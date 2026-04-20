import Link from "next/link";

import { CompanyLogo } from "@/components/brand/company-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
      <div className="grid w-full gap-8 lg:grid-cols-[1.25fr_0.9fr]">
        <div className="tg-reveal tg-breathe-panel rounded-[36px] border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(49,19,71,0.98),rgba(77,34,106,0.96)_58%,rgba(215,132,57,0.92))] p-8 text-white shadow-[0_40px_100px_rgba(49,19,71,0.22)] lg:p-12">
          <CompanyLogo
            width={80}
            height={80}
            priority
            className="tg-logo-float tg-reveal"
          />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-[#f7c08b]">
            The Gathering KSA
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
            Project-first completion certificate operations with approvals,
            governance, and public verification.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#efe3f5]">
            Manage vendor completion certificates from the project workspace,
            route them through secure PM approval, issue locked one-page PDFs,
            and verify them publicly without exposing admin systems.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="tg-cta-live shadow-[0_18px_40px_rgba(10,10,10,0.18)]"
            >
              <Link href="/admin/login">Open Admin Workspace</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="tg-reveal tg-delay-1">
            <CardContent className="p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Private Admin
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                Procurement Workspace
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                Create projects, link vendors, manage certificate drafts, review
                audit history, issue final PDFs, and monitor notifications from a
                single internal system.
              </p>
            </CardContent>
          </Card>
          <Card className="tg-reveal tg-delay-2">
            <CardContent className="p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Public Verification
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                QR-safe Validation
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                Every issued certificate points only to the public verification
                endpoint. PM approval links are single-purpose, expiring tokens,
                and never expose broader admin functions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
