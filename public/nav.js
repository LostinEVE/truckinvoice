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
    console.log('openTruckModal called');
    const modal = document.getElementById('truckModal');
    console.log('truckModal element:', modal);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        renderTruckList();
    } else {
        console.error('truckModal not found in DOM');
    }
}

function closeTruckModal() {
    console.log('closeTruckModal called');
    const modal = document.getElementById('truckModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function addTruck() {
    console.log('addTruck called');
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
    console.log('Truck added:', newTruck);

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
    if (!truckList) {
        console.error('truckList element not found');
        return;
    }

    const trucks = getTrucks();
    console.log('Rendering truck list, trucks:', trucks);

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
    const dropdowns = document.querySelectorAll('.truck-select');

    dropdowns.forEach(dropdown => {
        const currentValue = dropdown.value;
        dropdown.innerHTML = '<option value="">All Trucks</option>' +
            trucks.map(t => `<option value="${t.id}">${t.name}${t.unit ? ' (#' + t.unit + ')' : ''}</option>`).join('');
        if (currentValue && trucks.find(t => t.id === currentValue)) {
            dropdown.value = currentValue;
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
    console.log('switchToolTab called:', targetTool);

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
            console.log('Activated panel:', panel.id);
        }
    });
}

// Set up tool tab click handlers when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('Setting up tool tab handlers from nav.js');
    const toolTabs = document.querySelectorAll('.tool-tab');
    console.log('Found', toolTabs.length, 'tool tabs');

    toolTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const targetTool = this.dataset.tool;
            console.log('Tool tab clicked:', targetTool);
            switchToolTab(targetTool);
        });
    });
});

window.switchToolTab = switchToolTab;

console.log('nav.js loaded. window.navigateTo:', typeof window.navigateTo);
console.log('nav.js: openTruckModal available:', typeof window.openTruckModal);
