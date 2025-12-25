// Firebase Configuration and Sync Manager
// ========================================

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCt1nxGPblkmCo_4qSMvWnWIhm0I6RXtqY",
    authDomain: "otrtruckulator.firebaseapp.com",
    databaseURL: "https://otrtruckulator-default-rtdb.firebaseio.com",
    projectId: "otrtruckulator",
    storageBucket: "otrtruckulator.firebasestorage.app",
    messagingSenderId: "929218453570",
    appId: "1:929218453570:web:18f9dfd1823f36a4848ddb",
    measurementId: "G-YEGYH7GYEF"
};

// Initialize Firebase
let firebaseApp, auth, database;
let currentUser = null;
let syncEnabled = false;

// Initialize Firebase when script loads
function initializeFirebase() {
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        database = firebase.database();

        console.log('Firebase initialized successfully');

        // Listen for authentication state changes
        auth.onAuthStateChanged(handleAuthStateChange);

    } catch (error) {
        console.error('Firebase initialization error:', error);
        showSyncStatus('error', 'Sync unavailable - working offline');
    }
}

// Handle authentication state changes
function handleAuthStateChange(user) {
    currentUser = user;

    if (user) {
        syncEnabled = true;
        console.log('User authenticated:', user.uid);

        // Hide auth modal
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.style.display = 'none';

        // Show sign out button
        const signoutBtn = document.getElementById('signoutBtn');
        if (signoutBtn) signoutBtn.classList.remove('hidden');

        // Show sync status
        if (user.isAnonymous) {
            showSyncStatus('synced', 'Syncing (Anonymous)');
        } else {
            showSyncStatus('synced', `Synced: ${user.email}`);
        }

        // Start syncing data
        initializeDataSync();

    } else {
        syncEnabled = false;
        currentUser = null;
        console.log('User signed out');

        // Show auth modal
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.style.display = 'flex';

        // Hide sign out button
        const signoutBtn = document.getElementById('signoutBtn');
        if (signoutBtn) signoutBtn.classList.add('hidden');

        showSyncStatus('offline', 'Not syncing - Sign in to enable');
    }
}

// Authentication Functions
// ========================

function signIn(email, password) {
    showAuthError('');
    showSyncStatus('syncing', 'Signing in...');

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Sign in successful');
            showSyncStatus('synced', `Signed in: ${email}`);
        })
        .catch((error) => {
            console.error('Sign in error:', error);
            showAuthError(getAuthErrorMessage(error.code));
            showSyncStatus('error', 'Sign in failed');
        });
}

function signUp(email, password) {
    showAuthError('');
    showSyncStatus('syncing', 'Creating account...');

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('Sign up successful');
            showSyncStatus('synced', `Account created: ${email}`);
        })
        .catch((error) => {
            console.error('Sign up error:', error);
            showAuthError(getAuthErrorMessage(error.code));
            showSyncStatus('error', 'Sign up failed');
        });
}

function signInAnonymously() {
    showAuthError('');
    showSyncStatus('syncing', 'Connecting...');

    auth.signInAnonymously()
        .then(() => {
            console.log('Anonymous sign in successful');
            showSyncStatus('synced', 'Syncing (Anonymous)');
        })
        .catch((error) => {
            console.error('Anonymous sign in error:', error);
            showAuthError('Failed to connect. Please try again.');
            showSyncStatus('error', 'Connection failed');
        });
}

function signOut() {
    if (confirm('Are you sure you want to sign out? Your data will no longer sync.')) {
        auth.signOut()
            .then(() => {
                console.log('Sign out successful');
                showSyncStatus('offline', 'Signed out');
            })
            .catch((error) => {
                console.error('Sign out error:', error);
            });
    }
}

// Data Sync Functions
// ===================

function initializeDataSync() {
    if (!currentUser) return;

    const userId = currentUser.uid;
    console.log('Starting data sync for user:', userId);

    // Sync company info
    syncCompanyInfo(userId);

    // Sync invoices
    syncInvoices(userId);

    // Sync expenses
    syncExpenses(userId);

    // Force UI refresh after initial sync
    setTimeout(() => {
        console.log('Forcing UI refresh after sync...');
        if (typeof loadCompanyInfo === 'function') loadCompanyInfo();
        if (typeof displayHistory === 'function') displayHistory();
        if (typeof displayExpenses === 'function') displayExpenses();
        if (typeof updateDashboard === 'function') updateDashboard();
    }, 1500);
}

