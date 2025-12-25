// Initialize EmailJS
emailjs.init('flEWLVoiJ1uMBZgnW');

// Import category labels from expenses module
import('./expenses.js').then(module => {
    window.categoryLabels = module.categoryLabels;
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch((error) => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// Load saved company info on page load
window.addEventListener('DOMContentLoaded', () => {
    loadCompanyInfo();
    setTodayAsDefault();
    setupNavigation();
    setupReceiptUpload();
    setupQuickFill();
    setupCalculator();
    setupExpenses();
    setupDashboard();
    setupAccessories();
    setupTipJar();
    // Populate all truck dropdowns app-wide
    populateTruckDropdowns();
});

// Set today's date as default
function setTodayAsDefault() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    document.getElementById('dateDelivered').value = today;
}

// Load company info from localStorage
function loadCompanyInfo() {
    const companyName = localStorage.getItem('companyName');
    const companyAddress = localStorage.getItem('companyAddress');
    const carrierId = localStorage.getItem('carrierId');
    const userEmail = localStorage.getItem('userEmail');

    if (companyName) document.getElementById('companyName').value = companyName;
    if (companyAddress) document.getElementById('companyAddress').value = companyAddress;
    if (carrierId) document.getElementById('carrierId').value = carrierId;
    if (userEmail) document.getElementById('userEmail').value = userEmail;
}

// Save company info to localStorage and cloud
function saveCompanyInfo() {
    const companyData = {
        companyName: document.getElementById('companyName').value,
        companyAddress: document.getElementById('companyAddress').value,
        carrierId: document.getElementById('carrierId').value,
        userEmail: document.getElementById('userEmail').value
    };

    // Save to localStorage
    localStorage.setItem('companyName', companyData.companyName);
    localStorage.setItem('companyAddress', companyData.companyAddress);
    localStorage.setItem('carrierId', companyData.carrierId);
    localStorage.setItem('userEmail', companyData.userEmail);

    // Sync to cloud if enabled
    if (typeof saveCompanyInfoToCloud === 'function') {
        saveCompanyInfoToCloud(companyData);
    }
}

// Format date from YYYY-MM-DD to MM/DD/YYYY
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

// Handle form submission
document.getElementById('invoiceForm').addEventListener('submit', (e) => {
    e.preventDefault();

    // Save company info
    saveCompanyInfo();

    // Get form values
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

    // Get product information if available
    const productDescription = document.getElementById('productDescription').value.trim();
    const pieceCount = document.getElementById('pieceCount').value;
    const ratePerPiece = document.getElementById('ratePerPiece').value;

    // Get accessories/additional charges
    const accessories = getAccessories();

    // Generate PDF
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

function generateInvoicePDF(data) {
    // First, generate the JPG image
    generateInvoiceJPG(data);

    // Then, generate the PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25;

    // Add border
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Title "Invoice" - top right
    doc.setFontSize(14);
    doc.text('Invoice', pageWidth - margin, 25, { align: 'right' });

    // Main content - left aligned
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

    // Add product description if available
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

    // Add accessories/additional charges if available
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

    // Carrier ID
    doc.text(`Carrier ID: _${data.carrierId}______________`, margin, y);

    const fileName = `Invoice_${data.invoiceNumber}_${data.loadNumber}`;

    // Save PDF locally
    doc.save(`${fileName}.pdf`);

    // Save invoice to history
    saveInvoiceToHistory(data);
}

function generateInvoiceJPG(data) {
    // Create a canvas to draw the invoice
    const canvas = document.createElement('canvas');
    canvas.width = 816;  // 8.5 inches at 96 DPI
    canvas.height = 1056; // 11 inches at 96 DPI
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(38, 38, canvas.width - 76, canvas.height - 76);

    // Set up text styling
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';

    // Title "Invoice" - top right
    ctx.textAlign = 'right';
    ctx.fillText('Invoice', canvas.width - 95, 95);

    // Main content - left aligned
    ctx.textAlign = 'left';
    ctx.font = '18px Arial';
    let y = 170;
    const lineHeight = 23;

    ctx.fillText(`Invoice #: ${data.invoiceNumber}`, 95, y);
    y += lineHeight;
    y += 5;

    ctx.fillText('Invoice Date:', 95, y);
    y += lineHeight;
    ctx.fillText(`__${data.invoiceDate}____________`, 95, y);
    y += lineHeight + 8;

    ctx.fillText(`Customer's Name ____${data.customerName}`, 95, y);
    y += lineHeight;
    ctx.fillText('_______________', 95, y);
    y += lineHeight + 8;

    ctx.fillText('Date Delivered:', 95, y);
    y += lineHeight;
    ctx.fillText(`__${data.dateDelivered}____________`, 95, y);
    y += lineHeight + 8;

    ctx.fillText('Load Number:', 95, y);
    y += lineHeight;
    ctx.fillText(`__${data.loadNumber}______________`, 95, y);
    y += lineHeight + 12;

    // Add product description if available
    if (data.productDescription && data.productDescription.length > 0) {
        ctx.fillText('Product Description:', 95, y);
        y += lineHeight;
        ctx.fillText(`__${data.productDescription}`, 95, y);
        y += lineHeight;
        if (data.pieceCount && data.ratePerPiece) {
            ctx.fillText(`(${data.pieceCount} pieces @ $${parseFloat(data.ratePerPiece).toFixed(2)}/piece)`, 95, y);
            y += lineHeight + 8;
        } else {
            y += 8;
        }
    }

    // Add accessories/additional charges if available
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

    // Carrier ID
    ctx.fillText(`Carrier ID: _${data.carrierId}______________`, 95, y);

    // Convert canvas to JPG
    const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const jpgBase64 = jpgDataUrl.split(',')[1];

    const fileName = `Invoice_${data.invoiceNumber}_${data.loadNumber}`;

    // Download JPG
    const link = document.createElement('a');
    link.download = `${fileName}.jpg`;
    link.href = jpgDataUrl;
    link.click();

    // Send JPG via email (without attachment since EmailJS free doesn't support it)
    sendImageToPhone(jpgBase64, `${fileName}.jpg`, data);
}

function sendImageToPhone(jpgBase64, fileName, data) {
    console.log('Starting email send process...');

    const templateParams = {
        to_email: data.userEmail,
        invoice_number: data.invoiceNumber,
        load_number: data.loadNumber,
        amount: data.amount,
        customer_name: data.customerName
    };

    console.log('Template params prepared:', templateParams);

    emailjs.send('service_bhz3o5d', 'template_c0db69o', templateParams)
        .then((response) => {
            console.log('Email sent successfully:', response.status, response.text);
            alert('Invoice PDF and JPG generated and email notification sent to ' + data.userEmail + ' successfully!');
        })
        .catch((error) => {
            console.error('Email send failed:', error);
            alert('Invoice files generated, but failed to send email notification. Error: ' + error.text);
        });
}

// Invoice History Functions
function saveInvoiceToHistory(data) {
    const invoices = getInvoiceHistory();
    const invoice = {
        ...data,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(),
        paymentStatus: 'unpaid' // Default to unpaid
    };
    invoices.unshift(invoice); // Add to beginning
    localStorage.setItem('invoiceHistory', JSON.stringify(invoices));

    // Sync to cloud if enabled
    if (typeof saveInvoiceToCloud === 'function') {
        saveInvoiceToCloud(invoice);
    }
}

function getInvoiceHistory() {
    const history = localStorage.getItem('invoiceHistory');
    return history ? JSON.parse(history) : [];
}

function setupNavigation() {
    const newInvoiceBtn = document.getElementById('newInvoiceBtn');
    const receiptUploadBtn = document.getElementById('receiptUploadBtn');
    const historyBtn = document.getElementById('historyBtn');
    const expensesBtn = document.getElementById('expensesBtn');
    const toolsBtn = document.getElementById('toolsBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');

    const invoiceFormView = document.getElementById('invoiceFormView');
    const receiptUploadView = document.getElementById('receiptUploadView');
    const historyView = document.getElementById('historyView');
    const expensesView = document.getElementById('expensesView');
    const toolsView = document.getElementById('toolsView');
    const dashboardView = document.getElementById('dashboardView');

    const searchInput = document.getElementById('searchHistory');
    const navDropdown = document.getElementById('navDropdown');

    const allButtons = [newInvoiceBtn, receiptUploadBtn, historyBtn, expensesBtn, toolsBtn, dashboardBtn];
    const allViews = [invoiceFormView, receiptUploadView, historyView, expensesView, toolsView, dashboardView];

    function switchView(activeView, activeBtn) {
        console.log('Switching to view:', activeView.id);
        allViews.forEach(view => {
            view.classList.remove('active');
            view.style.display = 'none';
        });
        allButtons.forEach(btn => btn.classList.remove('active'));
        activeView.classList.add('active');
        activeView.style.display = 'block';
        activeBtn.classList.add('active');
    }

    // Handle dropdown navigation
    if (navDropdown) {
        navDropdown.addEventListener('change', (e) => {
            const value = e.target.value;
            switch (value) {
                case 'invoice':
                    switchView(invoiceFormView, newInvoiceBtn);
                    populateCustomerList();
                    break;
                case 'receipt':
                    switchView(receiptUploadView, receiptUploadBtn);
                    break;
                case 'history':
                    switchView(historyView, historyBtn);
                    displayHistory();
                    break;
                case 'expenses':
                    switchView(expensesView, expensesBtn);
                    displayExpenses();
                    break;
                case 'tools':
                    switchView(toolsView, toolsBtn);
                    setupDriverTools();
                    break;
                case 'dashboard':
                    switchView(dashboardView, dashboardBtn);
                    updateDashboard();
                    break;
            }
        });
    }

    newInvoiceBtn.addEventListener('click', () => {
        switchView(invoiceFormView, newInvoiceBtn);
        populateCustomerList();
        if (navDropdown) navDropdown.value = 'invoice';
    });

    receiptUploadBtn.addEventListener('click', () => {
        switchView(receiptUploadView, receiptUploadBtn);
        if (navDropdown) navDropdown.value = 'receipt';
    });

    historyBtn.addEventListener('click', () => {
        switchView(historyView, historyBtn);
        displayHistory();
        if (navDropdown) navDropdown.value = 'history';
    });

    expensesBtn.addEventListener('click', () => {
        switchView(expensesView, expensesBtn);
        displayExpenses();
        if (navDropdown) navDropdown.value = 'expenses';
    });

    toolsBtn.addEventListener('click', () => {
        switchView(toolsView, toolsBtn);
        setupDriverTools();
        if (navDropdown) navDropdown.value = 'tools';
    });

    dashboardBtn.addEventListener('click', () => {
        switchView(dashboardView, dashboardBtn);
        updateDashboard();
        if (navDropdown) navDropdown.value = 'dashboard';
    });

    searchInput.addEventListener('input', (e) => {
        displayHistory(e.target.value);
    });

    // Event delegation for history list actions
    document.getElementById('historyList').addEventListener('click', (e) => {
        const target = e.target;
        const id = target.dataset.id;

        if (target.dataset.action === 'regenerate' && id) {
            regenerateInvoice(id);
        } else if (target.dataset.action === 'delete' && id) {
            deleteInvoice(id);
        }
    });

    document.getElementById('historyList').addEventListener('change', (e) => {
        if (e.target.classList.contains('payment-toggle')) {
            const id = e.target.dataset.id;
            const isChecked = e.target.checked;
            console.log('Payment toggle clicked:', id, isChecked);
            togglePaymentStatus(id, isChecked);
        }
    });
}

function displayHistory(searchTerm = '') {
    if (window.skipDisplayHistory) {
        console.log('Skipping displayHistory - payment update in progress');
        return;
    }

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

    // Separate invoices by payment status
    const unpaidInvoices = filteredInvoices.filter(inv => inv.paymentStatus !== 'paid');
    const paidInvoices = filteredInvoices.filter(inv => inv.paymentStatus === 'paid');

    // Calculate totals
    const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
    const paidTotal = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

    let html = '<div class="invoice-status-accordion">';

    // Unpaid invoices section (expanded by default)
    html += `
        <div class="invoice-status-group">
            <button type="button" class="status-header unpaid-header" data-status="unpaid" aria-expanded="true">
                <span class="status-icon">&#128308;</span>
                <span class="status-name">Unpaid Invoices</span>
                <span class="status-count">${unpaidInvoices.length} invoice${unpaidInvoices.length !== 1 ? 's' : ''}</span>
                <span class="status-total">$${unpaidTotal.toFixed(2)}</span>
                <span class="status-chevron">&#9650;</span>
            </button>
            <div class="status-invoices-list expanded" data-status-list="unpaid">
                ${unpaidInvoices.length > 0 ? renderInvoiceItems(unpaidInvoices) : '<div class="no-items">No unpaid invoices</div>'}
            </div>
        </div>
    `;

    // Paid invoices section (collapsed by default)
    html += `
        <div class="invoice-status-group">
            <button type="button" class="status-header paid-header" data-status="paid" aria-expanded="false">
                <span class="status-icon">&#9989;</span>
                <span class="status-name">Paid Invoices</span>
                <span class="status-count">${paidInvoices.length} invoice${paidInvoices.length !== 1 ? 's' : ''}</span>
                <span class="status-total">$${paidTotal.toFixed(2)}</span>
                <span class="status-chevron">&#9660;</span>
            </button>
            <div class="status-invoices-list" data-status-list="paid">
                ${paidInvoices.length > 0 ? renderInvoiceItems(paidInvoices) : '<div class="no-items">No paid invoices</div>'}
            </div>
        </div>
    `;

    html += '</div>';
    historyList.innerHTML = html;

    // Add click handlers for accordion headers
    document.querySelectorAll('.status-header').forEach(header => {
        header.addEventListener('click', toggleStatusAccordion);
    });
}

// Toggle invoice status accordion open/closed
function toggleStatusAccordion(event) {
    const header = event.currentTarget;
    const status = header.dataset.status;
    const list = document.querySelector(`[data-status-list="${status}"]`);
    const isExpanded = header.getAttribute('aria-expanded') === 'true';

    // Toggle this section
    header.setAttribute('aria-expanded', !isExpanded);
    list.classList.toggle('expanded', !isExpanded);

    // Update chevron
    const chevron = header.querySelector('.status-chevron');
    chevron.innerHTML = isExpanded ? '&#9660;' : '&#9650;';
}

// Render individual invoice items
function renderInvoiceItems(invoices) {
    return invoices.map(invoice => {
        const isPaid = invoice.paymentStatus === 'paid';
        const deliveredDate = new Date(invoice.dateDelivered);
        const daysSinceDelivery = Math.floor((new Date() - deliveredDate) / (1000 * 60 * 60 * 24));
        const isOverdue = !isPaid && daysSinceDelivery >= 30;

        return `
        <div class="history-item ${isOverdue ? 'overdue' : ''}" data-invoice-id="${invoice.id}">
            <div class="history-header">
                <div class="history-title">
                    <strong>Invoice #${invoice.invoiceNumber}</strong>
                    <span class="history-date">${new Date(invoice.timestamp).toLocaleDateString()}</span>
                    ${isOverdue ? '<span class="overdue-badge">&#9888; 30+ Days Overdue</span>' : ''}
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
                    <input type="checkbox" class="payment-toggle" data-id="${invoice.id}" ${isPaid ? 'checked' : ''}>
                    <span>${isPaid ? 'Paid' : 'Mark as Paid'}</span>
                </label>
                <button class="btn-regenerate" data-action="regenerate" data-id="${invoice.id}">Regenerate PDF</button>
                <button class="btn-delete" data-action="delete" data-id="${invoice.id}">Delete</button>
            </div>
        </div>
    `;
    }).join('');
}

function regenerateInvoice(id) {
    const invoices = getInvoiceHistory();
    const invoice = invoices.find(inv => inv.id === id);
    if (invoice) {
        generateInvoicePDF(invoice);
    }
}

function deleteInvoice(id) {
    if (confirm('Are you sure you want to delete this invoice from history?')) {
        let invoices = getInvoiceHistory();
        invoices = invoices.filter(inv => inv.id !== id);
        localStorage.setItem('invoiceHistory', JSON.stringify(invoices));
        displayHistory();

        // Delete from cloud if enabled
        if (typeof deleteInvoiceFromCloud === 'function') {
            deleteInvoiceFromCloud(id);
        }
    }
}

function togglePaymentStatus(id, isPaid) {
    let invoices = getInvoiceHistory();
    const invoice = invoices.find(inv => inv.id === id);
    if (invoice) {
        invoice.paymentStatus = isPaid ? 'paid' : 'unpaid';
        localStorage.setItem('invoiceHistory', JSON.stringify(invoices));
        displayHistory();

        // Sync to cloud if enabled
        if (typeof saveInvoiceToCloud === 'function') {
            saveInvoiceToCloud(invoice);
        }

        // Show confirmation message
        const message = isPaid
            ? `Invoice #${invoice.invoiceNumber} marked as PAID ✔`
            : `Invoice #${invoice.invoiceNumber} marked as UNPAID`;
        showPaymentToast(message, isPaid);
    }
}

function checkOverdueInvoices(invoices) {
    const overdueInvoices = invoices.filter(invoice => {
        if (invoice.paymentStatus === 'paid') return false;

        const deliveredDate = new Date(invoice.dateDelivered);
        const daysSinceDelivery = Math.floor((new Date() - deliveredDate) / (1000 * 60 * 60 * 24));
        return daysSinceDelivery >= 30;
    });

    if (overdueInvoices.length > 0) {
        // Show alert at top of page
        showOverdueAlert(overdueInvoices);
    } else {
        // Remove alert if no overdue invoices
        const existingAlert = document.querySelector('.overdue-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
    }
}

function showOverdueAlert(overdueInvoices) {
    // Remove existing alert if present
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
            <span class="alert-icon">ΓÜá</span>
            <div class="alert-message">
                <strong>Payment Alert:</strong> You have ${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? 's' : ''}
                that ${overdueInvoices.length > 1 ? 'are' : 'is'} 30+ days past due (Total: $${totalOverdue.toFixed(2)})
            </div>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">├ù</button>
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

function showPaymentToast(message, isPaid) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `payment-toast ${isPaid ? 'success' : 'info'}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Hide and remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Quick Fill for Repeat Customers
function setupQuickFill() {
    const customerSelect = document.getElementById('customerQuickFill');
    populateCustomerList();

    customerSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            const customerData = JSON.parse(e.target.value);
            document.getElementById('customerName').value = customerData.customerName;

            // Reset select after use
            setTimeout(() => {
                e.target.value = '';
            }, 100);
        }
    });
}

function populateCustomerList() {
    const invoices = getInvoiceHistory();
    const customerSelect = document.getElementById('customerQuickFill');

    // Get unique customers
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

    // Sort by most recent first
    const customers = Array.from(customerMap.values())
        .sort((a, b) => b.lastUsed - a.lastUsed);

    // Clear existing options except first
    customerSelect.innerHTML = '<option value="">Quick Fill...</option>';

    // Add customer options
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = JSON.stringify(customer);
        option.textContent = `${customer.customerName} (${customer.count} invoice${customer.count > 1 ? 's' : ''})`;
        customerSelect.appendChild(option);
    });
}

// Calculator Setup (Miles/Rate and Product Count)
function setupCalculator() {
    // Calculator tab switching
    const calcTabs = document.querySelectorAll('.calc-tab');
    const milesCalculator = document.getElementById('milesCalculator');
    const productCalculator = document.getElementById('productCalculator');

    calcTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            calcTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding calculator
            const calcType = tab.dataset.calc;
            if (calcType === 'miles') {
                milesCalculator.classList.add('active');
                productCalculator.classList.remove('active');
            } else {
                productCalculator.classList.add('active');
                milesCalculator.classList.remove('active');
            }
        });
    });

    // Miles Calculator
    const milesInput = document.getElementById('miles');
    const rateInput = document.getElementById('ratePerMile');
    const useCalculatedBtn = document.getElementById('useCalculated');
    const calcValueSpan = document.querySelector('#calculatedAmount .calc-value');

    function updateMilesCalculation() {
        const miles = parseFloat(milesInput.value) || 0;
        const rate = parseFloat(rateInput.value) || 0;
        const total = miles * rate;

        if (total > 0) {
            calcValueSpan.textContent = `$${total.toFixed(2)}`;
            useCalculatedBtn.disabled = false;
        } else {
            calcValueSpan.textContent = '$0.00';
            useCalculatedBtn.disabled = true;
        }
    }

    milesInput.addEventListener('input', updateMilesCalculation);
    rateInput.addEventListener('input', updateMilesCalculation);

    useCalculatedBtn.addEventListener('click', () => {
        const calcValue = calcValueSpan.textContent.replace('$', '');
        document.getElementById('amount').value = calcValue;
        visualFeedback();
    });

    // Product Calculator
    const pieceCountInput = document.getElementById('pieceCount');
    const ratePerPieceInput = document.getElementById('ratePerPiece');
    const productDescInput = document.getElementById('productDescription');
    const useCalculatedProductBtn = document.getElementById('useCalculatedProduct');
    const calcProductValueSpan = document.querySelector('#calculatedProductAmount .calc-value');

    function updateProductCalculation() {
        const pieces = parseFloat(pieceCountInput.value) || 0;
        const rate = parseFloat(ratePerPieceInput.value) || 0;
        const total = pieces * rate;

        if (total > 0) {
            calcProductValueSpan.textContent = `$${total.toFixed(2)}`;
            useCalculatedProductBtn.disabled = false;
        } else {
            calcProductValueSpan.textContent = '$0.00';
            useCalculatedProductBtn.disabled = true;
        }
    }

    pieceCountInput.addEventListener('input', updateProductCalculation);
    ratePerPieceInput.addEventListener('input', updateProductCalculation);

    useCalculatedProductBtn.addEventListener('click', () => {
        const calcValue = calcProductValueSpan.textContent.replace('$', '');
        document.getElementById('amount').value = calcValue;
        visualFeedback();
    });

    function visualFeedback() {
        const amountInput = document.getElementById('amount');
        amountInput.style.background = '#e8f5e9';
        setTimeout(() => {
            amountInput.style.background = '';
        }, 1000);
    }
}

// Expense Tracking Functions
function setupExpenses() {
    const expenseForm = document.getElementById('expenseForm');
    const expenseDate = document.getElementById('expenseDate');
    const searchExpenses = document.getElementById('searchExpenses');

    // Set today's date as default for expenses
    expenseDate.value = new Date().toISOString().split('T')[0];

    expenseForm.addEventListener('submit', (e) => {
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

function saveExpense(expense) {
    const expenses = getExpenses();
    expenses.unshift(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));

    // Sync to cloud if enabled
    if (typeof saveExpenseToCloud === 'function') {
        saveExpenseToCloud(expense);
    }
}

function getExpenses() {
    const expenses = localStorage.getItem('expenses');
    return expenses ? JSON.parse(expenses) : [];
}

function displayExpenses(searchTerm = '') {
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
                <div class="expense-item-date">${formatExpenseDate(expense.date)}</div>
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

// Helper function to format expense date
function formatExpenseDate(dateString) {
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
    deleteExpense(id);
}

// Handle edit expense
function handleEditExpense(event) {
    const id = event.currentTarget.dataset.id;
    const expenses = getExpenses();
    const expense = expenses.find(exp => exp.id === id);
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

function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        let expenses = getExpenses();
        expenses = expenses.filter(exp => exp.id !== id);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        displayExpenses();
        updateDashboard();

        // Delete from cloud if enabled
        if (typeof deleteExpenseFromCloud === 'function') {
            deleteExpenseFromCloud(id);
        }
    }
}

// Dashboard Functions
function setupDashboard() {
    const yearSelect = document.getElementById('dashboardYear');
    const periodSelect = document.getElementById('dashboardPeriod');
    const exportExpenseBtn = document.getElementById('exportExpenseReport');
    const exportPLBtn = document.getElementById('exportProfitLoss');

    // Populate year selector
    populateYearSelector();

    yearSelect.addEventListener('change', () => {
        updateDashboard();
    });

    periodSelect.addEventListener('change', () => {
        updateDashboard();
    });

    exportExpenseBtn.addEventListener('click', () => {
        exportExpenseReport();
    });

    exportPLBtn.addEventListener('click', () => {
        exportProfitLossStatement();
    });

    updateDashboard();
}

function populateYearSelector() {
    const yearSelect = document.getElementById('dashboardYear');
    const currentYear = new Date().getFullYear();
    const invoices = getInvoiceHistory();
    const expenses = getExpenses();

    // Get all unique years from invoices and expenses
    const years = new Set([currentYear]);

    invoices.forEach(inv => {
        const year = new Date(inv.timestamp).getFullYear();
        years.add(year);
    });

    expenses.forEach(exp => {
        const year = new Date(exp.date).getFullYear();
        years.add(year);
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);

    yearSelect.innerHTML = sortedYears.map(year =>
        `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
    ).join('');
}

function updateDashboard() {
    const selectedYear = parseInt(document.getElementById('dashboardYear').value);
    const selectedPeriod = document.getElementById('dashboardPeriod').value;
    const invoices = getInvoiceHistory();
    const expenses = getExpenses();

    // Get date range based on period
    const dateRange = getDateRange(selectedPeriod, selectedYear);

    // Filter by selected period
    const filteredInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.timestamp);
        return invDate >= dateRange.start && invDate <= dateRange.end;
    });
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dateRange.start && expDate <= dateRange.end;
    });

    // Calculate totals
    const totalIncome = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const netProfit = totalIncome - totalExpenses;

    // Update dashboard cards with period label
    const periodLabel = selectedPeriod === 'ytd' ? 'YTD' : selectedPeriod === 'weekly' ? 'This Week' : 'Pay Period';
    document.querySelector('.income-card .card-label').textContent = `Total Income (${periodLabel})`;
    document.querySelector('.expense-card .card-label').textContent = `Total Expenses (${periodLabel})`;
    document.querySelector('.profit-card .card-label').textContent = `Net Profit (${periodLabel})`;

    document.getElementById('ytdIncome').textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById('ytdExpenses').textContent = `$${totalExpenses.toFixed(2)}`;
    document.getElementById('ytdProfit').textContent = `$${netProfit.toFixed(2)}`;

    // Update profit card color
    const profitCard = document.querySelector('.profit-card .card-value');
    profitCard.style.color = netProfit >= 0 ? '#4caf50' : '#dc3545';

    // Display expense breakdown
    displayExpenseBreakdown(filteredExpenses);

    // Display monthly summary
    displayMonthlySummary(filteredInvoices, filteredExpenses, selectedYear);
}

