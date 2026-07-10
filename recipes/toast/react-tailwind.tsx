import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "success" | "error" | "info";

interface Toast {
  id: string;
  variant: Variant;
  message: string;
  /** ms before auto-dismiss; errors default to longer. */
  duration?: number;
}

interface ToastContextValue {
  notify: (t: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const styles: Record<Variant, { ring: string; icon: ReactNode; role: "status" | "alert"; live: "polite" | "assertive" }> = {
  success: {
    ring: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    role: "status",
    live: "polite",
    icon: <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  error: {
    ring: "border-red-500/30 text-red-700 dark:text-red-300",
    role: "alert",
    live: "assertive",
    icon: <path d="M12 8v5m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  info: {
    ring: "border-indigo-500/30 text-indigo-700 dark:text-indigo-300",
    role: "status",
    live: "polite",
    icon: <path d="M12 16v-5m0-3h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    // Cap at 3 simultaneous toasts, newest last.
    setToasts((cur) => [...cur, { ...t, id }].slice(-3));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Region exists before toasts render so screen readers announce updates. */}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const s = styles[toast.variant];
  const duration = toast.duration ?? (toast.variant === "error" ? 8000 : 5000);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | null>(null);
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  const beginExit = useCallback(() => {
    setLeaving(true);
    // Wait for the exit transition before removing from the DOM.
    window.setTimeout(onDismiss, 150);
  }, [onDismiss]);

  const clear = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const resume = useCallback(() => {
    clear();
    startedAt.current = Date.now();
    timer.current = window.setTimeout(beginExit, remaining.current);
  }, [beginExit, clear]);

  const pause = useCallback(() => {
    clear();
    remaining.current -= Date.now() - startedAt.current;
  }, [clear]);

  useEffect(() => {
    resume();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role={s.role}
      aria-live={s.live}
      // Pause on hover AND on keyboard focus so users can read/act.
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className={cx(
        "pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg",
        "dark:bg-neutral-900",
        s.ring,
        // Enter ease-out / exit ease-in; only opacity + transform animate.
        "transition-[opacity,transform] duration-150",
        leaving
          ? "translate-x-2 opacity-0 ease-in"
          : "translate-x-0 opacity-100 ease-out motion-safe:animate-[toastIn_150ms_ease-out]",
        "motion-reduce:transition-opacity motion-reduce:animate-none"
      )}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
        {s.icon}
      </svg>
      <p className="flex-1 text-sm text-neutral-800 dark:text-neutral-100">{toast.message}</p>
      <button
        type="button"
        onClick={beginExit}
        aria-label="Dismiss notification"
        className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:hover:bg-neutral-800"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* @keyframes toastIn { from { opacity:0; transform: translateY(8px) }
                              to { opacity:1; transform:none } }  — define in global CSS */}
    </div>
  );
}

/* Usage:
<ToastProvider>
  <App />
</ToastProvider>

const { notify } = useToast();
notify({ variant: "success", message: "Order placed." });
notify({ variant: "error", message: "Payment failed. Try again." });
*/
