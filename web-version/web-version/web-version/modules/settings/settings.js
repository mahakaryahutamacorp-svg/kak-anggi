import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../shared/settings.js';
import { getCurrentUser } from '../auth/guard.js';

export function settingsModule() {
  return {
    form: { ...DEFAULT_SETTINGS },
    saved: false,
    saving: false,
    error: '',
    isOwner: false,

    async init() {
      this.isOwner = getCurrentUser()?.role === 'owner';
      this.form = await loadSettings();
    },

    async save() {
      if (!this.isOwner) return;
      this.saving = true;
      this.saved = false;
      this.error = '';
      try {
        await saveSettings({
          businessName: this.form.businessName,
          ownerName: this.form.ownerName,
          phone: this.form.phone,
          address: this.form.address,
          receiptFooter: this.form.receiptFooter,
          lowStockThreshold: Number(this.form.lowStockThreshold) || 5
        });
        this.saved = true;
      } catch (err) {
        this.error = err.message || 'Gagal menyimpan';
      } finally {
        this.saving = false;
      }
    },

    async resetDefaults() {
      if (!confirm('Reset semua pengaturan ke default?')) return;
      await saveSettings(DEFAULT_SETTINGS);
      this.form = { ...DEFAULT_SETTINGS };
      this.saved = true;
    }
  };
}
