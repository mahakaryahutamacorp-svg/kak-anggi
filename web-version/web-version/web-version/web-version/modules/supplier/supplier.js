import { getCurrentUser } from '../auth/guard.js';
import { listSuppliers, saveSupplier, deleteSupplier } from '../shared/dataService.js';

export function supplierModule() {
  return {
    supplierList: [],
    form: {
      id: null,
      nama: '',
      kontak: '',
      telepon: '',
      alamat: '',
      kategori: '',
      hutang: 0,
      catatan: ''
    },
    search: '',
    isOwner: false,
    totalHutang: 0,
    error: '',

    async init() {
      this.isOwner = getCurrentUser()?.role === 'owner';
      await this.loadSuppliers();
    },

    get filteredSuppliers() {
      const q = this.search.trim().toLowerCase();
      if (!q) return this.supplierList;
      return this.supplierList.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          (s.kategori || '').toLowerCase().includes(q) ||
          (s.telepon || '').includes(q)
      );
    },

    async loadSuppliers() {
      try {
        this.supplierList = await listSuppliers();
        this.totalHutang = this.supplierList.reduce(
          (sum, s) => sum + Number(s.hutang || 0),
          0
        );
      } catch (err) {
        this.error = err.message;
        this.supplierList = [];
        this.totalHutang = 0;
      }
    },

    resetForm() {
      this.form = {
        id: null,
        nama: '',
        kontak: '',
        telepon: '',
        alamat: '',
        kategori: '',
        hutang: 0,
        catatan: ''
      };
      this.error = '';
    },

    async saveSupplier() {
      if (!this.form.nama) return;
      this.error = '';
      const payload = {
        nama: this.form.nama.trim(),
        kontak: this.form.kontak || '',
        telepon: this.form.telepon || '',
        alamat: this.form.alamat || '',
        kategori: this.form.kategori || '',
        hutang: Number(this.form.hutang) || 0,
        catatan: this.form.catatan || ''
      };
      try {
        await saveSupplier(payload, this.form.id || null);
        this.resetForm();
        await this.loadSuppliers();
      } catch (err) {
        this.error = err.message || 'Gagal menyimpan supplier';
      }
    },

    editSupplier(item) {
      this.form = { ...item };
      this.error = '';
    },

    async deleteSupplier(id) {
      if (!confirm('Hapus data supplier ini?')) return;
      try {
        await deleteSupplier(id);
        await this.loadSuppliers();
      } catch (err) {
        this.error = err.message || 'Gagal menghapus supplier';
      }
    },

    formatRupiah(value) {
      return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
    }
  };
}
