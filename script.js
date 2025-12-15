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
    const dashboardBtn = document.getElementById('dashboardBtn');

    const invoiceFormView = document.getElementById('invoiceFormView');
    const receiptUploadView = document.getElementById('receiptUploadView');
    const historyView = document.getElementById('historyView');
    const expensesView = document.getElementById('expensesView');
    const dashboardView = document.getElementById('dashboardView');

    const searchInput = document.getElementById('searchHistory');
    const navDropdown = document.getElementById('navDropdown');

    const allButtons = [newInvoiceBtn, receiptUploadBtn, historyBtn, expensesBtn, dashboardBtn];
    const allViews = [invoiceFormView, receiptUploadView, historyView, expensesView, dashboardView];

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
            switch(value) {
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

    dashboardBtn.addEventListener('click', () => {
        switchView(dashboardView, dashboardBtn);
        updateDashboard();
        if (navDropdown) navDropdown.value = 'dashboard';
    });

    searchInput.addEventListener('input', (e) => {
        displayHistory(e.target.value);
    });
}

function displayHistory(searchTerm = '') {
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

    // Check for overdue invoices and show alert
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
            ? `Invoice #${invoice.invoiceNumber} marked as PAID ✓`
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
                ${expense.notes ? `<div><strong>Notes:</strong> ${expense.notes}</div>` : ''}
            </div>
            <div class="history-actions">
                <button class="btn-delete" onclick="deleteExpense('${expense.id}')">Delete</button>
            </div>
        </div>
    `).join('');
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

    switch(period) {
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
    const receiptInput = document.getElementById('receiptImage');
    const receiptForm = document.getElementById('receiptForm');
    const previewImage = document.getElementById('previewImage');
    const receiptPreview = document.getElementById('receiptPreview');
    const processBtn = document.getElementById('processReceiptBtn');
    const addAsExpenseBtn = document.getElementById('addAsExpenseBtn');
    const useInInvoiceBtn = document.getElementById('useInInvoiceBtn');
    const fileInputLabel = document.querySelector('.file-input-label');

    if (!fileInputLabel || !receiptInput) {
        return;
    }

    // Make the file input label clickable and enable camera on mobile
    fileInputLabel.addEventListener('click', () => {
        // Check if on mobile and support camera capture
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            // Set to camera capture mode
            receiptInput.setAttribute('capture', 'environment');
        }
        receiptInput.click();
    });

    // Handle file selection and preview
    receiptInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImage.src = event.target.result;
                receiptPreview.classList.remove('hidden');
                processBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // Initialize crop overlay when image is loaded
    previewImage.addEventListener('load', () => {
        setTimeout(() => {
            const previewContainer = document.getElementById('previewContainer');
            const cropOverlay = document.getElementById('cropOverlay');
            
            if (!cropOverlay || !previewContainer) return;
            
            // Reset any previous positioning
            cropOverlay.style.position = 'absolute';
            cropOverlay.style.display = 'block';
            
            // Get the actual displayed image dimensions
            const imgWidth = previewImage.offsetWidth;
            const imgHeight = previewImage.offsetHeight;
            
            // Set default crop to center 80% of image
            const cropWidth = imgWidth * 0.8;
            const cropHeight = imgHeight * 0.8;
            const cropLeft = imgWidth * 0.1;
            const cropTop = imgHeight * 0.1;
            
            cropOverlay.style.left = cropLeft + 'px';
            cropOverlay.style.top = cropTop + 'px';
            cropOverlay.style.width = cropWidth + 'px';
            cropOverlay.style.height = cropHeight + 'px';
            
            // Add resize handles
            cropOverlay.innerHTML = `
                <div class="resize-handle handle-nw"></div>
                <div class="resize-handle handle-n"></div>
                <div class="resize-handle handle-ne"></div>
                <div class="resize-handle handle-e"></div>
                <div class="resize-handle handle-se"></div>
                <div class="resize-handle handle-s"></div>
                <div class="resize-handle handle-sw"></div>
                <div class="resize-handle handle-w"></div>
            `;
            
            // Store crop data
            window.cropRect = {
                left: cropLeft,
                top: cropTop,
                width: cropWidth,
                height: cropHeight,
                imageWidth: imgWidth,
                imageHeight: imgHeight
            };
            
            console.log('Crop initialized:', window.cropRect);
        }, 100); // Small delay to ensure image is fully rendered
    });

    // Simple, reliable crop functionality
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = '';
    let startX, startY, startLeft, startTop, startWidth, startHeight;

    document.addEventListener('mousedown', (e) => {
        const cropOverlay = document.getElementById('cropOverlay');
        if (!cropOverlay || !window.cropRect) return;
        
        if (e.target.classList.contains('resize-handle')) {
            // Resizing
            isResizing = true;
            resizeHandle = e.target.className.split(' ').find(c => c.startsWith('handle-')).replace('handle-', '');
            startX = e.clientX;
            startY = e.clientY;
            startLeft = window.cropRect.left;
            startTop = window.cropRect.top;
            startWidth = window.cropRect.width;
            startHeight = window.cropRect.height;
            e.preventDefault();
        } else if (e.target === cropOverlay) {
            // Dragging
            isDragging = true;
            const rect = cropOverlay.getBoundingClientRect();
            const containerRect = document.getElementById('previewContainer').getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = window.cropRect.left;
            startTop = window.cropRect.top;
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!window.cropRect) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const cropOverlay = document.getElementById('cropOverlay');
        
        if (isDragging) {
            const newLeft = Math.max(0, Math.min(window.cropRect.imageWidth - window.cropRect.width, startLeft + deltaX));
            const newTop = Math.max(0, Math.min(window.cropRect.imageHeight - window.cropRect.height, startTop + deltaY));
            
            cropOverlay.style.left = newLeft + 'px';
            cropOverlay.style.top = newTop + 'px';
            window.cropRect.left = newLeft;
            window.cropRect.top = newTop;
            
        } else if (isResizing) {
            let newLeft = startLeft;
            let newTop = startTop;
            let newWidth = startWidth;
            let newHeight = startHeight;
            
            const minSize = 20;
            
            if (resizeHandle.includes('e')) {
                newWidth = Math.max(minSize, Math.min(window.cropRect.imageWidth - startLeft, startWidth + deltaX));
            }
            if (resizeHandle.includes('s')) {
                newHeight = Math.max(minSize, Math.min(window.cropRect.imageHeight - startTop, startHeight + deltaY));
            }
            if (resizeHandle.includes('w')) {
                newWidth = Math.max(minSize, startWidth - deltaX);
                newLeft = Math.max(0, startLeft + startWidth - newWidth);
            }
            if (resizeHandle.includes('n')) {
                newHeight = Math.max(minSize, startHeight - deltaY);
                newTop = Math.max(0, startTop + startHeight - newHeight);
            }
            
            cropOverlay.style.left = newLeft + 'px';
            cropOverlay.style.top = newTop + 'px';
            cropOverlay.style.width = newWidth + 'px';
            cropOverlay.style.height = newHeight + 'px';
            
            window.cropRect.left = newLeft;
            window.cropRect.top = newTop;
            window.cropRect.width = newWidth;
            window.cropRect.height = newHeight;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
        resizeHandle = '';
    });

    // Handle receipt processing
    receiptForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const file = receiptInput.files[0];
        if (file) {
            processReceiptWithOCR(file);
        }
    });

    // Add as expense button
    addAsExpenseBtn.addEventListener('click', () => {
        const vendor = document.getElementById('extractedVendor').value || 'Receipt Upload';
        const amount = parseFloat(document.getElementById('extractedAmount').value) || 0;
        const date = document.getElementById('extractedDate').value || new Date().toISOString().split('T')[0];
        const category = document.getElementById('extractedCategory').value || 'other';

        // Add to expenses
        const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        const newExpense = {
            id: Date.now(),
            date: date,
            amount: amount,
            category: category,
            vendor: vendor,
            notes: 'Added from receipt upload'
        };
        expenses.push(newExpense);
        localStorage.setItem('expenses', JSON.stringify(expenses));

        alert('Expense added successfully!');
        resetReceiptForm();
    });

    // Use in invoice button
    useInInvoiceBtn.addEventListener('click', () => {
        const vendor = document.getElementById('extractedVendor').value;
        const amount = parseFloat(document.getElementById('extractedAmount').value) || 0;

        // Switch to invoice form and populate
        document.getElementById('receiptUploadBtn').classList.remove('active');
        document.getElementById('invoiceFormView').classList.add('active');
        document.getElementById('newInvoiceBtn').classList.add('active');

        // Populate with extracted data
        if (vendor) {
            document.getElementById('customerName').value = vendor;
        }
        document.getElementById('amount').value = amount.toFixed(2);

        // Hide receipt view
        document.getElementById('receiptUploadView').classList.remove('active');

        resetReceiptForm();
    });
}

// Process receipt image with Tesseract OCR
async function processReceiptWithOCR(file) {
    const ocrStatus = document.getElementById('ocrStatus');
    const ocrResults = document.getElementById('ocrResults');
    const ocrMessage = document.getElementById('ocrMessage');
    const processBtn = document.getElementById('processReceiptBtn');

    // Show processing status
    ocrStatus.classList.remove('hidden');
    ocrResults.classList.add('hidden');
    processBtn.classList.add('hidden');
    ocrMessage.textContent = 'Processing receipt with OCR... This may take a moment.';

    try {
        // Apply crop if crop area is defined
        let processedFile = file;
        if (window.cropRect) {
            try {
                processedFile = await applyCrop(file);
                console.log('Applied crop to image before OCR');
            } catch (cropError) {
                console.warn('Crop failed, using original image:', cropError);
            }
        }

        // Read file as data URL
        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target.result;

            try {
                // Use Tesseract to extract text
                const result = await Tesseract.recognize(
                    imageData,
                    'eng',
                    {
                        logger: (m) => {
                            if (m.status === 'recognizing') {
                                ocrMessage.textContent = `Processing... ${Math.round(m.progress * 100)}%`;
                            }
                        }
                    }
                );

                const extractedText = result.data.text;
                console.log('Extracted text:', extractedText);

                // Parse extracted data
                const parsedData = parseReceiptData(extractedText);

                // Display results
                document.getElementById('extractedVendor').value = parsedData.vendor;
                document.getElementById('extractedAmount').value = parsedData.amount;
                document.getElementById('extractedDate').value = parsedData.date;
                document.getElementById('extractedCategory').value = parsedData.category;

                ocrStatus.classList.add('hidden');
                ocrResults.classList.remove('hidden');
            } catch (error) {
                console.error('OCR Error:', error);
                ocrMessage.textContent = 'Error processing image. Please try again with a clearer photo.';
            }
        };
        reader.readAsDataURL(processedFile);
    } catch (error) {
        console.error('File reading error:', error);
        alert('Error reading file. Please try again.');
    }
}

// Apply crop to an image file based on current crop selection
async function applyCrop(file) {
    return new Promise((resolve, reject) => {
        if (!window.cropRect) {
            console.log('No crop area defined, using original image');
            resolve(file);
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate scale factors from displayed image to natural image size
                const scaleX = img.naturalWidth / window.cropRect.imageWidth;
                const scaleY = img.naturalHeight / window.cropRect.imageHeight;
                
                // Convert crop coordinates to natural image coordinates
                const cropX = Math.round(window.cropRect.left * scaleX);
                const cropY = Math.round(window.cropRect.top * scaleY);
                const cropW = Math.round(window.cropRect.width * scaleX);
                const cropH = Math.round(window.cropRect.height * scaleY);
                
                console.log('Applying crop:', {
                    original: { w: img.naturalWidth, h: img.naturalHeight },
                    displayed: { w: window.cropRect.imageWidth, h: window.cropRect.imageHeight },
                    crop: { x: cropX, y: cropY, w: cropW, h: cropH },
                    scale: { x: scaleX, y: scaleY }
                });
                
                // Set canvas to cropped size
                canvas.width = cropW;
                canvas.height = cropH;
                
                // Draw cropped portion
                ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                
                // Convert to blob and create new file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const croppedFile = new File([blob], 'cropped_' + file.name, { type: 'image/jpeg' });
                        console.log('Created cropped file:', croppedFile.size, 'bytes');
                        resolve(croppedFile);
                    } else {
                        reject(new Error('Failed to create cropped image'));
                    }
                }, 'image/jpeg', 0.9);
            } catch (err) {
                console.error('Crop failed:', err);
                reject(err);
            } finally {
                URL.revokeObjectURL(url);
            }
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        
        img.src = url;
    });
}

// Parse receipt data from OCR text
function parseReceiptData(text) {
    console.log('=== PARSING OCR TEXT ===');
    console.log('Raw OCR text:', text);
    
    // Default values
    let vendor = 'Unknown Vendor';
    let amount = '0.00';
    let date = new Date().toISOString().split('T')[0];
    let category = 'other';

    if (!text || text.trim().length === 0) {
        console.log('No text to parse');
        return { vendor, amount, date, category };
    }

    // Clean and split text into lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('Lines:', lines);

    // Extract vendor - look for business names in first few lines
    const businessKeywords = [
        'PILOT', 'FLYING J', 'LOVES', "LOVE'S", 'TA', 'PETRO', 'SHELL', 'EXXON', 
        'CHEVRON', 'BP', 'MOBIL', 'SPEEDWAY', 'MARATHON', 'VALERO', 'CIRCLE K',
        'WALMART', 'TARGET', 'MCDONALD', 'SUBWAY', 'KFC', 'BURGER KING'
    ];

    // Look for vendor in first 5 lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].toUpperCase();
        
        // Check for known businesses
        for (const business of businessKeywords) {
            if (line.includes(business)) {
                vendor = lines[i]; // Use original case
                console.log('Found vendor:', vendor);
                break;
            }
        }
        
        if (vendor !== 'Unknown Vendor') break;
        
        // If no known business, look for lines with letters (not just numbers/symbols)
        if (lines[i].length > 3 && /[A-Za-z]{3,}/.test(lines[i]) && 
            !/^\d/.test(lines[i]) && !/(RECEIPT|TOTAL|DATE|TIME)/i.test(lines[i])) {
            vendor = lines[i];
            console.log('Vendor from text line:', vendor);
            break;
        }
    }

    // Extract amount - look for dollar amounts with better patterns
    const amountPatterns = [
        /(?:TOTAL|AMOUNT|SALE|BALANCE|DUE)[\s:]*\$?\s*([\d,]+\.\d{2})/gi,
        /\$\s*([\d,]+\.\d{2})/g,
        /(?:^|\s)([\d,]+\.\d{2})\s*$/gm
    ];

    const foundAmounts = [];
    
    for (const pattern of amountPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const amt = parseFloat(match[1].replace(/,/g, ''));
            if (amt > 0.01 && amt < 10000) { // Reasonable amount range
                foundAmounts.push({ amount: amt, context: match[0] });
                console.log('Found amount:', amt, 'in context:', match[0]);
            }
        }
    }

    // Use the largest labeled amount, or largest amount if no labels
    if (foundAmounts.length > 0) {
        const labeledAmount = foundAmounts.find(a => /total|amount|sale|balance|due/i.test(a.context));
        if (labeledAmount) {
            amount = labeledAmount.amount.toFixed(2);
            console.log('Using labeled amount:', amount);
        } else {
            amount = Math.max(...foundAmounts.map(a => a.amount)).toFixed(2);
            console.log('Using largest amount:', amount);
        }
    }

    // Extract date
    const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
        /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{1,2}),?\s+(\d{4})/i
    ];

    for (const pattern of datePatterns) {
        const dateMatch = pattern.exec(text);
        if (dateMatch) {
            try {
                if (dateMatch[0].match(/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/i)) {
                    // Handle month name format
                    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                    const monthAbbr = dateMatch[1].toUpperCase().substring(0, 3);
                    const month = String(monthNames.indexOf(monthAbbr) + 1).padStart(2, '0');
                    const day = dateMatch[2].padStart(2, '0');
                    const year = dateMatch[3];
                    date = `${year}-${month}-${day}`;
                    console.log('Found date (month name):', date);
                } else if (dateMatch[1].length === 4) {
                    // YYYY/MM/DD format
                    const year = dateMatch[1];
                    const month = dateMatch[2].padStart(2, '0');
                    const day = dateMatch[3].padStart(2, '0');
                    date = `${year}-${month}-${day}`;
                    console.log('Found date (YYYY-MM-DD):', date);
                } else {
                    // MM/DD/YYYY format
                    let month = dateMatch[1].padStart(2, '0');
                    let day = dateMatch[2].padStart(2, '0');
                    let year = dateMatch[3];
                    
                    if (year.length === 2) {
                        year = '20' + year;
                    }
                    
                    // If month > 12, assume DD/MM format
                    if (parseInt(month) > 12) {
                        [month, day] = [day, month];
                    }
                    
                    date = `${year}-${month}-${day}`;
                    console.log('Found date (MM-DD-YYYY):', date);
                }
                break;
            } catch (e) {
                console.log('Date parsing error:', e);
            }
        }
    }

    // Determine category based on vendor and keywords
    const upperText = text.toUpperCase();
    const upperVendor = vendor.toUpperCase();
    
    if (upperText.includes('FUEL') || upperText.includes('GAS') || upperText.includes('DIESEL') ||
        upperVendor.includes('PILOT') || upperVendor.includes('FLYING J') || upperVendor.includes('LOVES') ||
        upperVendor.includes('SHELL') || upperVendor.includes('EXXON') || upperVendor.includes('CHEVRON') ||
        upperVendor.includes('BP') || upperVendor.includes('MOBIL')) {
        category = 'fuel';
    } else if (upperText.includes('FOOD') || upperText.includes('RESTAURANT') ||
               upperVendor.includes('MCDONALD') || upperVendor.includes('SUBWAY') ||
               upperVendor.includes('BURGER') || upperVendor.includes('KFC')) {
        category = 'food';
    } else if (upperText.includes('MAINTENANCE') || upperText.includes('REPAIR') || 
               upperText.includes('OIL') || upperText.includes('TIRE')) {
        category = 'maintenance';
    } else if (upperText.includes('TOLL') || upperText.includes('PARKING')) {
        category = 'tolls';
    }

    const result = { vendor, amount, date, category };
    console.log('=== PARSE RESULT ===');
    console.log(result);
    
    return result;
}

    // Convert text to uppercase for easier matching
    const upperText = text.toUpperCase();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    console.log('OCR Extracted Text:', text);
    console.log('Lines:', lines);

    // Extract vendor name - look for common fuel stations and businesses
    const fuelStations = ['PILOT', 'FLYING J', 'LOVES', "LOVE'S", 'TA', 'TRAVEL CENTER', 'PETRO',
                          'SHELL', 'EXXON', 'CHEVRON', 'BP', 'MOBIL', 'SPEEDWAY', 'MARATHON',
                          'VALERO', 'CIRCLE K', 'WAWA', 'SHEETZ', 'CASEY'];

    // Try to find vendor in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        const upperLine = line.toUpperCase();

        // Check for fuel stations
        for (const station of fuelStations) {
            if (upperLine.includes(station)) {
                vendor = line;
                category = 'fuel';
                break;
            }
        }

        // If vendor found, break
        if (vendor !== 'Unknown Vendor') break;

        // Otherwise, use first non-empty line that's not a number or address
        if (line.length > 3 && line.length < 50 && !/^\d+$/.test(line) && !upperLine.includes('RECEIPT')) {
            vendor = line;
        }
    }

    // Look for dollar amounts - improved pattern matching
    const amountPatterns = [
        /(?:TOTAL|AMOUNT|SALE|PURCHASE|DUE)[\s:]*\$?\s*(\d+\.\d{2})/i,  // "TOTAL: $50.00" or "TOTAL 50.00"
        /\$\s*(\d+\.\d{2})\s*(?:TOTAL|AMOUNT|SALE|PURCHASE)/i,           // "$50.00 TOTAL"
        /(?:^|\s)\$\s*(\d+\.\d{2})(?:\s|$)/gm,                           // Standalone "$50.00"
        /(?:^|\s)(\d+\.\d{2})\s*(?:USD|US)?(?:\s|$)/gm                   // "50.00" or "50.00 USD"
    ];

    const amounts = [];

    // Try specific patterns first (TOTAL, AMOUNT, etc.)
    for (let i = 0; i < 2; i++) {
        const match = amountPatterns[i].exec(text);
        if (match) {
            amounts.push(parseFloat(match[1]));
        }
    }

    // If no specific amount found, get all dollar amounts
    if (amounts.length === 0) {
        let match;
        const generalPattern = /\$?\s*(\d{1,5}\.\d{2})/g;
        while ((match = generalPattern.exec(text)) !== null) {
            const val = parseFloat(match[1]);
            // Filter out unrealistic amounts (likely dates or other numbers)
            if (val > 0.50 && val < 10000) {
                amounts.push(val);
            }
        }
    }

    // For fuel receipts, look for "FUEL SALE" or "TOTAL SALE" amounts specifically
    if (category === 'fuel') {
        const fuelPattern = /(?:FUEL\s+SALE|TOTAL\s+SALE|PRODUCT\s+TOTAL)[\s:]*\$?\s*(\d+\.\d{2})/i;
        const fuelMatch = fuelPattern.exec(text);
        if (fuelMatch) {
            amount = parseFloat(fuelMatch[1]).toFixed(2);
        } else if (amounts.length > 0) {
            // Use the largest amount for fuel (usually the total)
            amount = Math.max(...amounts).toFixed(2);
        }
    } else {
        // For other receipts, prefer amounts labeled as "TOTAL" or use the largest
        if (amounts.length > 0) {
            amount = Math.max(...amounts).toFixed(2);
        }
    }

    // Try to extract date (multiple formats)
    const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,           // MM/DD/YYYY or DD/MM/YYYY
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,             // YYYY/MM/DD
        /(\d{2})(\d{2})(\d{2,4})/,                           // MMDDYY or MMDDYYYY
        /(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{1,2}),?\s+(\d{4})/i  // "JAN 15, 2024"
    ];

    for (const pattern of datePatterns) {
        const dateMatch = pattern.exec(text);
        if (dateMatch) {
            try {
                if (dateMatch[0].match(/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/i)) {
                    // Month name format
                    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                    const monthMatch = dateMatch[0].match(/JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC/i)[0].toUpperCase().substring(0, 3);
                    const month = String(monthNames.indexOf(monthMatch) + 1).padStart(2, '0');
                    const day = dateMatch[1].padStart(2, '0');
                    const year = dateMatch[2];
                    date = `${year}-${month}-${day}`;
                } else if (dateMatch[1].length === 4) {
                    // YYYY/MM/DD format
                    const year = dateMatch[1];
                    const month = dateMatch[2].padStart(2, '0');
                    const day = dateMatch[3].padStart(2, '0');
                    date = `${year}-${month}-${day}`;
                } else {
                    // MM/DD/YYYY or similar
                    let month = dateMatch[1].padStart(2, '0');
                    let day = dateMatch[2].padStart(2, '0');
                    let year = dateMatch[3];

                    if (year.length === 2) {
                        year = '20' + year;
                    }

                    // If month > 12, swap month and day (DD/MM format)
                    if (parseInt(month) > 12) {
                        [month, day] = [day, month];
                    }

                    date = `${year}-${month}-${day}`;
                }
                break;
            } catch (e) {
                console.log('Date parsing error:', e);
            }
        }
    }

    // Enhanced categorization based on keywords
    if (upperText.includes('FUEL') || upperText.includes('GAS') || upperText.includes('DIESEL') ||
        upperText.includes('SHELL') || upperText.includes('PILOT') || upperText.includes('FLYING J') ||
        upperText.includes('LOVE') || upperText.includes('SPEEDWAY') || upperText.includes('TA ') ||
        upperText.includes('PETRO') || upperText.includes('EXXON') || upperText.includes('CHEVRON') ||
        upperText.includes('BP ') || upperText.includes('MOBIL') || upperText.includes('MARATHON') ||
        upperText.includes('VALERO') || upperText.includes('CIRCLE K') || upperText.includes('GALLONS')) {
        category = 'fuel';
    } else if (upperText.includes('MAINTENANCE') || upperText.includes('OIL CHANGE') ||
               upperText.includes('TIRE') || upperText.includes('REPAIR') || upperText.includes('SERVICE')) {
        category = 'maintenance';
    } else if (upperText.includes('TOLL') || upperText.includes('PARKING')) {
        category = 'tolls';
    } else if (upperText.includes('FOOD') || upperText.includes('RESTAURANT') ||
               upperText.includes('DINER') || upperText.includes('CAFE') || upperText.includes('MCDONALD') ||
               upperText.includes('BURGER') || upperText.includes('SUBWAY') || upperText.includes('WENDY')) {
        category = 'food';
    } else if (upperText.includes('INSURANCE')) {
        category = 'insurance';
    } else if (upperText.includes('HOTEL') || upperText.includes('MOTEL') || upperText.includes('INN')) {
        category = 'other';
    }

    console.log('Parsed Data:', { vendor, amount, date, category });

    return {
        vendor: vendor,
        amount: amount,
        date: date,
        category: category
    };

// Reset receipt form
function resetReceiptForm() {
    document.getElementById('receiptForm').reset();
    document.getElementById('receiptPreview').classList.add('hidden');
    document.getElementById('ocrStatus').classList.add('hidden');
    document.getElementById('ocrResults').classList.add('hidden');
    document.getElementById('processReceiptBtn').classList.add('hidden');
}

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

