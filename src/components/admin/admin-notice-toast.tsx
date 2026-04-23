"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, RefreshCw, Send, ShieldCheck } from "lucide-react";

type ToastTone = "success" | "warning";

type ToastConfig = {
  title: string;
  body: string;
  tone: ToastTone;
};

type ToastState = ToastConfig & {
  id: string;
};

const NOTICE_TOASTS: Record<string, ToastConfig> = {
  "certificate-created": {
    title: "Certificate created",
    body: "Certificate saved successfully.",
    tone: "success",
  },
  "certificate-saved": {
    title: "Certificate updated",
    body: "Certificate saved successfully.",
    tone: "success",
  },
  "revision-submitted": {
    title: "Revision submitted",
    body: "Certificate saved successfully and sent back for PM approval.",
    tone: "success",
  },
  "pm-request-sent": {
    title: "PM approval requested",
    body: "Certificate sent to the Project Manager successfully.",
    tone: "success",
  },
  "certificate-issued": {
    title: "Certificate issued",
    body: "Certificate issued successfully.",
    tone: "success",
  },
  "certificate-reopened": {
    title: "Certificate reopened",
    body: "Certificate reopened successfully and is ready for revision.",
    tone: "warning",
  },
  "password-updated": {
    title: "Password updated",
    body: "Password updated successfully.",
    tone: "success",
  },
  "project-status-updated": {
    title: "Project status updated",
    body: "Project status updated successfully.",
    tone: "success",
  },
  "task-created": {
    title: "Task created",
    body: "Operational task created successfully.",
    tone: "success",
  },
  "task-updated": {
    title: "Task updated",
    body: "Operational task updated successfully.",
    tone: "success",
  },
  "performance-review-saved": {
    title: "Performance review saved",
    body: "Quarterly performance review saved successfully.",
    tone: "success",
  },
  "performance-review-finalized": {
    title: "Performance review finalized",
    body: "Quarterly performance review finalized successfully.",
    tone: "success",
  },
  "monthly-cycle-created": {
    title: "Monthly cycle created",
    body: "The monthly governance cycle was created successfully.",
    tone: "success",
  },
  "monthly-cycle-updated": {
    title: "Monthly cycle updated",
    body: "The monthly cycle state was updated successfully.",
    tone: "success",
  },
  "monthly-review-saved": {
    title: "Monthly review saved",
    body: "The monthly team review was saved successfully.",
    tone: "success",
  },
  "monthly-review-finalized": {
    title: "Monthly review finalized",
    body: "The monthly team review was finalized successfully.",
    tone: "success",
  },
  "vendor-governance-updated": {
    title: "Vendor updated",
    body: "Vendor governance details updated successfully.",
    tone: "success",
  },
  "vendor-category-created": {
    title: "Category created",
    body: "Vendor category created successfully.",
    tone: "success",
  },
  "vendor-subcategory-created": {
    title: "Subcategory created",
    body: "Vendor subcategory created successfully.",
    tone: "success",
  },
  "vendor-saved": {
    title: "Vendor saved",
    body: "Vendor record saved successfully.",
    tone: "success",
  },
  "vendor-evaluation-requested": {
    title: "Evaluation requested",
    body: "Vendor evaluation request emails were sent successfully.",
    tone: "success",
  },
  "vendor-evaluation-finalized": {
    title: "Evaluation finalized",
    body: "Vendor evaluation finalized successfully.",
    tone: "success",
  },
  "vendor-evaluation-force-finalized": {
    title: "Vendor evaluation force-finalized",
    body: "Executive override applied successfully and the evaluation was closed.",
    tone: "warning",
  },
  "certificate-override-approved": {
    title: "Certificate force-approved",
    body: "Executive override applied successfully and the certificate workflow advanced.",
    tone: "warning",
  },
  "workflow-email-routing-saved": {
    title: "Workflow routing updated",
    body: "Workflow email routing updated successfully.",
    tone: "success",
  },
};

function getToastIconKey(title: string) {
  const loweredTitle = title.toLowerCase();

  if (loweredTitle.includes("override") || loweredTitle.includes("force")) {
    return "shield";
  }

  if (title.includes("PM")) {
    return "send";
  }

  if (loweredTitle.includes("reopened")) {
    return "refresh";
  }

  if (title.includes("Password")) {
    return "shield";
  }

  return "check";
}

export function AdminNoticeToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<ToastState | null>(null);
  const consumedNoticeRef = useRef<string | null>(null);
  const notice = searchParams.get("notice");
  const search = searchParams.toString();

  const cleanHref = useMemo(() => {
    const params = new URLSearchParams(search);
    params.delete("notice");

    return params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
  }, [pathname, search]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const config = NOTICE_TOASTS[notice];

    if (!config || consumedNoticeRef.current === notice) {
      return;
    }

    consumedNoticeRef.current = notice;
    setToast({
      id: `${notice}-${Date.now()}`,
      ...config,
    });
    router.replace(cleanHref, { scroll: false });
  }, [cleanHref, notice, router]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  if (!toast) {
    return null;
  }

  const iconKey = getToastIconKey(toast.title);
  const palette =
    toast.tone === "warning"
      ? {
          border: "border-[rgba(215,132,57,0.28)]",
          bg: "bg-[rgba(255,248,238,0.96)]",
          badge: "bg-[rgba(215,132,57,0.12)] text-[var(--color-accent)]",
          icon: "text-[var(--color-accent)]",
        }
      : {
          border: "border-[rgba(21,128,61,0.18)]",
          bg: "bg-[rgba(245,255,248,0.96)]",
          badge: "bg-[rgba(21,128,61,0.12)] text-[#166534]",
          icon: "text-[#166534]",
        };

  return (
    <div className="pointer-events-none fixed right-6 top-24 z-50 flex max-w-sm justify-end">
      <div
        className={`pointer-events-auto w-full rounded-[24px] border px-5 py-4 shadow-[0_20px_50px_rgba(17,17,17,0.16)] backdrop-blur ${palette.border} ${palette.bg}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-2 ${palette.badge}`}>
            {iconKey === "send" ? (
              <Send className={`h-4 w-4 ${palette.icon}`} />
            ) : iconKey === "refresh" ? (
              <RefreshCw className={`h-4 w-4 ${palette.icon}`} />
            ) : iconKey === "shield" ? (
              <ShieldCheck className={`h-4 w-4 ${palette.icon}`} />
            ) : (
              <CheckCircle2 className={`h-4 w-4 ${palette.icon}`} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              {toast.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
              {toast.body}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-full px-2 py-1 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:bg-white hover:text-[var(--color-ink)]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
