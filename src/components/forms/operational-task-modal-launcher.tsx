"use client";

import { useEffect, useRef, useState } from "react";

import { OperationalTaskForm } from "@/components/forms/operational-task-form";
import { Button } from "@/components/ui/button";
import type { TaskLookupOptions } from "@/lib/types";

export function OperationalTaskModalLauncher({
  lookupOptions,
  canManage,
}: {
  lookupOptions: TaskLookupOptions;
  canManage: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!canManage) {
    return null;
  }

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)}>
        Create Task
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            ref={panelRef}
            className="tg-floating-panel max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-5">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--color-accent)]">
                  Operations
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  Create operational task
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  Launch a new execution task with ownership, SLA timing, checklist controls, and linked governance context.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-6 py-6">
              <OperationalTaskForm lookupOptions={lookupOptions} canManage={canManage} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
