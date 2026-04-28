"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { DropdownActionMenu } from "@/components/ui/dropdown-action-menu";
import type { OperationalTaskListItem } from "@/lib/types";

export function TasksRowActions({
  task,
  canManage,
}: {
  task: OperationalTaskListItem;
  canManage: boolean;
}) {
  const detailHref = `/admin/tasks/${task.id}`;
  const actionPanelHref = `${detailHref}#task-action-panel`;

  return (
    <DropdownActionMenu
      triggerLabel="Actions"
      menuClassName="tg-floating-panel"
      widthClassName="w-64"
    >
      {({ closeMenu }) => (
        <>
          <MenuLink href={detailHref} onClick={closeMenu}>
            View Task
          </MenuLink>
          {canManage ? (
            <MenuLink href={actionPanelHref} onClick={closeMenu}>
              Edit Task
            </MenuLink>
          ) : null}
          {canManage ? (
            <MenuLink href={actionPanelHref} onClick={closeMenu}>
              Assign User
            </MenuLink>
          ) : null}
          <MenuLink href={actionPanelHref} onClick={closeMenu}>
            Mark Complete
          </MenuLink>
          <MenuLink href={actionPanelHref} onClick={closeMenu}>
            Add Note
          </MenuLink>
          {canManage ? (
            <MenuLink href={actionPanelHref} onClick={closeMenu}>
              Escalate
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
