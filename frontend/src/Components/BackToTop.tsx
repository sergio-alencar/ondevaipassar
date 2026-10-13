import { useEffect, useState } from "react";

/** How far down the page (px) before the button appears: past the first screen, so it never sits over a page that barely scrolls. */
const SHOW_AFTER_PX = 700;

/**
 * A round "back to top" button, bottom-right, shown once the visitor has
 * scrolled down. Scrolls smoothly unless the visitor asked their system for
 * reduced motion. Rises with the footer as it scrolls into view, so it never covers it. Sits below the consent banner (z-40 against its z-50) so it
 * never covers the Accept/Refuse buttons.
 */
const BackToTop = () => {
  const [visible, setVisible] = useState(false);
  // How far the footer has come up into the screen: the button rides above it instead of over it.
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const update = (): void => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
      const footer = document.querySelector("footer");
      setLift(
        footer
          ? Math.max(
              0,
              Math.round(
                window.innerHeight - footer.getBoundingClientRect().top,
              ),
            )
          : 0,
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      onClick={() => {
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }}
      style={{ marginBottom: lift }}
      className="fixed bottom-5 right-5 z-40 flex size-12 cursor-pointer items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-colors hover:bg-gray-600 max-sm:bottom-4 max-sm:right-4"
    >
      <svg
        viewBox="0 0 20 20"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12l6-6 6 6" />
      </svg>
    </button>
  );
};

export default BackToTop;
