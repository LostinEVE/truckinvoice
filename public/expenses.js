import { getExpenses as getStoredExpenses, setExpenses as setStoredExpenses } from './state.js';

export const categoryLabels = {
    fuel: 'Fuel',
    maintenance: 'Maintenance & Repairs',
    tolls: 'Tolls & Parking',
    food: 'Food & Meals',
    insurance: 'Insurance',
    permits: 'Permits & Licenses',
    truck_payment: 'Truck Payment/Lease',
    supplies: 'Supplies',
    drivers_pay: 'Drivers Pay',
    other: 'Other'
};

export function setupExpenses() {
    console.log('setupExpenses called');
    const expenseForm = document.getElementById('expenseForm');
    const expenseDate = document.getElementById('expenseDate');
    const searchExpenses = document.getElementById('searchExpenses');

    console.log('Expense form elements:', { expenseForm: !!expenseForm, expenseDate: !!expenseDate, searchExpenses: !!searchExpenses });
    if (!expenseForm || !expenseDate || !searchExpenses) {
        console.error('Missing expense form elements');
        return;
    }

    expenseDate.value = new Date().toISOString().split('T')[0];

    console.log('Adding expense form submit listener');
    expenseForm.addEventListener('submit', (e) => {
        console.log('Expense form submitted');
        e.preventDefault();

        const expense = {
            id: Date.now().toString(),
            date: document.getElementById('expenseDate').value,
            amount: parseFloat(document.getElementById('expenseAmount').value).toFixed(2),
            category: document.getElementById('expenseCategory').value,
            vendor: document.getElementById('expenseVendor').value,
            notes: document.getElementById('expenseNotes').value,
            timestamp: new Date().toISOString()
        };

        saveExpense(expense);
        expenseForm.reset();
        expenseDate.value = new Date().toISOString().split('T')[0];
        displayExpenses();
        alert('Expense added successfully!');
    });

    searchExpenses.addEventListener('input', (e) => {
        displayExpenses(e.target.value);
    });
}

export function saveExpense(expense) {
    const expenses = getExpenses();
    expenses.unshift(expense);
    setStoredExpenses(expenses);

    if (typeof saveExpenseToCloud === 'function') {
        saveExpenseToCloud(expense);
    }
}

export function getExpenses() {
    return getStoredExpenses();
}

export function displayExpenses(searchTerm = '') {
    const expenses = getExpenses();
    const expensesList = document.getElementById('expensesList');
    if (!expensesList) return;

    let filteredExpenses = expenses;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredExpenses = expenses.filter(exp =>
            exp.vendor.toLowerCase().includes(term) ||
            exp.category.toLowerCase().includes(term) ||
            exp.notes.toLowerCase().includes(term)
        );
    }

    if (filteredExpenses.length === 0) {
        expensesList.innerHTML = '<div class="no-history">No expenses found</div>';
        return;
    }

    // Group expenses by category
    const groupedExpenses = groupExpensesByCategory(filteredExpenses);

    // Category display names and icons
    const categoryInfo = {
        'fuel': { name: 'Fuel', icon: '⛽' },
        'maintenance': { name: 'Maintenance & Repairs', icon: '🔧' },
        'tolls': { name: 'Tolls & Parking', icon: '🅿️' },
        'food': { name: 'Food & Meals', icon: '🍔' },
        'insurance': { name: 'Insurance', icon: '🛡️' },
        'permits': { name: 'Permits & Licenses', icon: '📋' },
        'truck_payment': { name: 'Truck Payment/Lease', icon: '🚛' },
        'supplies': { name: 'Supplies', icon: '📦' },
        'drivers_pay': { name: 'Drivers Pay', icon: '👤' },
        'other': { name: 'Other', icon: '📎' }
    };

    let html = '<div class="expense-categories-accordion">';

    // Sort categories alphabetically by display name
    const sortedCategories = Object.keys(groupedExpenses).sort((a, b) => {
        const nameA = categoryInfo[a]?.name || a;
        const nameB = categoryInfo[b]?.name || b;
        return nameA.localeCompare(nameB);
    });

    for (const category of sortedCategories) {
        const categoryExpenses = groupedExpenses[category];
        const info = categoryInfo[category] || { name: category, icon: '📎' };
        const categoryTotal = categoryExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

        html += `
            <div class="expense-category-group">
                <button type="button" class="category-header" data-category="${category}" aria-expanded="false">
                    <span class="category-icon">${info.icon}</span>
                    <span class="category-name">${info.name}</span>
                    <span class="category-count">${categoryExpenses.length} expense${categoryExpenses.length !== 1 ? 's' : ''}</span>
                    <span class="category-total">$${categoryTotal.toFixed(2)}</span>
                    <span class="category-chevron">▼</span>
                </button>
                <div class="category-expenses-list" data-category-list="${category}">
                    ${renderCategoryExpenses(categoryExpenses)}
                </div>
            </div>
        `;
    }

    html += '</div>';
    expensesList.innerHTML = html;

    // Add click handlers for accordion headers
    document.querySelectorAll('.category-header').forEach(header => {
        header.addEventListener('click', toggleCategoryAccordion);
    });

    // Add click handlers for delete buttons
    document.querySelectorAll('.delete-expense-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteExpense);
    });

    // Add click handlers for edit buttons
    document.querySelectorAll('.edit-expense-btn').forEach(btn => {
        btn.addEventListener('click', handleEditExpense);
    });
}

