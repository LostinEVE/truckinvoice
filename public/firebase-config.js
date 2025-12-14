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

    // Sync company info
    syncCompanyInfo(userId);

    // Sync invoices
    syncInvoices(userId);

    // Sync expenses
    syncExpenses(userId);
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
        const data = snapshot.val();
        if (data) {
            // Convert object to array
            const invoicesArray = Object.values(data);

            // Update localStorage with remote data
            localStorage.setItem('invoiceHistory', JSON.stringify(invoicesArray));

            // Update UI if on history page
            if (document.getElementById('historyView').classList.contains('active')) {
                displayHistory();
            }
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
        if (data) {
            // Convert object to array
            const expensesArray = Object.values(data);

            // Update localStorage with remote data
            localStorage.setItem('expenses', JSON.stringify(expensesArray));

            // Update UI if on expenses page
            if (document.getElementById('expensesView').classList.contains('active')) {
                displayExpenses();
            }
            if (document.getElementById('dashboardView').classList.contains('active')) {
                updateDashboard();
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
    switch(status) {
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
    switch(errorCode) {
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
