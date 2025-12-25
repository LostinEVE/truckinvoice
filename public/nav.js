// Global navigation function for onclick handlers
// This file is NOT a module, so it has access to global scope

function showView(view) {
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
        if (btn) {
            btn.classList.toggle('active', key === view);
        }
    });

    // Sync dropdown
    const dropdown = document.getElementById('navDropdown');
    if (dropdown && dropdown.value !== view) {
        dropdown.value = view;
    }

    // Initialize tools if switching to tools view
    if (view === 'tools' && typeof window.setupDriverTools === 'function') {
        window.setupDriverTools();
    }

    // Refresh data when switching views - with retry for module loading
    function callWhenReady(fnName, retries = 5) {
        if (typeof window[fnName] === 'function') {
            try {
                window[fnName]();
            } catch (e) {
                console.error('Error calling', fnName, ':', e);
            }
        } else if (retries > 0) {
            setTimeout(() => callWhenReady(fnName, retries - 1), 100);
        }
    }

    if (view === 'history') {
        callWhenReady('displayHistory');
    }
    if (view === 'expenses') {
        callWhenReady('displayExpenses');
    }
    if (view === 'dashboard') {
        callWhenReady('updateDashboard');
    }
}

// Global navigation function for onclick handlers
window.navigateTo = function (view) {
    // Ensure DOM is ready before calling showView
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            showView(view);
        });
    } else {
        showView(view);
    }

    // Refresh specific view data when switching
    setTimeout(() => {
        try {
            if (view === 'history' && typeof window.displayHistory === 'function') {
                window.displayHistory();
            } else if (view === 'expenses' && typeof window.displayExpenses === 'function') {
                window.displayExpenses();
            } else if (view === 'dashboard' && typeof window.updateDashboard === 'function') {
                window.updateDashboard();
            }
        } catch (e) {
            console.error(`Error refreshing view ${view}:`, e);
        }
    }, 100);
};

// Make showView available on window for module script
window.showView = showView;

// ======================================
// TRUCK MANAGEMENT FUNCTIONS (Global)
// ======================================

function getTrucks() {
    const trucksData = localStorage.getItem('trucks');
    return trucksData ? JSON.parse(trucksData) : [];
}

function saveTrucks(trucks) {
    localStorage.setItem('trucks', JSON.stringify(trucks));
}

function openTruckModal() {
    const modal = document.getElementById('truckModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        renderTruckList();
    }
}

function closeTruckModal() {
    const modal = document.getElementById('truckModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function addTruck() {
    const nameInput = document.getElementById('newTruckName');
    const unitInput = document.getElementById('newTruckUnit');

    if (!nameInput) {
        console.error('newTruckName input not found');
        return;
    }

    const name = nameInput.value.trim();
    const unit = unitInput ? unitInput.value.trim() : '';

    if (!name) {
        alert('Please enter a truck name');
        return;
    }

    const trucks = getTrucks();
    const newTruck = {
        id: Date.now().toString(),
        name: name,
        unit: unit,
        createdAt: new Date().toISOString()
    };

    trucks.push(newTruck);
    saveTrucks(trucks);

    // Clear inputs
    nameInput.value = '';
    if (unitInput) unitInput.value = '';

    // Refresh list
    renderTruckList();

    // Update all truck dropdowns in the app
    updateAllTruckDropdowns();
}

function deleteTruck(truckId) {
    if (!confirm('Delete this truck? This cannot be undone.')) return;

    let trucks = getTrucks();
    trucks = trucks.filter(t => t.id !== truckId);
    saveTrucks(trucks);

    renderTruckList();
    updateAllTruckDropdowns();
}

function renderTruckList() {
    const truckList = document.getElementById('truckList');
    if (!truckList) return;

    const trucks = getTrucks();

    if (trucks.length === 0) {
        truckList.innerHTML = '<div class="no-trucks">No trucks added yet. Add your first truck above!</div>';
        return;
    }

    truckList.innerHTML = trucks.map(truck => `
        <div class="truck-item">
            <div class="truck-info">
                <span class="truck-name">🚛 ${truck.name}</span>
                ${truck.unit ? `<span class="truck-unit">(Unit #${truck.unit})</span>` : ''}
            </div>
            <button type="button" class="btn-delete-truck" onclick="deleteTruck('${truck.id}')">🗑️</button>
        </div>
    `).join('');
}

function updateAllTruckDropdowns() {
    const trucks = getTrucks();
    const dropdownIds = ['invoiceTruck', 'receiptTruck', 'filterReceiptTruck', 'expenseTruck', 'fuelTruck'];

    dropdownIds.forEach(id => {
        const dropdown = document.getElementById(id);
        if (dropdown) {
            const currentValue = dropdown.value;
            const defaultText = id === 'invoiceTruck' ? 'Select Truck...' : 'All Trucks / No Selection';
            dropdown.innerHTML = `<option value="">${defaultText}</option>` +
                trucks.map(t => `<option value="${t.id}">${t.name}${t.unit ? ' (#' + t.unit + ')' : ''}</option>`).join('');
            if (currentValue && trucks.find(t => t.id === currentValue)) {
                dropdown.value = currentValue;
            }
        }
    });
}

// Expose truck functions globally
window.openTruckModal = openTruckModal;
window.closeTruckModal = closeTruckModal;
window.addTruck = addTruck;
window.deleteTruck = deleteTruck;
window.getTrucks = getTrucks;
window.saveTrucks = saveTrucks;
window.renderTruckList = renderTruckList;
window.updateAllTruckDropdowns = updateAllTruckDropdowns;

// ======================================
// DRIVER TOOLS TAB SWITCHING (Global)
// ======================================

function switchToolTab(targetTool) {
    const toolTabs = document.querySelectorAll('.tool-tab');
    const toolPanels = document.querySelectorAll('.tool-panel');

    // Update tabs
    toolTabs.forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tool === targetTool) {
            t.classList.add('active');
        }
    });

    // Update panels
    toolPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === targetTool + 'Tool') {
            panel.classList.add('active');
        }
    });
}

// Set up tool tab click handlers when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    const toolTabs = document.querySelectorAll('.tool-tab');
    toolTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            switchToolTab(this.dataset.tool);
        });
    });
});

window.switchToolTab = switchToolTab;
