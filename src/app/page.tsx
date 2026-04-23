import Link from "next/link";

import { CompanyLogo } from "@/components/brand/company-logo";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#05060d] text-white">
      <style>{`
        @keyframes drift-x {
          0%, 100% { transform: translateX(-16%); }
          50% { transform: translateX(16%); }
        }
        @keyframes drift-y {
          0%, 100% { transform: translateY(-10%); }
          50% { transform: translateY(10%); }
        }
        @keyframes sweep {
          0% { transform: translateX(-34%) translateY(-15%); opacity: 0.1; }
          50% { transform: translateX(34%) translateY(15%); opacity: 0.18; }
          100% { transform: translateX(-34%) translateY(-15%); opacity: 0.1; }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(90,44,122,0.45),transparent_34%),radial-gradient(circle_at_90%_84%,rgba(21,35,110,0.45),transparent_38%),linear-gradient(155deg,rgba(2,4,16,0.95),rgba(10,11,35,0.93))]" />
      <div className="absolute left-[-16%] top-[7%] h-[440px] w-[440px] rounded-full bg-[radial-gradient(circle,rgba(215,132,57,0.28)_0%,rgba(215,132,57,0.08)_58%,rgba(215,132,57,0)_72%)] blur-2xl" />
      <div className="tg-surface-live pointer-events-none absolute right-[-12%] top-[42%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(108,70,178,0.24)_0%,rgba(108,70,178,0.05)_52%,rgba(108,70,178,0)_78%)] blur-3xl" style={{ animation: "drift-y 28s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute inset-y-[-24%] left-[8%] h-72 w-[260px] rotate-12 rounded-full border border-white/16 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0)_100%)] blur-sm" style={{ animation: "sweep 24s linear infinite" }} />
      <div className="pointer-events-none absolute inset-y-[70%] left-[28%] h-64 w-[260px] -rotate-12 rounded-full border border-white/14 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.14)_50%,rgba(255,255,255,0)_100%)] blur-sm" style={{ animation: "sweep 32s linear infinite" }} />
      <div className="pointer-events-none absolute inset-x-0 top-12 mx-auto h-full w-full bg-[linear-gradient(100deg,transparent_0,rgba(255,255,255,0.06)_50%,transparent_100%)] bg-[length:220%_220%]" style={{ animation: "drift-x 30s ease-in-out infinite" }} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1420px] items-center justify-center px-5 py-6 lg:px-12">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="group relative overflow-hidden rounded-[34px] border border-white/12 bg-[linear-gradient(155deg,rgba(31,22,60,0.84),rgba(12,12,30,0.87))] p-10 text-white shadow-[0_36px_140px_rgba(2,2,14,0.62)] ring-1 ring-white/5 backdrop-blur-sm">
            <div className="absolute inset-0 rounded-[34px] border border-white/10" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <p className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-white/85">
                  CORPORATE EXECUTIVE CONTROL LAYER
                </p>

                <div className="mt-8 flex items-center gap-4">
                  <CompanyLogo width={80} height={80} priority className="size-20 object-contain" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f7c08b]">
                      The Gathering KSA
                    </p>
                    <p className="text-lg font-light tracking-[0.09em] text-white/85">
                      Certificate & Operations Platform
                    </p>
                  </div>
                </div>

                <h1 className="mt-8 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
                  The operations cockpit for procurement execution, vendor governance,
                  and certificate lifecycle control.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-white/82">
                  Keep the project workspace, vendor assignments, approvals,
                  tasks, and analytics in one professional command surface while
                  preserving strict role-based access and auditability.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/6 px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/50">Workflow</p>
                  <p className="mt-2 text-lg font-semibold">Project-linked certificates with PM governance</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/6 px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/50">Governance</p>
                  <p className="mt-2 text-lg font-semibold">Vendor ratings, notifications, and reviews</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-[30px] border border-white/20 bg-white/93 p-7 text-[var(--color-ink)] shadow-[0_28px_100px_rgba(7,9,22,0.24)] backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Private Admin
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                Procurement Workspace
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                Create projects, link vendor assignments, issue and revise certificates,
                control tasks and monthly reviews, and keep everything visible from a
                single dashboard.
              </p>
              <div className="mt-6">
                <Button
                  asChild
                  size="lg"
                  className="tg-button-live h-11 w-full justify-center rounded-xl bg-[var(--color-primary)] font-semibold text-white hover:bg-[var(--color-primary-strong)]"
                >
                  <Link href="/admin/login">Open Admin Workspace</Link>
                </Button>
              </div>
            </section>
            <section className="rounded-[28px] border border-white/15 bg-white/90 p-7 text-[var(--color-ink)] shadow-[0_22px_70px_rgba(7,9,22,0.2)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Public Verification
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                QR-safe Certificate Access
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                Issued certificates route to a controlled verification path with
                tamper-proof workflow visibility while keeping internal operations
                private.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
