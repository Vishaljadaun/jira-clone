import { useEffect, useRef, useId } from "react";
export default function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="dialog"
    >
      <header className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close dialog">
          ✕
        </button>
      </header>
      {children}
    </dialog>
  );
}