function getDateRange(period, year) {
    const now = new Date();
    let start, end;

    switch (period) {
        case 'weekly':
            // Get current week (Monday to Sunday)
            const dayOfWeek = now.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            start = new Date(now);
            start.setDate(now.getDate() + mondayOffset);
            start.setHours(0, 0, 0, 0);

            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;

        case 'pay-period':
            // Pay period is every 2 weeks, starting from a reference date
            // Using January 1st of current year as reference
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

        case 'ytd':
        default:
            // Year to date
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31, 23, 59, 59, 999);
            break;
    }

    return { start, end };
}

function displayExpenseBreakdown(expenses) {
    const breakdownDiv = document.getElementById('expenseBreakdown');

    // Use imported category labels
    const categoryLabels = window.categoryLabels || {
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

    // Group by category
    const breakdown = {};
    expenses.forEach(exp => {
        if (!breakdown[exp.category]) {
            breakdown[exp.category] = 0;
        }
        breakdown[exp.category] += parseFloat(exp.amount);
    });

    if (Object.keys(breakdown).length === 0) {
        breakdownDiv.innerHTML = '<div class="no-data">No expense data available</div>';
        return;
    }

    // Sort by amount descending
    const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

    breakdownDiv.innerHTML = sorted.map(([category, amount]) => `
        <div class="breakdown-item">
            <div class="breakdown-category">${categoryLabels[category]}</div>
            <div class="breakdown-amount">$${amount.toFixed(2)}</div>
        </div>
    `).join('');
}

function displayMonthlySummary(invoices, expenses, year) {
    const summaryDiv = document.getElementById('monthlySummary');

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, index) => {
        const monthInvoices = invoices.filter(inv => {
            const date = new Date(inv.timestamp);
            return date.getMonth() === index;
        });
        const monthExpenses = expenses.filter(exp => {
            const date = new Date(exp.date);
            return date.getMonth() === index;
        });

        const income = monthInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        const expense = monthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const profit = income - expense;

        return { month, income, expense, profit };
    });

    // Only show months with data
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

