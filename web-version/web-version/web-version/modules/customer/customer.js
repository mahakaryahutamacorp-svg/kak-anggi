import { listCustomers, saveCustomer, deleteCustomer } from '../shared/dataService.js';

export function customerModule() {
  return {
    customerList: [],
    form: { id: null, nama: '', telepon: '', alamat: '' },
    error: '',

    async init() {
      await this.loadCustomers();
    },

    async loadCustomers() {
      try {
        this.customerList = await listCustomers();
      } catch (err) {
        this.error = err.message;
        this.customerList = [];
      }
    },

    resetForm() {
      this.form = { id: null, nama: '', telepon: '', alamat: '' };
      this.error = '';
    },

    async saveCustomer() {
      if (!this.form.nama) return;
      this.error = '';
      const payload = {
        nama: this.form.nama.trim(),
        telepon: this.form.telepon || '',
        alamat: this.form.alamat || ''
      };
      try {
        await saveCustomer(payload, this.form.id || null);
        this.resetForm();
        await this.loadCustomers();
      } catch (err) {
        this.error = err.message || 'Gagal menyimpan pelanggan';
      }
    },

    editCustomer(item) {
      this.form = { ...item };
      this.error = '';
    },

    async deleteCustomer(id) {
      if (!confirm('Hapus data pelanggan ini?')) return;
      try {
        await deleteCustomer(id);
        await this.loadCustomers();
      } catch (err) {
        this.error = err.message || 'Gagal menghapus pelanggan';
      }
    }
  };
}
