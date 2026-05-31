import { getCurrentUser } from '../auth/guard.js';
import { listMenu, createTransaction } from '../shared/dataService.js';
import { loadSettings } from '../shared/settings.js';

export function posModule() {
  return {
    menuList: [],
    cart: [],
    total: 0,
    paymentMethod: 'tunai',
    lastReceipt: null,
    processing: false,
    settings: {},

    async init() {
      this.settings = await loadSettings();
      await this.reloadMenu();
      this.cart = [];
      this.total = 0;
      this.lastReceipt = null;
    },

    async reloadMenu() {
      this.menuList = await listMenu();
    },

    addToCart(item) {
      if (item.stok !== undefined && item.stok <= 0) {
        alert('Stok habis untuk ' + item.nama);
        return;
      }
      const found = this.cart.find((i) => i.id === item.id);
      if (found) {
        if (item.stok !== undefined && found.qty >= item.stok) {
          alert('Stok tidak mencukupi');
          return;
        }
        found.qty++;
      } else {
        this.cart.push({ ...item, qty: 1 });
      }
      this.updateTotal();
    },

    removeFromCart(id) {
      this.cart = this.cart.filter((i) => i.id !== id);
      this.updateTotal();
    },

    changeQty(item) {
      if (item.qty < 1) item.qty = 1;
      const menu = this.menuList.find((m) => m.id === item.id);
      if (menu && menu.stok !== undefined && item.qty > menu.stok) {
        item.qty = menu.stok;
        alert('Qty disesuaikan ke stok tersedia');
      }
      this.updateTotal();
    },

    updateTotal() {
      this.total = this.cart.reduce((sum, i) => sum + Number(i.qty) * Number(i.harga), 0);
    },

    formatRupiah(value) {
      return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
    },

    buildReceipt(orderId, nomorTransaksi) {
      const now = new Date();
      const business = {
        name: this.settings.businessName || 'M3 Chicken',
        owner: this.settings.ownerName || 'Selino Anggri',
        phone: this.settings.phone || '081373546317',
        address:
          this.settings.address ||
          'Jalan Pasar Raya Sidodadi BK 9, OKU Timur, Sumatera Selatan'
      };
      const itemsSnapshot = this.lastReceipt?.items || this.cart.map((i) => ({
        nama: i.nama,
        qty: i.qty,
        harga: Number(i.harga),
        subtotal: Number(i.qty) * Number(i.harga)
      }));

      return {
        orderId,
        nomorTransaksi,
        business,
        tanggal: now.toLocaleDateString('id-ID'),
        waktu: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        kasir: getCurrentUser()?.nama || 'Kasir',
        items: itemsSnapshot,
        total: this.lastReceipt?.total ?? this.total,
        paymentMethod: this.paymentMethod
      };
    },

    async checkout() {
      if (this.processing) return;
      if (!this.cart.length) {
        alert('Keranjang kosong!');
        return;
      }

      this.processing = true;
      const itemsSnapshot = this.cart.map((i) => ({
        id: i.id,
        nama: i.nama,
        harga: Number(i.harga),
        qty: Number(i.qty)
      }));
      const total = this.total;

      try {
        const result = await createTransaction({
          items: itemsSnapshot,
          metodeBayar: this.paymentMethod,
          diskon: 0
        });

        const orderId = result.id;
        const nomor = result.nomor_transaksi || `#${orderId}`;

        this.lastReceipt = {
          items: itemsSnapshot.map((i) => ({
            nama: i.nama,
            qty: i.qty,
            harga: i.harga,
            subtotal: i.qty * i.harga
          })),
          total: result.total ?? total
        };

        this.cart = [];
        this.updateTotal();
        await this.reloadMenu();

        this.lastReceipt = this.buildReceipt(orderId, nomor);
        await this.$nextTick();
        this.printReceipt();
        alert(`Transaksi berhasil! ${nomor}`);
      } catch (err) {
        console.error(err);
        alert(err.message || 'Gagal menyimpan transaksi. Coba lagi.');
      } finally {
        this.processing = false;
      }
    },

    printReceipt() {
      if (!this.lastReceipt) return;
      window.print();
    }
  };
}