// ===== Accessories/Additional Charges Functions =====

let accessoryCounter = 0;

function setupAccessories() {
    const addAccessoryBtn = document.getElementById('addAccessoryBtn');
    addAccessoryBtn.addEventListener('click', addAccessoryField);
}

function addAccessoryField() {
    const container = document.getElementById('accessoriesContainer');
    const accessoryId = `accessory-${accessoryCounter++}`;

    const accessoryDiv = document.createElement('div');
    accessoryDiv.className = 'accessory-item';
    accessoryDiv.id = accessoryId;

    accessoryDiv.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Description:</label>
                <input type="text" class="accessory-description" placeholder="e.g., Detention, Lumper Fee, Extra Stop" required>
            </div>
            <div class="form-group">
                <label>Amount ($):</label>
                <input type="number" step="0.01" class="accessory-amount" placeholder="50.00" required>
            </div>
            <button type="button" class="btn-remove-accessory" onclick="removeAccessory('${accessoryId}')">Remove</button>
        </div>
    `;

    container.appendChild(accessoryDiv);
}

function removeAccessory(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

function getAccessories() {
    const accessories = [];
    const items = document.querySelectorAll('.accessory-item');

    items.forEach(item => {
        const description = item.querySelector('.accessory-description').value;
        const amount = item.querySelector('.accessory-amount').value;

        if (description && amount) {
            accessories.push({
                description: description,
                amount: parseFloat(amount).toFixed(2)
            });
        }
    });

    return accessories;
}

// ===== PHASE 2: Receipt Upload and OCR Functions =====

// Initialize receipt uploader
function setupReceiptUpload() {
    // Initialize IndexedDB for local receipt photo storage
    initReceiptDB();

    const receiptInput = document.getElementById('receiptImage');
    const receiptForm = document.getElementById('receiptForm');
    const previewImage = document.getElementById('previewImage');
    const receiptPreview = document.getElementById('receiptPreview');
    const fileInputLabel = document.querySelector('.file-input-label');

    // Set default date to today
    const dateInput = document.getElementById('receiptDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Make the file input label clickable and enable camera on mobile
    if (fileInputLabel) {
        fileInputLabel.addEventListener('click', () => {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
                receiptInput.setAttribute('capture', 'environment');
            }
            receiptInput.click();
        });
    }

    // Handle file selection and preview
    if (receiptInput) {
        receiptInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImage.src = event.target.result;
                    receiptPreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle form submission - save receipt to IndexedDB
    if (receiptForm) {
        receiptForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveReceipt();
        });
    }

    // Setup truck management
    setupTruckManagement();

    // Load truck options
    populateTruckDropdowns();

    // Setup filter handler
    const filterSelect = document.getElementById('filterReceiptTruck');
    if (filterSelect) {
        filterSelect.addEventListener('change', () => loadSavedReceipts());
    }

    // Load saved receipts on page load
    loadSavedReceipts();
}

// ===== Truck Management =====
function getTrucks() {
    return JSON.parse(localStorage.getItem('trucks') || '[]');
}

function saveTrucks(trucks) {
    localStorage.setItem('trucks', JSON.stringify(trucks));
}

function setupTruckManagement() {
    const manageTrucksBtn = document.getElementById('manageTrucksBtn');
    const addTruckBtn = document.getElementById('addTruckBtn');

    if (manageTrucksBtn) {
        manageTrucksBtn.addEventListener('click', openTruckModal);
    }

    if (addTruckBtn) {
        addTruckBtn.addEventListener('click', addTruck);
    }
}

function openTruckModal() {
    const modal = document.getElementById('truckModal');
    if (modal) {
        modal.classList.remove('hidden');
        renderTruckList();
    }
}

function closeTruckModal() {
    const modal = document.getElementById('truckModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function addTruck() {
    const nameInput = document.getElementById('newTruckName');
    const unitInput = document.getElementById('newTruckUnit');

    const name = nameInput.value.trim();
    const unit = unitInput.value.trim();

    if (!name) {
        alert('Please enter a truck name');
        return;
    }

    const trucks = getTrucks();
    const newTruck = {
        id: Date.now().toString(),
        name,
        unit,
        createdAt: new Date().toISOString()
    };

    trucks.push(newTruck);
    saveTrucks(trucks);

    // Clear inputs
    nameInput.value = '';
    unitInput.value = '';

    // Refresh UI
    renderTruckList();
    populateTruckDropdowns();
}

function deleteTruck(truckId) {
    if (!confirm('Delete this truck? Receipts will keep their truck assignment.')) return;

    let trucks = getTrucks();
    trucks = trucks.filter(t => t.id !== truckId);
    saveTrucks(trucks);

    renderTruckList();
    populateTruckDropdowns();
}

function renderTruckList() {
    const listContainer = document.getElementById('truckList');
    if (!listContainer) return;

    const trucks = getTrucks();

    if (trucks.length === 0) {
        listContainer.innerHTML = '<div class="no-trucks">No trucks added yet.</div>';
        return;
    }

    listContainer.innerHTML = trucks.map(truck => `
        <div class="truck-item" data-id="${truck.id}">
            <div class="truck-item-info">
                <span class="truck-item-name">🚛 ${escapeHtml(truck.name)}</span>
                ${truck.unit ? `<span class="truck-item-unit">Unit #${escapeHtml(truck.unit)}</span>` : ''}
            </div>
            <div class="truck-item-actions">
                <button class="btn-delete-truck" onclick="deleteTruck('${truck.id}')">🗑</button>
            </div>
        </div>
    `).join('');
}

function populateTruckDropdowns() {
    const trucks = getTrucks();
    const receiptTruckSelect = document.getElementById('receiptTruck');
    const filterTruckSelect = document.getElementById('filterReceiptTruck');
    const invoiceTruckSelect = document.getElementById('invoiceTruck');
    const expenseTruckSelect = document.getElementById('expenseTruck');
    const fuelTruckSelect = document.getElementById('fuelTruck');

    const options = trucks.map(t =>
        `<option value="${t.id}">${escapeHtml(t.name)}${t.unit ? ` (#${escapeHtml(t.unit)})` : ''}</option>`
    ).join('');

    if (receiptTruckSelect) {
        receiptTruckSelect.innerHTML = '<option value="">All Trucks / No Selection</option>' + options;
    }

    if (filterTruckSelect) {
        filterTruckSelect.innerHTML = '<option value="">All Trucks</option>' + options;
    }

    if (invoiceTruckSelect) {
        invoiceTruckSelect.innerHTML = '<option value="">Select Truck...</option>' + options;
    }

    if (expenseTruckSelect) {
        expenseTruckSelect.innerHTML = '<option value="">All Trucks / No Selection</option>' + options;
    }

    if (fuelTruckSelect) {
        fuelTruckSelect.innerHTML = '<option value="">All Trucks / No Selection</option>' + options;
    }
}

function getTruckName(truckId) {
    if (!truckId) return null;
    const trucks = getTrucks();
    const truck = trucks.find(t => t.id === truckId);
    return truck ? truck.name : null;
}

// IndexedDB for local receipt photo storage
let receiptDB = null;

function initReceiptDB() {
    const request = indexedDB.open('TruckInvoiceReceipts', 2); // Bump version for truck field

    request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
    };

    request.onsuccess = (event) => {
        receiptDB = event.target.result;
        console.log('Receipt database initialized');
        loadSavedReceipts();
    };

    request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for receipts
        if (!db.objectStoreNames.contains('receipts')) {
            const store = db.createObjectStore('receipts', { keyPath: 'id', autoIncrement: true });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('category', 'category', { unique: false });
            store.createIndex('truckId', 'truckId', { unique: false });
            console.log('Receipts object store created');
        } else {
            // Add truckId index if upgrading
            const transaction = event.target.transaction;
            const store = transaction.objectStore('receipts');
            if (!store.indexNames.contains('truckId')) {
                store.createIndex('truckId', 'truckId', { unique: false });
            }
        }
    };
}

// Save receipt to IndexedDB and add as expense
async function saveReceipt() {
    const dateInput = document.getElementById('receiptDate');
    const amountInput = document.getElementById('receiptAmount');
    const categoryInput = document.getElementById('receiptCategory');
    const vendorInput = document.getElementById('receiptVendor');
    const notesInput = document.getElementById('receiptNotes');
    const truckInput = document.getElementById('receiptTruck');

    const date = dateInput.value;
    const amount = parseFloat(amountInput.value) || 0;
    const category = categoryInput.value;
    const vendor = vendorInput.value;
    const notes = notesInput.value;
    const truckId = truckInput ? truckInput.value : '';

    if (!date || !amount || !category || !vendor) {
        alert('Please fill in all required fields');
        return;
    }

    // Get photo as base64 if available
    let photoData = null;
    const previewImage = document.getElementById('previewImage');
    if (previewImage && previewImage.src && previewImage.src.startsWith('data:')) {
        photoData = previewImage.src;
    }

    // Create receipt object
    const receiptData = {
        date,
        amount,
        category,
        vendor,
        notes,
        truckId,
        photo: photoData,
        createdAt: new Date().toISOString()
    };

    try {
        // Save to IndexedDB (for photo storage)
        if (receiptDB && photoData) {
            const transaction = receiptDB.transaction(['receipts'], 'readwrite');
            const store = transaction.objectStore('receipts');
            const addRequest = store.add(receiptData);

            addRequest.onsuccess = () => {
                console.log('Receipt saved to IndexedDB with ID:', addRequest.result);
            };

            addRequest.onerror = () => {
                console.error('Error saving to IndexedDB:', addRequest.error);
            };
        }

        // Add to expenses (same as before, stored in localStorage/Firebase)
        const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        const newExpense = {
            id: Date.now(),
            date,
            amount,
            category,
            vendor,
            notes: notes || 'Receipt upload',
            truckId,
            hasPhoto: !!photoData
        };
        expenses.push(newExpense);
        localStorage.setItem('expenses', JSON.stringify(expenses));

        // Sync to Firebase if logged in
        if (window.syncToFirebase) {
            window.syncToFirebase();
        }

        alert('Receipt saved successfully!');
        resetReceiptForm();
        loadSavedReceipts();

    } catch (error) {
        console.error('Error saving receipt:', error);
        alert('Error saving receipt. Please try again.');
    }
}

// Load and display saved receipts from IndexedDB (grouped by month)
function loadSavedReceipts() {
    const listContainer = document.getElementById('savedReceiptsList');
    if (!listContainer) return;

    if (!receiptDB) {
        // DB not ready yet, will be called again after init
        return;
    }

    const transaction = receiptDB.transaction(['receipts'], 'readonly');
    const store = transaction.objectStore('receipts');
    const request = store.getAll();

    request.onsuccess = () => {
        let receipts = request.result;

        // Apply truck filter
        const filterTruckSelect = document.getElementById('filterReceiptTruck');
        const filterTruckId = filterTruckSelect ? filterTruckSelect.value : '';
        if (filterTruckId) {
            receipts = receipts.filter(r => r.truckId === filterTruckId);
        }

        if (receipts.length === 0) {
            listContainer.innerHTML = '<div class="no-history">No saved receipts yet.</div>';
            return;
        }

        // Sort by date, newest first
        receipts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Group by month
        const groupedByMonth = {};
        receipts.forEach(receipt => {
            const date = new Date(receipt.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            if (!groupedByMonth[monthKey]) {
                groupedByMonth[monthKey] = {
                    label: monthLabel,
                    receipts: [],
                    total: 0
                };
            }
            groupedByMonth[monthKey].receipts.push(receipt);
            groupedByMonth[monthKey].total += receipt.amount;
        });

        // Sort months newest first
        const sortedMonths = Object.keys(groupedByMonth).sort().reverse();

        // Build accordion HTML
        let html = '<div class="receipt-month-accordion">';

        sortedMonths.forEach((monthKey, index) => {
            const group = groupedByMonth[monthKey];
            const isExpanded = index === 0; // Expand first month by default

            html += `
                <div class="receipt-month-group">
                    <button type="button" class="receipt-month-header" data-month="${monthKey}" aria-expanded="${isExpanded}">
                        <div class="month-info">
                            <span class="month-icon">📅</span>
                            <span class="month-name">${group.label}</span>
                        </div>
                        <div class="month-stats">
                            <span class="receipt-count">${group.receipts.length} receipt${group.receipts.length !== 1 ? 's' : ''}</span>
                            <span class="month-total">$${group.total.toFixed(2)}</span>
                            <span class="chevron">▼</span>
                        </div>
                    </button>
                    <div class="receipt-month-items ${isExpanded ? 'expanded' : ''}" data-month-items="${monthKey}">
                        ${group.receipts.map(receipt => renderReceiptCard(receipt)).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        listContainer.innerHTML = html;

        // Add click handlers for accordion headers
        document.querySelectorAll('.receipt-month-header').forEach(header => {
            header.addEventListener('click', toggleReceiptMonth);
        });
    };

    request.onerror = () => {
        console.error('Error loading receipts:', request.error);
        listContainer.innerHTML = '<div class="no-history">Error loading receipts.</div>';
    };
}

