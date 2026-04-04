# Haset Hospital Management System

A full-stack hospital management system built with React (frontend) and Laravel (backend), deployed at [hasetcompany.or.tz](https://hasetcompany.or.tz).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Laravel 12, PHP, Sanctum (API auth) |
| Database | MySQL |
| Payments | ZenoPay |
| Real-time | Socket.io |

---

## Roles

| Role | Access |
|---|---|
| Admin | Full system access, user management, reports, ICD-10 import |
| Doctor | Patient consultations, diagnosis, lab orders, prescriptions |
| Nurse | Vitals, triage, patient intake |
| Lab | Lab test processing and results |
| Pharmacy | Prescription dispensing, inventory |
| Billing | Invoices, payments, insurance claims |
| Receptionist | Appointments, patient registration |

---

## Local Development

### Requirements
- PHP 8.2+
- Composer
- Node.js 18+
- MySQL

### Backend setup

```bash
cd backend
composer install
cp .env.example .env        # or create .env manually
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan serve
```

### Frontend setup

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8000`.

---

## Default Login Credentials (local)

| Role | Email | Password |
|---|---|---|
| Admin | admin@test.com | admin123 |
| Doctor | doctor@test.com | doctor123 |
| Lab | lab@test.com | lab123 |

---

## ICD-10 Integration

The system supports full ICD-10 diagnosis coding used by doctors during consultations and automatically included in insurance claim submissions.

### Load ICD-10 codes

**Option 1 — Download full dataset (94k codes, requires internet):**
```bash
php artisan icd10:download
```

**Option 2 — Tanzania QRC codes only:**
```bash
php artisan db:seed --class=TanzaniaICD10Seeder --force
```

**Option 3 — Upload via Admin Dashboard:**
Go to Admin → ICD-10 Code Database → upload a CSV, Excel, or PDF file.

### How it works
- Doctors search codes by name or code (e.g. `malaria`, `J18`) during consultation
- Codes attach to both provisional and final diagnosis on the visit record
- Insurance claims automatically include the ICD-10 code in the NHIF API payload

---

## Production Deployment

### Files to upload after changes
```
backend/app/
backend/routes/api.php
backend/database/migrations/
backend/bootstrap/app.php
dist/                        # built frontend
```

### After uploading backend changes
```bash
php artisan migrate --force
php artisan config:clear
php artisan route:clear
php artisan cache:clear
```

### Build frontend for production
```bash
npm run build
```

Upload the `dist/` folder to `public_html/`.

---

## Key Features

- Patient registration and medical history
- Appointment booking and workflow (Reception → Nurse → Doctor → Lab → Pharmacy → Billing)
- Doctor consultation with ICD-10 diagnosis coding and autofill from previous visits
- Lab test ordering and results
- Prescription management and pharmacy dispensing
- Invoice generation and payment processing (cash, mobile money via ZenoPay)
- Insurance claims with NHIF Tanzania API integration
- Admin reports and activity logs
- Real-time updates via Socket.io
