import { getCurrentUser } from '../auth/guard.js';
import { loadSettings, getCachedSettings } from '../shared/settings.js';
import { getDashboardData } from '../shared/dataService.js';

export function dashboardModule() {
  return {
    user: null,
    stats: {
      todaySales: 0,
      todayOrders: 0,
      monthSales: 0,
      monthOrders: 0,
      totalCustomers: 0,
      totalMenu: 0,
      totalSuppliers: 0,
      totalHutang: 0,
      cashbookSaldo: 0
    },
    lowStock: [],
    recentOrders: [],
    settings: getCachedSettings(),
    error: '',

    async init() {
      this.user = getCurrentUser();
      this.settings = await loadSettings();
      await this.refresh();
    },

    formatRupiah(value) {
      return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
    },

    get isOwner() {
      return this.user?.role === 'owner';
    },

    async refresh() {
      this.error = '';
      try {
        const threshold = Number(this.settings.lowStockThreshold) || 5;
        const data = await getDashboardData(threshold);
        this.stats = data.stats;
        this.lowStock = data.lowStock;
        this.recentOrders = data.recentOrders;
      } catch (err) {
        this.error = err.message || 'Gagal memuat dashboard';
      }
    }
  };
}
