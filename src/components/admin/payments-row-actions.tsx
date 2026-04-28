"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PaymentInstallmentModalLauncher } from "@/components/forms/payment-installment-modal-launcher";
import { DropdownActionMenu } from "@/components/ui/dropdown-action-menu";
import type { PaymentRecordListItemView } from "@/lib/types";

export function PaymentsRowActions({
  record,
  canManageInstallments,
  canClose,
  canExport,
}: {
  record: PaymentRecordListItemView;
  canManageInstallments: boolean;
  canClose: boolean;
  canExport: boolean;
}) {
  const detailHref = `/admin/payments/${record.projectVendorId}`;
  const installmentsHref = `${detailHref}?tab=installments`;
  const invoicesHref = `${detailHref}?tab=invoices`;
  const financeReviewHref = `${detailHref}?tab=finance-review`;
  const setPoAmountHref = `/admin/projects/${record.projectId}?editAssignment=${record.projectVendorId}#assignment-${record.projectVendorId}`;
  const assignmentLabel = `${record.projectName} | ${record.vendorName}`;

  return (
    <DropdownActionMenu
      triggerLabel="Actions"
      menuClassName="tg-floating-panel"
      widthClassName="w-72"
    >
      {({ closeMenu }) => (
        <>
          <MenuLink href={detailHref} onClick={closeMenu}>
            View Details
          </MenuLink>
          {record.recommendedAction === "SET_PO_AMOUNT" ? (
            <MenuLink href={setPoAmountHref} onClick={closeMenu}>
              Set PO Amount
            </MenuLink>
          ) : null}
          {canManageInstallments && record.recommendedAction === "ADD_INSTALLMENT" ? (
            <div className="rounded-[14px] px-1 py-1">
              <PaymentInstallmentModalLauncher
                projectId={record.projectId}
                projectVendorId={record.projectVendorId}
                assignmentLabel={assignmentLabel}
                redirectTo={detailHref}
                buttonLabel="Add Installment"
                buttonVariant="ghost"
                buttonSize="sm"
                className="w-full justify-start rounded-[14px] px-3 text-[13px]"
                assignmentAmount={record.activeAmount}
                plannedAmount={record.plannedAmount}
                onOpen={closeMenu}
                mode="create"
              />
            </div>
          ) : null}
          {canManageInstallments &&
          record.recommendedAction === "ADD_INVOICE" &&
          record.nextActionInstallment ? (
            <div className="rounded-[14px] px-1 py-1">
              <PaymentInstallmentModalLauncher
                projectId={record.projectId}
                projectVendorId={record.projectVendorId}
                assignmentLabel={assignmentLabel}
                redirectTo={detailHref}
                buttonLabel="Add Invoice"
                buttonVariant="ghost"
                buttonSize="sm"
                className="w-full justify-start rounded-[14px] px-3 text-[13px]"
                assignmentAmount={record.activeAmount}
                plannedAmount={record.plannedAmount}
                onOpen={closeMenu}
                mode="invoice"
                installment={record.nextActionInstallment}
              />
            </div>
          ) : null}
          {canManageInstallments &&
          record.recommendedAction === "REVIEW_INVOICE" &&
          record.nextActionInstallment ? (
            <div className="rounded-[14px] px-1 py-1">
              <PaymentInstallmentModalLauncher
                projectId={record.projectId}
                projectVendorId={record.projectVendorId}
                assignmentLabel={assignmentLabel}
                redirectTo={detailHref}
                buttonLabel="Review Invoice"
                buttonVariant="ghost"
                buttonSize="sm"
                className="w-full justify-start rounded-[14px] px-3 text-[13px]"
                assignmentAmount={record.activeAmount}
                plannedAmount={record.plannedAmount}
                onOpen={closeMenu}
                mode="review"
                installment={record.nextActionInstallment}
              />
            </div>
          ) : null}
          {canManageInstallments &&
          record.recommendedAction === "SCHEDULE_PAYMENT" &&
          record.nextActionInstallment ? (
            <div className="rounded-[14px] px-1 py-1">
              <PaymentInstallmentModalLauncher
                projectId={record.projectId}
                projectVendorId={record.projectVendorId}
                assignmentLabel={assignmentLabel}
                redirectTo={detailHref}
                buttonLabel="Schedule Payment"
                buttonVariant="ghost"
                buttonSize="sm"
                className="w-full justify-start rounded-[14px] px-3 text-[13px]"
                assignmentAmount={record.activeAmount}
                plannedAmount={record.plannedAmount}
                onOpen={closeMenu}
                mode="schedule"
                installment={record.nextActionInstallment}
              />
            </div>
          ) : null}
          {canManageInstallments &&
          record.recommendedAction === "MARK_PAID" &&
          record.nextActionInstallment ? (
            <div className="rounded-[14px] px-1 py-1">
              <PaymentInstallmentModalLauncher
                projectId={record.projectId}
                projectVendorId={record.projectVendorId}
                assignmentLabel={assignmentLabel}
                redirectTo={detailHref}
                buttonLabel="Mark Paid"
                buttonVariant="ghost"
                buttonSize="sm"
                className="w-full justify-start rounded-[14px] px-3 text-[13px]"
                assignmentAmount={record.activeAmount}
                plannedAmount={record.plannedAmount}
                onOpen={closeMenu}
                mode="mark-paid"
                installment={record.nextActionInstallment}
              />
            </div>
          ) : null}
          <MenuLink href={installmentsHref} onClick={closeMenu}>
            Open Installments
          </MenuLink>
          <MenuLink href={invoicesHref} onClick={closeMenu}>
            Open Invoices
          </MenuLink>
          <MenuLink href={financeReviewHref} onClick={closeMenu}>
            Open Finance Review
          </MenuLink>
          {canClose ? (
            <MenuLink
              href={`${detailHref}?tab=notes#payment-governance`}
              onClick={closeMenu}
            >
              {record.recommendedAction === "CLOSE_PAYMENT"
                ? "Close Payment"
                : record.closedAt
                  ? "Review Closed Record"
                  : "Open Governance"}
            </MenuLink>
          ) : null}
          {canExport ? (
            <MenuLink
              href={`/admin/payments/${record.projectVendorId}/report`}
              onClick={closeMenu}
            >
              Export PDF
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
