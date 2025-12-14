// Initialize EmailJS
emailjs.init('flEWLVoiJ1uMBZgnW');

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

    const categoryLabels = {
        fuel: 'Fuel',
        maintenance: 'Maintenance & Repairs',
        tolls: 'Tolls & Parking',
        food: 'Food & Meals',
        insurance: 'Insurance',
        permits: 'Permits & Licenses',
        truck_payment: 'Truck Payment/Lease',
        supplies: 'Supplies',
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

    const categoryLabels = {
        fuel: 'Fuel',
        maintenance: 'Maintenance & Repairs',
        tolls: 'Tolls & Parking',
        food: 'Food & Meals',
        insurance: 'Insurance',
        permits: 'Permits & Licenses',
        truck_payment: 'Truck Payment/Lease',
        supplies: 'Supplies',
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
    const rawOcrText = document.getElementById('rawOcrText');
    const copyRawBtn = document.getElementById('copyRawBtn');
    const saveRawExpenseBtn = document.getElementById('saveRawExpenseBtn');

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
                // Save original data and file for crop/reset
                window._originalDataURL = event.target.result;
                window._originalFile = file;
                window._croppedDataURL = null;
                receiptPreview.classList.remove('hidden');
                processBtn.classList.remove('hidden');
                // Clear any previous processed canvases
                window._lastProcessed = null;
                // Ensure toggle state is applied (defaults to original)
                const toggle = document.getElementById('showPreprocessed');
                if (toggle) toggle.checked = false;
                // Reset crop UI
                const applyBtn = document.getElementById('applyCropBtn');
                const applyProcessBtn = document.getElementById('applyCropProcessBtn');
                const resetBtn = document.getElementById('resetCropBtn');
                if (applyBtn) applyBtn.disabled = true;
                if (applyProcessBtn) applyProcessBtn.disabled = true;
                if (resetBtn) resetBtn.disabled = true;
            };
            reader.readAsDataURL(file);
        }
    });

    // Prefer cropped image when submitting the receipt form
    receiptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        let fileToProcess = null;
        if (window._croppedDataURL) {
            const blob = await (await fetch(window._croppedDataURL)).blob();
            fileToProcess = new File([blob], 'cropped.jpg', { type: blob.type });
        } else if (receiptInput.files && receiptInput.files[0]) {
            fileToProcess = receiptInput.files[0];
        } else if (window._originalFile) {
            fileToProcess = window._originalFile;
        }

        if (fileToProcess) {
            await processReceiptWithOCR(fileToProcess);
        } else {
            alert('No receipt image selected.');
        }
    });

    // Copy raw OCR text to clipboard
    if (copyRawBtn) {
        copyRawBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(rawOcrText.value || '');
                alert('Raw OCR text copied to clipboard');
            } catch (e) {
                alert('Unable to copy text. You can select and copy manually.');
            }
        });
    }

    // Save raw OCR text as an expense (verbatim)
    if (saveRawExpenseBtn) {
        saveRawExpenseBtn.addEventListener('click', () => {
            const rawText = rawOcrText.value || '';
            if (!rawText.trim()) {
                alert('No OCR text available to save. Please process an image first.');
                return;
            }

            // Ask user for category (use selected extractedCategory if present)
            const categorySelect = document.getElementById('extractedCategory');
            const category = (categorySelect && categorySelect.value) ? categorySelect.value : 'other';

            // Try to derive a vendor from first meaningful line
            const firstLine = rawText.split('\n').map(l => l.trim()).find(l => l.length > 2 && !/^[-_]{2,}/.test(l));
            const vendor = firstLine || 'Receipt Upload';

            // Try to parse amount if present
            const amount = parseAmountFromText(rawText) || 0;

            const dateInput = document.getElementById('extractedDate');
            const date = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().split('T')[0];

            const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
            const newExpense = {
                id: Date.now(),
                date: date,
                amount: amount,
                category: category,
                vendor: vendor,
                notes: rawText
            };
            expenses.push(newExpense);
            localStorage.setItem('expenses', JSON.stringify(expenses));

            alert('Raw OCR text saved as expense. Review in Expenses.');
            resetReceiptForm();
        });
    }

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

    // Retry amount detection using an aggressive numeric-only pass
    const retryAmountBtn = document.getElementById('retryAmountBtn');
    if (retryAmountBtn) {
        retryAmountBtn.addEventListener('click', async () => {
            const file = receiptInput.files[0];
            if (!file) { alert('No receipt loaded. Please select an image first.'); return; }
            retryAmountBtn.disabled = true;
            const ocrMessage = document.getElementById('ocrMessage');
            ocrMessage.textContent = 'Retrying amount detection...';

            try {
                const dataURL = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const { binaryCanvas, grayscaleCanvas } = await preprocessImage(dataURL);
                const worker = await getTesseractWorker();

                // Temporarily set PSM to single-block and restrict chars to numeric + $ and comma/period
                await worker.setParameters({ 'tessedit_pageseg_mode': '6', 'tessedit_char_whitelist': '0123456789$.,' });

                const canvasForBottom = grayscaleCanvas;
                const bottomCanvas = cropCanvas(canvasForBottom, 0, Math.floor(canvasForBottom.height * 0.5), canvasForBottom.width, Math.floor(canvasForBottom.height * 0.5));
                const bottomRes = await worker.recognize(bottomCanvas);
                const bottomText = (bottomRes && bottomRes.data) ? bottomRes.data.text || '' : '';
                const bottomAmount = parseAmountFromText(bottomText);
                if (bottomAmount) {
                    document.getElementById('extractedAmount').value = parseFloat(bottomAmount).toFixed(2);
                    document.getElementById('rawOcrText').value = (document.getElementById('rawOcrText').value || '') + '\n\n-- Retry Amount Detection --\n' + bottomText;
                    alert('Amount re-detected and updated');
                } else {
                    alert('Could not find a better amount on retry');
                }

                // Restore sensible PSM/whitelist
                await worker.setParameters({ 'tessedit_pageseg_mode': '3', 'tessedit_char_whitelist': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$.,:-/ ' });
            } catch (e) {
                console.warn('Retry amount detection failed', e);
                alert('Retry failed. Try a clearer photo or edit the amount manually.');
            } finally {
                retryAmountBtn.disabled = false;
                ocrMessage.textContent = '';
            }
        });
    }

    // Hook up preview toggle to switch between original and preprocessed canvases
    const previewToggle = document.getElementById('showPreprocessed');
    if (previewToggle) {
        previewToggle.addEventListener('change', () => {
            try {
                const last = window._lastProcessed;
                if (previewToggle.checked && last && last.binaryCanvas) {
                    previewImage.src = last.binaryCanvas.toDataURL();
                } else if (last && last.grayscaleCanvas) {
                    // If not checked but we have processed canvas, show grayscale version
                    previewImage.src = last.grayscaleCanvas.toDataURL();
                } else {
                    // Fallback to original file if available
                    const file = receiptInput.files[0];
                    if (file) {
                        const r = new FileReader();
                        r.onload = (e) => previewImage.src = e.target.result;
                        r.readAsDataURL(file);
                    }
                }
            } catch (e) { /* ignore */ }
        });
    }

    // CROPPING UI
    const previewContainer = document.getElementById('previewContainer');
    const cropOverlay = document.getElementById('cropOverlay');
    const startCropBtn = document.getElementById('startCropBtn');
    const applyCropBtn = document.getElementById('applyCropBtn');
    const applyCropProcessBtn = document.getElementById('applyCropProcessBtn');
    const resetCropBtn = document.getElementById('resetCropBtn');

    let cropping = false;
    let cropStart = null;
    let cropRect = null;

    function toImageCoords(clientX, clientY) {
        const imgRect = previewImage.getBoundingClientRect();
        const x = Math.max(0, Math.min(imgRect.width, clientX - imgRect.left));
        const y = Math.max(0, Math.min(imgRect.height, clientY - imgRect.top));
        return { x, y, imgRect };
    }

    startCropBtn.addEventListener('click', () => {
        cropping = true;
        cropOverlay.style.display = 'none';
        cropOverlay.style.left = '0px';
        cropOverlay.style.top = '0px';
        cropOverlay.style.width = '0px';
        cropOverlay.style.height = '0px';
        cropStart = null;
        previewContainer.style.cursor = 'crosshair';
        // enable reset button when cropping started
        if (resetCropBtn) resetCropBtn.disabled = false;
    });

    previewContainer.addEventListener('mousedown', (e) => {
        if (!cropping) return;
        const { x, y } = toImageCoords(e.clientX, e.clientY);
        cropStart = { x, y };
        cropOverlay.style.left = `${x}px`;
        cropOverlay.style.top = `${y}px`;
        cropOverlay.style.width = '0px';
        cropOverlay.style.height = '0px';
        cropOverlay.style.display = 'block';
    });

    window.addEventListener('mousemove', (e) => {
        if (!cropping || !cropStart) return;
        const { x, y } = toImageCoords(e.clientX, e.clientY);
        const left = Math.min(cropStart.x, x);
        const top = Math.min(cropStart.y, y);
        const width = Math.abs(cropStart.x - x);
        const height = Math.abs(cropStart.y - y);
        cropOverlay.style.left = `${left}px`;
        cropOverlay.style.top = `${top}px`;
        cropOverlay.style.width = `${width}px`;
        cropOverlay.style.height = `${height}px`;
    });

    window.addEventListener('mouseup', (e) => {
        if (!cropping || !cropStart) return;
        const { x, y, imgRect } = toImageCoords(e.clientX, e.clientY);
        const left = Math.min(cropStart.x, x);
        const top = Math.min(cropStart.y, y);
        const width = Math.abs(cropStart.x - x);
        const height = Math.abs(cropStart.y - y);
        // store normalized crop in displayed pixels
        cropRect = { left, top, width, height, imgRect };
        cropping = false;
        cropStart = null;
        previewContainer.style.cursor = 'default';
        if (applyCropBtn) applyCropBtn.disabled = false;
        if (applyCropProcessBtn) applyCropProcessBtn.disabled = false;
    });

    function applyCrop() {
        if (!cropRect || !cropRect.width || !cropRect.height) return null;
        const img = previewImage;
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;
        const dispW = cropRect.imgRect.width;
        const dispH = cropRect.imgRect.height;
        const sx = Math.round((cropRect.left / dispW) * naturalW);
        const sy = Math.round((cropRect.top / dispH) * naturalH);
        const sw = Math.round((cropRect.width / dispW) * naturalW);
        const sh = Math.round((cropRect.height / dispH) * naturalH);
        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        // If previewImage is currently a processed dataURL, draw image from that source
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const dataURL = canvas.toDataURL('image/jpeg', 0.9);
        window._croppedDataURL = dataURL;
        // update preview to cropped image
        previewImage.src = dataURL;
        // clear processed caches
        window._lastProcessed = null;
        // disable apply until next selection
        if (applyCropBtn) applyCropBtn.disabled = true;
        if (applyCropProcessBtn) applyCropProcessBtn.disabled = true;
        cropOverlay.style.display = 'none';
        return dataURL;
    }

    if (applyCropBtn) {
        applyCropBtn.addEventListener('click', () => {
            applyCrop();
            // enable reset
            if (resetCropBtn) resetCropBtn.disabled = false;
        });
    }

    if (applyCropProcessBtn) {
        applyCropProcessBtn.addEventListener('click', async () => {
            const dataURL = applyCrop();
            if (!dataURL) { alert('No crop selected'); return; }
            // convert to File and process
            const blob = await (await fetch(dataURL)).blob();
            const file = new File([blob], 'cropped.jpg', { type: blob.type });
            // call OCR directly
            await processReceiptWithOCR(file);
        });
    }

    if (resetCropBtn) {
        resetCropBtn.addEventListener('click', () => {
            // restore original preview
            if (window._originalDataURL) previewImage.src = window._originalDataURL;
            window._croppedDataURL = null;
            window._lastProcessed = null;
            cropOverlay.style.display = 'none';
            cropRect = null;
            if (applyCropBtn) applyCropBtn.disabled = true;
            if (applyCropProcessBtn) applyCropProcessBtn.disabled = true;
            resetCropBtn.disabled = true;
        });
    }
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
        // Read file as data URL and preprocess image for better OCR
        const dataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // Preprocess image (grayscale, increase contrast, adaptive threshold)
        const { binaryCanvas, grayscaleCanvas } = await preprocessImage(dataURL);

        // Store processed canvases for preview and retry use
        window._lastProcessed = { binaryCanvas, grayscaleCanvas };
        // Optionally show the preprocessed preview to the user for debugging if toggle is set
        try {
            const previewImage = document.getElementById('previewImage');
            const previewToggle = document.getElementById('showPreprocessed');
            if (previewToggle && previewToggle.checked) {
                previewImage.src = binaryCanvas.toDataURL();
            } else {
                // show grayscale by default when using preprocessed preview logic for OCR result
                previewImage.src = grayscaleCanvas.toDataURL();
            }
        } catch (e) {
            // ignore
        }

        // Use a Tesseract worker for better control and parameters
        const worker = await getTesseractWorker((m) => {
            // Update progress UI
            if (m.status && (m.status.includes('recogniz') || m.status.includes('analyz'))) {
                ocrMessage.textContent = `Processing... ${Math.round((m.progress || 0) * 100)}%`;
            }
        });

        // Try recognizing on binary (thresholded) first, then grayscale as a fallback
        const binaryRes = await worker.recognize(binaryCanvas);
        const grayRes = await worker.recognize(grayscaleCanvas);

        // Choose result with higher mean word confidence
        const meanConfidence = (res) => {
            if (!res || !res.data || !res.data.words || res.data.words.length === 0) return 0;
            const ws = res.data.words;
            return ws.reduce((s, w) => s + (w.confidence || 0), 0) / ws.length;
        };

        const binConf = meanConfidence(binaryRes);
        const grayConf = meanConfidence(grayRes);
        const chosen = binConf >= grayConf ? binaryRes : grayRes;
        let extractedText = (chosen && chosen.data && chosen.data.text) ? chosen.data.text : (binaryRes.data.text || grayRes.data.text || '');
        console.log('Chosen OCR source:', binConf >= grayConf ? 'binary' : 'grayscale', 'conf:', Math.max(binConf, grayConf));
        console.log('Extracted text:', extractedText);

        // Parse extracted data with improved heuristics using word-level info
        const parsedData = parseReceiptData(extractedText, chosen && chosen.data ? chosen.data : null, (chosen === binaryRes ? binaryCanvas : grayscaleCanvas));

        // If amount wasn't found or is zero, try a focused pass on the bottom of the receipt (where totals usually are)
        try {
            const parsedAmount = parseFloat(parsedData.amount || '0');
            if (!parsedAmount || parsedAmount < 0.5) {
                const canvasForBottom = (chosen === binaryRes ? binaryCanvas : grayscaleCanvas);
                const bottomCanvas = cropCanvas(canvasForBottom, 0, Math.floor(canvasForBottom.height * 0.6), canvasForBottom.width, Math.floor(canvasForBottom.height * 0.4));
                const bottomRes = await worker.recognize(bottomCanvas);
                const bottomText = bottomRes && bottomRes.data ? bottomRes.data.text || '' : '';
                console.log('Bottom region text:', bottomText);
                const bottomAmount = parseAmountFromText(bottomText);
                if (bottomAmount) {
                    parsedData.amount = bottomAmount.toFixed(2);
                } else {
                    // As a last resort, try a numeric-only search on the whole text
                    const fallback = parseAmountFromText(extractedText);
                    if (fallback) parsedData.amount = fallback.toFixed(2);
                }
            }
        } catch (e) {
            console.warn('Bottom-pass amount detection failed', e);
        }

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
        processBtn.classList.remove('hidden');
    }
}

