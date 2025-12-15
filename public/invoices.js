import { getCompanyInfo, setCompanyInfo, getInvoiceHistory as getStoredInvoices, setInvoiceHistory as setStoredInvoices } from './state.js';
import { getAccessories } from './accessories.js';

// Date helpers
export function setTodayAsDefault() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    document.getElementById('dateDelivered').value = today;
}

// Company info
export function loadCompanyInfo() {
    const { companyName, companyAddress, carrierId, userEmail } = getCompanyInfo();

    if (companyName) document.getElementById('companyName').value = companyName;
    if (companyAddress) document.getElementById('companyAddress').value = companyAddress;
    if (carrierId) document.getElementById('carrierId').value = carrierId;
    if (userEmail) document.getElementById('userEmail').value = userEmail;
}

export function saveCompanyInfo() {
    const companyData = {
        companyName: document.getElementById('companyName').value,
        companyAddress: document.getElementById('companyAddress').value,
        carrierId: document.getElementById('carrierId').value,
        userEmail: document.getElementById('userEmail').value
    };

    setCompanyInfo(companyData);

    if (typeof saveCompanyInfoToCloud === 'function') {
        saveCompanyInfoToCloud(companyData);
    }
}

export function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// Invoice form wiring
export function setupInvoiceForm() {
    const invoiceForm = document.getElementById('invoiceForm');
    if (!invoiceForm) return;

    invoiceForm.addEventListener('submit', (e) => {
        e.preventDefault();

        saveCompanyInfo();

        const invoiceNumber = document.getElementById('invoiceNumber').value;
        const invoiceDate = formatDate(document.getElementById('invoiceDate').value);
        const customerName = document.getElementById('customerName').value;
        const dateDelivered = formatDate(document.getElementById('dateDelivered').value);
        const loadNumber = document.getElementById('loadNumber').value;
        const amount = parseFloat(document.getElementById('amount').value).toFixed(2);
        const companyName = document.getElementById('companyName').value;
        const companyAddress = document.getElementById('companyAddress').value;
        const carrierId = document.getElementById('carrierId').value;
        const userEmail = document.getElementById('userEmail').value;

        const productDescription = document.getElementById('productDescription').value.trim();
        const pieceCount = document.getElementById('pieceCount').value;
        const ratePerPiece = document.getElementById('ratePerPiece').value;

        const accessories = getAccessories();

        generateInvoicePDF({
            invoiceNumber,
            invoiceDate,
            customerName,
            dateDelivered,
            loadNumber,
            amount,
            companyName,
            companyAddress,
            carrierId,
            userEmail,
            productDescription,
            pieceCount,
            ratePerPiece,
            accessories
        });
    });
}

// Invoice generation
export function generateInvoicePDF(data) {
    generateInvoiceJPG(data);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 25;

    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, doc.internal.pageSize.getHeight() - 20);

    doc.setFontSize(14);
    doc.text('Invoice', pageWidth - margin, 25, { align: 'right' });

    doc.setFontSize(11);
    let y = 45;
    const lineHeight = 6;

    doc.text(`Invoice #: ${data.invoiceNumber}`, margin, y);
    y += lineHeight;

    doc.text('Invoice Date:', margin, y);
    y += lineHeight;
    doc.text(`__${data.invoiceDate}____________`, margin, y);
    y += lineHeight + 2;

    doc.text(`Customer's Name ____${data.customerName}`, margin, y);
    y += lineHeight;
    doc.text('_______________', margin, y);
    y += lineHeight + 2;

    doc.text('Date Delivered:', margin, y);
    y += lineHeight;
    doc.text(`__${data.dateDelivered}____________`, margin, y);
    y += lineHeight + 2;

    doc.text('Load Number:', margin, y);
    y += lineHeight;
    doc.text(`__${data.loadNumber}______________`, margin, y);
    y += lineHeight + 3;

    if (data.productDescription && data.productDescription.length > 0) {
        doc.text('Product Description:', margin, y);
        y += lineHeight;
        doc.text(`__${data.productDescription}`, margin, y);
        y += lineHeight;
        if (data.pieceCount && data.ratePerPiece) {
            doc.text(`(${data.pieceCount} pieces @ $${parseFloat(data.ratePerPiece).toFixed(2)}/piece)`, margin, y);
            y += lineHeight + 2;
        } else {
            y += 2;
        }
    }

    if (data.accessories && data.accessories.length > 0) {
        doc.text('Additional Charges:', margin, y);
        y += lineHeight;
        data.accessories.forEach(acc => {
            doc.text(`  - ${acc.description}: $${acc.amount}`, margin, y);
            y += lineHeight;
        });
        y += 2;
    }

    doc.text('Amount to be paid:', margin, y);
    y += lineHeight;
    doc.text(`${data.amount}______________ Your`, margin, y);
    y += lineHeight;

    doc.text(`Company Name: _${data.companyName}`, margin, y);
    y += lineHeight;
    doc.text('________________ Your Company', margin, y);
    y += lineHeight;

    doc.text('Address:', margin, y);
    y += lineHeight;
    doc.text(`_${data.companyAddress}`, margin, y);
    y += lineHeight;
    doc.text('_____________________________', margin, y);
    y += lineHeight;
    doc.text('_____________________________', margin, y);
    y += lineHeight + 8;

    doc.text(`Carrier ID: _${data.carrierId}______________`, margin, y);

    y += lineHeight + 4;
    doc.text('Notes:', margin, y);
    y += lineHeight;
    doc.text('_____________________________', margin, y);
    y += lineHeight;
    doc.text('_____________________________', margin, y);
    y += lineHeight;
    doc.text('_____________________________', margin, y);

    y += lineHeight + 6;
    doc.text('Signature: _____________________________', margin, y);

    const fileName = `Invoice_${data.invoiceNumber}_${data.loadNumber}`;
    doc.save(`${fileName}.pdf`);

    saveInvoiceToHistory(data);
}

