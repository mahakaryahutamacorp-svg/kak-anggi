import { loadSettings, getCachedSettings } from '../shared/settings.js';
import { listTransactions, getTransaction } from '../shared/dataService.js';

export function historyModule() {
  return {
    orders: [],
    filter: { tanggal: new Date().toISOString().slice(0, 10) },
    selected: null,
    settings: getCachedSettings(),
    loading: false,
    error: '',

    async init() {
      this.settings = await loadSettings();
      await this.load();
    },

    async load() {
      this.loading = true;
      this.error = '';
      try {
        this.orders = await listTransactions({
          tanggal: this.filter.tanggal || '',
          limit: 200
        });
      } catch (err) {
        this.error = err.message || 'Gagal memuat riwayat';
        this.orders = [];
      } finally {
        this.loading = false;
      }
    },

    formatRupiah(value) {
      return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
    },

    get totalHari() {
      return this.orders.reduce((s, o) => s + Number(o.total), 0);
    },

    itemCount(order) {
      if (order.items?.length) {
        return order.items.reduce((s, i) => s + Number(i.qty), 0);
      }
      return order.itemCount || 0;
    },

    async openReceipt(order) {
      try {
        const full = await getTransaction(order.id);
        this.selected = full;
      } catch {
        this.selected = order;
      }
    },

    closeReceipt() {
      this.selected = null;
    },

    async printOrder(order) {
      await this.openReceipt(order);
      await this.$nextTick();
      window.print();
    }
  };
}
