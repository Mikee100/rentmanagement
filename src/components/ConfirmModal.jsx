import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon confirm-modal-icon-${type}`}>
            {type === 'danger' && '⚠'}
            {type === 'warning' && '⚠'}
            {type === 'info' && 'ℹ'}
          </div>
          <h3>{title}</h3>
        </div>
        <p className="confirm-modal-message">{message}</p>
        <div className="confirm-modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`btn-confirm btn-confirm-${type}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

