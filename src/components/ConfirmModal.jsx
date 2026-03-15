import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-premium" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-premium-header">
          <h2>{title}</h2>
          <button className="btn-close-sm" onClick={onClose}>×</button>
        </div>
        <div className="modal-premium-body">
          <div className="confirm-modal-content-inner">
            <div className={`confirm-modal-icon confirm-modal-icon-${type}`}>
              {type === 'danger' && '⚠'}
              {type === 'warning' && '⚠'}
              {type === 'info' && 'ℹ'}
            </div>
            <p className="confirm-modal-message">{message}</p>
          </div>
        </div>
        <div className="modal-premium-footer">
          <button className="btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`btn-primary ${type === 'danger' ? 'btn-danger' : ''}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

