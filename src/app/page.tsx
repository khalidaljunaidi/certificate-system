import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";

import { CompanyLogo } from "@/components/brand/company-logo";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#05020a] text-white">
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

        @keyframes robot-float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -12px, 0); }
        }

        @keyframes halo-pulse {
          0%, 100% { opacity: 0.58; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.86; transform: translate(-50%, -50%) scale(1.035); }
        }

        @keyframes ai-caption-shimmer {
          0% { background-position: 0% 50%; opacity: 0.78; }
          50% { background-position: 100% 50%; opacity: 1; }
          100% { background-position: 0% 50%; opacity: 0.78; }
        }

        .landing-grid {
          animation: landing-grid-drift 18s ease-in-out infinite;
        }

        .robot-float {
          animation: robot-float 7s ease-in-out infinite;
        }

        .robot-halo {
          animation: halo-pulse 6.5s ease-in-out infinite;
        }

        .ai-caption {
          animation: ai-caption-shimmer 5.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .landing-particle,
          .landing-grid,
          .robot-float,
          .robot-halo,
          .ai-caption {
            animation: none !important;
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_14%,rgba(109,70,174,0.36),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(216,166,91,0.18),transparent_38%),linear-gradient(135deg,#05020a_0%,#150822_46%,#020105_100%)]" />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:76px_76px] [mask-image:radial-gradient(circle_at_66%_48%,black,transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.028),transparent_22%,rgba(216,166,91,0.055)_56%,transparent_82%)]" />
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
              <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-[#d8a65b]">
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
              className="h-12 justify-center rounded-2xl bg-[#d8a65b] px-6 text-sm font-semibold text-[#120817] shadow-[0_18px_46px_rgba(216,166,91,0.24)] transition hover:-translate-y-0.5 hover:bg-[#f0c276]"
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
              className="h-12 justify-center rounded-2xl border border-white/22 bg-white/[0.13] px-6 text-sm font-semibold !text-white shadow-none transition hover:-translate-y-0.5 hover:bg-white/[0.2] hover:!text-white"
            >
              <Link href="/supplier-registration">
                Supplier Registration
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <ActionCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Private Admin"
              description="Secure workspace for procurement governance, approvals, task control, vendor oversight, and finance tracking."
              href="/admin/dashboard"
              action="Open workspace"
            />
            <ActionCard
              icon={<Building2 className="h-5 w-5" />}
              title="Supplier Registration"
              description="Public onboarding for company details, compliance documents, business coverage, and supplier taxonomy."
              href="/supplier-registration"
              action="Start onboarding"
            />
          </div>
        </div>

        <RobotStage />
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
          className="landing-particle absolute h-1 w-1 rounded-full bg-[#d8a65b]/70"
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

function RobotStage() {
  return (
    <div className="relative mx-auto flex min-h-[420px] w-full max-w-[610px] items-center justify-center lg:min-h-[650px]">
      <div className="robot-halo absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(216,166,91,0.28)_0%,rgba(124,72,186,0.24)_38%,transparent_70%)] blur-2xl sm:h-[520px] sm:w-[520px]" />
      <div className="absolute left-1/2 top-[52%] h-[54%] w-[74%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(216,166,91,0.18),transparent_68%)] blur-2xl" />

      <div className="relative h-[420px] w-full sm:h-[560px] lg:h-[650px]">
        <div className="absolute inset-x-5 top-12 bottom-8 rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.018))] shadow-[0_38px_120px_rgba(0,0,0,0.34)] backdrop-blur-sm" />
        <div className="absolute inset-x-12 top-10 h-px bg-[linear-gradient(90deg,transparent,rgba(216,166,91,0.7),transparent)]" />
        <Image
          src="/robot.png"
          alt="Luxury AI procurement assistant"
          fill
          priority
          sizes="(max-width: 1024px) 92vw, 48vw"
          className="robot-float object-contain drop-shadow-[0_38px_80px_rgba(0,0,0,0.56)]"
        />
        <div className="absolute inset-x-0 bottom-8 flex justify-center sm:bottom-10">
          <div className="rounded-full border border-[#d8a65b]/28 bg-black/28 px-5 py-2.5 shadow-[0_16px_50px_rgba(216,166,91,0.16)] backdrop-blur-xl">
            <p className="ai-caption bg-[linear-gradient(90deg,#f7d28f,#ffffff,#d8a65b,#f7d28f)] bg-[length:220%_100%] bg-clip-text text-[11px] font-semibold uppercase tracking-[0.14em] text-transparent sm:text-xs">
              Fully operated by AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[26px] border border-white/12 bg-white/[0.065] p-5 shadow-[0_18px_58px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#d8a65b]/38 hover:bg-white/[0.1]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8a65b]/28 bg-[#d8a65b]/12 text-[#d8a65b]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#d8a65b]">
            {action}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
