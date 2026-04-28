import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { CompanyLogo } from "@/components/brand/company-logo";
import { Button } from "@/components/ui/button";

const SUPPLIER_REGISTRATION_STEPS = [
  {
    number: "1",
    title: "Submit company details",
    description: "Legal info, contact, and services.",
  },
  {
    number: "2",
    title: "Upload required documents",
    description: "CR, VAT, and company profile.",
  },
  {
    number: "3",
    title: "Procurement review",
    description: "Our team validates your submission.",
  },
  {
    number: "4",
    title: "Get approved & onboarded",
    description: "Receive confirmation and start with us.",
  },
] as const;

export default function Home() {
  return (
    <main className="theme-landing relative isolate min-h-screen overflow-hidden bg-[var(--tg-dark)] text-white">
      <style>{`
        @keyframes landing-particle-rise {
          0% { transform: translate3d(0, 24px, 0); opacity: 0; }
          20% { opacity: 0.72; }
          100% { transform: translate3d(0, -96vh, 0); opacity: 0; }
        }

        @keyframes landing-grid-drift {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.2; }
          50% { transform: translate3d(-14px, 10px, 0); opacity: 0.34; }
        }

        @keyframes ai-caption-shimmer {
          0% { background-position: 0% 50%; opacity: 0.78; }
          50% { background-position: 100% 50%; opacity: 1; }
          100% { background-position: 0% 50%; opacity: 0.78; }
        }

        .landing-grid {
          animation: landing-grid-drift 18s ease-in-out infinite;
        }

        .ai-caption {
          animation: ai-caption-shimmer 5.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .landing-particle,
          .landing-grid,
          .ai-caption {
            animation: none !important;
          }
        }
      `}</style>

      <div className="absolute inset-0 [background:var(--tg-dark-gradient)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_14%,rgba(200,164,92,0.2),transparent_30%),radial-gradient(circle_at_18%_80%,rgba(229,201,138,0.12),transparent_36%)]" />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:76px_76px] [mask-image:radial-gradient(circle_at_66%_48%,black,transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.028),transparent_22%,rgba(200,164,92,0.06)_56%,transparent_82%)]" />
      <ParticleField />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:px-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/[0.055] px-4 py-3 shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <CompanyLogo
              width={64}
              height={64}
              priority
              className="h-14 w-14 rounded-2xl object-contain shadow-[0_16px_45px_rgba(0,0,0,0.36)]"
            />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-[var(--tg-gold-soft)]">
                The Gathering KSA
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                Procurement Operations Platform
              </p>
            </div>
          </div>

          <h1 className="mt-9 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl xl:text-5xl">
            Intelligent procurement control, supplier governance, and finance
            visibility.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
            Manage supplier onboarding, vendor assignments, certificates,
            payments, tasks, and governance from one secure internal platform.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 justify-center rounded-2xl px-6 text-sm font-semibold"
            >
              <Link href="/admin/dashboard">
                Open Admin Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="h-12 justify-center rounded-2xl border border-white/22 bg-white/[0.1] px-6 text-sm font-semibold !text-white shadow-none hover:bg-white/[0.16] hover:!text-white"
            >
              <Link href="/supplier-registration">
                Supplier Registration
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

        </div>

        <BrandIntelligencePanel />

        <SupplierGuide />
      </section>
    </main>
  );
}

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }).map((_, index) => (
        <span
          key={index}
          className="landing-particle absolute h-1 w-1 rounded-full bg-[var(--tg-gold)]/70"
          style={{
            left: `${(index * 37) % 100}%`,
            bottom: `${(index * 19) % 86}%`,
            animation: `landing-particle-rise ${15 + (index % 7)}s linear infinite`,
            animationDelay: `${index * -0.66}s`,
            opacity: 0.2 + (index % 5) * 0.08,
          }}
        />
      ))}
    </div>
  );
}

function BrandIntelligencePanel() {
  return (
    <aside className="relative mx-auto w-full max-w-[610px]">
      <div className="absolute -inset-8 rounded-[44px] bg-[radial-gradient(circle,rgba(200,164,92,0.18),transparent_64%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[34px] border border-[rgba(229,201,138,0.16)] bg-[linear-gradient(145deg,rgba(255,255,255,0.11),rgba(255,255,255,0.03))] p-6 shadow-[0_38px_120px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(229,201,138,0.16),transparent_34%),radial-gradient(circle_at_78%_78%,rgba(42,27,77,0.46),transparent_44%)]" />
        <div className="absolute inset-x-10 top-10 h-px bg-[linear-gradient(90deg,transparent,rgba(229,201,138,0.76),transparent)]" />

        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-[var(--tg-gold-soft)]">
                Platform Intelligence
              </p>
              <h2 className="mt-3 max-w-md text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Governance visibility, designed for executive control.
              </h2>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(229,201,138,0.22)] bg-[rgba(200,164,92,0.12)] text-[var(--tg-gold-soft)]">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-7 rounded-[26px] border border-white/10 bg-black/22 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.09em] text-white/48">
                Live Control Layer
              </span>
              <span className="ai-caption rounded-full border border-[rgba(229,201,138,0.28)] bg-[rgba(200,164,92,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--tg-gold-soft)]">
                Fully operated by AI
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {[
                "Supplier intake and document readiness",
                "Project, vendor, certificate, and payment alignment",
                "Task governance with controlled internal visibility",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.055] px-4 py-3"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--tg-gold-soft)]" />
                  <span className="text-sm leading-6 text-white/76">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <VisualSignal label="Suppliers" value="Onboard" />
            <VisualSignal label="Finance" value="Track" />
            <VisualSignal label="Governance" value="Control" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function VisualSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.065] px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.09em] text-white/48">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SupplierGuide() {
  return (
    <section className="lg:col-span-2">
      <div className="rounded-[30px] border border-white/12 bg-white/[0.06] p-5 shadow-[0_24px_82px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-6">
        <div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              How to register as a supplier
            </h2>
            <p className="mt-2 text-sm text-white/62">
              Complete your registration in a few simple steps.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SUPPLIER_REGISTRATION_STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-white/10 bg-black/18 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(200,164,92,0.34)] hover:bg-white/[0.08]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(200,164,92,0.34)] bg-[rgba(200,164,92,0.14)] text-sm font-semibold text-[var(--tg-gold-soft)]">
                  {step.number}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-white/58">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