// Sync company information
function syncCompanyInfo(userId) {
    const companyRef = database.ref(`users/${userId}/companyInfo`);

    // Listen for remote changes
    companyRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Update localStorage with remote data
            localStorage.setItem('companyName', data.companyName || '');
            localStorage.setItem('companyAddress', data.companyAddress || '');
            localStorage.setItem('carrierId', data.carrierId || '');
            localStorage.setItem('userEmail', data.userEmail || '');

            // Update UI if on the page
            loadCompanyInfo();
        }
    });
}

// Save company info to Firebase
function saveCompanyInfoToCloud(companyData) {
    if (!syncEnabled || !currentUser) return;

    const userId = currentUser.uid;
    const companyRef = database.ref(`users/${userId}/companyInfo`);

    companyRef.set(companyData)
        .then(() => {
            console.log('Company info synced to cloud');
        })
        .catch((error) => {
            console.error('Error syncing company info:', error);
        });
}

// Sync invoices
function syncInvoices(userId) {
    const invoicesRef = database.ref(`users/${userId}/invoices`);

    // Listen for remote changes
    invoicesRef.on('value', (snapshot) => {
        // Skip sync if we're in the middle of updating payment status locally
        if (window.isUpdatingPaymentStatus || window.skipDisplayHistory) {
            console.log('Skipping sync - payment status update in progress');
            return;
        }

        console.log('Firebase sync triggered...');
        const data = snapshot.val();

        // Get local invoices
        const localData = localStorage.getItem('invoiceHistory');
        const localInvoices = localData ? JSON.parse(localData) : [];
        const localMap = new Map(localInvoices.map(inv => [inv.id, inv]));

        if (!data) {
            // No remote data - push all local to cloud
            localInvoices.forEach(inv => saveInvoiceToCloud(inv));
            return;
        }

        // Convert remote object to array
        const remoteInvoices = Object.values(data);
        const remoteMap = new Map(remoteInvoices.map(inv => [inv.id, inv]));

        // Merge: start with local as the base, then carefully add/update from remote
        const mergedMap = new Map(localMap);
        const invoicesToPushToCloud = [];

        for (const [id, remoteInv] of remoteMap) {
            const localInv = localMap.get(id);

            if (!localInv) {
                // Remote only - add it
                mergedMap.set(id, remoteInv);
            } else if (localInv.paymentStatus !== remoteInv.paymentStatus) {
                // Payment status conflict - resolve by timestamp
                const localHasUpdate = !!localInv.paymentStatusUpdated;
                const remoteHasUpdate = !!remoteInv.paymentStatusUpdated;

                // If local has a paymentStatusUpdated but remote doesn't, local wins
                if (localHasUpdate && !remoteHasUpdate) {
                    console.log(`Invoice ${id}: Local wins (has paymentStatusUpdated, remote doesn't)`);
                    mergedMap.set(id, localInv);
                    invoicesToPushToCloud.push(localInv);
                }
                // If remote has it but local doesn't, remote wins
                else if (!localHasUpdate && remoteHasUpdate) {
                    console.log(`Invoice ${id}: Remote wins (has paymentStatusUpdated, local doesn't)`);
                    mergedMap.set(id, remoteInv);
                }
                // Both have timestamps - compare them
                else if (localHasUpdate && remoteHasUpdate) {
                    const localTime = new Date(localInv.paymentStatusUpdated).getTime();
                    const remoteTime = new Date(remoteInv.paymentStatusUpdated).getTime();

                    if (localTime >= remoteTime) {
                        console.log(`Invoice ${id}: Local wins (newer timestamp)`);
                        mergedMap.set(id, localInv);
                        invoicesToPushToCloud.push(localInv);
                    } else {
                        console.log(`Invoice ${id}: Remote wins (newer timestamp)`);
                        mergedMap.set(id, remoteInv);
                    }
                }
                // Neither has timestamp - prefer local (user's most recent action)
                else {
                    console.log(`Invoice ${id}: Local wins (no timestamps, preferring local)`);
                    // Add timestamp now so future syncs work correctly
                    localInv.paymentStatusUpdated = new Date().toISOString();
                    mergedMap.set(id, localInv);
                    invoicesToPushToCloud.push(localInv);
                }
            }
            // If payment status is the same, keep local (it's already in mergedMap)
        }

        // Convert to array and save
        const mergedArray = Array.from(mergedMap.values());
        localStorage.setItem('invoiceHistory', JSON.stringify(mergedArray));

        // Push any local wins to cloud
        invoicesToPushToCloud.forEach(inv => {
            console.log('Pushing local invoice to cloud:', inv.id);
            saveInvoiceToCloud(inv);
        });

        // Update UI if on history page
        if (document.getElementById('historyView')?.classList.contains('active')) {
            displayHistory();
        }
    });
}

