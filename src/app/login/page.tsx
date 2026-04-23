import { CompanyLogo } from "@/components/brand/company-logo";
import { LoginForm } from "@/components/forms/login-form";
import { redirectSignedInUser } from "@/lib/auth";

export default async function AdminLoginPage() {
  await redirectSignedInUser();

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#05060d] text-white">
      <style>{`
        @keyframes drift-x {
          0%, 100% { transform: translateX(-18%); }
          50% { transform: translateX(18%); }
        }
        @keyframes drift-y {
          0%, 100% { transform: translateY(-12%); }
          50% { transform: translateY(12%); }
        }
        @keyframes sweep {
          0% { transform: translateX(-35%) translateY(-15%); opacity: 0.12; }
          50% { transform: translateX(35%) translateY(15%); opacity: 0.2; }
          100% { transform: translateX(-35%) translateY(-15%); opacity: 0.12; }
        }
        @keyframes lux-orbit {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes lux-float-a {
          0%, 100% { transform: translate3d(-24px, 0, 0) scale(0.86); opacity: 0.18; }
          50% { transform: translate3d(24px, -20px, 0) scale(1.08); opacity: 0.42; }
        }
        @keyframes lux-float-b {
          0%, 100% { transform: translate3d(16px, 12px, 0) scale(0.82); opacity: 0.2; }
          50% { transform: translate3d(-18px, -14px, 0) scale(1.12); opacity: 0.45; }
        }
        @keyframes lux-float-c {
          0%, 100% { transform: translate3d(0, -16px, 0) scale(0.9); opacity: 0.15; }
          50% { transform: translate3d(22px, 14px, 0) scale(1.1); opacity: 0.38; }
        }
        @keyframes lux-ribbon {
          0% { transform: translateX(-4%) translateY(-8%); opacity: 0.08; }
          50% { transform: translateX(4%) translateY(8%); opacity: 0.2; }
          100% { transform: translateX(-4%) translateY(-8%); opacity: 0.08; }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(90,44,122,0.5),transparent_36%),radial-gradient(circle_at_90%_90%,rgba(27,34,108,0.45),transparent_40%),linear-gradient(155deg,rgba(2,2,16,0.9),rgba(8,10,34,0.94))]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" style={{ background: "conic-gradient(from 0deg,rgba(255,255,255,0.14),rgba(255,255,255,0),rgba(181,128,255,0.18),rgba(255,255,255,0))", animation: "lux-orbit 68s linear infinite" }} />
      <div className="absolute left-[-14%] top-[8%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(215,132,57,0.34)_0%,rgba(215,132,57,0.08)_55%,rgba(215,132,57,0)_72%)] blur-2xl opacity-90" />
      <div className="tg-surface-live pointer-events-none absolute right-[-10%] top-[38%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(116,61,163,0.25)_0%,rgba(116,61,163,0.05)_52%,rgba(116,61,163,0)_78%)] blur-3xl" style={{ animation: "drift-y 26s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute inset-x-[-20%] top-[35%] h-[16px] border-t border-white/30" />
      <div className="pointer-events-none absolute inset-y-[-30%] left-[16%] h-72 w-[220px] rotate-12 rounded-full border border-white/20 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.26)_48%,rgba(255,255,255,0)_100%)] blur-sm" style={{ animation: "sweep 20s linear infinite" }} />
      <div className="pointer-events-none absolute inset-y-[72%] left-[32%] h-64 w-[240px] -rotate-12 rounded-full border border-white/16 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.16)_48%,rgba(255,255,255,0)_100%)] blur-sm" style={{ animation: "sweep 28s linear infinite" }} />
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-full w-full bg-[linear-gradient(100deg,transparent_0,rgba(255,255,255,0.05)_50%,transparent_100%)] bg-[length:220%_220%]" style={{ animation: "lux-ribbon 36s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-full w-full bg-[linear-gradient(100deg,transparent_0,rgba(255,255,255,0.06)_50%,transparent_100%)] bg-[length:220%_220%]" style={{ animation: "drift-x 30s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute top-[18%] left-[24%] h-1.5 w-1.5 rounded-full bg-white/65 shadow-[0_0_18px_rgba(255,255,255,0.66)]" style={{ animation: "lux-float-a 17s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute top-[36%] left-[74%] h-2.5 w-2.5 rounded-full bg-[#f8caa0] shadow-[0_0_22px_rgba(248,202,160,0.55)]" style={{ animation: "lux-float-b 19s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute top-[62%] left-[14%] h-2 w-2 rounded-full bg-[#9d79ff] shadow-[0_0_20px_rgba(157,121,255,0.52)]" style={{ animation: "lux-float-c 21s ease-in-out infinite" }} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1420px] px-5 py-6 lg:px-12">
        <div className="grid w-full items-stretch gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="group relative hidden overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(155deg,rgba(32,21,64,0.84),rgba(16,15,34,0.84))] p-10 text-white shadow-[0_36px_140px_rgba(3,1,12,0.64)] ring-1 ring-white/5 backdrop-blur-sm lg:block">
            <div className="tg-reveal absolute inset-0 rounded-[34px] border border-white/10" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-white/85">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
                  INTERNAL GOVERNANCE PLATFORM
                </div>
                <div className="mt-10">
                  <CompanyLogo
                    width={136}
                    height={136}
                    priority
                    className="size-36 rounded-none border-0 bg-transparent p-0 object-contain"
                  />
                </div>
                <p className="mt-10 text-xl font-light tracking-[0.09em] text-white/95">
                  Certificate &amp; Operations Platform
                </p>
                <p className="mt-8 max-w-xl text-base leading-7 text-white/76">
                  Enterprise Governance for Vendors, Certificates, Tasks, and
                  Performance.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/15 bg-white/6 px-4 py-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Secure Access</p>
                  <p className="mt-2 text-lg font-semibold">Role-based workflow control</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/6 px-4 py-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Audit Visibility</p>
                  <p className="mt-2 text-lg font-semibold">Notifications and traceability</p>
                </div>
              </div>
            </div>
          </div>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-[28px] border border-white/25 bg-white/92 p-8 text-[var(--color-ink)] shadow-[0_28px_100px_rgba(7,9,22,0.28)] backdrop-blur-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-primary)]">
                Internal System
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
                Sign in
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                Sign in with your Procurement account to continue.
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
                Internal System — Authorized Access Only
              </p>

              <div className="mt-8">
                <LoginForm />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