export function generateInvoiceJPG(data) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1700;
    canvas.height = 2200;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    ctx.fillStyle = '#000';
    ctx.font = '32px Arial';

    ctx.textAlign = 'right';
    ctx.fillText('Invoice', canvas.width - 120, 80);

    ctx.textAlign = 'left';
    ctx.font = '28px Arial';

    let y = 140;
    const lineHeight = 40;

    ctx.fillText(`Invoice #: ${data.invoiceNumber}`, 95, y);
    y += lineHeight;

    ctx.fillText('Invoice Date:', 95, y);
    y += lineHeight;
    ctx.fillText(`__${data.invoiceDate}____________`, 95, y);
    y += lineHeight + 20;

    ctx.fillText("Customer's Name ____" + data.customerName, 95, y);
    y += lineHeight;
    ctx.fillText('_______________', 95, y);
    y += lineHeight + 20;

    ctx.fillText('Date Delivered:', 95, y);
    y += lineHeight;
    ctx.fillText(`__${data.dateDelivered}____________`, 95, y);
    y += lineHeight + 20;

    ctx.fillText('Load Number:', 95, y);
    y += lineHeight;
    ctx.fillText(`__${data.loadNumber}______________`, 95, y);
    y += lineHeight + 30;

    if (data.productDescription && data.productDescription.length > 0) {
        ctx.fillText('Product Description:', 95, y);
        y += lineHeight;
        ctx.fillText(`__${data.productDescription}`, 95, y);
        y += lineHeight;
        if (data.pieceCount && data.ratePerPiece) {
            ctx.fillText(`(${data.pieceCount} pieces @ $${parseFloat(data.ratePerPiece).toFixed(2)}/piece)`, 95, y);
            y += lineHeight + 10;
        } else {
            y += 10;
        }
    }

    if (data.accessories && data.accessories.length > 0) {
        ctx.fillText('Additional Charges:', 95, y);
        y += lineHeight;
        data.accessories.forEach(acc => {
            ctx.fillText(`  - ${acc.description}: $${acc.amount}`, 95, y);
            y += lineHeight;
        });
        y += 8;
    }

    ctx.fillText('Amount to be paid:', 95, y);
    y += lineHeight;
    ctx.fillText(`${data.amount}______________ Your`, 95, y);
    y += lineHeight;

    ctx.fillText(`Company Name: _${data.companyName}`, 95, y);
    y += lineHeight;
    ctx.fillText('________________ Your Company', 95, y);
    y += lineHeight;

    ctx.fillText('Address:', 95, y);
    y += lineHeight;
    ctx.fillText(`_${data.companyAddress}`, 95, y);
    y += lineHeight;
    ctx.fillText('_____________________________', 95, y);
    y += lineHeight;
    ctx.fillText('_____________________________', 95, y);
    y += lineHeight + 30;

    ctx.fillText(`Carrier ID: _${data.carrierId}______________`, 95, y);

    const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const jpgBase64 = jpgDataUrl.split(',')[1];
    const fileName = `Invoice_${data.invoiceNumber}_${data.loadNumber}`;

    const link = document.createElement('a');
    link.download = `${fileName}.jpg`;
    link.href = jpgDataUrl;
    link.click();

    sendImageToPhone(jpgBase64, `${fileName}.jpg`, data);
}

