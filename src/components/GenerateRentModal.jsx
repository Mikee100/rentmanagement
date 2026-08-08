import { useState } from 'react';
import './GenerateRentModal.css';

const GenerateRentModal = ({ isOpen, onClose, onConfirm }) => {
  const [formData, setFormData] = useState({
    month: String(new Date().getMonth() + 1).padStart(2, '0'),
    year: new Date().getFullYear()
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <div className="generate-rent-modal-overlay" onClick={onClose}>
      <div className="generate-rent-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Generate Monthly Rent</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Month (01-12)</label>
            <input
              type="text"
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              placeholder="01-12"
              required
              maxLength={2}
            />
          </div>
          <div className="form-group">
            <label>Year</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Generate</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateRentModal;

