# Firebase Sync Setup Instructions

Your TruckInvoice app now supports cross-device data synchronization using Firebase! Follow these steps to enable syncing between your phone and laptop.

---

## Step 1: Create a Firebase Project (FREE)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Sign in with your Google account (or create one if needed)

2. **Create a New Project**
   - Click "Add project"
   - Enter project name: `TruckInvoice` (or any name you prefer)
   - Click "Continue"
   - Disable Google Analytics (not needed for this app)
   - Click "Create project"
   - Wait for project to be created, then click "Continue"

---

## Step 2: Set Up Firebase Realtime Database

1. **Navigate to Database**
   - In the left sidebar, click "Build" → "Realtime Database"
   - Click "Create Database"

2. **Choose Database Location**
   - Select your preferred location (choose closest to you)
   - Click "Next"

3. **Set Security Rules**
   - Start in "**Test mode**" for initial setup
   - Click "Enable"

4. **Update Security Rules (IMPORTANT!)**
   - After database is created, click on the "Rules" tab
   - Replace the rules with the following:

   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "$uid === auth.uid",
           ".write": "$uid === auth.uid"
         }
       }
     }
   }
   ```

   - Click "Publish"
   - This ensures users can only access their own data

---

## Step 3: Enable Email/Password Authentication

1. **Navigate to Authentication**
   - In the left sidebar, click "Build" → "Authentication"
   - Click "Get started"

2. **Enable Sign-In Methods**
   - Click on the "Sign-in method" tab
   - Click on "Email/Password"
   - Enable both toggles (Email/Password and Email link)
   - Click "Save"

3. **Enable Anonymous Authentication (Optional)**
   - Click on "Anonymous"
   - Enable the toggle
   - Click "Save"

---

## Step 4: Get Your Firebase Configuration

1. **Add a Web App**
   - In Firebase Console, click the gear icon (⚙️) next to "Project Overview"
   - Click "Project settings"
   - Scroll down to "Your apps" section
   - Click the web icon `</>` (Add app)
   - Give it a nickname: "TruckInvoice Web"
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

2. **Copy Your Configuration**
   - You'll see a configuration object that looks like this:

   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "truckinvoice-xxxxx.firebaseapp.com",
     databaseURL: "https://truckinvoice-xxxxx-default-rtdb.firebaseio.com",
     projectId: "truckinvoice-xxxxx",
     storageBucket: "truckinvoice-xxxxx.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:xxxxxxxxxxxxxx"
   };
   ```

   - Copy this entire configuration

---

## Step 5: Update Your App Configuration

1. **Open firebase-config.js**
   - Open the file: `firebase-config.js`
   - Find this section at the top:

   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY_HERE",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

2. **Replace with Your Configuration**
   - Replace the entire `firebaseConfig` object with the one you copied from Firebase Console
   - Save the file

---

## Step 6: Test Your Setup

1. **Open the App**
   - Open `index.html` in your browser
   - You should see a sign-in modal

2. **Create Your Account**
   - Click on the "Sign Up" tab
   - Enter your email and password
   - Click "Sign Up"
   - You should see "Synced: your@email.com" in the sync status bar

3. **Test Syncing**
   - Enter some company info and create an invoice
   - Open the app on another device (laptop/phone)
   - Sign in with the same email and password
   - Your data should sync automatically!

---

## How to Use the Sync Feature

### Sign In Options

1. **Sign Up (Recommended)**
   - Create an account with email and password
   - Access your data from any device with your credentials
   - Data persists even if you clear browser data

2. **Sign In**
   - Use this if you already created an account
   - Enter the same email and password

3. **Continue Without Account**
   - Sign in anonymously
   - Data syncs only within the same browser
   - Useful for quick testing or single-device use

### Sync Status Indicators

- **✓ Synced** (Green) - Your data is up to date in the cloud
- **🔄 Syncing** (Blue) - Data is being synchronized
- **⚠ Error** (Red) - Sync failed, check your internet connection
- **○ Offline** (Gray) - Not signed in, no syncing

### What Gets Synced?

- ✅ Company information
- ✅ Invoice history
- ✅ Payment status
- ✅ Expenses
- ✅ Customer quick-fill list
- ✅ All dashboard data

### Sign Out

- Click the "Sign Out" button in the sync status bar
- Your local data remains on the device
- Data stops syncing until you sign in again

---

## Troubleshooting

### "Sync unavailable - working offline"
- Check your internet connection
- Verify Firebase configuration in `firebase-config.js`
- Check browser console for errors (F12)

### "Authentication failed"
- Ensure Email/Password is enabled in Firebase Console
- Check if email and password are correct
- Verify security rules are set correctly

### Data not syncing between devices
- Make sure you're signed in with the same account on both devices
- Check sync status - should show "Synced"
- Try signing out and signing back in
- Check your internet connection

### "Network error"
- Check your internet connection
- Firebase might be blocked by firewall/network
- Try on a different network

---

## Firebase Free Tier Limits

The free tier is very generous and should be sufficient for personal use:

- **Realtime Database**: 1GB storage, 10GB/month bandwidth, 100 simultaneous connections
- **Authentication**: Unlimited users
- **Cost**: $0 (Free forever for normal usage)

For a single user or small business, you'll likely never exceed these limits.

---

## Security Best Practices

1. **Never share your Firebase credentials** in `firebase-config.js` publicly
2. **Use strong passwords** for your authentication
3. **Keep security rules updated** to prevent unauthorized access
4. **Enable 2FA** on your Firebase/Google account
5. **Regularly review** Firebase Console → Authentication → Users

---

## Need Help?

If you encounter issues:
1. Check the browser console (F12) for error messages
2. Verify all steps in this guide were completed
3. Check Firebase Console for any warnings or errors
4. Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)

---

## Optional: Deploy to Firebase Hosting

If you want to access your app from anywhere (not just localhost):

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize hosting:
   ```bash
   firebase init hosting
   ```

4. Deploy:
   ```bash
   firebase deploy
   ```

Your app will be available at: `https://your-project-id.web.app`

---

**That's it! Your TruckInvoice app now syncs across all your devices!** 🚚✨