function sendImageToPhone(jpgBase64, fileName, data) {
    const templateParams = {
        to_email: data.userEmail,
        invoice_number: data.invoiceNumber,
        load_number: data.loadNumber,
        amount: data.amount,
        customer_name: data.customerName
    };

    emailjs.send('service_bhz3o5d', 'template_c0db69o', templateParams)
        .then(() => {
            alert('Invoice PDF and JPG generated and email notification sent to ' + data.userEmail + ' successfully!');
        })
        .catch((error) => {
            alert('Invoice files generated, but failed to send email notification. Error: ' + error.text);
        });
}

// History
export function saveInvoiceToHistory(data) {
    const invoices = getInvoiceHistory();
    const invoice = {
        ...data,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(),
        paymentStatus: 'unpaid'
    };
    invoices.unshift(invoice);
    setStoredInvoices(invoices);

    if (typeof saveInvoiceToCloud === 'function') {
        saveInvoiceToCloud(invoice);
    }
}

export function getInvoiceHistory() {
    return getStoredInvoices();
}

export function displayHistory(searchTerm = '') {
    const invoices = getInvoiceHistory();
    const historyList = document.getElementById('historyList');

    let filteredInvoices = invoices;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredInvoices = invoices.filter(inv =>
            inv.invoiceNumber.toLowerCase().includes(term) ||
            inv.loadNumber.toLowerCase().includes(term) ||
            inv.customerName.toLowerCase().includes(term)
        );
    }

    if (filteredInvoices.length === 0) {
        historyList.innerHTML = '<div class="no-history">No invoices found</div>';
        return;
    }

    checkOverdueInvoices(filteredInvoices);

    historyList.innerHTML = filteredInvoices.map(invoice => {
        const isPaid = invoice.paymentStatus === 'paid';
        const deliveredDate = new Date(invoice.dateDelivered);
        const daysSinceDelivery = Math.floor((new Date() - deliveredDate) / (1000 * 60 * 60 * 24));
        const isOverdue = !isPaid && daysSinceDelivery >= 30;

        return `
        <div class="history-item ${isOverdue ? 'overdue' : ''}">
            <div class="history-header">
                <div class="history-title">
                    <strong>Invoice #${invoice.invoiceNumber}</strong>
                    <span class="history-date">${new Date(invoice.timestamp).toLocaleDateString()}</span>
                    <span class="payment-status ${isPaid ? 'paid' : 'unpaid'}">
                        ${isPaid ? '✓ Paid' : 'Unpaid'}
                    </span>
                    ${isOverdue ? '<span class="overdue-badge">⚠ 30+ Days Overdue</span>' : ''}
                </div>
                <div class="history-amount">$${invoice.amount}</div>
            </div>
            <div class="history-details">
                <div><strong>Customer:</strong> ${invoice.customerName}</div>
                <div><strong>Load #:</strong> ${invoice.loadNumber}</div>
                <div><strong>Date Delivered:</strong> ${invoice.dateDelivered}</div>
                ${isOverdue ? `<div class="overdue-text"><strong>Days Overdue:</strong> ${daysSinceDelivery} days</div>` : ''}
            </div>
            <div class="history-actions">
                <label class="payment-checkbox">
                    <input type="checkbox" ${isPaid ? 'checked' : ''} onchange="togglePaymentStatus('${invoice.id}', this.checked)">
                    <span>Mark as Paid</span>
                </label>
                <button class="btn-regenerate" onclick="regenerateInvoice('${invoice.id}')">Regenerate PDF</button>
                <button class="btn-delete" onclick="deleteInvoice('${invoice.id}')">Delete</button>
            </div>
        </div>
    `;
    }).join('');
}

export function regenerateInvoice(id) {
    const invoices = getInvoiceHistory();
    const invoice = invoices.find(inv => inv.id === id);
    if (invoice) {
        generateInvoicePDF(invoice);
    }
}

