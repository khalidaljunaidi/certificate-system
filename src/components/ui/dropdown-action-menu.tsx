"use client";

import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DropdownActionMenuProps = {
  children: (input: { closeMenu: () => void }) => ReactNode;
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
  menuClassName?: string;
  widthClassName?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const VIEWPORT_PADDING = 16;
const MENU_GAP = 10;
const DEFAULT_MENU_WIDTH = 288;
const ESTIMATED_MENU_HEIGHT = 360;

function DropdownActionMenu({
  children,
  triggerLabel = "Actions",
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerClassName,
  menuClassName,
  widthClassName = "w-72",
}: DropdownActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableBelow = viewportHeight - rect.bottom - VIEWPORT_PADDING;
    const availableAbove = rect.top - VIEWPORT_PADDING;
    const openUp =
      availableBelow < Math.min(ESTIMATED_MENU_HEIGHT, 280) &&
      availableAbove > availableBelow;
    const computedWidth = Math.min(
      DEFAULT_MENU_WIDTH,
      viewportWidth - VIEWPORT_PADDING * 2,
    );
    const computedLeft = Math.min(
      Math.max(VIEWPORT_PADDING, rect.right - computedWidth),
      viewportWidth - computedWidth - VIEWPORT_PADDING,
    );
    const maxHeight = Math.max(
      180,
      openUp ? availableAbove - MENU_GAP : availableBelow - MENU_GAP,
    );
    const computedTop = openUp
      ? Math.max(
          VIEWPORT_PADDING,
          rect.top - Math.min(ESTIMATED_MENU_HEIGHT, maxHeight) - MENU_GAP,
        )
      : rect.bottom + MENU_GAP;

    setPosition({
      top: computedTop,
      left: computedLeft,
      width: computedWidth,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !mounted) {
      return;
    }

    updatePosition();
  }, [isOpen, mounted, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }

      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={cn("gap-2", triggerClassName)}
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {triggerLabel}
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {mounted && isOpen && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className={cn(
                "fixed z-[120] overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white p-2 shadow-[0_24px_64px_rgba(17,17,17,0.18)]",
                widthClassName,
                menuClassName,
              )}
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
                maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
                maxHeight: position.maxHeight,
              }}
            >
              <div className="space-y-1 overflow-y-auto pr-1">{children({ closeMenu })}</div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export { DropdownActionMenu };