// Create or return a cached Tesseract worker with sensible params
let _tesseractWorker = null;
async function getTesseractWorker(logger) {
    if (_tesseractWorker) return _tesseractWorker;

    const worker = Tesseract.createWorker({ logger });
    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    // Improve recognition for receipts
    await worker.setParameters({
        'user_defined_dpi': '300',
        'tessedit_char_whitelist': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$.,:-/ ',
        'preserve_interword_spaces': '1',
        'tessedit_pageseg_mode': '3'
    });

    _tesseractWorker = worker;
    return worker;
}

// Cleanup worker on unload
window.addEventListener('beforeunload', async () => {
    if (_tesseractWorker) {
        try { await _tesseractWorker.terminate(); } catch (e) { /* ignore */ }
    }
});

// Simple preprocessing: scale, grayscale, increase contrast, and apply threshold
async function preprocessImage(dataURL) {
    // Returns both a binary (thresholded) canvas and a grayscale canvas
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // Resize up to a reasonable range to help OCR on small images
            const maxDim = 2000;
            const minDim = 900;
            let width = img.width;
            let height = img.height;

            // Upscale small images to improve recognition
            if (Math.max(width, height) < minDim) {
                const scale = minDim / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            } else if (Math.max(width, height) > maxDim) {
                const scale = maxDim / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }

            const canvasGray = document.createElement('canvas');
            canvasGray.width = width;
            canvasGray.height = height;
            const ctx = canvasGray.getContext('2d');

            // Draw original and get grayscale image
            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            // Convert to grayscale
            for (let i = 0; i < data.length; i += 4) {
                const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                data[i] = data[i + 1] = data[i + 2] = gray;
            }

            // Apply a light median filter to reduce salt-and-pepper noise
            const filtered = medianFilter(imageData, width, height);
            ctx.putImageData(filtered, 0, 0);

            // Create a binary canvas using adaptive thresholding
            const binaryCanvas = adaptiveThreshold(canvasGray, 32, 10);

            resolve({ binaryCanvas, grayscaleCanvas: canvasGray });
        };
        img.onerror = reject;
        img.src = dataURL;
    });
}

