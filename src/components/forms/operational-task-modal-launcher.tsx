"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { OperationalTaskForm } from "@/components/forms/operational-task-form";
import { Button } from "@/components/ui/button";
import type { ActionState, TaskLookupOptions } from "@/lib/types";

export function OperationalTaskModalLauncher({
  lookupOptions,
  canManage,
}: {
  lookupOptions?: TaskLookupOptions;
  canManage: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadedLookupOptions, setLoadedLookupOptions] =
    useState<TaskLookupOptions | null>(lookupOptions ?? null);
  const [isLoadingLookupOptions, setIsLoadingLookupOptions] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const activeLookupOptions = lookupOptions ?? loadedLookupOptions;

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleSuccess = (state: ActionState) => {
    setIsOpen(false);

    const params = new URLSearchParams(searchParams.toString());
    params.set("notice", state.noticeKey ?? "task-created");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    router.refresh();
  };

  return (
    <>
      <Button type="button" onClick={handleOpen}>
        Create Task
      </Button>

      {mounted && isOpen
        ? createPortal(
        <div
          className="theme-admin fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(11,11,20,0.62)] px-4 py-8 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create operational task"
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_30px_90px_rgba(11,11,20,0.28)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-[var(--accent)]">
                  Operations
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">
                  Create operational task
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
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
                  redirectOnSuccess={false}
                  onSuccess={handleSuccess}
                />
              ) : (
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-5 text-sm text-[var(--text-muted)]">
                  {lookupError ??
                    (isLoadingLookupOptions
                      ? "Loading task setup options..."
                      : "Preparing task setup options...")}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
          )
        : null}
    </>
  );
}
