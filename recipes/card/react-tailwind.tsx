import * as React from "react";

/**
 * Card — content container with optional media, clamped title, body, footer.
 *
 * Two variants:
 *  - static   : passive surface; put links/buttons in the footer.
 *  - clickable: the WHOLE card is one target via a stretched link. Do not nest
 *               other tap targets inside a clickable card.
 *
 * SaglitzDesign: border OR shadow (never both), one consistent radius,
 * only transform/opacity/shadow animate, ease-out on enter.
 */

type CardBaseProps = {
  /** "border" = containment, "shadow" = elevation. Never both. */
  surface?: "border" | "shadow";
  className?: string;
  children: React.ReactNode;
};

const RADIUS = "rounded-2xl"; // single radius token for card + media top corners

function surfaceClasses(surface: "border" | "shadow") {
  return surface === "shadow"
    ? "shadow-sm hover:shadow-md"
    : "border border-neutral-200 dark:border-neutral-800";
}

/* -------------------------------------------------------------------------- */
/* Static card                                                                */
/* -------------------------------------------------------------------------- */

export const Card = React.forwardRef<HTMLDivElement, CardBaseProps>(
  function Card({ surface = "border", className = "", children }, ref) {
    return (
      <div
        ref={ref}
        className={[
          "relative flex flex-col overflow-hidden bg-white dark:bg-neutral-900",
          RADIUS,
          surfaceClasses(surface),
          "transition-shadow duration-200 ease-out motion-reduce:transition-none",
          className,
        ].join(" ")}
      >
        {children}
      </div>
    );
  }
);

/* -------------------------------------------------------------------------- */
/* Clickable card — whole surface is one target (stretched link)              */
/* -------------------------------------------------------------------------- */

type CardLinkProps = Omit<CardBaseProps, "children"> & {
  href: string;
  /** Media + body live here; the title element wires up the stretched link. */
  children: React.ReactNode;
};

/**
 * The stretched link is rendered by <CardTitle> when `href` is passed.
 * `focus-within` draws the ring on the card so keyboard focus is visible even
 * though the actual focusable element is the (visually flush) title link.
 */
export const CardLink = React.forwardRef<HTMLDivElement, CardLinkProps>(
  function CardLink({ surface = "shadow", className = "", href, children }, ref) {
    return (
      <div
        ref={ref}
        data-href={href}
        className={[
          "group relative flex flex-col overflow-hidden bg-white dark:bg-neutral-900",
          RADIUS,
          surfaceClasses(surface),
          "transition-[transform,box-shadow] duration-200 ease-out",
          "hover:-translate-y-0.5 active:translate-y-0",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2",
          "dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-neutral-950",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          className,
        ].join(" ")}
      >
        {children}
      </div>
    );
  }
);

/* -------------------------------------------------------------------------- */
/* Parts                                                                      */
/* -------------------------------------------------------------------------- */

export function CardMedia({
  src,
  alt,
  ratio = "16/9",
}: {
  src: string;
  /** Meaningful alt, or "" if purely decorative. */
  alt: string;
  ratio?: string;
}) {
  return (
    <div className="w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800" style={{ aspectRatio: ratio }}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

/**
 * Title. When `href` is set, renders a stretched link: the ::after overlay
 * (via peer class) covers the whole card, so a single Tab focuses it and the
 * whole surface is clickable — no nested tap targets.
 */
export function CardTitle({
  children,
  href,
  as: As = "h3",
}: {
  children: React.ReactNode;
  href?: string;
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <As className="line-clamp-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
      {href ? (
        <a
          href={href}
          className="outline-none after:absolute after:inset-0 after:z-10 after:content-['']"
        >
          {children}
        </a>
      ) : (
        children
      )}
    </As>
  );
}

export function CardBody({
  children,
  clamp = true,
}: {
  children: React.ReactNode;
  clamp?: boolean;
}) {
  return (
    <p className={["text-sm text-neutral-600 dark:text-neutral-300", clamp ? "line-clamp-3" : ""].join(" ")}>
      {children}
    </p>
  );
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col gap-2 p-4">{children}</div>;
}

/** Footer actions — static variant only (nesting tap targets in CardLink is disallowed). */
export function CardFooter({ children }: { children: React.ReactNode }) {
  // z-20 keeps footer controls above a sibling stretched-link overlay, but the
  // convention is to only use CardFooter inside the static Card.
  return (
    <div className="relative z-20 flex items-center gap-3 border-t border-neutral-100 p-4 dark:border-neutral-800">
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Usage                                                                      */
/* -------------------------------------------------------------------------- */

export function CardExamples() {
  return (
    <div className="grid max-w-3xl grid-cols-1 gap-6 p-6 sm:grid-cols-2">
      {/* Static card with footer actions */}
      <Card surface="border">
        <CardMedia src="https://picsum.photos/640/360" alt="Aerial view of a coastline at sunset" />
        <CardContent>
          <CardTitle>A descriptive title that may run onto two lines and then clamp</CardTitle>
          <CardBody>
            Supporting copy explaining the content. Clamped to three lines so every card in the grid
            keeps a consistent height regardless of text length.
          </CardBody>
        </CardContent>
        <CardFooter>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Open project
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Share
          </button>
        </CardFooter>
      </Card>

      {/* Whole-card-clickable */}
      <CardLink surface="shadow" href="/articles/design-systems">
        <CardMedia src="https://picsum.photos/641/360" alt="" />
        <CardContent>
          <CardTitle href="/articles/design-systems">
            Whole card is clickable — one tap target, no nested links
          </CardTitle>
          <CardBody>
            The title link stretches over the card via ::after. Keyboard users Tab once; the focus
            ring is drawn on the card through focus-within.
          </CardBody>
        </CardContent>
      </CardLink>
    </div>
  );
}