// Render a single receipt card
function renderReceiptCard(receipt) {
    const truckName = getTruckName(receipt.truckId);

    return `
        <div class="receipt-card" data-id="${receipt.id}">
            ${receipt.photo ?
            `<img src="${receipt.photo}" class="receipt-card-thumbnail" 
                      onclick="viewReceiptPhoto('${receipt.id}')" 
                      alt="Receipt photo">` :
            '<div class="receipt-card-thumbnail" style="background: #ddd; display: flex; align-items: center; justify-content: center;">📄</div>'
        }
            <div class="receipt-card-info">
                <h4>${escapeHtml(receipt.vendor)}${truckName ? `<span class="receipt-truck-badge">🚛 ${escapeHtml(truckName)}</span>` : ''}</h4>
                <div class="receipt-amount">$${receipt.amount.toFixed(2)}</div>
                <div class="receipt-meta">
                    ${new Date(receipt.date).toLocaleDateString()} • ${getCategoryLabel(receipt.category)}
                </div>
                ${receipt.notes ? `<div class="receipt-meta">${escapeHtml(receipt.notes)}</div>` : ''}
            </div>
            <div class="receipt-card-actions">
                ${receipt.photo ? `<button class="btn-view-receipt" onclick="viewReceiptPhoto('${receipt.id}')">👁 View</button>` : ''}
                <button class="btn-delete-receipt" onclick="deleteReceipt('${receipt.id}')">🗑 Delete</button>
            </div>
        </div>
    `;
}