// Save invoice to Firebase
function saveInvoiceToCloud(invoice) {
    if (!syncEnabled || !currentUser) return;

    const userId = currentUser.uid;
    const invoiceRef = database.ref(`users/${userId}/invoices/${invoice.id}`);

    invoiceRef.set(invoice)
        .then(() => {
            console.log('Invoice synced to cloud:', invoice.id);
            showSyncStatus('synced', 'Synced');
        })
        .catch((error) => {
            console.error('Error syncing invoice:', error);
            showSyncStatus('error', 'Sync failed');
        });
}

// Delete invoice from Firebase
function deleteInvoiceFromCloud(invoiceId) {
    if (!syncEnabled || !currentUser) return;

    const userId = currentUser.uid;
    const invoiceRef = database.ref(`users/${userId}/invoices/${invoiceId}`);

    invoiceRef.remove()
        .then(() => {
            console.log('Invoice deleted from cloud:', invoiceId);
        })
        .catch((error) => {
            console.error('Error deleting invoice:', error);
        });
}

// Sync expenses
function syncExpenses(userId) {
    const expensesRef = database.ref(`users/${userId}/expenses`);

    // Listen for remote changes
    expensesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        console.log('Expenses sync received:', data ? Object.keys(data).length + ' expenses' : 'no data');
        if (data) {
            // Convert object to array
            const expensesArray = Object.values(data);
            console.log('Saving', expensesArray.length, 'expenses to localStorage');

            // Update localStorage with remote data
            localStorage.setItem('expenses', JSON.stringify(expensesArray));

            // Update UI if on expenses page
            if (document.getElementById('expensesView') && document.getElementById('expensesView').classList.contains('active')) {
                if (typeof displayExpenses === 'function') displayExpenses();
            }
            if (document.getElementById('dashboardView') && document.getElementById('dashboardView').classList.contains('active')) {
                if (typeof updateDashboard === 'function') updateDashboard();
            }
        }
    });
}

// Save expense to Firebase
function saveExpenseToCloud(expense) {
    if (!syncEnabled || !currentUser) return;

    const userId = currentUser.uid;
    const expenseRef = database.ref(`users/${userId}/expenses/${expense.id}`);

    expenseRef.set(expense)
        .then(() => {
            console.log('Expense synced to cloud:', expense.id);
            showSyncStatus('synced', 'Synced');
        })
        .catch((error) => {
            console.error('Error syncing expense:', error);
            showSyncStatus('error', 'Sync failed');
        });
}

// Delete expense from Firebase
function deleteExpenseFromCloud(expenseId) {
    if (!syncEnabled || !currentUser) return;

    const userId = currentUser.uid;
    const expenseRef = database.ref(`users/${userId}/expenses/${expenseId}`);

    expenseRef.remove()
        .then(() => {
            console.log('Expense deleted from cloud:', expenseId);
        })
        .catch((error) => {
            console.error('Error deleting expense:', error);
        });
}

// UI Helper Functions
// ===================

function showSyncStatus(status, message) {
    const statusIcon = document.getElementById('syncStatusIcon');
    const statusText = document.getElementById('syncStatusText');
    const syncStatus = document.getElementById('syncStatus');

    if (!statusIcon || !statusText || !syncStatus) return;

    statusText.textContent = message;

    // Remove all status classes
    syncStatus.classList.remove('status-synced', 'status-syncing', 'status-error', 'status-offline');

    // Add appropriate status class and icon
    switch (status) {
        case 'synced':
            statusIcon.textContent = '✓';
            syncStatus.classList.add('status-synced');
            break;
        case 'syncing':
            statusIcon.textContent = '🔄';
            syncStatus.classList.add('status-syncing');
            break;
        case 'error':
            statusIcon.textContent = '⚠';
            syncStatus.classList.add('status-error');
            break;
        case 'offline':
            statusIcon.textContent = '○';
            syncStatus.classList.add('status-offline');
            break;
    }
}

function showAuthError(message) {
    const authError = document.getElementById('authError');
    if (authError) {
        authError.textContent = message;
        if (message) {
            authError.classList.remove('hidden');
        } else {
            authError.classList.add('hidden');
        }
    }
}

function getAuthErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        default:
            return 'Authentication failed. Please try again.';
    }
}

// Setup Authentication UI
// =======================

