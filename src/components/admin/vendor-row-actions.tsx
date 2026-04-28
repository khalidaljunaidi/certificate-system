"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { DropdownActionMenu } from "@/components/ui/dropdown-action-menu";

export function VendorRowActions({
  vendorId,
  canEditVendor,
  canRequestEvaluation,
  canViewPayments,
}: {
  vendorId: string;
  canEditVendor: boolean;
  canRequestEvaluation: boolean;
  canViewPayments: boolean;
}) {
  const vendorHref = `/admin/vendors/${vendorId}`;

  return (
    <DropdownActionMenu
      triggerLabel="Actions"
      menuClassName="tg-floating-panel"
      widthClassName="w-64"
    >
      {({ closeMenu }) => (
        <>
          <MenuLink href={vendorHref} onClick={closeMenu}>
            View Vendor
          </MenuLink>
          {canEditVendor ? (
            <MenuLink href={`${vendorHref}#profile-editor`} onClick={closeMenu}>
              Edit Vendor
            </MenuLink>
          ) : null}
          <MenuLink href={`${vendorHref}#vendor-assignments`} onClick={closeMenu}>
            View Assignments
          </MenuLink>
          {canViewPayments ? (
            <MenuLink href={`/admin/payments?vendorId=${vendorId}`} onClick={closeMenu}>
              Open Payments
            </MenuLink>
          ) : null}
          {canRequestEvaluation ? (
            <MenuLink href={`${vendorHref}#evaluation-request`} onClick={closeMenu}>
              Request Evaluation
            </MenuLink>
          ) : null}
        </>
      )}
    </DropdownActionMenu>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center rounded-[14px] px-3 py-2 text-[13px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-panel-soft)]"
    >
      {children}
    </Link>
  );
}
