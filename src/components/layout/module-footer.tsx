import { MODULE_FOOTER_TEXT } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function ModuleFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "text-center text-xs tracking-[0.16em] text-[var(--color-muted)]",
        className,
      )}
    >
      {MODULE_FOOTER_TEXT}
    </footer>
  );
}
