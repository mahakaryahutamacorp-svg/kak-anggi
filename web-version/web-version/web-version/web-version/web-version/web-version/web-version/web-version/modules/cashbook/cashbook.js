import { db } from '../../db/schema.js';
import { getCurrentUser } from '../auth/guard.js';

const DEFAULT_CATEGORIES_IN = ['Penjualan Pribadi', 'Tabungan', 'Hutang Diterima', 'Investasi', 'Lainnya'];
const DEFAULT_CATEGORIES_OUT = [
  'Belanja Bahan',
  'Gaji Karyawan',
  'Listrik & Air',
  'Sewa',
  'Operasional',
  'Pribadi',
  'Bayar Hutang',
  'Lainnya'
];

export function cashbookModule() {
  return {
    entries: [],
    form: {
      id: null,
      tanggal: new Date().toISOString().slice(0, 10),
      tipe: 'cash-in',
      kategori: 'Penjualan Pribadi',
      deskripsi: '',
      nominal: 0
    },
    filter: { month: new Date().toISOString().slice(0, 7), tipe: 'all' },
    isOwner: false,
    summary: { totalIn: 0, totalOut: 0, saldo: 0 },

    async init() {
      this.isOwner = getCurrentUser()?.role === 'owner';
      await this.loadEntries();
    },

    get categoryOptions() {
      return this.form.tipe === 'cash-in' ? DEFAULT_CATEGORIES_IN : DEFAULT_CATEGORIES_OUT;
    },

    async loadEntries() {
      const all = await db.cashbook.orderBy('tanggal').reverse().toArray();
      this.entries = all.filter((e) => {
        const matchMonth = !this.filter.month || e.tanggal.startsWith(this.filter.month);
        const matchTipe = this.filter.tipe === 'all' || e.tipe === this.filter.tipe;
        return matchMonth && matchTipe;
      });
      this.recalcSummary();
    },

    recalcSummary() {
      const inSum = this.entries
        .filter((e) => e.tipe === 'cash-in')
        .reduce((sum, e) => sum + Number(e.nominal), 0);
      const outSum = this.entries
        .filter((e) => e.tipe === 'cash-out')
        .reduce((sum, e) => sum + Number(e.nominal), 0);
      this.summary = {
        totalIn: inSum,
        totalOut: outSum,
        saldo: inSum - outSum
      };
    },

    resetForm() {
      this.form = {
        id: null,
        tanggal: new Date().toISOString().slice(0, 10),
        tipe: 'cash-in',
        kategori: 'Penjualan Pribadi',
        deskripsi: '',
        nominal: 0
      };
    },

    async saveEntry() {
      if (!this.form.deskripsi || !this.form.tanggal) return;
      const payload = {
        tanggal: this.form.tanggal,
        tipe: this.form.tipe,
        kategori: this.form.kategori || 'Lainnya',
        deskripsi: this.form.deskripsi.trim(),
        nominal: Number(this.form.nominal) || 0,
        createdBy: getCurrentUser()?.username || '',
        updatedAt: new Date().toISOString()
      };
      if (this.form.id) {
        await db.cashbook.update(this.form.id, payload);
      } else {
        payload.createdAt = new Date().toISOString();
        await db.cashbook.add(payload);
      }
      this.resetForm();
      await this.loadEntries();
    },

    editEntry(item) {
      this.form = { ...item };
    },

    async deleteEntry(id) {
      if (!confirm('Hapus catatan keuangan ini?')) return;
      await db.cashbook.delete(id);
      await this.loadEntries();
    },

    formatRupiah(value) {
      return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
    },

    exportCsv() {
      const header = 'Tanggal,Tipe,Kategori,Deskripsi,Nominal\n';
      const rows = this.entries
        .map(
          (e) =>
            `${e.tanggal},${e.tipe},"${(e.kategori || '').replace(/"/g, '""')}","${(e.deskripsi || '').replace(
              /"/g,
              '""'
            )}",${e.nominal}`
        )
        .join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cashbook_${this.filter.month || 'semua'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
}
