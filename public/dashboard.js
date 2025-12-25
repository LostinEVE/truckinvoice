import { getInvoiceHistory } from './state.js';
import { getExpenses, categoryLabels } from './expenses.js';

export function setupDashboard() {
    const yearSelect = document.getElementById('dashboardYear');
    const periodSelect = document.getElementById('dashboardPeriod');
    const exportExpenseBtn = document.getElementById('exportExpenseReport');
    const exportPLBtn = document.getElementById('exportProfitLoss');

    if (!yearSelect || !periodSelect || !exportExpenseBtn || !exportPLBtn) return;

    populateYearSelector();

    yearSelect.addEventListener('change', updateDashboard);
    periodSelect.addEventListener('change', updateDashboard);
    exportExpenseBtn.addEventListener('click', exportExpenseReport);
    exportPLBtn.addEventListener('click', exportProfitLossStatement);

    updateDashboard();
}

export function populateYearSelector() {
    const yearSelect = document.getElementById('dashboardYear');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const invoices = getInvoiceHistory();
    const expenses = getExpenses();

    const years = new Set([currentYear]);
    invoices.forEach(inv => years.add(new Date(inv.timestamp).getFullYear()));
    expenses.forEach(exp => years.add(new Date(exp.date).getFullYear()));

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    yearSelect.innerHTML = sortedYears.map(year =>
        `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
    ).join('');
}

export function updateDashboard() {
    const yearSelect = document.getElementById('dashboardYear');
    const periodSelect = document.getElementById('dashboardPeriod');

    if (!yearSelect || !periodSelect) {
        return;
    }

    // Make sure year selector is populated
    if (!yearSelect.innerHTML || yearSelect.options.length === 0) {
        populateYearSelector();
    }

    const selectedYear = parseInt(yearSelect.value) || new Date().getFullYear();
    const selectedPeriod = periodSelect.value || 'ytd';

    const invoices = getInvoiceHistory();
    const expenses = getExpenses();

    const dateRange = getDateRange(selectedPeriod, selectedYear);

    const filteredInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.timestamp);
        return invDate >= dateRange.start && invDate <= dateRange.end;
    });
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dateRange.start && expDate <= dateRange.end;
    });

    const totalIncome = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const netProfit = totalIncome - totalExpenses;

    const periodLabel = selectedPeriod === 'ytd' ? 'YTD' : selectedPeriod === 'weekly' ? 'This Week' : 'Pay Period';
    document.querySelector('.income-card .card-label').textContent = `Total Income (${periodLabel})`;
    document.querySelector('.expense-card .card-label').textContent = `Total Expenses (${periodLabel})`;
    document.querySelector('.profit-card .card-label').textContent = `Net Profit (${periodLabel})`;

    document.getElementById('ytdIncome').textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById('ytdExpenses').textContent = `$${totalExpenses.toFixed(2)}`;
    document.getElementById('ytdProfit').textContent = `$${netProfit.toFixed(2)}`;

    const profitCard = document.querySelector('.profit-card .card-value');
    if (profitCard) profitCard.style.color = netProfit >= 0 ? '#4caf50' : '#dc3545';

    displayExpenseBreakdown(filteredExpenses);
    displayMonthlySummary(filteredInvoices, filteredExpenses, selectedYear);
}

export function getDateRange(period, year) {
    const now = new Date();
    let start, end;

    switch (period) {
        case 'weekly': {
            const dayOfWeek = now.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            start = new Date(now);
            start.setDate(now.getDate() + mondayOffset);
            start.setHours(0, 0, 0, 0);

            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        }
        case 'pay-period': {
            const referenceDate = new Date(now.getFullYear(), 0, 1);
            const daysSinceReference = Math.floor((now - referenceDate) / (1000 * 60 * 60 * 24));
            const payPeriodNumber = Math.floor(daysSinceReference / 14);

            start = new Date(referenceDate);
            start.setDate(referenceDate.getDate() + (payPeriodNumber * 14));
            start.setHours(0, 0, 0, 0);

            end = new Date(start);
            end.setDate(start.getDate() + 13);
            end.setHours(23, 59, 59, 999);
            break;
        }
        case 'ytd':
        default:
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31, 23, 59, 59, 999);
            break;
    }

    return { start, end };
}

export function displayExpenseBreakdown(expenses) {
    const breakdownDiv = document.getElementById('expenseBreakdown');
    if (!breakdownDiv) return;

    const breakdown = {};
    expenses.forEach(exp => {
        if (!breakdown[exp.category]) breakdown[exp.category] = 0;
        breakdown[exp.category] += parseFloat(exp.amount);
    });

    if (Object.keys(breakdown).length === 0) {
        breakdownDiv.innerHTML = '<div class="no-data">No expense data available</div>';
        return;
    }

    const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

    breakdownDiv.innerHTML = sorted.map(([category, amount]) => `
        <div class="breakdown-item">
            <div class="breakdown-category">${categoryLabels[category]}</div>
            <div class="breakdown-amount">$${amount.toFixed(2)}</div>
        </div>
    `).join('');
}

export function displayMonthlySummary(invoices, expenses, year) {
    const summaryDiv = document.getElementById('monthlySummary');
    if (!summaryDiv) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, index) => {
        const monthInvoices = invoices.filter(inv => new Date(inv.timestamp).getMonth() === index);
        const monthExpenses = expenses.filter(exp => new Date(exp.date).getMonth() === index);

        const income = monthInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        const expense = monthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const profit = income - expense;
        return { month, income, expense, profit };
    });

    const dataMonths = monthlyData.filter(m => m.income > 0 || m.expense > 0);

    if (dataMonths.length === 0) {
        summaryDiv.innerHTML = '<div class="no-data">No monthly data available</div>';
        return;
    }

    summaryDiv.innerHTML = dataMonths.reverse().map(data => `
        <div class="monthly-item">
            <div class="monthly-month">${data.month}</div>
            <div class="monthly-details">
                <div class="monthly-row">
                    <span>Income:</span>
                    <span class="income-value">$${data.income.toFixed(2)}</span>
                </div>
                <div class="monthly-row">
                    <span>Expenses:</span>
                    <span class="expense-value">$${data.expense.toFixed(2)}</span>
                </div>
                <div class="monthly-row monthly-profit">
                    <span>Profit:</span>
                    <span class="profit-value" style="color: ${data.profit >= 0 ? '#4caf50' : '#dc3545'}">$${data.profit.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

export function exportExpenseReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const selectedYear = parseInt(document.getElementById('dashboardYear').value);
    const selectedPeriod = document.getElementById('dashboardPeriod').value;
    const expenses = getExpenses();

    const dateRange = getDateRange(selectedPeriod, selectedYear);

    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dateRange.start && expDate <= dateRange.end;
    });

    const periodLabel = selectedPeriod === 'ytd' ? 'Year to Date' : selectedPeriod === 'weekly' ? 'This Week' : 'Pay Period';
    const companyName = localStorage.getItem('companyName') || 'Your Company';

    doc.setFontSize(18);
    doc.text('Expense Report', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(companyName, 105, 30, { align: 'center' });
    doc.text(`Period: ${periodLabel} (${selectedYear})`, 105, 38, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 46, { align: 'center' });

    const labels = { ...categoryLabels };

    const breakdown = {};
    filteredExpenses.forEach(exp => {
        if (!breakdown[exp.category]) breakdown[exp.category] = { total: 0, items: [] };
        breakdown[exp.category].total += parseFloat(exp.amount);
        breakdown[exp.category].items.push(exp);
    });

    let y = 60;
    const lineHeight = 6;
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(14);
    doc.text('Expense Summary by Category', 20, y);
    y += 10;

    doc.setFontSize(10);
    Object.entries(breakdown).sort((a, b) => b[1].total - a[1].total).forEach(([category, data]) => {
        if (y > pageHeight - 20) { doc.addPage(); y = 20; }
        doc.text(`${labels[category]}: $${data.total.toFixed(2)}`, 25, y);
        y += lineHeight;
    });

    y += 10;

    doc.setFontSize(14);
    if (y > pageHeight - 20) { doc.addPage(); y = 20; }
    doc.text('Detailed Expenses', 20, y);
    y += 10;

    doc.setFontSize(9);
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => {
        if (y > pageHeight - 20) { doc.addPage(); y = 20; }
        const expDate = new Date(exp.date).toLocaleDateString();
        doc.text(`${expDate} - ${labels[exp.category]}`, 25, y);
        y += lineHeight;
        doc.text(`  ${exp.vendor} - $${exp.amount}`, 25, y);
        if (exp.notes) { y += lineHeight; doc.text(`  Notes: ${exp.notes}`, 25, y); }
        y += lineHeight + 2;
    });

    y += 5;
    if (y > pageHeight - 30) { doc.addPage(); y = 20; }
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Expenses: $${totalExpenses.toFixed(2)}`, 20, y);

    doc.save(`Expense_Report_${periodLabel.replace(/\s+/g, '_')}_${selectedYear}.pdf`);
    alert('Expense report exported successfully!');
}

export function exportProfitLossStatement() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const selectedYear = parseInt(document.getElementById('dashboardYear').value);
    const selectedPeriod = document.getElementById('dashboardPeriod').value;
    const invoices = getInvoiceHistory();
    const expenses = getExpenses();

    const dateRange = getDateRange(selectedPeriod, selectedYear);

    const filteredInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.timestamp);
        return invDate >= dateRange.start && invDate <= dateRange.end;
    });
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dateRange.start && expDate <= dateRange.end;
    });

    const periodLabel = selectedPeriod === 'ytd' ? 'Year to Date' : selectedPeriod === 'weekly' ? 'This Week' : 'Pay Period';
    const companyName = localStorage.getItem('companyName') || 'Your Company';
    const companyAddress = localStorage.getItem('companyAddress') || '';

    doc.setFontSize(18);
    doc.text('Profit & Loss Statement', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(companyName, 105, 30, { align: 'center' });
    if (companyAddress) { doc.setFontSize(10); doc.text(companyAddress, 105, 37, { align: 'center' }); }
    doc.setFontSize(11);
    doc.text(`Period: ${periodLabel} (${selectedYear})`, 105, 45, { align: 'center' });
    doc.text(`Date Range: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, 105, 52, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 59, { align: 'center' });

    let y = 75;
    const lineHeight = 7;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('INCOME', 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    const totalIncome = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    doc.text(`Freight Revenue (${filteredInvoices.length} invoices)`, 25, y);
    doc.text(`$${totalIncome.toFixed(2)}`, 180, y, { align: 'right' });
    y += 10;

    doc.setFont(undefined, 'bold');
    doc.text('Total Income:', 25, y);
    doc.text(`$${totalIncome.toFixed(2)}`, 180, y, { align: 'right' });
    y += 15;

    doc.setFontSize(14);
    doc.text('EXPENSES', 20, y);
    y += 10;

    const breakdown = {};
    filteredExpenses.forEach(exp => {
        if (!breakdown[exp.category]) breakdown[exp.category] = 0;
        breakdown[exp.category] += parseFloat(exp.amount);
    });

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    Object.entries(breakdown).sort((a, b) => b[1] - a[1]).forEach(([category, amount]) => {
        doc.text(categoryLabels[category], 25, y);
        doc.text(`$${amount.toFixed(2)}`, 180, y, { align: 'right' });
        y += lineHeight;
    });

    y += 5;
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    doc.setFont(undefined, 'bold');
    doc.text('Total Expenses:', 25, y);
    doc.text(`$${totalExpenses.toFixed(2)}`, 180, y, { align: 'right' });
    y += 15;

    const netProfit = totalIncome - totalExpenses;
    doc.setFontSize(14);
    doc.line(20, y - 5, 190, y - 5);
    y += 5;

    if (netProfit >= 0) {
        doc.setTextColor(0, 128, 0);
        doc.text('NET PROFIT:', 25, y);
        doc.text(`$${netProfit.toFixed(2)}`, 180, y, { align: 'right' });
    } else {
        doc.setTextColor(220, 53, 69);
        doc.text('NET LOSS:', 25, y);
        doc.text(`$${Math.abs(netProfit).toFixed(2)}`, 180, y, { align: 'right' });
    }

    doc.setTextColor(0, 0, 0);
    y += 15;

    doc.setFontSize(12);
    doc.text('Key Metrics:', 20, y);
    y += 10;

    doc.setFontSize(10);
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : '0.00';
    doc.text(`Profit Margin: ${profitMargin}%`, 25, y);
    y += lineHeight;

    const avgInvoice = filteredInvoices.length > 0 ? (totalIncome / filteredInvoices.length).toFixed(2) : '0.00';
    doc.text(`Average Invoice: $${avgInvoice}`, 25, y);
    y += lineHeight;

    const avgExpense = filteredExpenses.length > 0 ? (totalExpenses / filteredExpenses.length).toFixed(2) : '0.00';
    doc.text(`Average Expense: $${avgExpense}`, 25, y);

    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text('This statement is for informational purposes. Consult a tax professional for official filings.', 105, 280, { align: 'center' });

    doc.save(`Profit_Loss_Statement_${periodLabel.replace(/\s+/g, '_')}_${selectedYear}.pdf`);
    alert('Profit & Loss statement exported successfully!');
}

// Expose updateDashboard globally for Force Sync
window.updateDashboard = updateDashboard;
