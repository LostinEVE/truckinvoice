import { EMAILJS_CONFIG } from './config.js';
import {
    setupInvoiceForm,
    setTodayAsDefault,
    loadCompanyInfo,
    displayHistory,
    togglePaymentStatus,
    deleteInvoice,
    regenerateInvoice,
    setupQuickFill,
    populateCustomerList
} from './invoices.js';
import { setupExpenses, displayExpenses, deleteExpense, getExpenses, saveExpense } from './expenses.js';
import { setupDashboard, updateDashboard, exportExpenseReport, exportProfitLossStatement } from './dashboard.js';
import { setupAccessories } from './accessories.js';

// Expose invoice actions for inline history controls
Object.assign(window, { displayHistory, togglePaymentStatus, deleteInvoice, regenerateInvoice });

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

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
    setupInvoiceForm();
    setupNavigation();
    setupReceiptUpload();
    setupQuickFill();
    setupCalculator();
    setupExpenses();
    setupDashboard();
    setupAccessories();
});

// (invoice form, company info, history, quick fill now in invoices.js)

// (invoice generation and history now in invoices.js)

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
        allViews.forEach(view => {
            view.classList.remove('active');
            view.style.display = 'none';
        });
        allButtons.forEach(btn => btn.classList.remove('active'));
        activeView.classList.add('active');
        activeView.style.display = 'block';
        activeBtn.classList.add('active');
    }

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
    const doNotSavePhotosCheckbox = document.getElementById('doNotSavePhotos');
    const enhancedOcrToggle = document.getElementById('enhancedOcrToggle');
    const retryEnhancedBtn = document.getElementById('retryEnhancedBtn');

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
                // Initialize doNotSavePhotos checkbox from stored preference (default true)
                try {
                    const pref = localStorage.getItem('doNotSavePhotos');
                    if (doNotSavePhotosCheckbox) {
                        if (pref === null) {
                            doNotSavePhotosCheckbox.checked = true;
                        } else {
                            doNotSavePhotosCheckbox.checked = pref === '1';
                        }
                    }
                } catch (e) { /* ignore localStorage errors */ }
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
            await processReceiptWithOCR(fileToProcess, { enhanced: enhancedOcrToggle && enhancedOcrToggle.checked });

            // If user prefers not to keep photos, clear temporary image data and persist preference
            try {
                if (doNotSavePhotosCheckbox && doNotSavePhotosCheckbox.checked) {
                    localStorage.setItem('doNotSavePhotos', '1');
                    // Clear any in-memory data URLs/files
                    if (window._originalDataURL) delete window._originalDataURL;
                    if (window._croppedDataURL) delete window._croppedDataURL;
                    // Keep _originalFile in memory for retries but do not persist
                } else if (doNotSavePhotosCheckbox) {
                    localStorage.setItem('doNotSavePhotos', '0');
                }
            } catch (e) { /* ignore storage errors */ }
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

            const expense = {
                id: Date.now().toString(),
                date,
                amount,
                category,
                vendor,
                notes: rawText,
                timestamp: new Date().toISOString()
            };

            saveExpense(expense);
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
        const expense = {
            id: Date.now().toString(),
            date,
            amount,
            category,
            vendor,
            notes: 'Added from receipt upload',
            timestamp: new Date().toISOString()
        };

        saveExpense(expense);
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

    // Retry with enhanced preprocessing
    if (retryEnhancedBtn) {
        retryEnhancedBtn.addEventListener('click', async () => {
            try {
                const file = window._originalFile || (receiptInput.files && receiptInput.files[0]);
                if (!file) { alert('No image available to retry. Please upload again.'); return; }
                await processReceiptWithOCR(file, { enhanced: true });
            } catch (e) {
                alert('Retry failed: ' + (e && e.message ? e.message : e));
            }
        });
    }

    // Retry amount detection using an aggressive numeric-only pass
    const retryAmountBtn = document.getElementById('retryAmountBtn');
    if (retryAmountBtn) {
        retryAmountBtn.addEventListener('click', () => {
            alert('OCR is disabled. Please enter the amount manually.');
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

// Process receipt image (OCR disabled; manual entry only)
async function processReceiptWithOCR(file, options = {}) {
    const ocrStatus = document.getElementById('ocrStatus');
    const ocrResults = document.getElementById('ocrResults');
    const ocrMessage = document.getElementById('ocrMessage');
    const processBtn = document.getElementById('processReceiptBtn');

    ocrStatus.classList.remove('hidden');
    ocrResults.classList.add('hidden');
    processBtn.classList.add('hidden');
    ocrMessage.textContent = 'OCR disabled. Please enter receipt details manually.';

    const parsedData = {
        vendor: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'other',
        items: []
    };

    try {
        const rawEl = document.getElementById('rawOcrText');
        if (rawEl) rawEl.value = 'OCR disabled. Enter details manually or paste text here.';
        const tessJsonEl = document.getElementById('rawTessJson');
        if (tessJsonEl) tessJsonEl.value = '';
        window._lastTessRaw = null;
    } catch (e) { /* ignore */ }

    document.getElementById('extractedVendor').value = parsedData.vendor;
    document.getElementById('extractedAmount').value = parsedData.amount;
    document.getElementById('extractedDate').value = parsedData.date;
    document.getElementById('extractedCategory').value = parsedData.category;

    ocrStatus.classList.add('hidden');
    ocrResults.classList.remove('hidden');
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

    try {
        console.log('OCR Extracted Text:', text);
        console.log('Lines:', Array.isArray(lines) ? JSON.stringify(lines.slice(0, 50)) : lines);
    } catch (_) {}

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
    // If we see clear merchant names in the whole text, prefer them
    const vendorWhitelist = ['RURAL KING', 'WALMART', 'TARGET', 'HOME DEPOT', 'LOWE', 'KROGER', 'HEB', 'COSTCO', 'SAM\'S CLUB'];
    for (const v of vendorWhitelist) {
        if (upperText.includes(v)) { vendor = v; break; }
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
        const alphaCount = (c.match(/[A-Za-z]/g) || []).length;
        const digitCount = (c.match(/\d/g) || []).length;
        // Prefer lines with enough letters, minimal digits, and at least two words
        if (alphaCount >= 4 && c.split(' ').length >= 2 && digitCount < 3) {
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

    // Try to extract line items using layout-aware pairing (preferred), fallback to regex
    const items = [];
    try {
        if (tesseractData && tesseractData.words && tesseractData.words.length > 0) {
            // Group words by line_num
            const lineGroups = new Map();
            for (const w of tesseractData.words) {
                const ln = w.line_num;
                if (!lineGroups.has(ln)) lineGroups.set(ln, []);
                // derive bbox with x0/x1 if available
                const x0 = w.bbox && typeof w.bbox.x0 === 'number' ? w.bbox.x0 : (typeof w.x0 === 'number' ? w.x0 : null);
                const x1 = w.bbox && typeof w.bbox.x1 === 'number' ? w.bbox.x1 : (typeof w.x1 === 'number' ? w.x1 : null);
                lineGroups.get(ln).push({ text: w.text || '', conf: w.confidence || 0, x0, x1 });
            }

            // For each line, sort words by x0 and split into description (left) and price (rightmost numeric)
            for (const [, ws] of lineGroups.entries()) {
                const wordsSorted = ws.filter(w => (w.text || '').trim().length > 0).sort((a, b) => (a.x0||0) - (b.x0||0));
                if (wordsSorted.length === 0) continue;
                const joined = wordsSorted.map(w => w.text).join(' ').trim();
                // Skip obvious header/footer lines
                if (/TOTAL|SUBTOTAL|TAX|CHANGE|AMOUNT\s+DUE/i.test(joined)) continue;

                // Find the rightmost token that looks like a price
                let priceIdx = -1;
                for (let i = wordsSorted.length - 1; i >= 0; i--) {
                    if (/^\$?[\d,]+\.\d{2}$/.test(wordsSorted[i].text)) { priceIdx = i; break; }
                }
                if (priceIdx === -1) continue;
                const priceVal = parseFloat(wordsSorted[priceIdx].text.replace(/[$,]/g, ''));
                if (isNaN(priceVal) || priceVal <= 0) continue;

                // Description is everything left of the price token, excluding quantities-only tails
                const desc = wordsSorted.slice(0, priceIdx).map(w => w.text).join(' ').trim();
                const cleanDesc = sanitizeVendorLine(desc).replace(/\s{2,}/g, ' ').trim();
                if (cleanDesc.length >= 2) {
                    items.push({ description: cleanDesc, price: priceVal.toFixed(2) });
                }
            }
        }

        // Fallback: regex on plain lines if layout pairing found none
        if (items.length === 0) {
            let inspectLines = lines.slice();
            if (tesseractData && tesseractData.lines && tesseractData.lines.length) {
                inspectLines = tesseractData.lines.map(l => (l.text || '').trim()).filter(l => l.length > 0);
            }
            const itemPattern = /(.+?)\s+\$?\s*([\d,]+\.\d{2})\s*$/;
            for (const ln of inspectLines) {
                const m = ln.match(itemPattern);
                if (m) {
                    const desc = sanitizeVendorLine(m[1]);
                    const price = parseFloat(m[2].replace(/,/g, ''));
                    if (!isNaN(price) && price > 0) {
                        items.push({ description: desc, price: price.toFixed(2) });
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Item extraction failed', e);
    }

    // If items found, prefer sensible sum-of-items when appropriate
    try {
        const itemsTotal = items.reduce((s, it) => s + parseFloat(it.price), 0);
        if (items.length > 0 && itemsTotal > 0.0) {
            if ((!labeledAmount || labeledAmount === null)) {
                amount = itemsTotal.toFixed(2);
            } else {
                // If a labeled amount exists but is implausibly large compared to summed items,
                // prefer the items total as it's likely OCR misread the labeled total.
                const labeledVal = parseFloat(labeledAmount || 0);
                if (labeledVal > itemsTotal * 3 || labeledVal > 10000) {
                    console.warn('Labeled amount seems implausible; using sum of items instead', { labeledVal, itemsTotal });
                    amount = itemsTotal.toFixed(2);
                }
            }
        }
    } catch (e) { /* ignore */ }

    try {
        console.log('Parsed Data:', JSON.stringify({ vendor, amount, date, category, items }, null, 2));
    } catch (_) {}

    return {
        vendor: vendor,
        amount: amount,
        date: date,
        category: category,
        items: items
    };
}

// Try to extract an amount value from arbitrary OCR text (robust to commas and labels)
function parseAmountFromText(text) {
    if (!text || typeof text !== 'string') return null;
    // First look for labeled patterns
    const labeled = text.match(/(?:TOTAL|AMOUNT\s*DUE|BALANCE|BALANCE\s*DUE)[\s:\-]*\$?\s*([\d,]+\.\d{2})/i);
    if (labeled && labeled[1]) return parseFloat(labeled[1].replace(/,/g, ''));

    // Then search for all currency-like numbers with cents and pick the largest reasonable
    const matches = Array.from(text.matchAll(/\$?\s*([\d,]{1,7}\.\d{2})/g)).map(m => parseFloat(m[1].replace(/,/g, ''))).filter(v => !isNaN(v) && v > 0.5 && v < 100000);
    if (matches.length > 0) return Math.max(...matches);

    // As a fallback, accept numbers without explicit cents (e.g., '123' or '$123') and pick the largest
    const fallbackMatches = Array.from(text.matchAll(/\$?\s*([\d,]{1,7}(?:\.\d{1,2})?)/g)).map(m => parseFloat(m[1].replace(/,/g, ''))).filter(v => !isNaN(v) && v > 0.5 && v < 100000);
    if (fallbackMatches.length === 0) return null;
    return Math.max(...fallbackMatches);
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
    // Remove any in-memory image data to avoid storing photos
    try {
        if (window._originalDataURL) delete window._originalDataURL;
        if (window._croppedDataURL) delete window._croppedDataURL;
        if (window._originalFile) delete window._originalFile;
    } catch (e) { /* ignore */ }
}

// ===== Export Functions =====

// Expose functions used by inline handlers and Firebase callbacks
Object.assign(window, {
    loadCompanyInfo,
    displayHistory,
    displayExpenses,
    updateDashboard,
    togglePaymentStatus,
    deleteInvoice,
    regenerateInvoice,
    deleteExpense,
    exportExpenseReport,
    exportProfitLossStatement
});

