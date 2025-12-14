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

The workflow now supports the free CI token method using `FIREBASE_TOKEN`.

To generate and add a token (free-tier friendly):

1. Install the Firebase CLI locally if you don't have it:

   ```bash
   npm install -g firebase-tools
   ```

2. Login and generate a CI token on your machine:

   ```bash
   firebase login:ci
   ```

   Copy the token printed to your terminal.

3. In GitHub go to **Settings → Secrets and variables → Actions** and add a new repository secret named `FIREBASE_TOKEN` with that token as the value.

After adding `FIREBASE_TOKEN`, PRs will deploy preview channels and pushes to `main` will deploy to production automatically.

If you'd like, I can add extra helpers like a PR-comment with the preview URL or a 'retry' button in the UI. I can't add repository secrets from here, so you'll need to create the `FIREBASE_TOKEN` secret yourself.
