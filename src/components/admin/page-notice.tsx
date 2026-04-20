type PageNoticeProps = {
  tone?: "success" | "warning" | "error";
  title: string;
  body: string;
};

export function PageNotice({
  tone = "success",
  title,
  body,
}: PageNoticeProps) {
  const palette =
    tone === "warning"
      ? {
          border: "border-[rgba(215,132,57,0.28)]",
          bg: "bg-[rgba(215,132,57,0.08)]",
          text: "text-[var(--color-ink)]",
          accent: "text-[var(--color-accent)]",
        }
      : tone === "error"
        ? {
            border: "border-[rgba(185,28,28,0.22)]",
            bg: "bg-[rgba(185,28,28,0.06)]",
            text: "text-[#991b1b]",
            accent: "text-[#991b1b]",
          }
      : {
          border: "border-[rgba(21,128,61,0.18)]",
          bg: "bg-[rgba(21,128,61,0.06)]",
          text: "text-[#166534]",
          accent: "text-[#166534]",
        };

  return (
    <div
      className={`rounded-[24px] border px-5 py-4 ${palette.border} ${palette.bg}`}
    >
      <p className={`text-sm font-semibold ${palette.accent}`}>{title}</p>
      <p className={`mt-1 text-sm leading-6 ${palette.text}`}>{body}</p>
    </div>
  );
}
