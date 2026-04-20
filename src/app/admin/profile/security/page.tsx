import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { PageNotice } from "@/components/admin/page-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";

type SecurityPageProps = {
  searchParams: Promise<{
    notice?: string;
  }>;
};

export default async function SecurityPage({
  searchParams,
}: SecurityPageProps) {
  const session = await requireAdminSession({
    allowPasswordChangeBypass: true,
  });
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Security
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-[var(--color-ink)]">
          Update password
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
          Keep your Procurement account secure by updating your password and
          maintaining a strong credential.
        </p>
      </section>

      {!session.user.passwordChanged || params.notice === "password-change-required" ? (
        <PageNotice
          tone="warning"
          title="Password update required"
          body="Please update your password to continue into the admin workspace."
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Password settings</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
