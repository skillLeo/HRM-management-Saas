# CLAUDE.md — AfriPay HRM Project Memory

## Project Overview
- **Project Name:** AfriPay HR — Zambian Payroll & HR Management SaaS
- **Client:** Nafisa (Company user, type = 'company', user id = 2)
- **Stack:** Laravel + Inertia.js + React (TypeScript) + Tailwind CSS + MySQL/MariaDB
- **Hosted:** hrmsaas.skillleo.com (Linux server, not localhost)
- **Local Dev:** XAMPP (C:/xampp/htdocs/HRM-management-Saas)
- **Base Product:** WorkDo HRM SaaS (CodeCanyon) — customized for Zambia

---

## Architecture

### Backend
```
app/Http/Controllers/          → All controllers
app/Http/Controllers/Settings/ → Settings-specific controllers
app/Models/                    → Eloquent models
app/Helpers/helper.php         → Global helpers (creatorId, getCompanyAndUsersId, etc)
routes/web.php                 → Main routes
routes/settings.php            → Settings routes (imported into web.php)
database/migrations/           → All migrations
```

### Frontend
```
resources/js/pages/            → All Inertia page components
resources/js/pages/hr/employees/
  create.tsx                   → Create employee form
  edit.tsx                     → Edit employee form
  show.tsx                     → View employee details (tabbed)
  index.tsx                    → Employee list (table + grid view)

resources/js/pages/payroll-runs/
  index.tsx                    → Payroll run list + create/edit modal

resources/js/pages/settings/
  index.tsx                    → Settings page router
  components/
    zambia-tax-settings.tsx    → ZRA tax slab settings
    working-days-settings.tsx  → Working days config

resources/js/components/       → Shared UI components
```

### Key Models
```
User          → type: superadmin | company | employee | manager | hr
Employee      → linked to User via user_id
PayrollRun    → payroll periods
PayrollEntry  → per-employee payroll calculations
Payslip       → generated payslips
SalaryComponent → earnings/deductions components
Setting       → key-value settings per user_id (creatorId)
```

---

## Zambia-Specific Context

### Statutory Deductions
```
NAPSA  → National Pension Scheme Authority
         Employee: 5% of basic salary
         Employer: 5% of basic salary
         Monthly Cap: ZMW 1,073.20
         Calculated on: BASIC SALARY (not total earnings)

NHIMA  → National Health Insurance Management Authority
         Employee: 1% of basic salary
         Employer: 1% of basic salary
         No monthly cap
         Calculated on: BASIC SALARY (not total earnings)

SDL    → Skills Development Levy
         Employer only: 0.5% of total payroll
         Optional — not all employers pay
         Per-employee exemption available

PAYE   → Pay As You Earn Income Tax (ZRA official bands)
         Slab 1: ZMW 0       to 5,100.00  → 0%
         Slab 2: ZMW 5,100.01 to 7,100.00 → 25%
         Slab 3: ZMW 7,100.01 to 9,200.00 → 30%
         Slab 4: ZMW 9,201.01 and above   → 35%
```

### Zambian Employee Fields
```
NRC            → National Registration Card format: XXXXXX/XX/X
                 Auto-formats on input, regex: /^\d{6}\/\d{2}\/\d{1}$/
                 Only for Zambian nationals
Passport No    → For non-Zambian employees (free text)
Permit No      → For non-Zambian employees (free text)
TPIN           → Tax Payer Identification Number (free text)
NAPSA Number   → Registration number for NAPSA
NHIMA Number   → Registration number for NHIMA
Biometric ID   → Maps employee to biometric device
```

### Zambian Banks (EFT dropdown)
```
Zanaco, FNB Zambia, Stanbic Bank Zambia, Absa Bank Zambia,
Atlas Mara Bank Zambia, Citibank Zambia, Bank of China Zambia,
Indo Zambia Bank, UBA Zambia, Access Bank Zambia,
First Alliance Bank Zambia, Madison Finance,
Investrust Bank Zambia, Development Bank of Zambia, Bank of Zambia
```

---

## Key Business Rules

