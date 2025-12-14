# TruckInvoice - Quick Invoice Generator for OTR Drivers

Generate professional invoices in seconds instead of manually filling out PDFs. Works with any carrier!

## Features

### Invoice Generation

- **Auto-saves your company info** (no re-typing)
- **Auto-fills today's date**
- Downloads ready-to-upload **PDF and JPG**
- Email notifications when invoices are generated
- Works **offline** (no internet needed)

### Invoice History & Tracking

- **Automatic history** of all generated invoices
- **Search and filter** by invoice #, load #, or customer name
- **Regenerate** any past invoice with one click
- Delete unwanted history entries

### Time-Saving Tools

- **Quick Fill for Repeat Customers** - dropdown shows your past customers with one-click auto-fill
- **Mile/Rate Calculator** - enter miles and rate per mile to automatically calculate payment amount
- **Responsive design** - works on desktop, tablet, and mobile

## How to Use

1. **Open the app**: Double-click `index.html` to open in your web browser
2. **First time setup**: Enter your company info (saved automatically for next time)
3. **For each load**:
   - Enter invoice number
   - Enter customer name
   - Enter load number
   - Enter amount (or use the calculator)
   - Click "Generate Invoice PDF"
4. **Upload**: Upload the downloaded PDF to your carrier's portal

## Quick Tips

- **Calculator**: Enter miles and rate to auto-calculate payment
- **Quick Fill**: Click the dropdown next to customer name to re-use past customers
- **History**: View all past invoices in the "Invoice History" tab
- **Search**: Find specific invoices by typing in the search box

## Tech Stack

- HTML/CSS/JavaScript
- jsPDF for PDF generation
- EmailJS for notifications
- localStorage for data persistence
- PWA (Progressive Web App) ready

## For Distribution

This app is **carrier-agnostic** and works for:

- J.B. Hunt
- Schneider
- Werner
- Swift
- Any trucking carrier or independent loads

---

**Perfect for owner-operators and independent drivers who need professional invoices fast.**

## Deployment

This project uses Firebase Hosting. To deploy manually, run `firebase deploy --only hosting` from the project root.

CI/CD: GitHub Actions

- I added a GitHub Actions workflow: [/.github/workflows/firebase-hosting-deploy.yml](.github/workflows/firebase-hosting-deploy.yml).
- It deploys preview channels for pull requests and deploys to production when pushing to `main`.

Secrets required for the workflow:

- `FIREBASE_SERVICE_ACCOUNT`: JSON of a Firebase service account (create in Firebase Console → Project Settings → Service Accounts → Generate private key). Add the entire JSON as a GitHub secret with this name.
- `GITHUB_TOKEN`: provided automatically by GitHub Actions.

If you prefer the quick token method, create a CI token with `firebase login:ci` and store it as `FIREBASE_TOKEN` (update workflow accordingly).

If you'd like, I can create a PR to add the secrets (I can't add secrets from here), or I can add an alternate workflow that uses a CI token instead.
