import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../shared/settings.js';
import { getCurrentUser } from '../auth/guard.js';
import {
  canServerBackup,
  downloadServerBackupSql,
  downloadServerBackupJson
} from '../shared/serverBackup.js';

export function settingsModule() {
  return {
    form: { ...DEFAULT_SETTINGS },
    saved: false,
    saving: false,
    error: '',
    isOwner: false,
    canBackup: false,
    backingUp: '',
    backupError: '',
    backupInfo: '',

    async init() {
      this.isOwner = getCurrentUser()?.role === 'owner';
      this.canBackup = canServerBackup();
      this.form = await loadSettings();
    },

    async backupSql() {
      await this.runBackup('sql', downloadServerBackupSql);
    },

    async backupJson() {
      await this.runBackup('json', downloadServerBackupJson);
    },

    async runBackup(kind, fn) {
      if (this.backingUp) return;
      this.backingUp = kind;
      this.backupError = '';
      this.backupInfo = '';
      try {
        const filename = await fn();
        this.backupInfo = `Backup tersimpan: ${filename}`;
      } catch (err) {
        this.backupError = err.message || 'Gagal membuat backup';
      } finally {
        this.backingUp = '';
      }
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
