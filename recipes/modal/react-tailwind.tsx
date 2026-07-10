import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Footer actions; place the primary action last (renders right-most). */
  footer?: ReactNode;
  /** Non-destructive dialogs close on backdrop click; destructive ones must not. */
  dismissOnBackdrop?: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export const Modal = forwardRef<HTMLDivElement, ModalProps>(function Modal(
  { open, onClose, title, children, footer, dismissOnBackdrop = true },
  _ref
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  // Remember what was focused so we can restore it on close.
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;

    // Move focus into the dialog.
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    // Lock background scroll.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
      // Return focus to the trigger on close.
      triggerRef.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      // Focus trap.
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === firstNode) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && active === lastNode) {
        e.preventDefault();
        firstNode.focus();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={onKeyDown}
    >
      {/* Backdrop — fades in, closes non-destructive dialogs on click. */}
      <div
        className="absolute inset-0 bg-black/50 motion-safe:animate-[fadeIn_150ms_ease-out]"
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        className={cx(
          "relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl outline-none",
          "dark:bg-neutral-900",
          // Only transform/opacity animate; ease-out enter.
          "motion-safe:animate-[panelIn_150ms_ease-out]"
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:hover:bg-neutral-800"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div id={bodyId} className="text-sm text-neutral-600 dark:text-neutral-300">
          {children}
        </div>

        {footer && (
          // Primary action is placed last by the caller and renders right-most.
          <div className="mt-6 flex justify-end gap-3">{footer}</div>
        )}
      </div>

      {/* Keyframes (Tailwind v4: define in your global CSS via @keyframes or @theme).
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes panelIn { from { opacity: 0; transform: translateY(8px) scale(.98) }
                               to { opacity: 1; transform: none } } */}
    </div>
  );
});

/* Usage:
const [open, setOpen] = useState(false);
<button onClick={() => setOpen(true)}>Delete project</button>
<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Delete project?"
  dismissOnBackdrop={false}           // destructive: don't discard on stray click
  footer={<>
    <button onClick={() => setOpen(false)}>Cancel</button>
    <button onClick={confirm}>Delete project</button>  // primary, right-most
  </>}
>
  This permanently removes the project and all its data.
</Modal>
*/
