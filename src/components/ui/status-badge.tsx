import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

type StatusBadgeTone = "neutral" | "purple" | "orange" | "green" | "red";

function StatusBadge({
  label,
  title,
  tone = "neutral",
  className,
}: {
  label: string;
  title?: string;
  tone?: StatusBadgeTone;
  className?: string;
}) {
  const size = label.replace(/\s+/g, " ").trim().length > 14 ? "sm" : "md";

  return (
    <Chip
      tone={tone}
      size={size}
      className={cn(
        "min-w-0 max-w-full overflow-hidden text-ellipsis align-middle normal-case tracking-[0.08em]",
        className,
      )}
      title={title ?? label}
    >
      {label}
    </Chip>
  );
}

export { StatusBadge, type StatusBadgeTone };
