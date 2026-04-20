import Link from "next/link";

import { PageNotice } from "@/components/admin/page-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { requireAdminSession } from "@/lib/auth";

type ProfilePageProps = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Profile
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
            Account profile
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
            Review your Procurement account identity, role, and security status.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/profile/security">Open security settings</Link>
        </Button>
      </section>

      {params.notice === "password-change-required" ? (
        <PageNotice
          tone="warning"
          title="Password update required"
          body="Please update your password before continuing into the rest of the admin workspace."
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ProfileItem label="Full name" value={session.user.name} />
          <ProfileItem label="Email address" value={session.user.email} />
          <ProfileItem label="Title" value={session.user.title} />
          <ProfileItem
            label="Role"
            value={USER_ROLE_LABELS[session.user.role]}
          />
          <ProfileItem
            label="Password status"
            value={
              session.user.passwordChanged
                ? "Password updated"
                : "Password update required"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