### Employee Module
```
- Age minimum: 18 years (DOB validation)
- Gender: Male / Female only (no Other)
- Nationality Zambian → show NRC field
- Nationality non-Zambian → show Passport No + Permit No (free text)
- Designation is NOT linked to department or branch
- Branch change resets Department but NOT Designation
- Payment methods: Cash | Mobile Money | EFT
- EFT selected → show banking fields with Zambian banks dropdown
- Statutory exemptions: exempt_from_napsa, exempt_from_nhima, exempt_from_sdl
  All manual — HR ticks/unticks, no automatic age-based logic
- Employee with payroll history → CANNOT be deleted → must be archived
- Employee without payroll history → CAN be deleted
- Mandatory fields: nationality, marital_status, nrc/passport, tpin
```

### Employee Status Values
```
active | inactive | probation | suspended | terminated
```

### Payroll Run Workflow
```
draft → processing → completed → pending_approval → final

- Draft: editable, can be deleted
- Processing: employees being added one batch at a time
- Completed: all active employees processed, can submit for approval
- Pending Approval: submitted, awaiting company user approval
- Final: approved, locked
- Unlock: final/pending/completed → back to draft (keeps entries)
```

### Payroll Run Rules
```
- Monthly frequency → show Month + Year dropdown (not date range)
- Pay date falls on Saturday → auto-push to Monday (+2 days)
- Pay date falls on Sunday → auto-push to Monday (+1 day)
- Can filter employees by branch / department / designation when processing
- Multiple runs allowed for same period if different branch/dept/designation
- Period auto-advances: after January completes → suggest February
- Payroll only closes when ALL active employees for that filter are processed
- Hide already-processed months from new run dropdown
```

### Payslip Rules
```
- Show current period payslips first by default
- Bulk select: checkbox to select one or more
- Bulk actions: Send to email | Download | Print
- Deleted employees must still show on historical payslips
```

---

## Permissions System
```
- Uses Spatie Laravel Permission package
- This is a SaaS system — roles have created_by column
- Global roles (created_by = NULL): superadmin, company
- Company-specific roles (created_by = company_user_id): employee, manager, hr
- Permission cache must be cleared after any permission changes:
  php artisan cache:clear
  php artisan permission:cache-reset
- Company user must log out and back in after permission changes
- Common issue: permission assigned to global role but SaaS scoping fails
  → Fix: assign directly via model_has_permissions or remove middleware
```

### Key Permissions
```
manage-payroll-runs       → view payroll runs list
create-payroll-runs       → add new payroll run
edit-payroll-runs         → edit + unlock payroll run
process-payroll-runs      → process + submit for approval
approve-payroll-runs      → approve final (company user needs this)
delete-payroll-runs       → delete draft runs
view-payroll-runs         → view details
manage-zambia-tax-settings → save ZRA tax slab settings
```

---

## Settings Storage
```
- Settings stored in `settings` table
- Schema: id, user_id, key, value, created_at, updated_at
- user_id = creatorId() — the company user id
- Key is a reserved word in MariaDB — always use backticks: `key`
- zambia tax settings keys: zambia_paye_slab_1_min, zambia_paye_slab_1_max, etc
- If settings table is empty for zambia keys → insert defaults manually
```

---

## Database Notes
```
- MariaDB on production server
- `key` is a reserved word — use backticks in raw SQL
- employees table has: title, first_name, middle_name, last_name,
  nationality, marital_status, nrc, tpin, napsa_number, nhima_number,
  biometric_emp_id, payment_method, exempt_from_napsa, exempt_from_nhima,
  exempt_from_sdl, base_salary, employee_status (enum includes suspended)
- employee_status enum: active, inactive, terminated, probation, suspended
- Settings are scoped per company user via user_id = creatorId()
```

---

## Completed Work (Phase 1 — Revision 1) ✅
```
✅ Employee profile — all Zambian fields
✅ NRC format validation and auto-formatting
✅ Nationality/Marital Status/Gender dropdowns
✅ DOB 18+ restriction
✅ NAPSA/NHIMA numbers in Employment Details
✅ Base Salary in Employment Details
✅ Designation independent of branch/department
✅ Suspended status in employee list + show page
✅ Relationship dropdown with Other + text input
✅ Payment method Cash/Mobile Money/EFT
✅ Zambian banks dropdown for EFT
✅ Statutory exemptions (NAPSA/NHIMA/SDL) — manual HR control
✅ Payroll run monthly → month dropdown
✅ Pay date weekend auto-adjustment
✅ Filter employees by branch/dept/designation
✅ Period auto-advance after completion
✅ Draft → Pending Approval → Final workflow
✅ Unlock completed/final payroll run
✅ Approve payroll run (company user permission fixed)
✅ ZRA tax slab settings save (middleware removed, correct values seeded)
✅ Advance management basic module (Phase 1 addition)
```

