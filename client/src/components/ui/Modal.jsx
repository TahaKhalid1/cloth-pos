import { createPortal } from "react-dom";
import Button from "./Button";

export default function Modal({
  isOpen,
  title,
  children,
  onClose,
  footer,
  size = "default"
}) {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal"
        style={{ width: size === "large" ? "min(1080px, 100%)" : "min(820px, 100%)" }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>{title}</h3>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="modal-body">{children}</div>
        {(footer || onClose) && (
          <div className="modal-footer">
            {footer || (
              <Button variant="secondary" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
