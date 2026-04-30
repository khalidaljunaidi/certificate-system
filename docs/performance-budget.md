# Performance Budget

This document defines the performance guardrails for THE GATHERING KSA Procurement Operations Platform. Any new page, query, report, sync, or export should stay within these budgets unless the exception is documented and approved.

## Route Budgets

| Area | Cold Budget | Warm Budget |
| --- | ---: | ---: |
| Admin list pages | < 1.5s | < 700ms |
| Detail pages | < 2s | < 900ms |
| Dashboard | < 2s | < 700ms |

Cold means the first request after server/database connection warm-up is not guaranteed. Warm means the next request after the route, query service, and connection pool are active.

## Hard Rules

- Initial page render must only read from the database or local cache.
- No live Odoo calls during initial page render.
- No live OpenAI/AI analysis calls during initial page render.
- Odoo sync must run from an explicit button, background job, or cached status read.
- AI analysis must run on demand or in the background, never as a blocking page dependency.
- No unbounded Prisma list queries. Every list query must use `take`, pagination, or a clear aggregate.
- No huge Prisma `include` trees in page queries. Prefer explicit `select`.
- Load only the visible tab data on detail pages.
- Audit logs, timelines, notes, and notification history must be capped to the latest 30-50 records, with "Load more" for history.
- Exports and PDF generation must run on demand, not during normal page render.

## Runtime Guardrails

- Server route/page warning: log when an admin route exceeds `2000ms`.
- Prisma slow-query warning: log when a query exceeds `300ms`.
- Prisma list warning: log when a likely list query has `ORDER BY` but no `LIMIT`.

## Smoke Test

Run:

```bash
npm run smoke:performance
```

The smoke test checks:

- `/admin/dashboard`
- `/admin/projects`
- `/admin/vendors`
- `/admin/payments`
- `/admin/payments/[knownId]`
- `/admin/tasks`
- `/admin/notifications`
- `/admin/roles`

Required output per route:

- route
- status
- durationMs
- pass/fail

## Review Checklist

- Did the page avoid live external calls?
- Did every list query use `take` or pagination?
- Did detail pages load only active tab data?
- Did query services avoid broad `include` trees?
- Did large histories use caps and "Load more"?
- Did `npm run smoke:performance` pass locally?
- Did `npm run build` and `npx prisma validate` pass?