// Toggle receipt month accordion
function toggleReceiptMonth(event) {
    const header = event.currentTarget;
    const monthKey = header.dataset.month;
    const items = document.querySelector(`[data-month-items="${monthKey}"]`);
    const isExpanded = header.getAttribute('aria-expanded') === 'true';

    header.setAttribute('aria-expanded', !isExpanded);
    items.classList.toggle('expanded', !isExpanded);
}

// View full receipt photo in modal
function viewReceiptPhoto(receiptId) {
    if (!receiptDB) return;

    const transaction = receiptDB.transaction(['receipts'], 'readonly');
    const store = transaction.objectStore('receipts');
    const request = store.get(parseInt(receiptId));

    request.onsuccess = () => {
        const receipt = request.result;
        if (receipt && receipt.photo) {
            const modal = document.getElementById('receiptModal');
            const modalImage = document.getElementById('receiptModalImage');
            if (modal && modalImage) {
                modalImage.src = receipt.photo;
                modal.classList.add('active');
            }
        }
    };
}

// Close receipt modal
function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Delete receipt from IndexedDB
function deleteReceipt(receiptId) {
    if (!confirm('Delete this receipt photo? The expense record will remain.')) return;

    if (!receiptDB) return;

    const transaction = receiptDB.transaction(['receipts'], 'readwrite');
    const store = transaction.objectStore('receipts');
    const request = store.delete(parseInt(receiptId));

    request.onsuccess = () => {
        console.log('Receipt deleted');
        loadSavedReceipts();
    };

    request.onerror = () => {
        console.error('Error deleting receipt:', request.error);
        alert('Error deleting receipt');
    };
}

// Helper: Get category label
function getCategoryLabel(category) {
    const labels = {
        fuel: 'Fuel',
        maintenance: 'Maintenance',
        tolls: 'Tolls',
        food: 'Food',
        insurance: 'Insurance',
        permits: 'Permits',
        truck_payment: 'Truck Payment',
        supplies: 'Supplies',
        drivers_pay: 'Drivers Pay',
        other: 'Other'
    };
    return labels[category] || category;
}

// Helper: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Reset receipt form
function resetReceiptForm() {
    const form = document.getElementById('receiptForm');
    if (form) form.reset();

    const preview = document.getElementById('receiptPreview');
    if (preview) preview.classList.add('hidden');

    const previewImage = document.getElementById('previewImage');
    if (previewImage) previewImage.src = '';

    // Set date back to today
    const dateInput = document.getElementById('receiptDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// Close modal on click outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('receiptModal');
    if (modal && e.target === modal) {
        closeReceiptModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeReceiptModal();
    }
});

// ===== Export Functions =====

function exportExpenseReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const selectedYear = parseInt(document.getElementById('dashboardYear').value);
    const selectedPeriod = document.getElementById('dashboardPeriod').value;
    const expenses = getExpenses();

    // Get date range
    const dateRange = getDateRange(selectedPeriod, selectedYear);

    // Filter expenses
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dateRange.start && expDate <= dateRange.end;
    });

    const periodLabel = selectedPeriod === 'ytd' ? 'Year to Date' : selectedPeriod === 'weekly' ? 'This Week' : 'Pay Period';
    const companyName = localStorage.getItem('companyName') || 'Your Company';

    // Title
    doc.setFontSize(18);
    doc.text('Expense Report', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(companyName, 105, 30, { align: 'center' });
    doc.text(`Period: ${periodLabel} (${selectedYear})`, 105, 38, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 46, { align: 'center' });

    // Use imported category labels
    const categoryLabels = window.categoryLabels || {
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

    // Group by category
    const expenseBreakdown = {};
    filteredExpenses.forEach(exp => {
        if (!expenseBreakdown[exp.category]) {
            expenseBreakdown[exp.category] = { total: 0, items: [] };
        }
        expenseBreakdown[exp.category].total += parseFloat(exp.amount);
        expenseBreakdown[exp.category].items.push(exp);
    });

    let y = 60;
    const lineHeight = 6;
    const pageHeight = doc.internal.pageSize.getHeight();

    // Summary by category
    doc.setFontSize(14);
    doc.text('Expense Summary by Category', 20, y);
    y += 10;

    doc.setFontSize(10);
    Object.entries(expenseBreakdown).sort((a, b) => b[1].total - a[1].total).forEach(([category, data]) => {
        if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }
        doc.text(`${categoryLabels[category]}: $${data.total.toFixed(2)}`, 25, y);
        y += lineHeight;
    });

    y += 10;

    // Detailed expenses
    doc.setFontSize(14);
    if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
    }
    doc.text('Detailed Expenses', 20, y);
    y += 10;

    doc.setFontSize(9);
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => {
        if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }
        const expDate = new Date(exp.date).toLocaleDateString();
        doc.text(`${expDate} - ${categoryLabels[exp.category]}`, 25, y);
        y += lineHeight;
        doc.text(`  ${exp.vendor} - $${exp.amount}`, 25, y);
        if (exp.notes) {
            y += lineHeight;
            doc.text(`  Notes: ${exp.notes}`, 25, y);
        }
        y += lineHeight + 2;
    });

    // Total
    y += 5;
    if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
    }
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Expenses: $${totalExpenses.toFixed(2)}`, 20, y);

    // Save PDF
    doc.save(`Expense_Report_${periodLabel.replace(/\s+/g, '_')}_${selectedYear}.pdf`);
    alert('Expense report exported successfully!');
}

function exportProfitLossStatement() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const selectedYear = parseInt(document.getElementById('dashboardYear').value);
    const selectedPeriod = document.getElementById('dashboardPeriod').value;
    const invoices = getInvoiceHistory();
    const expenses = getExpenses();

    // Get date range
    const dateRange = getDateRange(selectedPeriod, selectedYear);

    // Filter data
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

    // Title
    doc.setFontSize(18);
    doc.text('Profit & Loss Statement', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(companyName, 105, 30, { align: 'center' });
    if (companyAddress) {
        doc.setFontSize(10);
        doc.text(companyAddress, 105, 37, { align: 'center' });
    }
    doc.setFontSize(11);
    doc.text(`Period: ${periodLabel} (${selectedYear})`, 105, 45, { align: 'center' });
    doc.text(`Date Range: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, 105, 52, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 59, { align: 'center' });

    let y = 75;
    const lineHeight = 7;

    // INCOME SECTION
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

    // EXPENSES SECTION
    doc.setFontSize(14);
    doc.text('EXPENSES', 20, y);
    y += 10;

    // Use imported category labels
    const categoryLabels = window.categoryLabels || {
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

    // Group expenses by category
    const breakdown = {};
    filteredExpenses.forEach(exp => {
        if (!breakdown[exp.category]) {
            breakdown[exp.category] = 0;
        }
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

    // NET PROFIT
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

    // Key Metrics
    doc.setFontSize(12);
    doc.text('Key Metrics:', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : '0.00';
    doc.text(`Profit Margin: ${profitMargin}%`, 25, y);
    y += lineHeight;

    const avgInvoice = filteredInvoices.length > 0 ? (totalIncome / filteredInvoices.length).toFixed(2) : '0.00';
    doc.text(`Average Invoice: $${avgInvoice}`, 25, y);
    y += lineHeight;

    const avgExpense = filteredExpenses.length > 0 ? (totalExpenses / filteredExpenses.length).toFixed(2) : '0.00';
    doc.text(`Average Expense: $${avgExpense}`, 25, y);

    // Footer
    doc.setFontSize(8);
    doc.setFont(undefined, 'italic');
    doc.text('This statement is for informational purposes. Consult a tax professional for official filings.', 105, 280, { align: 'center' });

    // Save PDF
    doc.save(`Profit_Loss_Statement_${periodLabel.replace(/\s+/g, '_')}_${selectedYear}.pdf`);
    alert('Profit & Loss statement exported successfully!');
}

// =====================================
// DRIVER TOOLS SECTION
// =====================================

let driverToolsInitialized = false;

function setupDriverTools() {
    if (driverToolsInitialized) {
        // Just refresh displays when switching to tools view
        displayFuelLog();
        displayPerDiemLog();
        displayReminders();
        updatePerDiemYTD();
        return;
    }

    driverToolsInitialized = true;

    // Tool tab switching
    const toolTabs = document.querySelectorAll('.tool-tab');
    const toolPanels = document.querySelectorAll('.tool-panel');

    toolTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTool = tab.dataset.tool;

            // Update tabs
            toolTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update panels
            toolPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetTool + 'Tool') {
                    panel.classList.add('active');
                }
            });
        });
    });

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    const fuelDateInput = document.getElementById('fuelDate');
    if (fuelDateInput) fuelDateInput.value = today;

    // Fuel log form handlers
    setupFuelLogHandlers();

    // Rate check handlers
    setupRateCheckHandlers();

    // Per diem handlers
    setupPerDiemHandlers();

    // CPM calculator handlers
    setupCpmCalculatorHandlers();

    // Service reminders handlers
    setupRemindersHandlers();

    // Initial displays
    displayFuelLog();
    displayPerDiemLog();
    displayReminders();
    updatePerDiemYTD();

    // Load saved minimum CPM
    const savedMinCpm = localStorage.getItem('truck_minCpm');
    if (savedMinCpm) {
        document.getElementById('rateCheckMinCpm').value = savedMinCpm;
    }

    // Load saved per diem rate
    const savedPerDiemRate = localStorage.getItem('truck_perDiemRate');
    if (savedPerDiemRate) {
        document.getElementById('perDiemRate').value = savedPerDiemRate;
    }
}

// =====================================
// FUEL LOG FUNCTIONS
// =====================================

function setupFuelLogHandlers() {
    const fuelForm = document.getElementById('fuelLogForm');
    const gallonsInput = document.getElementById('fuelGallons');
    const priceInput = document.getElementById('fuelPricePerGallon');
    const totalInput = document.getElementById('fuelTotalCost');
    const autoLocationBtn = document.getElementById('autoLocationBtn');

    // Auto-calculate total cost
    function calculateTotal() {
        const gallons = parseFloat(gallonsInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const total = gallons * price;
        totalInput.value = total > 0 ? total.toFixed(2) : '';
    }

    gallonsInput.addEventListener('input', calculateTotal);
    priceInput.addEventListener('input', calculateTotal);

    // Auto-location button
    autoLocationBtn.addEventListener('click', getAutoLocation);

    // Form submission
    fuelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveFuelEntry();
    });
}

function getAutoLocation() {
    const locationInput = document.getElementById('fuelLocation');
    const locationStatus = document.getElementById('locationStatus');
    const autoBtn = document.getElementById('autoLocationBtn');

    if (!navigator.geolocation) {
        showLocationStatus('Geolocation not supported by your browser', 'error');
        return;
    }

    autoBtn.disabled = true;
    autoBtn.textContent = '⏳';
    showLocationStatus('Getting location...', 'loading');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;

            try {
                // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
                    { headers: { 'User-Agent': 'TruckInvoiceApp/1.0' } }
                );

                if (!response.ok) throw new Error('Geocoding failed');

                const data = await response.json();
                const address = data.address;

                // Extract city and state
                const city = address.city || address.town || address.village || address.county || '';
                const state = address.state || '';

                if (city && state) {
                    // Try to get state abbreviation
                    const stateAbbrev = getStateAbbreviation(state);
                    locationInput.value = `${city}, ${stateAbbrev}`;
                    showLocationStatus('Location found!', 'success');
                } else {
                    locationInput.value = data.display_name.split(',').slice(0, 2).join(',');
                    showLocationStatus('Location found (approximate)', 'success');
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                showLocationStatus('Could not get city name. Try entering manually.', 'error');
            }

            autoBtn.disabled = false;
            autoBtn.textContent = '📍 Auto';
        },
        (error) => {
            let message = 'Could not get location';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Location permission denied. Please enable location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Location unavailable. Try again.';
                    break;
                case error.TIMEOUT:
                    message = 'Location request timed out. Try again.';
                    break;
            }
            showLocationStatus(message, 'error');
            autoBtn.disabled = false;
            autoBtn.textContent = '📍 Auto';
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
}

function showLocationStatus(message, type) {
    const statusDiv = document.getElementById('locationStatus');
    statusDiv.textContent = message;
    statusDiv.className = 'location-status ' + type;
    statusDiv.classList.remove('hidden');

    if (type === 'success') {
        setTimeout(() => statusDiv.classList.add('hidden'), 3000);
    }
}

function getStateAbbreviation(stateName) {
    const stateMap = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
        'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
        'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
        'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
        'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
        'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
        'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
        'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
        'district of columbia': 'DC'
    };
    const normalized = stateName.toLowerCase().trim();
    return stateMap[normalized] || stateName;
}

function saveFuelEntry() {
    const entry = {
        id: Date.now().toString(),
        date: document.getElementById('fuelDate').value,
        odometer: document.getElementById('fuelOdometer').value,
        gallons: parseFloat(document.getElementById('fuelGallons').value),
        pricePerGallon: parseFloat(document.getElementById('fuelPricePerGallon').value),
        totalCost: parseFloat(document.getElementById('fuelTotalCost').value),
        location: document.getElementById('fuelLocation').value,
        station: document.getElementById('fuelStation').value,
        createdAt: new Date().toISOString()
    };

    // Save to localStorage (and sync to Firebase if available)
    const fuelLog = JSON.parse(localStorage.getItem('truck_fuelLog') || '[]');
    fuelLog.unshift(entry);
    localStorage.setItem('truck_fuelLog', JSON.stringify(fuelLog));

    // Also add as expense
    const expense = {
        id: 'fuel_' + entry.id,
        date: entry.date,
        amount: entry.totalCost,
        category: 'fuel',
        vendor: entry.station || entry.location,
        notes: `${entry.gallons} gal @ $${entry.pricePerGallon}/gal - ${entry.location}`,
        createdAt: entry.createdAt
    };

    const expenses = JSON.parse(localStorage.getItem('truck_expenses') || '[]');
    expenses.unshift(expense);
    localStorage.setItem('truck_expenses', JSON.stringify(expenses));

    // Reset form
    document.getElementById('fuelLogForm').reset();
    document.getElementById('fuelDate').value = new Date().toISOString().split('T')[0];

    showToast('Fuel entry added!');
    displayFuelLog();
}

