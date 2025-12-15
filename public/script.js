import { EMAILJS_CONFIG, OCR_CONFIG, FEATURES } from './config.js';
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

// Shared crop state so OCR handler can use the current selection
let cropRect = null;
let applyCropFn = null;
let previewImageRef = null;
let tesseractData = null;

// Limits for OCR uploads
const MAX_OCR_FILE_KB = 900; // keep under 1 MB API limit
const MAX_OCR_DIM = 1600;    // constrain max width/height to reduce size

// Navigation between views (tabs + dropdown)
function showView(view) {
    const viewMap = {
        invoice: 'invoiceFormView',
        receipt: 'receiptUploadView',
        history: 'historyView',
        expenses: 'expensesView',
        dashboard: 'dashboardView'
    };

    // Hide all views, show selected
    Object.entries(viewMap).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('active', key === view);
        }
    });

    const tabMap = {
        invoice: 'newInvoiceBtn',
        receipt: 'receiptUploadBtn',
        history: 'historyBtn',
        expenses: 'expensesBtn',
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
}

function setupNavigation() {
    const dropdown = document.getElementById('navDropdown');
    
    const handleViewChange = (view) => {
        showView(view);
        // Refresh specific view data when switching
        setTimeout(() => {
            try {
                if (view === 'history') {
                    displayHistory();
                } else if (view === 'expenses') {
                    displayExpenses();
                } else if (view === 'dashboard') {
                    updateDashboard();
                }
            } catch (e) {
                console.error(`Error refreshing view ${view}:`, e);
            }
        }, 100);
    };
    
    if (dropdown) {
        // Listen to both 'change' and 'input' for better mobile support
        const handler = (e) => {
            const view = e.target.value || 'invoice';
            handleViewChange(view);
        };
        dropdown.addEventListener('change', handler);
        dropdown.addEventListener('input', handler);
    }

    const bindings = [
        { id: 'newInvoiceBtn', view: 'invoice' },
        { id: 'receiptUploadBtn', view: 'receipt' },
        { id: 'historyBtn', view: 'history' },
        { id: 'expensesBtn', view: 'expenses' },
        { id: 'dashboardBtn', view: 'dashboard' }
    ];

    bindings.forEach(({ id, view }) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                handleViewChange(view);
            });
        }
    });

    // Show invoice view by default
    showView('invoice');
}

// Calculator panels (miles vs product count)
function setupCalculators() {
    const calcTabs = document.querySelectorAll('.calc-tab');
    const milesPanel = document.getElementById('milesCalculator');
    const productPanel = document.getElementById('productCalculator');

    calcTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            calcTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.calc;
            if (target === 'miles') {
                milesPanel?.classList.add('active');
                productPanel?.classList.remove('active');
            } else if (target === 'product') {
                productPanel?.classList.add('active');
                milesPanel?.classList.remove('active');
            }
        });
    });

    // Miles calculator
    const milesInput = document.getElementById('miles');
    const ratePerMileInput = document.getElementById('ratePerMile');
    const calcAmountSpan = document.querySelector('#calculatedAmount .calc-value');
    const useCalculatedBtn = document.getElementById('useCalculated');

    function updateMilesCalc() {
        const miles = parseFloat(milesInput?.value) || 0;
        const rate = parseFloat(ratePerMileInput?.value) || 0;
        const total = miles * rate;
        if (calcAmountSpan) calcAmountSpan.textContent = `$${total.toFixed(2)}`;
        if (useCalculatedBtn) useCalculatedBtn.disabled = total <= 0;
    }

    milesInput?.addEventListener('input', updateMilesCalc);
    ratePerMileInput?.addEventListener('input', updateMilesCalc);
    useCalculatedBtn?.addEventListener('click', () => {
        const calcValue = calcAmountSpan?.textContent?.replace('$', '') || '0';
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.value = calcValue;
            amountInput.style.background = '#e8f5e9';
            setTimeout(() => { amountInput.style.background = ''; }, 1000);
        }
    });

    // Product count calculator
    const pieceCountInput = document.getElementById('pieceCount');
    const ratePerPieceInput = document.getElementById('ratePerPiece');
    const calcProductValueSpan = document.querySelector('#calculatedProductAmount .calc-value');
    const useCalculatedProductBtn = document.getElementById('useCalculatedProduct');

    function updateProductCalculation() {
        const pieces = parseFloat(pieceCountInput?.value) || 0;
        const rate = parseFloat(ratePerPieceInput?.value) || 0;
        const total = pieces * rate;
        if (calcProductValueSpan) calcProductValueSpan.textContent = `$${total.toFixed(2)}`;
        if (useCalculatedProductBtn) useCalculatedProductBtn.disabled = total <= 0;
    }

    pieceCountInput?.addEventListener('input', updateProductCalculation);
    ratePerPieceInput?.addEventListener('input', updateProductCalculation);
    useCalculatedProductBtn?.addEventListener('click', () => {
        const calcValue = calcProductValueSpan?.textContent?.replace('$', '') || '0';
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.value = calcValue;
            amountInput.style.background = '#e8f5e9';
            setTimeout(() => { amountInput.style.background = ''; }, 1000);
        }
    });

    // Default state
    updateMilesCalc();
    updateProductCalculation();
}

