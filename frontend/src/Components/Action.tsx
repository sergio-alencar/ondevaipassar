import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * The site's three kinds of clickable text, so a page never invents a fourth:
 *
 * - ActionButton / ActionLink — a light action or a way to move around: "Ver
 *   mais jogos", "Todos os campeonatos", "Cancelar". Bold, upper-case, dark
 *   grey, with a small icon and no box (the look "+ Seguir" set), at least 44px
 *   tall so it is easy to hit on a phone.
 * - InlineLink — a link inside a sentence or a row of small options. Bold
 *   purple instead of underlined: colour and weight tell it from the text
 *   around it without the underline.
 * - The dark pill (see ContaPage) stays for decisions with weight: signing
 *   out, deleting the account.
 *
 * FollowButton shares ACTION_CLASS so all of these read as one family.
 */
export const ACTION_CLASS =
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 px-3 font-bold uppercase text-gray-800 transition-colors hover:text-gray-500 disabled:cursor-default disabled:opacity-50";

type IconName = "back" | "down" | "edit" | "close";

const ICON_PATHS: Record<IconName, string> = {
  back: "M12 4l-6 6 6 6M6 10h11",
  down: "M4 8l6 6 6-6",
  edit: "M4 16l1-4 8-8 3 3-8 8-4 1zM11 6l3 3",
  close: "M5 5l10 10M15 5L5 15",
};

const Icon = ({ name }: { name: IconName }) => (
  <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICON_PATHS[name]} />
  </svg>
);

interface ActionProps {
  icon?: IconName;
  children: ReactNode;
}

export const ActionButton = ({ icon, children, className = "", ...rest }: ActionProps & Omit<ComponentProps<"button">, "children">) => (
  <button type="button" className={`${ACTION_CLASS} ${className}`} {...rest}>
    {icon && <Icon name={icon} />}
    {children}
  </button>
);

export const ActionLink = ({ icon, children, className = "", ...rest }: ActionProps & Omit<ComponentProps<typeof Link>, "children">) => (
  <Link className={`${ACTION_CLASS} ${className}`} {...rest}>
    {icon && <Icon name={icon} />}
    {children}
  </Link>
);

const INLINE_CLASS = "font-bold text-purple-900 transition-colors hover:text-purple-600";

export const InlineLink = ({ className = "", ...rest }: ComponentProps<typeof Link>) => <Link className={`${INLINE_CLASS} ${className}`} {...rest} />;

/** For the one or two links that leave the site or are plain anchors (a Google sign-in, a dev-only login). */
export const InlineAnchor = ({ className = "", ...rest }: ComponentProps<"a">) => <a className={`${INLINE_CLASS} ${className}`} {...rest} />;
