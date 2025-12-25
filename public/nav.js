// Global navigation function for onclick handlers
// This file is NOT a module, so it has access to global scope

console.log('nav.js loading...');

function showView(view) {
    console.log('showView called with:', view);

    const viewMap = {
        invoice: 'invoiceFormView',
        receipt: 'receiptUploadView',
        history: 'historyView',
        expenses: 'expensesView',
        tools: 'toolsView',
        dashboard: 'dashboardView'
    };

    // Hide all views, show selected
    Object.entries(viewMap).forEach(([key, id]) => {
        const el = document.getElementById(id);
        console.log(`Element ${id}:`, el ? 'found' : 'NOT FOUND');
        if (el) {
            el.classList.toggle('active', key === view);
            el.style.display = key === view ? 'block' : 'none';
        }
    });

    const tabMap = {
        invoice: 'newInvoiceBtn',
        receipt: 'receiptUploadBtn',
        history: 'historyBtn',
        expenses: 'expensesBtn',
        tools: 'toolsBtn',
        dashboard: 'dashboardBtn'
    };

    // Update button states
    Object.entries(tabMap).forEach(([key, id]) => {
        const btn = document.getElementById(id);
        console.log(`Button ${id}:`, btn ? 'found' : 'NOT FOUND');
        if (btn) {
            btn.classList.toggle('active', key === view);
        }
    });

    // Sync dropdown
    const dropdown = document.getElementById('navDropdown');
    console.log('Dropdown:', dropdown ? 'found' : 'NOT FOUND');
    if (dropdown && dropdown.value !== view) {
        dropdown.value = view;
    }

    // Initialize tools if switching to tools view
    if (view === 'tools' && typeof window.setupDriverTools === 'function') {
        window.setupDriverTools();
    }
}

// Global navigation function for onclick handlers
window.navigateTo = function (view) {
    console.log('navigateTo called:', view);

    // Ensure DOM is ready before calling showView
    if (document.readyState === 'loading') {
        console.log('DOM not ready, waiting...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM ready, calling showView');
            showView(view);
        });
    } else {
        showView(view);
    }

    // Refresh specific view data when switching
    setTimeout(() => {
        try {
            // Access the functions from the module context
            if (view === 'history' && typeof window.displayHistory === 'function') {
                console.log('Calling displayHistory');
                window.displayHistory();
            } else if (view === 'expenses' && typeof window.displayExpenses === 'function') {
                console.log('Calling displayExpenses');
                window.displayExpenses();
            } else if (view === 'dashboard' && typeof window.updateDashboard === 'function') {
                console.log('Calling updateDashboard');
                window.updateDashboard();
            }
        } catch (e) {
            console.error(`Error refreshing view ${view}:`, e);
        }
    }, 100);
};

// Make showView available on window for module script
window.showView = showView;

console.log('nav.js loaded. window.navigateTo:', typeof window.navigateTo);
