function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Tone = "neutral" | "accent" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  accent: "bg-indigo-600/10 text-indigo-800 dark:bg-indigo-400/20 dark:text-indigo-200",
  danger: "bg-red-600/10 text-red-800 dark:bg-red-400/20 dark:text-red-200",
};

export function Badge({
  tone = "neutral",
  count,
  children,
}: {
  tone?: Tone;
  count?: number;
  children: string;
}) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-1 text-sm font-medium", tones[tone])}>
      {children}
      {count != null && <span className="ml-1 tabular-nums">{count}</span>}
    </span>
  );
}