---

## Pending Work (Phase 2 — New Requirements) 🔲

### Employee
```
🔲 Nationality-based field switch (Zambian → NRC, non-Zambian → Passport + Permit)
🔲 Make nationality, marital status, nrc/passport, tpin mandatory
🔲 Block delete if payroll history exists → show Archive option
🔲 Deleted employees report
```

### Salary Components
```
🔲 Bonus system — flexible per-employee amounts per payroll run
🔲 Zero-value component that allows per-employee amount input
🔲 Archive used components instead of delete
🔲 Audit trail report for components
```

### Payroll Run
```
🔧 Fix: additional deductions from salary components not calculating (BUG)
🔲 Hide already-processed months from new run dropdown
```

### Payslip
```
🔲 Current period shown first by default
🔲 Bulk checkbox selection
🔲 Bulk actions: Send email, Download, Print
🔲 Deleted employees still show on historical payslips
```

### Settings
```
🔲 Working hours display in Working Days Settings
🔲 Hourly wage toggle on employee profile (Employment Details)
   Default: monthly. If hourly ticked → calculate based on hours worked
```

### New Modules
```
🔲 Advance Management — full version with ESS portal + approval workflow
🔲 Overtime Management — Zambian labor law compliance + payroll integration
```

### Reports (from Expectations document)
```
🔲 Employee List report (Name, DOJ, TPIN, NAPSA No, NHIMA No)
🔲 Employee Status Report (Terminated, Resigned, etc)
🔲 Salary Changes Report
🔲 Payroll Run detailed and summary report
🔲 Employee Payroll Entries report
🔲 Full payroll record per period
🔲 NHIMA/NAPSA contributory history per employee
🔲 Deductions report (summary + detailed)
🔲 Audit Trail
🔲 Variance check vs previous month
```

---

## Common Commands
```bash
# Build frontend
npm run build

# Clear all caches
php artisan cache:clear
php artisan route:clear
php artisan config:clear
php artisan permission:cache-reset

# Run migrations
php artisan migrate
php artisan migrate:status

# Find files
find app -name "*.php" | xargs grep -l "keyword"
find resources/js -name "*.tsx" | xargs grep -l "keyword"
grep -rn "keyword" routes/
```

---

## Common Gotchas
```
1. `key` is reserved in MariaDB — always use backtick quotes in raw SQL
2. Spatie permissions are SaaS-scoped — permission assigned to global role
   may not work for company user. Fix: assign via model_has_permissions
   or remove middleware and handle in controller
3. Always clear permission cache + logout/login after permission changes
4. creatorId() returns the company user id for all nested users
5. getCompanyAndUsersId() returns array of all user ids under the company
6. NRC field uses auto-formatter on frontend — strips non-digits and inserts /
7. Pay date adjustment happens both on frontend (JS) and backend (PHP)
   to ensure consistency
8. Settings table uses user_id scoping — always pass creatorId() not Auth::id()
9. Employee status enum must include 'suspended' — run DB migration if missing
10. Zambia tax settings route was protected by broken middleware — removed
    the permission middleware from routes/settings.php for that route
```

---

## File Paths Quick Reference
```
Employee Create:    resources/js/pages/hr/employees/create.tsx
Employee Edit:      resources/js/pages/hr/employees/edit.tsx
Employee Show:      resources/js/pages/hr/employees/show.tsx
Employee List:      resources/js/pages/hr/employees/index.tsx
Employee Controller: app/Http/Controllers/EmployeeController.php
Employee Model:     app/Models/Employee.php

Payroll Run List:   resources/js/pages/hr/payroll-runs/index.tsx
Payroll Controller: app/Http/Controllers/PayrollRunController.php
Payroll Run Model:  app/Models/PayrollRun.php

Zambia Tax UI:      resources/js/pages/settings/components/zambia-tax-settings.tsx
Zambia Tax Controller: app/Http/Controllers/Settings/ZambiaTaxSettingController.php
Zambia Tax Route:   routes/settings.php (line ~124)

Settings Page:      resources/js/pages/settings/index.tsx
Routes:             routes/web.php + routes/settings.php
Helpers:            app/Helpers/helper.php
```