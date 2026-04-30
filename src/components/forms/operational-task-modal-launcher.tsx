"use client";

import { useEffect, useRef, useState } from "react";

import { OperationalTaskForm } from "@/components/forms/operational-task-form";
import { Button } from "@/components/ui/button";
import type { TaskLookupOptions } from "@/lib/types";

export function OperationalTaskModalLauncher({
  lookupOptions,
  canManage,
}: {
  lookupOptions?: TaskLookupOptions;
  canManage: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadedLookupOptions, setLoadedLookupOptions] =
    useState<TaskLookupOptions | null>(lookupOptions ?? null);
  const [isLoadingLookupOptions, setIsLoadingLookupOptions] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const activeLookupOptions = lookupOptions ?? loadedLookupOptions;

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

  const handleOpen = async () => {
    setIsOpen(true);

    if (lookupOptions || loadedLookupOptions || isLoadingLookupOptions) {
      return;
    }

    setLookupError(null);
    setIsLoadingLookupOptions(true);

    try {
      const response = await fetch("/api/admin/tasks/lookup-options", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Task lookup data could not be loaded.");
      }

      const payload = (await response.json()) as {
        lookupOptions?: TaskLookupOptions;
        error?: string;
      };

      if (!payload.lookupOptions) {
        throw new Error(payload.error ?? "Task lookup data could not be loaded.");
      }

      setLoadedLookupOptions(payload.lookupOptions);
    } catch (error) {
      setLookupError(
        error instanceof Error
          ? error.message
          : "Task lookup data could not be loaded.",
      );
    } finally {
      setIsLoadingLookupOptions(false);
    }
  };

  return (
    <>
      <Button type="button" onClick={handleOpen}>
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
              {activeLookupOptions ? (
                <OperationalTaskForm
                  lookupOptions={activeLookupOptions}
                  canManage={canManage}
                />
              ) : (
                <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel-soft)] p-5 text-sm text-[var(--color-muted)]">
                  {lookupError ??
                    (isLoadingLookupOptions
                      ? "Loading task setup options..."
                      : "Preparing task setup options...")}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
