// State helpers wrapping localStorage to keep offline-first behavior
import { STORAGE_KEYS } from './config.js';

// Company info
export function getCompanyInfo() {
    return {
        companyName: localStorage.getItem(STORAGE_KEYS.companyName) || '',
        companyAddress: localStorage.getItem(STORAGE_KEYS.companyAddress) || '',
        carrierId: localStorage.getItem(STORAGE_KEYS.carrierId) || '',
        userEmail: localStorage.getItem(STORAGE_KEYS.userEmail) || ''
    };
}

export function setCompanyInfo(data) {
    localStorage.setItem(STORAGE_KEYS.companyName, data.companyName || '');
    localStorage.setItem(STORAGE_KEYS.companyAddress, data.companyAddress || '');
    localStorage.setItem(STORAGE_KEYS.carrierId, data.carrierId || '');
    localStorage.setItem(STORAGE_KEYS.userEmail, data.userEmail || '');
}

// Invoices
export function getInvoiceHistory() {
    const raw = localStorage.getItem(STORAGE_KEYS.invoiceHistory);
    return raw ? JSON.parse(raw) : [];
}

export function setInvoiceHistory(list) {
    localStorage.setItem(STORAGE_KEYS.invoiceHistory, JSON.stringify(list || []));
}

// Expenses
export function getExpenses() {
    const raw = localStorage.getItem(STORAGE_KEYS.expenses);
    return raw ? JSON.parse(raw) : [];
}

export function setExpenses(list) {
    localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(list || []));
}
