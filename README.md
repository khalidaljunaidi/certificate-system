# The Gathering KSA Completion Certificate System

Production-grade, project-first completion certificate management for internal Procurement operations at The Gathering KSA.

## What This Builds

This application is a real workflow system, not a flat certificate demo.

Core behavior:

- Projects are the primary operating entity.
- Vendors are linked inside projects before certificates are issued.
- Each certificate belongs to exactly one project and one vendor.
- PM approval happens through a secure tokenized public route.
- Final certificates are issued as server-generated one-page PDFs.
- Public QR verification is read-only and never exposes admin routes.
- Internal notifications and audit logs track every critical workflow action.
- The admin interface is English-only and uses the official company logo from `/public/logo.png`.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- shadcn-style component layer
- Prisma 7 with PostgreSQL adapter
- NextAuth credentials auth
- Supabase Storage support for issued PDFs
- Resend email delivery
- `@react-pdf/renderer` for server-side PDF generation
- Vitest unit tests

## Implemented Routes

Private admin routes:

- `/admin/login`
- `/admin/dashboard`
- `/admin/projects`
- `/admin/projects/[projectId]`
- `/admin/projects/[projectId]/certificates`
- `/admin/projects/[projectId]/certificates/new`
- `/admin/projects/[projectId]/certificates/[certificateId]`
- `/admin/certificates`
- `/admin/notifications`

Public routes:

- `/verify/[certificateCode]`
- `/pm-approval/[secureToken]`

Internal API routes:

- `/api/auth/[...nextauth]`
- `/api/certificates/[certificateId]/pdf`

## Core Workflow

1. Procurement creates a draft certificate from inside a project.
2. Procurement sends the certificate to the Project Manager for approval.
3. The system generates a hashed, expiring, single-use PM approval token.
4. PM approves or rejects from the token route without admin login.
5. Procurement receives notifications and can issue the certificate after PM approval.
6. The system generates a final PDF, stores it when Supabase storage is configured, and exposes a stable download route.
7. Vendor distribution email includes the PDF attachment and verification link.
8. Public verification shows only safe data and revoked or invalid states.

## Environment Setup

Copy `.env.example` to `.env.local` and populate the values.

Required for local and production app startup:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Recommended for Prisma seeding and direct administrative scripts:

- `DIRECT_URL`

