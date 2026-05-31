import { db } from '../../db/schema.js';
import { isApiMode, listTransactions } from '../shared/dataService.js';
import { exportAllData, downloadBackupJson, importAllData } from '../shared/backup.js';

export function ledgerModule() {
  return {
    ledgerList: [],
    form: { tipe: 'cash-in', deskripsi: '', nominal: '', kategori: '' },
    rekapHarian: [],
    backupMessage: '',
    backupError: '',
    importing: false,
    loading: false,
    error: '',
    usingApi: false,

    async init() {
      this.loading = true;
      this.error = '';
      this.usingApi = isApiMode();
      try {
        await db.open();
        await this.loadLedger();
        await this.loadRekap();
      } catch (err) {
        console.error('[Ledger]', err);
        this.error = err.message || 'Gagal memuat buku besar';
      } finally {
        this.loading = false;
      }
    },

    async loadLedger() {
      this.ledgerList = await db.ledger.orderBy('tanggal').reverse().toArray();
    },

    async addEntry() {
      if (!this.form.deskripsi || !this.form.kategori) return;
      this.error = '';
      const tanggal = new Date().toISOString().slice(0, 10);
      try {
        await db.ledger.add({
          tanggal,
          tipe: this.form.tipe,
          deskripsi: this.form.deskripsi.trim(),
          nominal: Number(this.form.nominal) || 0,
          kategori: this.form.kategori.trim()
        });
        this.form = { tipe: 'cash-in', deskripsi: '', nominal: '', kategori: '' };
        await this.loadLedger();
        await this.loadRekap();
      } catch (err) {
        this.error = err.message || 'Gagal menambah entri';
      }
    },

    async deleteEntry(id) {
      if (!confirm('Hapus entry ini?')) return;
      try {
        await db.ledger.delete(id);
        await this.loadLedger();
        await this.loadRekap();
      } catch (err) {
        this.error = err.message || 'Gagal menghapus entri';
      }
    },

    async loadRekap() {
      let orders = [];
      if (isApiMode()) {
        try {
          orders = await listTransactions({ limit: 200 });
        } catch (err) {
          console.warn('[Ledger] Gagal memuat transaksi API:', err.message);
        }
      } else {
        orders = await db.orders.toArray();
      }

      const ledger = await db.ledger.toArray();
      const tanggalSet = new Set([
        ...orders.map((o) => o.tanggal),
        ...ledger.map((l) => l.tanggal)
      ]);

      const rekap = [];
      for (const tgl of Array.from(tanggalSet).sort().reverse()) {
        const penjualan = orders
          .filter((o) => o.tanggal === tgl)
          .reduce((sum, o) => sum + Number(o.total), 0);
        const cashIn = ledger
          .filter((l) => l.tanggal === tgl && l.tipe === 'cash-in' && l.kategori !== 'Penjualan')
          .reduce((sum, l) => sum + Number(l.nominal), 0);
        const cashOut = ledger
          .filter((l) => l.tanggal === tgl && l.tipe === 'cash-out')
          .reduce((sum, l) => sum + Number(l.nominal), 0);
        rekap.push({
          tanggal: tgl,
          penjualan,
          cashIn,
          cashOut,
          profit: penjualan + cashIn - cashOut
        });
      }
      this.rekapHarian = rekap;
    },

    formatRupiah(value) {
      return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
    },

    async exportBackup() {
      this.backupError = '';
      this.backupMessage = '';
      try {
        const payload = await exportAllData();
        const filename = downloadBackupJson(payload);
        const counts = Object.entries(payload.data)
          .map(([k, v]) => `${k}: ${v.length}`)
          .join(', ');
        this.backupMessage = `Backup berhasil: ${filename} (${counts})`;
      } catch (err) {
        this.backupError = err.message || 'Gagal mengekspor backup';
      }
    },

    async handleImportFile(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = '';

      this.backupError = '';
      this.backupMessage = '';

      const confirmed = confirm(
        'PERINGATAN: Restore akan MENIMPA seluruh data menu, pelanggan, transaksi, dan buku besar di mesin ini.\n\nLanjutkan restore?'
      );
      if (!confirmed) return;

      this.importing = true;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        await importAllData(payload);
        await this.loadLedger();
        await this.loadRekap();
        this.backupMessage = `Restore berhasil dari ${file.name}`;
      } catch (err) {
        this.backupError = err.message || 'Gagal restore backup';
      } finally {
        this.importing = false;
      }
    }
  };
}
