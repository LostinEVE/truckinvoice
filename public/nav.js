// Global navigation function for onclick handlers
// This file is NOT a module, so it has access to global scope

function showView(view) {
    const viewMap = {
        invoice: 'invoiceFormView',
        receipt: 'receiptUploadView',
        history: 'historyView',
        expenses: 'expensesView',
        dashboard: 'dashboardView'
    };

    // Hide all views, show selected
    Object.entries(viewMap).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('active', key === view);
        }
    });

    const tabMap = {
        invoice: 'newInvoiceBtn',
        receipt: 'receiptUploadBtn',
        history: 'historyBtn',
        expenses: 'expensesBtn',
        dashboard: 'dashboardBtn'
    };

    // Update button states
    Object.entries(tabMap).forEach(([key, id]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.toggle('active', key === view);
        }
    });

    // Sync dropdown
    const dropdown = document.getElementById('navDropdown');
    if (dropdown && dropdown.value !== view) {
        dropdown.value = view;
    }
}

// Global navigation function for onclick handlers
window.navigateTo = function(view) {
    console.log('navigateTo called:', view);
    showView(view);
    
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