function displayFuelLog() {
    const fuelLog = JSON.parse(localStorage.getItem('truck_fuelLog') || '[]');
    const listContainer = document.getElementById('fuelLogList');

    if (fuelLog.length === 0) {
        listContainer.innerHTML = '<div class="no-history">No fuel entries yet.</div>';
        document.getElementById('avgMpg').textContent = '--';
        document.getElementById('mtdGallons').textContent = '--';
        return;
    }

    // Calculate MPG if we have odometer data
    let avgMpg = '--';
    const entriesWithOdometer = fuelLog.filter(e => e.odometer).sort((a, b) => parseInt(b.odometer) - parseInt(a.odometer));
    if (entriesWithOdometer.length >= 2) {
        let totalMiles = 0;
        let totalGallons = 0;
        for (let i = 0; i < Math.min(entriesWithOdometer.length - 1, 9); i++) {
            const miles = parseInt(entriesWithOdometer[i].odometer) - parseInt(entriesWithOdometer[i + 1].odometer);
            if (miles > 0) {
                totalMiles += miles;
                totalGallons += entriesWithOdometer[i].gallons;
            }
        }
        if (totalGallons > 0) {
            avgMpg = (totalMiles / totalGallons).toFixed(1);
        }
    }
    document.getElementById('avgMpg').textContent = avgMpg;

    // Calculate MTD gallons
    const now = new Date();
    const mtdGallons = fuelLog
        .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, e) => sum + e.gallons, 0);
    document.getElementById('mtdGallons').textContent = mtdGallons.toFixed(1);

    // Display recent entries
    const html = fuelLog.slice(0, 10).map(entry => `
        <div class="fuel-entry">
            <div class="fuel-entry-header">
                <span class="fuel-date">${formatFuelDate(entry.date)}</span>
                <span class="fuel-location">${escapeHtml(entry.location)}</span>
            </div>
            <div class="fuel-entry-details">
                <span>${entry.gallons.toFixed(1)} gal @ $${entry.pricePerGallon.toFixed(3)}</span>
                <span class="fuel-total">$${entry.totalCost.toFixed(2)}</span>
            </div>
            ${entry.odometer ? `<div class="fuel-odometer">Odometer: ${parseInt(entry.odometer).toLocaleString()}</div>` : ''}
        </div>
    `).join('');

    listContainer.innerHTML = html;
}

function formatFuelDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =====================================
// RATE CHECK FUNCTIONS
// =====================================

function setupRateCheckHandlers() {
    const checkBtn = document.getElementById('checkRateBtn');
    const minCpmInput = document.getElementById('rateCheckMinCpm');

    checkBtn.addEventListener('click', checkRate);

    // Save minimum CPM when changed
    minCpmInput.addEventListener('change', () => {
        localStorage.setItem('truck_minCpm', minCpmInput.value);
    });
}

function checkRate() {
    const pay = parseFloat(document.getElementById('rateCheckPay').value);
    const miles = parseFloat(document.getElementById('rateCheckMiles').value);
    const minCpm = parseFloat(document.getElementById('rateCheckMinCpm').value) || 2.50;

    if (!pay || !miles) {
        showToast('Please enter load pay and miles', 'warning');
        return;
    }

    const rpm = pay / miles;
    const difference = rpm - minCpm;

    document.getElementById('calculatedRpm').textContent = '$' + rpm.toFixed(2);
    document.getElementById('minRpmDisplay').textContent = '$' + minCpm.toFixed(2);

    const diffElement = document.getElementById('rpmDifference');
    diffElement.textContent = (difference >= 0 ? '+$' : '-$') + Math.abs(difference).toFixed(2);
    diffElement.className = 'rate-value ' + (difference >= 0 ? 'positive' : 'negative');

    const verdictElement = document.getElementById('rateVerdict');
    if (difference >= 0.25) {
        verdictElement.innerHTML = '<span class="verdict-icon">✅</span> GOOD LOAD! Take it.';
        verdictElement.className = 'rate-verdict good';
    } else if (difference >= 0) {
        verdictElement.innerHTML = '<span class="verdict-icon">⚠️</span> Meets minimum. Consider other factors.';
        verdictElement.className = 'rate-verdict okay';
    } else if (difference >= -0.25) {
        verdictElement.innerHTML = '<span class="verdict-icon">⚠️</span> Below minimum. Only if needed.';
        verdictElement.className = 'rate-verdict marginal';
    } else {
        verdictElement.innerHTML = '<span class="verdict-icon">❌</span> BAD LOAD! Skip it.';
        verdictElement.className = 'rate-verdict bad';
    }

    document.getElementById('rateResult').classList.remove('hidden');
}

// =====================================
// PER DIEM FUNCTIONS
// =====================================

function setupPerDiemHandlers() {
    const calcBtn = document.getElementById('calcPerDiemBtn');
    const addBtn = document.getElementById('addPerDiemBtn');
    const perDiemRateInput = document.getElementById('perDiemRate');

    calcBtn.addEventListener('click', calculatePerDiem);
    addBtn.addEventListener('click', addPerDiemEntry);

    perDiemRateInput.addEventListener('change', () => {
        localStorage.setItem('truck_perDiemRate', perDiemRateInput.value);
    });
}

function calculatePerDiem() {
    const startDate = document.getElementById('perDiemStart').value;
    const endDate = document.getElementById('perDiemEnd').value;
    const rate = parseFloat(document.getElementById('perDiemRate').value) || 69;
    const partialStart = document.getElementById('partialStartDay').checked;
    const partialEnd = document.getElementById('partialEndDay').checked;

    if (!startDate || !endDate) {
        showToast('Please enter start and end dates', 'warning');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
        showToast('End date must be after start date', 'warning');
        return;
    }

    // Calculate days
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let fullDays = totalDays;
    let partialDays = 0;

    if (partialStart) {
        fullDays -= 0.5;
        partialDays += 0.5;
    }
    if (partialEnd) {
        fullDays -= 0.5;
        partialDays += 0.5;
    }

    const totalPerDiem = (fullDays - partialDays + partialDays * 0.5) * rate;
    // Simplified: just use effective days
    const effectiveDays = fullDays - partialDays + (partialDays * 0.5);
    const finalTotal = effectiveDays * rate;

    document.getElementById('fullDaysCount').textContent = (totalDays - (partialStart ? 1 : 0) - (partialEnd ? 1 : 0)).toString();
    document.getElementById('partialDaysCount').textContent = ((partialStart ? 1 : 0) + (partialEnd ? 1 : 0)).toString();
    document.getElementById('perDiemTotal').textContent = '$' + finalTotal.toFixed(2);

    document.getElementById('perDiemResult').classList.remove('hidden');
}

function addPerDiemEntry() {
    const startDate = document.getElementById('perDiemStart').value;
    const endDate = document.getElementById('perDiemEnd').value;
    const rate = parseFloat(document.getElementById('perDiemRate').value) || 69;
    const partialStart = document.getElementById('partialStartDay').checked;
    const partialEnd = document.getElementById('partialEndDay').checked;

    if (!startDate || !endDate) {
        showToast('Please enter start and end dates', 'warning');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let effectiveDays = totalDays;
    if (partialStart) effectiveDays -= 0.5;
    if (partialEnd) effectiveDays -= 0.5;

    const entry = {
        id: Date.now().toString(),
        startDate,
        endDate,
        totalDays,
        effectiveDays,
        rate,
        total: effectiveDays * rate,
        partialStart,
        partialEnd,
        createdAt: new Date().toISOString()
    };

    const perDiemLog = JSON.parse(localStorage.getItem('truck_perDiemLog') || '[]');
    perDiemLog.unshift(entry);
    localStorage.setItem('truck_perDiemLog', JSON.stringify(perDiemLog));

    // Reset form
    document.getElementById('perDiemStart').value = '';
    document.getElementById('perDiemEnd').value = '';
    document.getElementById('partialStartDay').checked = false;
    document.getElementById('partialEndDay').checked = false;
    document.getElementById('perDiemResult').classList.add('hidden');

    showToast('Per diem entry added!');
    displayPerDiemLog();
    updatePerDiemYTD();
}

function displayPerDiemLog() {
    const perDiemLog = JSON.parse(localStorage.getItem('truck_perDiemLog') || '[]');
    const listContainer = document.getElementById('perDiemList');

    if (perDiemLog.length === 0) {
        listContainer.innerHTML = '<div class="no-history">No per diem entries yet.</div>';
        return;
    }

    const html = perDiemLog.slice(0, 10).map(entry => `
        <div class="perdiem-entry">
            <div class="perdiem-entry-header">
                <span class="perdiem-dates">${formatFuelDate(entry.startDate)} - ${formatFuelDate(entry.endDate)}</span>
                <span class="perdiem-total">$${entry.total.toFixed(2)}</span>
            </div>
            <div class="perdiem-entry-details">
                <span>${entry.effectiveDays} days @ $${entry.rate}/day</span>
                <button type="button" class="btn-delete-small" onclick="deletePerDiemEntry('${entry.id}')" title="Delete">×</button>
            </div>
        </div>
    `).join('');

    listContainer.innerHTML = html;
}

function updatePerDiemYTD() {
    const perDiemLog = JSON.parse(localStorage.getItem('truck_perDiemLog') || '[]');
    const currentYear = new Date().getFullYear();

    const ytdEntries = perDiemLog.filter(e => new Date(e.startDate).getFullYear() === currentYear);
    const ytdDays = ytdEntries.reduce((sum, e) => sum + e.effectiveDays, 0);
    const ytdTotal = ytdEntries.reduce((sum, e) => sum + e.total, 0);

    document.getElementById('ytdDays').textContent = ytdDays.toFixed(1);
    document.getElementById('ytdPerDiem').textContent = '$' + ytdTotal.toFixed(2);
}

function deletePerDiemEntry(id) {
    if (!confirm('Delete this per diem entry?')) return;

    let perDiemLog = JSON.parse(localStorage.getItem('truck_perDiemLog') || '[]');
    perDiemLog = perDiemLog.filter(e => e.id !== id);
    localStorage.setItem('truck_perDiemLog', JSON.stringify(perDiemLog));

    displayPerDiemLog();
    updatePerDiemYTD();
    showToast('Entry deleted');
}

// =====================================
// COST PER MILE CALCULATOR
// =====================================

function setupCpmCalculatorHandlers() {
    const calcBtn = document.getElementById('calcCpmBtn');
    const periodSelect = document.getElementById('cpmPeriod');

    calcBtn.addEventListener('click', calculateCostPerMile);

    periodSelect.addEventListener('change', () => {
        const customRange = document.getElementById('cpmCustomRange');
        customRange.classList.toggle('hidden', periodSelect.value !== 'custom');
    });
}

function calculateCostPerMile() {
    const period = document.getElementById('cpmPeriod').value;
    const milesInput = parseFloat(document.getElementById('cpmMilesDriven').value);

    if (!milesInput || milesInput <= 0) {
        showToast('Please enter total miles driven', 'warning');
        return;
    }

    // Get date range based on period
    const now = new Date();
    let startDate, endDate;

    if (period === 'mtd') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    } else if (period === 'ytd') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
    } else {
        startDate = new Date(document.getElementById('cpmStartDate').value);
        endDate = new Date(document.getElementById('cpmEndDate').value);
    }

    // Get expenses in range
    const expenses = JSON.parse(localStorage.getItem('truck_expenses') || '[]');
    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= startDate && expDate <= endDate;
    });

    // Group by category
    const breakdown = {};
    const categoryLabels = {
        fuel: '⛽ Fuel',
        maintenance: '🔧 Maintenance',
        tolls: '🅿️ Tolls & Parking',
        food: '🍔 Food & Meals',
        insurance: '🛡️ Insurance',
        permits: '📋 Permits',
        truck_payment: '🚛 Truck Payment',
        supplies: '📦 Supplies',
        drivers_pay: '👤 Drivers Pay',
        other: '📎 Other'
    };

    filteredExpenses.forEach(exp => {
        const cat = exp.category || 'other';
        if (!breakdown[cat]) breakdown[cat] = 0;
        breakdown[cat] += parseFloat(exp.amount);
    });

    const totalExpenses = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const cpm = totalExpenses / milesInput;

    // Build breakdown HTML
    let breakdownHtml = '';
    Object.entries(breakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, amount]) => {
            const catCpm = (amount / milesInput).toFixed(2);
            breakdownHtml += `
                <div class="cpm-expense-line">
                    <span class="cpm-category">${categoryLabels[cat] || cat}</span>
                    <span class="cpm-amount">$${amount.toFixed(2)}</span>
                    <span class="cpm-per-mile">$${catCpm}/mi</span>
                </div>
            `;
        });

    document.getElementById('cpmExpenseBreakdown').innerHTML = breakdownHtml || '<div class="no-items">No expenses found for this period</div>';
    document.getElementById('cpmTotalExpenses').textContent = '$' + totalExpenses.toFixed(2);
    document.getElementById('cpmTotalMiles').textContent = milesInput.toLocaleString();
    document.getElementById('cpmFinalValue').textContent = '$' + cpm.toFixed(2);

    // Insight
    let insight = '';
    if (cpm < 1.50) {
        insight = '✅ Excellent! Your operating costs are well controlled.';
    } else if (cpm < 2.00) {
        insight = '👍 Good. You\'re running efficiently.';
    } else if (cpm < 2.50) {
        insight = '⚠️ Average. Look for ways to reduce expenses.';
    } else {
        insight = '❌ High costs. Review expenses, especially fuel efficiency.';
    }
    document.getElementById('cpmInsight').textContent = insight;

    document.getElementById('cpmResult').classList.remove('hidden');
}