Required for email delivery and dashboard email testing:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Required for production PDF storage:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET_CERTIFICATES`
- `SUPABASE_STORAGE_BUCKET_VENDOR_REGISTRATION`
- `SUPABASE_STORAGE_BUCKET_PAYMENT_INVOICES`
- `SUPABASE_STORAGE_BUCKET_REPORTS`

Notes:

- `DATABASE_URL` should point to the Supabase session pooler or another pooled Postgres connection string.
- `DIRECT_URL` is optional and can point to a direct Postgres connection for Prisma maintenance commands.
- The app still issues PDFs without Supabase configured, but they are regenerated on download instead of being uploaded to storage.
- Resend is optional for local development. If it is not configured, workflow transitions still complete but outbound email delivery is skipped.
- NextAuth credentials login in this codebase uses JWT sessions because `next-auth` v4 does not support a credentials-only provider with database sessions.

## Local Development

Install dependencies:

```bash
npm install
```

Generate the Prisma client:

```bash
npm run db:generate
```

Push the schema to your PostgreSQL database:

```bash
npm run db:push
```

Reset the development database and recreate the default users-only seed:

```bash
npm run db:reset
```

Seed only the Procurement login users:

```bash
npm run db:seed
```

Optionally seed the demo/sample workspace:

```bash
npm run db:seed:demo
```

Run the app:

```bash
npm run dev
```

Build for production verification:

```bash
npm run build
```

Development reset notes:

- `npm run db:reset` runs `prisma migrate reset --force`.
- Prisma automatically reruns the configured default seed after reset, and that default seed recreates only the three Procurement login users.
- Demo/sample projects, certificates, vendors, notifications, and approval workflow data are not recreated unless you explicitly run `npm run db:seed:demo`.
- Use reset only against a development database because it drops all existing data before rebuilding the schema.

## Seeded Procurement Users

After seeding, the Procurement team can sign in with these accounts:

- `abdulmajeed@thegatheringksa.com`
- `samia@thegatheringksa.com`
- `khaledeljenidy@thegatheringksa.com`

Temporary password for all seeded users:

- `12345678`

Security note:

- `12345678` is for initial setup only.
- Change each password immediately after the first successful login and before production use.

## Optional Demo Data

The optional demo seed keeps the sample workspace idempotent and safe to rerun. It upserts:

- Multiple projects across different statuses
- Shared vendors across projects
- Project-vendor links
- Certificates in `DRAFT`, `PENDING_PM_APPROVAL`, `PM_REJECTED`, `ISSUED`, and `REVOKED`
- Notifications and audit history
- A demo PM approval token hash entry

Useful seeded verification example:

- `/verify/TGCC-TG-JED-2408-001`

## Email Testing

Admin users can test email delivery from the dashboard.

Available test sends:

- PM approval request email
- Procurement notification email
- Final issued certificate email with PDF attachment

Behavior:

- Test emails are sent only to the address entered in the dashboard panel.
- Live PM, vendor, and procurement CC recipients are not used for dashboard email tests.
- Results are surfaced in the UI and written to server logs.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
npm run db:generate
npm run db:push
npm run db:reset
npm run db:seed
npm run db:seed:demo
npm run prisma:studio
```

## Tests

Current automated tests cover:

- token hashing determinism
- verification and PM approval URL generation
- PDF model truncation and font scaling behavior for long certificate content

Run:

```bash
npm test
```

## Architecture Notes

Key folders:

- `src/app` for routes and route handlers
- `src/actions` for server actions
- `src/server/queries` for read-side data access
- `src/server/services` for workflow, audit, notifications, PDF, storage, and email logic
- `src/components` for admin shell, UI primitives, and forms
- `src/emails` for Resend email templates
- `src/pdf` for certificate document rendering
- `prisma` for schema and seed data

Important implementation boundaries:

- UI does not directly contain business workflow logic.
- Workflow transitions are transaction-backed in the service layer.
- Notifications and audit entries are created alongside domain mutations.
- Public verification never exposes internal notes or admin actions.
- PM approval links are single-purpose and expire automatically.
- All app-generated URLs use environment variables through the shared URL helpers.

## Deployment Preparation For Vercel

Configure these environment variables in Vercel:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET_CERTIFICATES`
- `SUPABASE_STORAGE_BUCKET_VENDOR_REGISTRATION`
- `SUPABASE_STORAGE_BUCKET_PAYMENT_INVOICES`
- `SUPABASE_STORAGE_BUCKET_REPORTS`

Deployment notes:

- Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the production domain.
- Keep `NEXTAUTH_SECRET` strong and private.
- Use the pooled Supabase connection string for `DATABASE_URL`.
- Use `DIRECT_URL` only when you want a direct Postgres connection for Prisma maintenance work.
- Verify the sender domain used in `RESEND_FROM_EMAIL`.

## Current Operational Assumptions

- Procurement team users share the same effective permissions today, even though their stored roles can distinguish lead, specialist, and director accounts.
- Issued certificates are treated as locked records.
- Reissue is not implemented; revocation is implemented.
- PM rejection returns the record to a rejected state that Procurement can edit and resubmit.

## Production Hardening Checklist

Before go-live, confirm:

- Supabase storage bucket exists and is private
- Resend sender domain is verified
- Production `NEXTAUTH_SECRET` is rotated and strong
- Seeded users are forced to change their password on first login before they can access the admin workspace
- PostgreSQL backups and monitoring are in place
- Procurement inbox and PM email policies are finalized
