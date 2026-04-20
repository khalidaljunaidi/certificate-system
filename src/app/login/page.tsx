import { CompanyLogo } from "@/components/brand/company-logo";
import { LoginForm } from "@/components/forms/login-form";
import { ModuleFooter } from "@/components/layout/module-footer";
import { Card, CardContent } from "@/components/ui/card";
import { redirectSignedInUser } from "@/lib/auth";

export default async function AdminLoginPage() {
  await redirectSignedInUser();

  return (
    <main className="flex min-h-screen flex-col px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="tg-reveal tg-breathe-panel rounded-[32px] border border-[var(--color-border)] bg-[linear-gradient(145deg,rgba(49,19,71,0.98),rgba(77,34,106,0.95)_55%,rgba(215,132,57,0.94))] p-8 text-white lg:p-10">
            <CompanyLogo
              width={76}
              height={76}
              priority
              className="tg-logo-float tg-reveal"
            />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-[#f7c08b]">
              Procurement Admin
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Secure certificate operations for project-linked vendor completion.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#efe3f5]">
              Sign in to manage projects, route PM approvals, issue locked PDFs,
              and track every workflow action with notifications and audit history.
            </p>
          </div>

          <Card className="tg-reveal tg-delay-1">
            <CardContent className="p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Admin Access
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
                Sign in
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                Sign in with your Procurement team account to access the protected
                project and certificate workspace.
              </p>
              <div className="mt-8">
                <LoginForm />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <ModuleFooter className="tg-reveal tg-delay-2 pt-8" />
    </main>
  );
}
