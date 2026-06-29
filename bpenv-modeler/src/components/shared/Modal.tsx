type ModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const Modal = ({ title, onClose, children, footer }: ModalProps) => {
  return (
    <div className="modal d-block position-fixed" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="d-flex justify-content-between align-items-center" style={{
            padding: "20px",
            backgroundColor: "var(--color-grey-225-10-95)",
            fontSize: "16px",
            borderBottom: "1px solid var(--color-grey-225-10-85)"
          }}>
            <h5 className="modal-title">{title}</h5>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              X
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export default Modal;