function setupAuthUI() {
    // Auth tab switching
    const authTabs = document.querySelectorAll('.auth-tab');
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');
    const anonymousForm = document.getElementById('anonymousForm');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            signinForm.classList.remove('active');
            signupForm.classList.remove('active');
            anonymousForm.classList.remove('active');

            const authType = tab.dataset.auth;
            if (authType === 'signin') {
                signinForm.classList.add('active');
            } else if (authType === 'signup') {
                signupForm.classList.add('active');
            } else if (authType === 'anonymous') {
                anonymousForm.classList.add('active');
            }

            showAuthError('');
        });
    });

    // Sign in button
    document.getElementById('signinBtn').addEventListener('click', () => {
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;

        if (email && password) {
            signIn(email, password);
        } else {
            showAuthError('Please enter email and password.');
        }
    });

    // Sign up button
    document.getElementById('signupBtn').addEventListener('click', () => {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupPasswordConfirm').value;

        if (!email || !password || !confirmPassword) {
            showAuthError('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            showAuthError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            showAuthError('Password must be at least 6 characters.');
            return;
        }

        signUp(email, password);
    });

    // Anonymous button
    document.getElementById('anonymousBtn').addEventListener('click', () => {
        signInAnonymously();
    });

    // Sign out button
    document.getElementById('signoutBtn').addEventListener('click', () => {
        signOut();
    });

    // Enter key support
    document.getElementById('signinPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('signinBtn').click();
        }
    });

    document.getElementById('signupPasswordConfirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('signupBtn').click();
        }
    });
}

// Initialize Firebase and auth UI when page loads
window.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
    setupAuthUI();
});

// Force Data Sync - manually pull all data from Firebase
function forceDataSync() {
    if (!currentUser) {
        alert('Please sign in first to sync data.');
        return;
    }

    const userId = currentUser.uid;
    console.log('Force sync starting for user:', userId);
    showSyncStatus('syncing', 'Force syncing...');

    const promises = [];

    // Force sync company info
    promises.push(
        database.ref(`users/${userId}/companyInfo`).once('value').then((snapshot) => {
            const data = snapshot.val();
            console.log('Force sync - Company info:', data);
            if (data) {
                localStorage.setItem('companyName', data.companyName || '');
                localStorage.setItem('companyAddress', data.companyAddress || '');
                localStorage.setItem('carrierId', data.carrierId || '');
                localStorage.setItem('userEmail', data.userEmail || '');
                console.log('Company info saved to localStorage');
            }
        })
    );

    // Force sync invoices
    promises.push(
        database.ref(`users/${userId}/invoices`).once('value').then((snapshot) => {
            const data = snapshot.val();
            console.log('Force sync - Invoices:', data);
            if (data) {
                const invoicesArray = Object.values(data);
                localStorage.setItem('invoiceHistory', JSON.stringify(invoicesArray));
                console.log('Saved', invoicesArray.length, 'invoices to localStorage');
            }
        })
    );

    // Force sync expenses
    promises.push(
        database.ref(`users/${userId}/expenses`).once('value').then((snapshot) => {
            const data = snapshot.val();
            console.log('Force sync - Expenses:', data);
            if (data) {
                const expensesArray = Object.values(data);
                localStorage.setItem('expenses', JSON.stringify(expensesArray));
                console.log('Saved', expensesArray.length, 'expenses to localStorage');
            }
        })
    );

    Promise.all(promises).then(() => {
        console.log('Force sync complete! Refreshing UI...');
        showSyncStatus('synced', 'Force sync complete!');

        // Log what we saved to localStorage
        console.log('localStorage invoiceHistory:', localStorage.getItem('invoiceHistory'));
        console.log('localStorage expenses:', localStorage.getItem('expenses'));

        // Force refresh all UI components using window. scope
        if (typeof window.loadCompanyInfo === 'function') {
            window.loadCompanyInfo();
            console.log('Company info UI refreshed');
        } else {
            console.warn('loadCompanyInfo not found on window');
        }

        if (typeof window.displayHistory === 'function') {
            window.displayHistory();
            console.log('Invoice history UI refreshed');
        } else {
            console.warn('displayHistory not found on window');
        }

        if (typeof window.displayExpenses === 'function') {
            window.displayExpenses();
            console.log('Expenses UI refreshed');
        } else {
            console.warn('displayExpenses not found on window');
        }

        if (typeof window.updateDashboard === 'function') {
            window.updateDashboard();
            console.log('Dashboard UI refreshed');
        } else {
            console.warn('updateDashboard not found on window');
        }

        alert('Sync complete! Check console for details. Your data should now be visible.');
    }).catch((error) => {
        console.error('Force sync error:', error);
        showSyncStatus('error', 'Sync failed');
        alert('Sync failed: ' + error.message);
    });
}

// Expose functions globally for use in other scripts
window.saveInvoiceToCloud = saveInvoiceToCloud;
window.deleteInvoiceFromCloud = deleteInvoiceFromCloud;
window.forceDataSync = forceDataSync;
