import { useEffect, useRef, type ReactNode } from "react";
import { ActionButton } from "./Action";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A confirmation over the page, on the browser's own <dialog>: it traps focus,
 * closes on Escape and marks everything behind it inert, none of which a
 * hand-built overlay gets for free. A click on the dimmed area outside the box
 * cancels; the safe choice ("Cancelar") is the one focused first.
 */
const ConfirmDialog = ({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        // Escape: let our state close it, not the browser alone.
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onCancel();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl p-0 text-gray-800 shadow-xl backdrop:bg-black/50"
    >
      {open && (
        <div className="flex flex-col items-center gap-2 px-6 pb-4 pt-8 text-center">
          <h2 id="confirm-title" className="text-xl font-bold">
            {title}
          </h2>
          {children && <p className="text-gray-600">{children}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <ActionButton autoFocus onClick={onCancel}>
              Cancelar
            </ActionButton>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-11 cursor-pointer rounded-full bg-gray-800 px-6 font-bold uppercase text-white transition-colors hover:bg-gray-600"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
};

export default ConfirmDialog;