// Compress an image file to stay under the OCR API size limit
async function compressImageFile(file, { maxSizeKB = MAX_OCR_FILE_KB, maxDim = MAX_OCR_DIM } = {}) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            try {
                // Scale down if needed based on maxDim
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                const targetW = Math.max(1, Math.round(img.width * scale));
                const targetH = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, targetW, targetH);

                const tryEncode = (quality) => {
                    canvas.toBlob((blob) => {
                        if (!blob) { reject(new Error('Failed to encode image')); return; }
                        if (blob.size <= maxSizeKB * 1024 || quality <= 0.4) {
                            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
                        } else {
                            tryEncode(quality - 0.1);
                        }
                    }, 'image/jpeg', quality);
                };

                tryEncode(0.9);
            } catch (err) {
                reject(err);
            } finally {
                URL.revokeObjectURL(url);
            }
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
}

// ===== PHASE 2: Receipt Upload and OCR Functions =====

// Initialize receipt uploader
function setupReceiptUpload() {
    const receiptInput = document.getElementById('receiptImage');
    const receiptForm = document.getElementById('receiptForm');
    const previewImage = document.getElementById('previewImage');
    previewImageRef = previewImage;
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
                    // Parse the OCR text to extract receipt data
                    const parsedData = parseReceiptData(ocrText);
                    // Keep parsed line items for later saving to Expenses
                    try { window._lastParsedItems = Array.isArray(parsedData.items) ? parsedData.items : []; } catch (_) {}

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

            try { saveExpense(expense); } catch (e) {
                console.error('saveExpense failed', e);
                alert('Failed to save expense: ' + (e && e.message ? e.message : e));
                return;
            }
            alert('Raw OCR text saved as expense. Review in Expenses.');
            try { displayExpenses(); } catch (_) {}
            try { showView('expenses'); } catch (_) {
                const expensesView = document.getElementById('expensesView');
                const receiptView = document.getElementById('receiptUploadView');
                const tabBtn = document.getElementById('expensesBtn');
                const receiptBtn = document.getElementById('receiptUploadBtn');
                const dropdown = document.getElementById('navDropdown');
                if (expensesView) expensesView.classList.add('active');
                if (receiptView) receiptView.classList.remove('active');
                if (tabBtn) tabBtn.classList.add('active');
                if (receiptBtn) receiptBtn.classList.remove('active');
                if (dropdown) dropdown.value = 'expenses';
            }
            resetReceiptForm();
        });
    }

    // Add as expense button
    addAsExpenseBtn.addEventListener('click', () => {
        const vendor = document.getElementById('extractedVendor').value || 'Receipt Upload';
        const amount = parseFloat(document.getElementById('extractedAmount').value) || 0;
        const date = document.getElementById('extractedDate').value || new Date().toISOString().split('T')[0];
        const categoryEl = document.getElementById('extractedCategory');
        // Ensure category is selectable on mobile and has a value
        if (categoryEl) { categoryEl.disabled = false; }
        const category = (categoryEl && categoryEl.value) ? categoryEl.value : 'other';

        // Add to expenses
        const expense = {
            id: Date.now().toString(),
            date,
            amount,
            category,
            vendor,
                // Prefer raw OCR text if available so you can review receipt details later
                notes: (document.getElementById('rawOcrText')?.value || '').trim() || 'Added from receipt upload',
                // Attach parsed items when available
                items: (window._lastParsedItems && window._lastParsedItems.length ? window._lastParsedItems : undefined),
            timestamp: new Date().toISOString()
        };

        // Persist and immediately refresh Expenses view
        try {
            saveExpense(expense);
        } catch (e) {
            console.error('saveExpense failed', e);
            alert('Failed to save expense: ' + (e && e.message ? e.message : e));
            return;
        }

        alert('Expense added successfully!');

        // Update expenses list and navigate to Expenses view to show the saved item
        try { displayExpenses(); } catch (_) {}
        try { showView('expenses'); } catch (_) {
            const expensesView = document.getElementById('expensesView');
            const receiptView = document.getElementById('receiptUploadView');
            const tabBtn = document.getElementById('expensesBtn');
            const receiptBtn = document.getElementById('receiptUploadBtn');
            const dropdown = document.getElementById('navDropdown');
            if (expensesView) expensesView.classList.add('active');
            if (receiptView) receiptView.classList.remove('active');
            if (tabBtn) tabBtn.classList.add('active');
            if (receiptBtn) receiptBtn.classList.remove('active');
            if (dropdown) dropdown.value = 'expenses';
        }

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
    const applyCropBtn = document.getElementById('applyCropBtn');
    const applyCropProcessBtn = document.getElementById('applyCropProcessBtn');
    const resetCropBtn = document.getElementById('resetCropBtn');

    // Simple adjustable crop box: drag to move, handles to resize
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let isResizing = false;
    let resizeDir = null; // 'nw','ne','sw','se','n','s','e','w'

    function toImageCoords(clientX, clientY) {
        const imgEl = previewImageRef || previewImage;
        const imgRect = imgEl.getBoundingClientRect();
        const x = Math.max(0, Math.min(imgRect.width, clientX - imgRect.left));
        const y = Math.max(0, Math.min(imgRect.height, clientY - imgRect.top));
        return { x, y, imgRect };
    }

    // Initialize overlay when preview shows
    function ensureDefaultCrop() {
        const imgEl = previewImageRef || previewImage;
        const imgRect = imgEl.getBoundingClientRect();
        // default to central box covering ~80% width/height
        const left = imgRect.width * 0.1;
        const top = imgRect.height * 0.1;
        const width = imgRect.width * 0.8;
        const height = imgRect.height * 0.8;
        cropOverlay.style.display = 'block';
        cropOverlay.style.left = `${left}px`;
        cropOverlay.style.top = `${top}px`;
        cropOverlay.style.width = `${width}px`;
        cropOverlay.style.height = `${height}px`;
        cropRect = { left, top, width, height, imgRect };
        addOverlayHandles();
    }

    // Drag to move
    const startDragResize = (clientX, clientY, target) => {
        if (!target) return;
        if (target.classList.contains('resize-handle')) {
            isResizing = true;
            resizeDir = target.dataset.dir;
        } else {
            isDragging = true;
            const rect = cropOverlay.getBoundingClientRect();
            dragOffset.x = clientX - rect.left;
            dragOffset.y = clientY - rect.top;
        }
    };

    const handleDragResize = (clientX, clientY) => {
        if (!cropRect) return;
        const { x, y, imgRect } = toImageCoords(clientX, clientY);
        let left = cropRect.left;
        let top = cropRect.top;
        let width = cropRect.width;
        let height = cropRect.height;
        if (isDragging) {
            left = Math.max(0, Math.min(imgRect.width - width, clientX - imgRect.left - dragOffset.x));
            top = Math.max(0, Math.min(imgRect.height - height, clientY - imgRect.top - dragOffset.y));
        } else if (isResizing && resizeDir) {
            const right = left + width;
            const bottom = top + height;
            if (resizeDir.includes('e')) {
                width = Math.max(20, Math.min(imgRect.width - left, x - left));
            }
            if (resizeDir.includes('s')) {
                height = Math.max(20, Math.min(imgRect.height - top, y - top));
            }
            if (resizeDir.includes('w')) {
                const newLeft = Math.max(0, Math.min(right - 20, x));
                width = right - newLeft;
                left = newLeft;
            }
            if (resizeDir.includes('n')) {
                const newTop = Math.max(0, Math.min(bottom - 20, y));
                height = bottom - newTop;
                top = newTop;
            }
        }
        cropOverlay.style.left = `${left}px`;
        cropOverlay.style.top = `${top}px`;
        cropOverlay.style.width = `${width}px`;
        cropOverlay.style.height = `${height}px`;
        cropRect = { left, top, width, height, imgRect };
    };

    const getTouchPoint = (e) => {
        const t = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0]);
        if (!t) return null;
        return { clientX: t.clientX, clientY: t.clientY };
    };

    cropOverlay.addEventListener('mousedown', (e) => {
        startDragResize(e.clientX, e.clientY, e.target);
        e.preventDefault();
    });

    cropOverlay.addEventListener('touchstart', (e) => {
        const p = getTouchPoint(e);
        if (!p) return;
        startDragResize(p.clientX, p.clientY, e.target);
        // prevent scrolling only when interacting with the overlay
        e.preventDefault();
    }, { passive: false });

    window.addEventListener('mousemove', (e) => {
        handleDragResize(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging && !isResizing) return; // allow normal scrolls when not interacting with crop box
        const p = getTouchPoint(e);
        if (!p) return;
        handleDragResize(p.clientX, p.clientY);
        e.preventDefault();
    }, { passive: false });

    const endDragResize = () => {
        isDragging = false;
        isResizing = false;
                            const parsedData = parseReceiptData(rawOcrText.value);
                            try { window._lastParsedItems = Array.isArray(parsedData.items) ? parsedData.items : []; } catch (_) {}
    window.addEventListener('touchend', endDragResize);

    function applyCrop() {
        if (!cropRect || !cropRect.width || !cropRect.height) return null;
        const img = previewImageRef || previewImage;
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

    // expose crop helpers for OCR handler
    applyCropFn = applyCrop;

    // Ensure overlay appears when image is ready
    previewImage.addEventListener('load', () => {
        ensureDefaultCrop();
    });

    // Add resize handles to overlay
    function addOverlayHandles() {
        const dirs = ['nw','n','ne','e','se','s','sw','w'];
        cropOverlay.innerHTML = '';
        dirs.forEach(dir => {
            const h = document.createElement('div');
            h.className = 'resize-handle handle-' + dir;
            h.dataset.dir = dir;
            cropOverlay.appendChild(h);
        });
    }
}

// Process receipt image with OCR.space API
async function processReceiptWithOCR(file, options = {}) {
    const ocrStatus = document.getElementById('ocrStatus');
    const ocrResults = document.getElementById('ocrResults');
    const ocrMessage = document.getElementById('ocrMessage');
    const processBtn = document.getElementById('processReceiptBtn');

    if (!FEATURES.OCR_ENABLED) {
        ocrMessage.textContent = 'OCR disabled. Please enter receipt details manually.';
        ocrStatus.classList.add('hidden');
        ocrResults.classList.remove('hidden');
        return;
    }

    ocrStatus.classList.remove('hidden');
    ocrResults.classList.add('hidden');
    processBtn.classList.add('hidden');
    ocrMessage.textContent = 'Processing receipt with OCR...';

    try {
        // Prepare form data for OCR.space API
        const formData = new FormData();
        formData.append('language', OCR_CONFIG.language);
        formData.append('detectOrientation', OCR_CONFIG.detectOrientation);
        formData.append('scale', OCR_CONFIG.scale);
        formData.append('OCREngine', '2'); // Engine 2 is better for receipts

        // If a crop is set, apply crop before sending
        if (cropRect && applyCropFn && previewImageRef && window._originalDataURL) {
            const dataURL = applyCropFn();
            if (dataURL) {
                const blob = await (await fetch(dataURL)).blob();
                file = new File([blob], 'cropped.jpg', { type: blob.type });
            }
        }

        // Compress if needed to stay under OCR size limit
        if (file && file.size > MAX_OCR_FILE_KB * 1024) {
            try {
                file = await compressImageFile(file, { maxSizeKB: MAX_OCR_FILE_KB, maxDim: MAX_OCR_DIM });
            } catch (e) {
                console.warn('Compression failed, sending original file', e);
            }
        }

        // Append the final file AFTER crop/compress adjustments
        formData.append('file', file);

        // Call OCR.space API
        const response = await fetch(OCR_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'apikey': OCR_CONFIG.apiKey
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`OCR API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.OCRExitCode !== 1) {
            throw new Error(result.ErrorMessage || 'OCR processing failed');
        }

        tesseractData = (result?.ParsedResults?.[0]?.TextOverlay) || null;

        // Extract text from result
        const ocrText = result.ParsedResults[0].ParsedText || '';
        const rawEl = document.getElementById('rawOcrText');
        if (rawEl) rawEl.value = ocrText;

        // Store raw result for debugging
        const tessJsonEl = document.getElementById('rawTessJson');
        if (tessJsonEl) tessJsonEl.value = JSON.stringify(result, null, 2);
        window._lastOcrRaw = result;

        console.log('OCR Result:', ocrText);

        // Parse the OCR text to extract receipt data
        const parsedData = parseReceiptData(ocrText);

        // Populate form fields
        document.getElementById('extractedVendor').value = parsedData.vendor;
        document.getElementById('extractedAmount').value = parsedData.amount;
        document.getElementById('extractedDate').value = parsedData.date;
        document.getElementById('extractedCategory').value = parsedData.category;

        ocrMessage.textContent = 'OCR complete! Review and edit the extracted data below.';

    } catch (error) {
        console.error('OCR Error:', error);
        ocrMessage.textContent = `OCR failed: ${error.message}. Please enter details manually.`;
        
        // Provide empty fields for manual entry
        const rawEl = document.getElementById('rawOcrText');
        if (rawEl) rawEl.value = `OCR Error: ${error.message}\n\nEnter details manually or paste text here.`;
        
        document.getElementById('extractedVendor').value = '';
        document.getElementById('extractedAmount').value = '';
        document.getElementById('extractedDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('extractedCategory').value = 'other';
    }

    ocrStatus.classList.add('hidden');
    ocrResults.classList.remove('hidden');
}

// Parse receipt data from OCR text
function parseReceiptData(text) {
    // Default values
    let vendor = 'Unknown Vendor';
    let amount = '0.00';
    let date = new Date().toISOString().split('T')[0];
    let category = 'other';

    if (!text || text.trim().length === 0) {
        return { vendor, amount, date, category };
    }

    // Convert text to uppercase for easier matching
    const upperText = text.toUpperCase();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    console.log('Parsing OCR text:', text.substring(0, 200));

    // Get vendor from top lines
    let vendorCandidates = lines.slice(0, Math.min(8, lines.length));
    
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

// ===== App Bootstrap =====
window.addEventListener('DOMContentLoaded', () => {
    const safeRun = (label, fn) => {
        try { fn(); } catch (e) { console.error(`${label} failed`, e); }
    };

    safeRun('navigation', setupNavigation);
    safeRun('calculators', setupCalculators);
    safeRun('receipt upload', setupReceiptUpload);

    safeRun('invoice form', () => {
        setTodayAsDefault();
        loadCompanyInfo();
        populateCustomerList();
        setupQuickFill();
        setupInvoiceForm();
    });

    safeRun('history', displayHistory);
    safeRun('expenses setup', setupExpenses);
    safeRun('expenses display', displayExpenses);
    safeRun('dashboard setup', setupDashboard);
    safeRun('dashboard update', updateDashboard);
    safeRun('accessories setup', setupAccessories);
});

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