// Get expense by ID
function getExpenseById(id) {
    const expenses = getExpenses();
    return expenses.find(exp => exp.id === id);
}

// Delete expense by ID - exported for global use
export function deleteExpense(id) {
    let expenses = getExpenses();
    expenses = expenses.filter(exp => exp.id !== id);
    setStoredExpenses(expenses);
    displayExpenses();
    
    // Update dashboard if available
    if (typeof window.updateDashboard === 'function') {
        window.updateDashboard();
    }

    // Delete from cloud if enabled
    if (typeof window.deleteExpenseFromCloud === 'function') {
        window.deleteExpenseFromCloud(id);
    }
}

// Group expenses by category
function groupExpensesByCategory(expenses) {
    return expenses.reduce((groups, expense) => {
        const category = expense.category || 'other';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(expense);
        return groups;
    }, {});
}

// Render expenses within a category
function renderCategoryExpenses(expenses) {
    // Sort by date (newest first)
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    return sorted.map(expense => `
        <div class="expense-item" data-id="${expense.id}">
            <div class="expense-item-main">
                <div class="expense-item-date">${formatDate(expense.date)}</div>
                <div class="expense-item-vendor">${escapeHtml(expense.vendor || 'Unknown')}</div>
                <div class="expense-item-amount">$${parseFloat(expense.amount).toFixed(2)}</div>
            </div>
            ${expense.notes ? `<div class="expense-item-notes">${escapeHtml(expense.notes)}</div>` : ''}
            <div class="expense-item-actions">
                <button type="button" class="edit-expense-btn" data-id="${expense.id}" title="Edit expense">✏️</button>
                <button type="button" class="delete-expense-btn" data-id="${expense.id}" title="Delete expense">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Toggle accordion open/closed
function toggleCategoryAccordion(event) {
    const header = event.currentTarget;
    const category = header.dataset.category;
    const list = document.querySelector(`[data-category-list="${category}"]`);
    const isExpanded = header.getAttribute('aria-expanded') === 'true';

    // Toggle this category
    header.setAttribute('aria-expanded', !isExpanded);
    list.classList.toggle('expanded', !isExpanded);

    // Update chevron
    const chevron = header.querySelector('.category-chevron');
    chevron.textContent = isExpanded ? '▼' : '▲';
}

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle delete expense - called from accordion delete buttons
function handleDeleteExpense(event) {
    const id = event.currentTarget.dataset.id;
    // Call deleteExpenseDirectly to avoid double confirmation
    deleteExpenseDirectly(id);
}

// Direct delete without confirmation (for internal use after button click confirms intent)
function deleteExpenseDirectly(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        let expenses = getExpenses();
        expenses = expenses.filter(exp => exp.id !== id);
        setStoredExpenses(expenses);
        displayExpenses();
        
        // Update dashboard if available
        if (typeof window.updateDashboard === 'function') {
            window.updateDashboard();
        }

        // Delete from cloud if enabled
        if (typeof window.deleteExpenseFromCloud === 'function') {
            window.deleteExpenseFromCloud(id);
        }
    }
}

// Handle edit expense (you can expand this as needed)
function handleEditExpense(event) {
    const id = event.currentTarget.dataset.id;
    const expense = getExpenseById(id);
    if (expense) {
        // Populate the form with expense data for editing
        document.getElementById('expenseDate').value = expense.date || '';
        document.getElementById('expenseAmount').value = expense.amount || '';
        document.getElementById('expenseCategory').value = expense.category || '';
        document.getElementById('expenseVendor').value = expense.vendor || '';
        document.getElementById('expenseNotes').value = expense.notes || '';

        // Store the ID being edited
        document.getElementById('expenseForm').dataset.editingId = id;

        // Update button text
        const submitBtn = document.querySelector('#expenseForm .btn-generate');
        if (submitBtn) {
            submitBtn.textContent = 'Update Expense';
        }

        // Scroll to form
        document.getElementById('expenseForm').scrollIntoView({ behavior: 'smooth' });
    }
}
