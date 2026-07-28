# AfriPay HR

**A multi-tenant HR & Payroll SaaS platform built for the Zambian market.**

AfriPay HR is a full-featured Human Resource and Payroll management system that lets multiple companies (tenants) manage their own employees, attendance, leave, recruitment, and payroll from a single hosted platform — with payroll calculations that follow Zambian statutory requirements (PAYE, NAPSA, NHIMA, SDL) out of the box.

---

## Overview

- **Multi-tenant SaaS** — each company signs up as an isolated tenant with its own employees, roles, branches, and settings, sharing one codebase and database.
- **Zambian payroll compliance** — PAYE tax bands, NAPSA and NHIMA contributions (with statutory caps), and Skills Development Levy are calculated automatically per the current ZRA rules.
- **Full HR suite** — beyond payroll, it covers attendance (including biometric device integration), leave management, recruitment, performance reviews, training, assets, disciplinary records, and more.
- **Role-based access control** — a hybrid permission model supports both platform-wide roles (superadmin, company owner) and roles a company defines for its own staff (HR, manager, employee).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 12 (PHP 8.2+) |
| Frontend bridge | Inertia.js v2 — server-driven SPA, no separate REST/GraphQL API layer |
| Frontend | React 19 + TypeScript, built with Vite |
| Styling / UI | Tailwind CSS v4, Radix UI primitives, Lucide icons |
| Database | MySQL / MariaDB |
| Auth & Permissions | Spatie Laravel Permission (tenant-scoped roles) |
| Reporting | PhpSpreadsheet (Excel import/export), DomPDF & PhpWord (payslips, documents) |
| Other | i18next (multi-language), Recharts (dashboards), FullCalendar, Tiptap editor, multiple payment gateway SDKs (Stripe, Razorpay, Mollie, PayTabs, and more) for subscription billing |

## Architecture

The app is a **server-driven SPA**: Laravel controllers respond with `Inertia::render(...)` calls that hand data straight to React page components, instead of exposing a separate JSON API. This keeps validation, authorization, and business logic centralized in Laravel while the frontend still feels like a single-page app.

```
app/Http/Controllers/     Business logic & Inertia responses
app/Models/                Eloquent models
app/Helpers/helper.php     Tenant-scoping helpers (creatorId(), getCompanyAndUsersId(), ...)
routes/web.php             Application routes
routes/settings.php        Settings routes

resources/js/pages/        Inertia page components (one per route)
resources/js/pages/hr/     HR module pages (employees, payroll, attendance, leave, ...)
resources/js/components/   Shared React components
```

**Multi-tenancy**: every company account is the root of its own tenant. All nested users (HR staff, managers, employees) and their data are scoped through `creatorId()` / `getCompanyAndUsersId()`, so queries never cross tenant boundaries.

**Payroll pipeline**: Employee → Payroll Run (draft → processing → completed → pending approval → final) → per-employee Payroll Entries with configurable salary components → statutory deductions (PAYE/NAPSA/NHIMA/SDL) applied automatically → Payslip generation (PDF) → approval workflow.

## Key Modules

- **HR Core** — Employees, Branches, Departments, Designations, Documents, Contracts, Transfers, Promotions, Resignations, Terminations, Warnings, Awards, Complaints
- **Attendance & Time** — Attendance Records, Biometric Attendance, Attendance Policies & Regularizations, Shifts, Time Entries, Trips
- **Leave** — Leave Applications, Leave Types, Leave Policies, Leave Balances, Holidays
- **Payroll (Zambia)** — Payroll Runs, Payslips, Salary Components, Employee Salaries, Zambia-specific reports (PAYE/NAPSA/NHIMA)
- **Talent** — Recruitment, Performance Reviews, Training, Assets
- **Platform / SaaS** — Companies, Subscription Plans, Coupons, Currencies, Roles & Permissions, Announcements

## Getting Started (local development)

**Requirements:** PHP 8.2+, Composer, Node.js 18+, MySQL/MariaDB.

```bash
# Install dependencies
composer install
npm install

# Configure environment
cp .env.example .env
php artisan key:generate
# then edit .env with your database credentials

# Run migrations
php artisan migrate

# Start the dev servers (Laravel + queue + Vite)
composer run dev
```

The app will be available at `http://127.0.0.1:8000`.

### Useful commands

```bash
npm run build              # Production frontend build
php artisan cache:clear    # Clear application cache
php artisan permission:cache-reset   # Clear Spatie permission cache (required after role/permission changes)
```

## License

Proprietary — all rights reserved. This is a commercial product built and customized for a specific client; it is not licensed for redistribution or reuse.
