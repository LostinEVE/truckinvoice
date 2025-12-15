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

    expensesList.innerHTML = filteredExpenses.map(expense => `
        <div class="history-item expense-item">
            <div class="history-header">
                <div class="history-title">
                    <strong>${categoryLabels[expense.category]}</strong>
                    <span class="history-date">${new Date(expense.date).toLocaleDateString()}</span>
                </div>
                <div class="history-amount expense-amount">$${expense.amount}</div>
            </div>
            <div class="history-details">
                <div><strong>Vendor:</strong> ${expense.vendor}</div>
                ${Array.isArray(expense.items) && expense.items.length ? `
                <div><strong>Items:</strong></div>
                <div>
                    ${expense.items.map(it => `<div>- ${it.description} — $${it.price}</div>`).join('')}
                </div>` : ''}
                ${expense.notes ? `
                <details>
                    <summary>View Details</summary>
                    <div class="section-description" style="white-space: pre-wrap;">${expense.notes}</div>
                </details>` : ''}
            </div>
            <div class="history-actions">
                <button class="btn-delete" onclick="deleteExpense('${expense.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

export function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    let expenses = getExpenses();
    expenses = expenses.filter(exp => exp.id !== id);
    setStoredExpenses(expenses);
    displayExpenses();
    if (typeof updateDashboard === 'function') updateDashboard();

    if (typeof deleteExpenseFromCloud === 'function') {
        deleteExpenseFromCloud(id);
    }
}