// =====================================
// SERVICE REMINDERS
// =====================================

function setupRemindersHandlers() {
    const reminderForm = document.getElementById('reminderForm');
    const reminderTypeSelect = document.getElementById('reminderType');

    reminderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveReminder();
    });

    // Show/hide custom name field
    reminderTypeSelect.addEventListener('change', () => {
        const customDiv = document.getElementById('customReminderName');
        customDiv.classList.toggle('hidden', reminderTypeSelect.value !== 'other');
    });
}

function saveReminder() {
    const type = document.getElementById('reminderType').value;
    const customName = document.getElementById('reminderCustomName').value;
    const dueDate = document.getElementById('reminderDueDate').value;
    const dueMiles = document.getElementById('reminderDueMiles').value;
    const notes = document.getElementById('reminderNotes').value;

    if (!type || !dueDate) {
        showToast('Please select type and due date', 'warning');
        return;
    }

    const typeLabels = {
        oil_change: '🛢️ Oil Change',
        dot_inspection: '📋 DOT Inspection',
        annual_inspection: '🔍 Annual Inspection',
        registration: '📄 Registration Renewal',
        ifta: '📊 IFTA Filing',
        insurance: '🛡️ Insurance Renewal',
        permit: '📝 Permit Renewal',
        tires: '🛞 Tire Replacement',
        brakes: '🛑 Brake Service',
        other: '📌 ' + (customName || 'Other')
    };

    const reminder = {
        id: Date.now().toString(),
        type,
        label: typeLabels[type] || type,
        dueDate,
        dueMiles: dueMiles || null,
        notes,
        completed: false,
        createdAt: new Date().toISOString()
    };

    const reminders = JSON.parse(localStorage.getItem('truck_reminders') || '[]');
    reminders.push(reminder);
    reminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    localStorage.setItem('truck_reminders', JSON.stringify(reminders));

    // Reset form
    document.getElementById('reminderForm').reset();
    document.getElementById('customReminderName').classList.add('hidden');

    showToast('Reminder added!');
    displayReminders();
}

function displayReminders() {
    const reminders = JSON.parse(localStorage.getItem('truck_reminders') || '[]');
    const listContainer = document.getElementById('remindersList');

    // Filter out completed ones older than 30 days
    const activeReminders = reminders.filter(r => {
        if (!r.completed) return true;
        const completedDate = new Date(r.completedAt || r.dueDate);
        const daysSinceCompleted = (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCompleted < 30;
    });

    if (activeReminders.length === 0) {
        listContainer.innerHTML = '<div class="no-history">No reminders set. Add your first reminder!</div>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const html = activeReminders.map(reminder => {
        const dueDate = new Date(reminder.dueDate + 'T00:00:00');
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        let statusClass = '';
        let statusText = '';

        if (reminder.completed) {
            statusClass = 'completed';
            statusText = '✓ Completed';
        } else if (daysUntil < 0) {
            statusClass = 'overdue';
            statusText = `${Math.abs(daysUntil)} days overdue!`;
        } else if (daysUntil === 0) {
            statusClass = 'due-today';
            statusText = 'Due Today!';
        } else if (daysUntil <= 7) {
            statusClass = 'due-soon';
            statusText = `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`;
        } else if (daysUntil <= 30) {
            statusClass = 'upcoming';
            statusText = `${daysUntil} days`;
        } else {
            statusClass = 'future';
            statusText = formatFuelDate(reminder.dueDate);
        }

        return `
            <div class="reminder-item ${statusClass} ${reminder.completed ? 'is-completed' : ''}">
                <div class="reminder-header">
                    <span class="reminder-label">${reminder.label}</span>
                    <span class="reminder-status">${statusText}</span>
                </div>
                <div class="reminder-details">
                    <span class="reminder-due">Due: ${formatFuelDate(reminder.dueDate)}</span>
                    ${reminder.dueMiles ? `<span class="reminder-miles">@ ${parseInt(reminder.dueMiles).toLocaleString()} mi</span>` : ''}
                </div>
                ${reminder.notes ? `<div class="reminder-notes">${escapeHtml(reminder.notes)}</div>` : ''}
                <div class="reminder-actions">
                    ${!reminder.completed ? `<button type="button" class="btn-complete" onclick="completeReminder('${reminder.id}')">✓ Complete</button>` : ''}
                    <button type="button" class="btn-delete-small" onclick="deleteReminder('${reminder.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    listContainer.innerHTML = html;
}

function completeReminder(id) {
    const reminders = JSON.parse(localStorage.getItem('truck_reminders') || '[]');
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        reminder.completed = true;
        reminder.completedAt = new Date().toISOString();
        localStorage.setItem('truck_reminders', JSON.stringify(reminders));
        displayReminders();
        showToast('Reminder completed!');
    }
}

function deleteReminder(id) {
    if (!confirm('Delete this reminder?')) return;

    let reminders = JSON.parse(localStorage.getItem('truck_reminders') || '[]');
    reminders = reminders.filter(r => r.id !== id);
    localStorage.setItem('truck_reminders', JSON.stringify(reminders));

    displayReminders();
    showToast('Reminder deleted');
}

// =====================================
// TIP JAR
// =====================================

function setupTipJar() {
    const toggleBtn = document.getElementById('tipJarToggle');
    const content = document.getElementById('tipJarContent');

    if (toggleBtn && content) {
        toggleBtn.addEventListener('click', () => {
            content.classList.toggle('hidden');

            // Scroll into view when opened
            if (!content.classList.contains('hidden')) {
                content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }
}

// Make functions globally accessible for onclick handlers
window.deletePerDiemEntry = deletePerDiemEntry;
window.completeReminder = completeReminder;
window.deleteReminder = deleteReminder;

// Truck management functions
window.openTruckModal = openTruckModal;
window.closeTruckModal = closeTruckModal;
window.addTruck = addTruck;
window.deleteTruck = deleteTruck;

// Receipt functions
window.viewReceiptPhoto = viewReceiptPhoto;
window.deleteReceipt = deleteReceipt;
window.closeReceiptModal = closeReceiptModal;

// Driver tools
window.setupDriverTools = setupDriverTools;

// Expose display functions for Force Sync
window.displayHistory = displayHistory;
window.loadCompanyInfo = loadCompanyInfo;

