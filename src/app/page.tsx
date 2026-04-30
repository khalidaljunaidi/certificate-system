import Link from "next/link";

import { CompanyLogo } from "@/components/brand/company-logo";

export default function Home() {
  return (
    <main className="relative isolate flex h-screen min-h-[100svh] overflow-hidden bg-[#080711] px-6 text-[#F8F7FB]">
      <style>{`
        @keyframes hero-reveal {
          from {
            opacity: 0;
            transform: translate3d(0, 24px, 0) scale(0.98);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes cinematic-video-zoom {
          0%, 100% { transform: scale(1.03) translate3d(0, 0, 0); }
          50% { transform: scale(1.11) translate3d(-1.2%, -0.8%, 0); }
        }

        @keyframes fallback-aurora {
          0%, 100% { transform: translate3d(-3%, -2%, 0) rotate(-3deg) scale(1); opacity: 0.72; }
          50% { transform: translate3d(3%, 2%, 0) rotate(3deg) scale(1.08); opacity: 1; }
        }

        @keyframes light-sweep {
          0% { transform: translate3d(-140%, 18%, 0) rotate(-15deg); opacity: 0; }
          22% { opacity: 0.42; }
          58% { opacity: 0.16; }
          100% { transform: translate3d(142%, -12%, 0) rotate(-15deg); opacity: 0; }
        }

        @keyframes particle-rise {
          0% { transform: translate3d(0, 44px, 0); opacity: 0; }
          20% { opacity: 0.72; }
          100% { transform: translate3d(0, -92vh, 0); opacity: 0; }
        }

        @keyframes grain-drift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(-2%, 1%, 0); }
          50% { transform: translate3d(1%, -2%, 0); }
          75% { transform: translate3d(2%, 2%, 0); }
        }

        .hero-content {
          animation: hero-reveal 1100ms cubic-bezier(0.16, 1, 0.3, 1) 160ms both;
        }

        .hero-video {
          animation: cinematic-video-zoom 26s ease-in-out infinite;
        }

        .fallback-aurora {
          animation: fallback-aurora 16s ease-in-out infinite;
        }

        .gold-sweep {
          animation: light-sweep 8.5s ease-in-out infinite;
        }

        .cinematic-noise {
          animation: grain-drift 1.1s steps(2, end) infinite;
          background-image:
            radial-gradient(circle at 18% 22%, rgba(255,255,255,0.16) 0 1px, transparent 1px),
            radial-gradient(circle at 72% 16%, rgba(255,255,255,0.11) 0 1px, transparent 1px),
            radial-gradient(circle at 44% 78%, rgba(255,255,255,0.09) 0 1px, transparent 1px),
            radial-gradient(circle at 86% 64%, rgba(255,255,255,0.12) 0 1px, transparent 1px);
          background-size: 92px 92px, 137px 137px, 171px 171px, 229px 229px;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-content,
          .hero-video,
          .fallback-aurora,
          .gold-sweep,
          .cinematic-noise,
          .hero-particle {
            animation: none !important;
          }
        }
      `}</style>

      <div className="absolute inset-0 overflow-hidden">
        <div className="fallback-aurora absolute inset-[-18%] bg-[radial-gradient(circle_at_50%_16%,rgba(200,164,92,0.42),transparent_22%),radial-gradient(circle_at_17%_72%,rgba(122,72,210,0.34),transparent_32%),radial-gradient(circle_at_82%_68%,rgba(229,201,138,0.18),transparent_28%),linear-gradient(135deg,#070610_0%,#1B1033_54%,#2A1B4D_100%)] blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(200,164,92,0.12)_18%,transparent_34%,rgba(107,62,185,0.18)_60%,transparent_78%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_18%),radial-gradient(circle_at_50%_110%,rgba(200,164,92,0.18),transparent_32%)]" />
        <ParticleField />
      </div>

      <video
        className="hero-video absolute inset-0 h-full w-full object-cover opacity-90"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,5,13,0.66)_0%,rgba(8,7,17,0.34)_42%,rgba(8,7,17,0.78)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.22)_42%,rgba(0,0,0,0.82)_100%)]" />
      <div className="gold-sweep pointer-events-none absolute left-1/2 top-1/2 h-[170vh] w-[28vw] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(229,201,138,0.32),rgba(200,164,92,0.18),transparent)] blur-3xl" />
      <div className="cinematic-noise pointer-events-none absolute inset-[-10%] opacity-[0.13] mix-blend-screen" />

      <section className="relative z-10 mx-auto flex h-full min-h-[100svh] w-full max-w-6xl items-center justify-center text-center">
        <div className="hero-content flex w-full flex-col items-center">
          <div className="relative flex w-full justify-center">
            <div className="absolute left-1/2 top-1/2 h-32 w-[min(82vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C8A45C]/28 blur-[54px] sm:h-40" />
            <div className="absolute left-1/2 top-1/2 h-px w-[min(86vw,780px)] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(229,201,138,0.9),transparent)] blur-sm" />
            <CompanyLogo
              width={900}
              height={180}
              priority
              className="relative h-auto w-[min(86vw,760px)] object-contain drop-shadow-[0_28px_82px_rgba(229,201,138,0.34)]"
            />
          </div>

          <p className="mt-12 text-sm font-medium uppercase tracking-[0.24em] text-[#E5C98A] drop-shadow-[0_14px_38px_rgba(0,0,0,0.58)] sm:mt-14 sm:text-base">
            Procurement &amp; Vendor Platform
          </p>

          <div className="mt-12 flex w-full max-w-3xl flex-col gap-4 sm:flex-row sm:justify-center sm:gap-5">
            <Link
              href="/vendor-registration"
              className="group relative inline-flex min-h-[68px] min-w-[270px] items-center justify-center gap-3 overflow-hidden rounded-[1.45rem] bg-[linear-gradient(135deg,#F8E7B5_0%,#D8B86B_44%,#A9792D_100%)] px-10 text-[13px] font-bold uppercase tracking-[0.12em] text-[#1B1033] shadow-[0_28px_90px_rgba(200,164,92,0.36),inset_0_1px_0_rgba(255,255,255,0.52)] transition duration-300 hover:scale-[1.035] hover:shadow-[0_34px_118px_rgba(229,201,138,0.52),inset_0_1px_0_rgba(255,255,255,0.62)] focus:outline-none focus:ring-2 focus:ring-[#F4DFA5] focus:ring-offset-2 focus:ring-offset-[#080711]"
            >
              <span className="absolute inset-x-4 top-0 h-px bg-white/65" />
              <span className="relative">Register as Vendor</span>
              <ArrowIcon className="relative h-4 w-4 transition duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="group relative inline-flex min-h-[68px] min-w-[270px] items-center justify-center gap-3 overflow-hidden rounded-[1.45rem] border border-[#E5C98A]/48 bg-[linear-gradient(135deg,rgba(27,16,51,0.74),rgba(11,11,20,0.42))] px-10 text-[13px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_24px_88px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition duration-300 hover:scale-[1.035] hover:border-[#E5C98A]/80 hover:bg-white/[0.11] hover:shadow-[0_30px_110px_rgba(229,201,138,0.2),inset_0_1px_0_rgba(255,255,255,0.18)] focus:outline-none focus:ring-2 focus:ring-[#E5C98A] focus:ring-offset-2 focus:ring-offset-[#080711]"
            >
              <span className="absolute inset-x-4 top-0 h-px bg-[#E5C98A]/38" />
              <span className="relative">Team Login</span>
              <ArrowIcon className="relative h-4 w-4 transition duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 9h9.25M9.75 4.5 14.25 9l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 34 }).map((_, index) => (
        <span
          key={index}
          className="hero-particle absolute h-1 w-1 rounded-full bg-[#E5C98A]/70"
          style={{
            left: `${(index * 31) % 100}%`,
            bottom: `${(index * 17) % 96}%`,
            animation: `particle-rise ${14 + (index % 8)}s linear infinite`,
            animationDelay: `${index * -0.52}s`,
            opacity: 0.12 + (index % 5) * 0.08,
          }}
        />
      ))}
    </div>
  );
}
