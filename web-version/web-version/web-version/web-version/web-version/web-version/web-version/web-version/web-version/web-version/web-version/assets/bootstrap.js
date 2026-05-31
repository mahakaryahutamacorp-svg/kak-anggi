import { logout } from '../modules/auth/logout.js';
import { getCurrentUser, requireRole, isLoggedIn, verifySession } from '../modules/auth/guard.js';
import { appState } from './app-state.js';
import { loginForm } from '../modules/auth/login.js';
import { menuModule } from '../modules/menu/menu.js';
import { posModule } from '../modules/transaction/pos.js';
import { customerModule } from '../modules/customer/customer.js';
import { ledgerModule } from '../modules/ledger/ledger.js';
import { supplierModule } from '../modules/supplier/supplier.js';
import { cashbookModule } from '../modules/cashbook/cashbook.js';
import { dashboardModule } from '../modules/dashboard/dashboard.js';
import { historyModule } from '../modules/history/history.js';
import { settingsModule } from '../modules/settings/settings.js';
import { storeModule } from '../modules/store/store.js'; // [MULTI-STORE]
import { loadSettings } from '../modules/shared/settings.js';
import { initModulePage } from '../modules/shared/loadHtml.js';

window.m3chickenAuth = { getCurrentUser, requireRole, isLoggedIn, logout };
window.initModulePage = initModulePage;

// Global factories for x-data="module()" calls in portable runtime
window.appState = appState;
window.loginForm = loginForm;
window.menuModule = menuModule;
window.posModule = posModule;
window.customerModule = customerModule;
window.ledgerModule = ledgerModule;
window.supplierModule = supplierModule;
window.cashbookModule = cashbookModule;
window.dashboardModule = dashboardModule;
window.historyModule = historyModule;
window.settingsModule = settingsModule;
window.storeModule = storeModule; // [MULTI-STORE]

loadSettings().catch((err) => console.warn('[M3] Settings load:', err));

verifySession().catch((err) => console.warn('[M3] Session verify:', err));

function registerAlpineComponents() {
  Alpine.data('appState', appState);
  Alpine.data('loginForm', loginForm);
  Alpine.data('menuModule', menuModule);
  Alpine.data('posModule', posModule);
  Alpine.data('customerModule', customerModule);
  Alpine.data('ledgerModule', ledgerModule);
  Alpine.data('supplierModule', supplierModule);
  Alpine.data('cashbookModule', cashbookModule);
  Alpine.data('dashboardModule', dashboardModule);
  Alpine.data('historyModule', historyModule);
  Alpine.data('settingsModule', settingsModule);
  Alpine.data('storeModule', storeModule); // [MULTI-STORE]
}

document.addEventListener('alpine:init', registerAlpineComponents);

if (typeof Alpine !== 'undefined') {
  registerAlpineComponents();
}