export function deleteInvoice(id) {
    if (!confirm('Are you sure you want to delete this invoice from history?')) return;
    let invoices = getInvoiceHistory();
    invoices = invoices.filter(inv => inv.id !== id);
    setStoredInvoices(invoices);
    displayHistory();

    if (typeof deleteInvoiceFromCloud === 'function') {
        deleteInvoiceFromCloud(id);
    }
}

export function togglePaymentStatus(id, isPaid) {
    const invoices = getInvoiceHistory();
    const invoice = invoices.find(inv => inv.id === id);
    if (invoice) {
        invoice.paymentStatus = isPaid ? 'paid' : 'unpaid';
        setStoredInvoices(invoices);
        displayHistory();

        if (typeof saveInvoiceToCloud === 'function') {
            saveInvoiceToCloud(invoice);
        }

        const message = isPaid
            ? `Invoice #${invoice.invoiceNumber} marked as PAID ✓`
            : `Invoice #${invoice.invoiceNumber} marked as UNPAID`;
        showPaymentToast(message, isPaid);
    }
}

export function checkOverdueInvoices(invoices) {
    const overdueInvoices = invoices.filter(invoice => {
        if (invoice.paymentStatus === 'paid') return false;

        const deliveredDate = new Date(invoice.dateDelivered);
        const daysSinceDelivery = Math.floor((new Date() - deliveredDate) / (1000 * 60 * 60 * 24));
        return daysSinceDelivery >= 30;
    });

    if (overdueInvoices.length > 0) {
        showOverdueAlert(overdueInvoices);
    } else {
        const existingAlert = document.querySelector('.overdue-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
    }
}

export function showOverdueAlert(overdueInvoices) {
    const existingAlert = document.querySelector('.overdue-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const historyView = document.getElementById('historyView');
    const alertDiv = document.createElement('div');
    alertDiv.className = 'overdue-alert';

    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    alertDiv.innerHTML = `
        <div class="alert-content">
            <span class="alert-icon">⚠</span>
            <div class="alert-message">
                <strong>Payment Alert:</strong> You have ${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? 's' : ''}
                that ${overdueInvoices.length > 1 ? 'are' : 'is'} 30+ days past due (Total: $${totalOverdue.toFixed(2)})
            </div>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="overdue-list">
            ${overdueInvoices.map(inv => {
                const deliveredDate = new Date(inv.dateDelivered);
                const days = Math.floor((new Date() - deliveredDate) / (1000 * 60 * 60 * 24));
                return `<div class="overdue-item">Invoice #${inv.invoiceNumber} - ${inv.customerName} - $${inv.amount} (${days} days overdue)</div>`;
            }).join('')}
        </div>
    `;

    historyView.insertBefore(alertDiv, historyView.firstChild);
}

export function showPaymentToast(message, isPaid) {
    const toast = document.createElement('div');
    toast.className = `payment-toast ${isPaid ? 'success' : 'info'}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Quick fill for repeat customers
export function setupQuickFill() {
    const customerSelect = document.getElementById('customerQuickFill');
    if (!customerSelect) return;

    populateCustomerList();

    customerSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            const customerData = JSON.parse(e.target.value);
            document.getElementById('customerName').value = customerData.customerName;

            setTimeout(() => {
                e.target.value = '';
            }, 100);
        }
    });
}

export function populateCustomerList() {
    const invoices = getInvoiceHistory();
    const customerSelect = document.getElementById('customerQuickFill');
    if (!customerSelect) return;

    const customerMap = new Map();
    invoices.forEach(inv => {
        const key = inv.customerName.toLowerCase();
        if (!customerMap.has(key)) {
            customerMap.set(key, {
                customerName: inv.customerName,
                count: 1,
                lastUsed: new Date(inv.timestamp)
            });
        } else {
            const existing = customerMap.get(key);
            existing.count++;
            const invDate = new Date(inv.timestamp);
            if (invDate > existing.lastUsed) {
                existing.lastUsed = invDate;
            }
        }
    });

    const customers = Array.from(customerMap.values())
        .sort((a, b) => b.lastUsed - a.lastUsed);

    customerSelect.innerHTML = '<option value="">Quick Fill...</option>';

    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = JSON.stringify(customer);
        option.textContent = `${customer.customerName} (${customer.count} invoice${customer.count > 1 ? 's' : ''})`;
        customerSelect.appendChild(option);
    });
}