// Simple 3x3 median filter on ImageData; returns new ImageData
function medianFilter(imageData, width, height) {
    const src = imageData.data;
    const out = new Uint8ClampedArray(src.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const vals = [];
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    const nx = Math.min(width - 1, Math.max(0, x + ox));
                    const ny = Math.min(height - 1, Math.max(0, y + oy));
                    const idx = (ny * width + nx) * 4;
                    vals.push(src[idx]);
                }
            }
            vals.sort((a, b) => a - b);
            const m = vals[4];
            const idxOut = (y * width + x) * 4;
            out[idxOut] = out[idxOut + 1] = out[idxOut + 2] = m;
            out[idxOut + 3] = 255;
        }
    }
    return new ImageData(out, width, height);
}

// Adaptive thresholding on a canvas: tileSize determines local window, C is subtracted from mean
function adaptiveThreshold(sourceCanvas, tileSize = 32, C = 10) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d');
    const src = ctx.getImageData(0, 0, w, h);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = w;
    outCanvas.height = h;
    const outCtx = outCanvas.getContext('2d');
    const outData = outCtx.createImageData(w, h);

    // Precompute integral image for fast local mean
    const integral = new Uint32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
        let rowSum = 0;
        for (let x = 0; x < w; x++) {
            const v = src.data[(y * w + x) * 4];
            rowSum += v;
            integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
        }
    }

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const x0 = Math.max(0, x - tileSize >> 1);
            const y0 = Math.max(0, y - tileSize >> 1);
            const x1 = Math.min(w - 1, x0 + tileSize - 1);
            const y1 = Math.min(h - 1, y0 + tileSize - 1);
            const area = (x1 - x0 + 1) * (y1 - y0 + 1);
            const sum = integral[(y1 + 1) * (w + 1) + (x1 + 1)] - integral[y0 * (w + 1) + (x1 + 1)] - integral[(y1 + 1) * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
            const mean = sum / area;
            const val = src.data[(y * w + x) * 4];
            const v = val > (mean - C) ? 255 : 0;
            const idx = (y * w + x) * 4;
            outData.data[idx] = outData.data[idx + 1] = outData.data[idx + 2] = v;
            outData.data[idx + 3] = 255;
        }
    }

    outCtx.putImageData(outData, 0, 0);
    return outCanvas;
}

// Parse receipt data from OCR text
function parseReceiptData(text, tesseractData = null, canvas = null) {
    // Default values
    let vendor = 'Unknown Vendor';
    let amount = '0.00';
    let date = new Date().toISOString().split('T')[0];
    let category = 'other';

    // Convert text to uppercase for easier matching
    const upperText = text.toUpperCase();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    console.log('OCR Extracted Text:', text);
    console.log('Lines:', lines);

    // If tesseract provided word-level data, try to pick a vendor line by confidence and position
    let vendorCandidates = lines.slice(0, Math.min(8, lines.length));
    if (tesseractData && tesseractData.words && canvas) {
        try {
            const words = tesseractData.words;
            // Group words into lines using line_num and paragraph/block info
            const lineMap = new Map();
            for (const w of words) {
                const key = `${w.block_num || 0}_${w.par_num || 0}_${w.line_num || 0}`;
                if (!lineMap.has(key)) lineMap.set(key, []);
                lineMap.get(key).push(w);
            }

            const linesFromWords = [];
            for (const [k, ws] of lineMap.entries()) {
                const txt = ws.map(w => w.text).join(' ').trim();
                if (!txt) continue;
                const avgConf = ws.reduce((s, w) => s + (w.confidence || 0), 0) / ws.length;
                const avgY = ws.reduce((s, w) => s + (w.bbox ? (w.bbox.y0 || 0) : (w.y0 || 0)), 0) / ws.length;
                linesFromWords.push({ text: txt, avgConf, avgY });
            }

            // Prefer lines in the top 30% with highest confidence
            const topRegion = (canvas && canvas.height) ? canvas.height * 0.3 : Infinity;
            const topLines = linesFromWords.filter(l => l.avgY <= topRegion && /[A-Za-z]{2,}/.test(l.text));
            topLines.sort((a, b) => b.avgConf - a.avgConf);
            if (topLines.length > 0) {
                // Use the topmost high-confidence line as the vendor
                vendor = sanitizeVendorLine(topLines[0].text);
            }
            // If we found a vendor via words, set vendorCandidates to that for fallback consistency
            if (vendor !== 'Unknown Vendor') {
                vendorCandidates = [vendor];
            }
        } catch (e) {
            console.warn('Vendor extraction from words failed', e);
        }
    }
    const vendorBlacklist = ['RECEIPT', 'INVOICE', 'TOTAL', 'SUBTOTAL', 'TAX', 'ITEM', 'PRICE', 'AMOUNT', 'VISIT', 'LOYALTY', 'TRANSACTION', 'AUTH', 'CHANGE', 'QTY'];
    const cleanedCandidates = [];
    for (const rawLine of vendorCandidates) {
        const line = rawLine.trim();
        if (!line) continue;
        // Skip lines that are mostly dashes/underscores or contain many repeated non-letters
        if (/^[\-=_]{3,}$/.test(line) || /[-_]{6,}/.test(line)) continue;
        const upperLine = line.toUpperCase();
        if (vendorBlacklist.some(b => upperLine.includes(b))) continue;
        // Skip lines that look like phone numbers, dates, or long addresses
        if (/\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4}/.test(line)) continue; // phone
        if (/\d+\s+\w+\s+(ST|RD|AVE|BLVD|LN|DR|WAY)\b/i.test(line)) continue;
        if (/^\d/.test(line) && line.length < 6) continue;

        // sanitize weird characters and compress spaces
        const sanitized = line.replace(/[^A-Za-z0-9 &'.,()-]/g, ' ').replace(/\s+/g, ' ').trim();
        if (sanitized.length < 3) continue;
        cleanedCandidates.push(sanitized);
    }

    // Prefer candidate with at least two words and minimal numeric content
    for (const c of cleanedCandidates) {
        if (/[A-Za-z]/.test(c) && c.split(' ').length >= 2 && ( (c.match(/\d/g) || []).length < 3 )) {
            vendor = c;
            break;
        }
    }
    // Fallback: first cleaned candidate
    if (vendor === 'Unknown Vendor' && cleanedCandidates.length > 0) {
        vendor = cleanedCandidates[0];
    }

    // Look for dollar amounts - improved pattern matching (support commas)
    const amountPatterns = [
        /(?:TOTAL|AMOUNT|SALE|PURCHASE|DUE)[\s:]*\$?\s*([\d,]+\.\d{2})/i,  // "TOTAL: $1,234.56" or "TOTAL 50.00"
        /\$\s*([\d,]+\.\d{2})\s*(?:TOTAL|AMOUNT|SALE|PURCHASE)/i,           // "$50.00 TOTAL"
        /(?:^|\s)\$\s*([\d,]+\.\d{2})(?:\s|$)/gm,                           // Standalone "$50.00"
        /(?:^|\s)([\d,]+\.\d{2})\s*(?:USD|US)?(?:\s|$)/gm                   // "50.00" or "1,234.56 USD"
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
        const generalPattern = /\$?\s*([\d,]{1,7}\.\d{2})/g;
        while ((match = generalPattern.exec(text)) !== null) {
            const val = parseFloat(match[1].replace(/,/g, ''));
            // Filter out unrealistic amounts (likely dates or other numbers)
            if (val > 0.50 && val < 10000) {
                amounts.push(val);
            }
        }
    }

    // Prefer amounts that are explicitly labeled as TOTAL/AMOUNT DUE/BALANCE
    // Search for labeled amounts first (look for label within 30 chars)
    let labeledAmount = null;
    const labeledPatterns = [/TOTAL\s*[:]?[\s]*\$?[\s]*([\d,]+\.\d{2})/i,
                             /AMOUNT\s*DUE\s*[:]?[\s]*\$?[\s]*([\d,]+\.\d{2})/i,
                             /BALANCE\s*DUE\s*[:]?[\s]*\$?[\s]*([\d,]+\.\d{2})/i,
                             /AMOUNT\s*[:]?[\s]*\$?[\s]*([\d,]+\.\d{2})/i];

    for (const pat of labeledPatterns) {
        const m = pat.exec(text);
        if (m) {
            labeledAmount = parseFloat(m[1].replace(/,/g, ''));
            break;
        }
    }

    if (labeledAmount !== null) {
        amount = labeledAmount.toFixed(2);
    } else if (amounts.length > 0) {
        // If no labeled amount, prefer the largest sensible amount
        amount = Math.max(...amounts).toFixed(2);
    }

    // If tesseract word data available, try to find 'TOTAL' labels and nearby numeric tokens
    if (tesseractData && tesseractData.words && tesseractData.words.length > 0) {
        try {
            const ws = tesseractData.words;
            for (let i = 0; i < ws.length; i++) {
                const w = ws[i];
                if (/TOTAL|AMOUNT|BALANCE/i.test(w.text)) {
                    // Search same line for numeric tokens
                    const sameLine = ws.filter(x => x.line_num === w.line_num).map(x => x.text).join(' ');
                    const m = (sameLine.match(/\$?\s*([\d,]+\.\d{2})/) || [])[1];
                    if (m) { amount = parseFloat(m.replace(/,/g, '')).toFixed(2); break; }

                    // Search nearby words (within +/-3 words)
                    for (let j = Math.max(0, i - 3); j <= Math.min(ws.length - 1, i + 3); j++) {
                        const nm = (ws[j].text.match(/\$?\s*([\d,]+\.\d{2})/) || [])[1];
                        if (nm) { amount = parseFloat(nm.replace(/,/g, '')).toFixed(2); break; }
                    }
                    if (amount && parseFloat(amount) > 0) break;
                }
            }
        } catch (e) {
            // ignore
        }
    }

    // If we somehow parsed amounts with commas, ensure numeric string (already handled above)

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

    // Categorize based on presence of keywords; be conservative (don't default to fuel)
    const categoryHints = {
        fuel: ['FUEL', 'GAS', 'DIESEL', 'GALLONS'],
        maintenance: ['MAINTENANCE', 'OIL CHANGE', 'TIRE', 'REPAIR', 'SERVICE'],
        tolls: ['TOLL', 'PARKING'],
        food: ['FOOD', 'RESTAURANT', 'DINER', 'CAFE', 'MCDONALD', 'BURGER', 'SUBWAY', 'WENDY'],
        insurance: ['INSURANCE'],
        hotel: ['HOTEL', 'MOTEL', 'INN']
    };

    // Count hints for each category
    const hintCounts = {};
    for (const [cat, keywords] of Object.entries(categoryHints)) {
        hintCounts[cat] = keywords.reduce((c, kw) => c + (upperText.includes(kw) ? 1 : 0), 0);
    }

    // Pick category with the highest hint count (if any), else leave as 'other'
    const bestCategory = Object.entries(hintCounts).sort((a, b) => b[1] - a[1])[0];
    if (bestCategory && bestCategory[1] > 0) {
        // Map 'hotel' to 'other' to keep categories consistent
        category = bestCategory[0] === 'hotel' ? 'other' : bestCategory[0];
    }

    console.log('Parsed Data:', { vendor, amount, date, category });

    return {
        vendor: vendor,
        amount: amount,
        date: date,
        category: category
    };
}

// Try to extract an amount value from arbitrary OCR text (robust to commas and labels)
function parseAmountFromText(text) {
    if (!text || typeof text !== 'string') return null;
    // First look for labeled patterns
    const labeled = text.match(/(?:TOTAL|AMOUNT\s*DUE|BALANCE|BALANCE\s*DUE)[\s:\-]*\$?\s*([\d,]+\.\d{2})/i);
    if (labeled && labeled[1]) return parseFloat(labeled[1].replace(/,/g, ''));

    // Then search for all currency-like numbers and pick the largest reasonable
    const matches = Array.from(text.matchAll(/\$?\s*([\d,]{1,7}\.\d{2})/g)).map(m => parseFloat(m[1].replace(/,/g, ''))).filter(v => !isNaN(v) && v > 0.5 && v < 100000);
    if (matches.length === 0) return null;
    return Math.max(...matches);
}

// Sanitize vendor lines: remove odd characters and compress spaces
function sanitizeVendorLine(line) {
    return line.replace(/[^A-Za-z0-9 &'.,()-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Crop a canvas and return a new canvas with that region
function cropCanvas(sourceCanvas, x, y, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);
    return canvas;
}

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

    // Category labels
    const categoryLabels = {
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
    filteredExpenses.forEach(exp => {
        if (!breakdown[exp.category]) {
            breakdown[exp.category] = { total: 0, items: [] };
        }
        breakdown[exp.category].total += parseFloat(exp.amount);
        breakdown[exp.category].items.push(exp);
    });

    let y = 60;
    const lineHeight = 6;
    const pageHeight = doc.internal.pageSize.getHeight();

    // Summary by category
    doc.setFontSize(14);
    doc.text('Expense Summary by Category', 20, y);
    y += 10;

    doc.setFontSize(10);
    Object.entries(breakdown).sort((a, b) => b[1].total - a[1].total).forEach(([category, data]) => {
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

    // Category labels
    const categoryLabels = {
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

