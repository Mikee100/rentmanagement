import { useState, useEffect } from 'react';
import { Calendar, DollarSign, Users, Home, ChevronLeft, ChevronRight, X } from 'lucide-react';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useToast } from '../../../components/Toast';
import { paymentsAPI } from '../../../services/api';
import './PaymentFormModal.css';

const PaymentFormModal = ({ 
  isOpen, 
  payment: initialPayment, 
  tenants, 
  houses, 
  apartments,
  onClose, 
  onSave 
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [formData, setFormData] = useState({
    tenant: '',
    house: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentMethod: 'cash',
    status: 'pending',
    notes: ''
  });

  const availableMonths = [
    { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' }, { value: '04', label: 'Apr' },
    { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' }, { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' }
  ];

  useEffect(() => {
    if (!isOpen) return;
    
    if (initialPayment) {
      // Edit mode
      setSelectedMonths([{ month: initialPayment.month, year: initialPayment.year }]);
      setCurrentYear(initialPayment.year);
      setFormData({
        tenant: initialPayment.tenant?._id || initialPayment.tenant || '',
        house: initialPayment.house?._id || initialPayment.house || '',
        amount: initialPayment.amount || '',
        paymentDate: initialPayment.paymentDate ? new Date(initialPayment.paymentDate).toISOString().split('T')[0] : '',
        dueDate: initialPayment.dueDate ? new Date(initialPayment.dueDate).toISOString().split('T')[0] : '',
        paymentMethod: initialPayment.paymentMethod || 'cash',
        status: initialPayment.status || 'pending',
        notes: initialPayment.notes || ''
      });
    } else {
      // Add mode
      const today = new Date();
      setSelectedMonths([{ month: String(today.getMonth() + 1).padStart(2, '0'), year: today.getFullYear() }]);
      setCurrentYear(today.getFullYear());
      setFormData({
        tenant: '',
        house: '',
        amount: '',
        paymentDate: today.toISOString().split('T')[0],
        dueDate: '',
        paymentMethod: 'cash',
        status: 'pending',
        notes: ''
      });
    }
  }, [isOpen, initialPayment]);

  const toggleMonth = (monthValue) => {
    const isSelected = selectedMonths.some(m => m.month === monthValue && m.year === currentYear);
    
    let newSelected;
    if (isSelected) {
      newSelected = selectedMonths.filter(m => !(m.month === monthValue && m.year === currentYear));
    } else {
      newSelected = [...selectedMonths, { month: monthValue, year: currentYear }];
    }
    
    // Sort chronologically
    newSelected.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return parseInt(a.month) - parseInt(b.month);
    });

    setSelectedMonths(newSelected);
    
    // Auto-update amount based on house rent
    if (formData.house) {
      const house = houses.find(h => h._id === formData.house);
      if (house && house.rentAmount) {
        const totalAmount = house.rentAmount * newSelected.length;
        setFormData(prev => ({ ...prev, amount: totalAmount.toString() }));
      }
    }
  };

  const handleTenantChange = (tenantId) => {
    const tenant = tenants.find(t => t._id === tenantId);
    if (tenant) {
      const tenantHouses = houses.filter(h => 
        h.tenant?._id === tenantId || h.tenant === tenantId
      );
      const houseId = tenantHouses[0]?._id || '';
      const houseRent = tenantHouses[0]?.rentAmount || 0;
      const totalAmount = houseRent * selectedMonths.length;
      
      setFormData(prev => ({
        ...prev,
        tenant: tenantId,
        house: houseId,
        amount: totalAmount.toString()
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedMonths.length === 0) {
      toast.warning('Please select at least one month');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        months: selectedMonths,
        year: currentYear
      };

      if (initialPayment) {
        await paymentsAPI.update(initialPayment._id, submitData);
        toast.success('Payment updated successfully');
      } else {
        await paymentsAPI.create(submitData);
        toast.success('Payment(s) created successfully');
      }
      
      onSave?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving payment');
    } finally {
      setLoading(false);
    }
  };

  const selectedMonthsSummary = selectedMonths.map(m => 
    `${availableMonths.find(am => am.value === m.month)?.label || m.month} ${m.year}`
  ).join(', ') || 'No months selected';

  if (!isOpen) return null;

  return (
    <div className="payment-form-overlay" onClick={onClose}>
      <div className="payment-form-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialPayment ? 'Edit Payment' : 'New Payment'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-grid">
            <div className="form-group">
              <label>Tenant</label>
              <select 
                value={formData.tenant} 
                onChange={(e) => handleTenantChange(e.target.value)}
                required
              >
                <option value="">Select tenant</option>
                {tenants.map(tenant => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.firstName} {tenant.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>House</label>
              <select 
                value={formData.house} 
                onChange={(e) => {
                  const houseId = e.target.value;
                  const house = houses.find(h => h._id === houseId);
                  const totalAmount = house?.rentAmount * selectedMonths.length || '';
                  setFormData(prev => ({ ...prev, house: houseId, amount: totalAmount.toString() }));
                }}
                disabled={!formData.tenant}
              >
                <option value="">Select house</option>
                {formData.tenant && houses
                  .filter(h => h.tenant?._id === formData.tenant || h.tenant === formData.tenant)
                  .map(house => (
                    <option key={house._id} value={house._id}>
                      {house.houseNumber} ({house.apartment?.name}) - KSh {house.rentAmount?.toLocaleString()}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group span-2">
              <label>Amount (KSh)</label>
              <div className="amount-input-wrapper">
                <DollarSign size={20} />
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
                <span className="month-count">{selectedMonths.length} months</span>
              </div>
            </div>

            <div className="form-group">
              <label>Payment Date</label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div className="form-group span-2">
              <label>Months ({currentYear})</label>
              <div className="month-selector">
                <div className="year-nav">
                  <button 
                    type="button"
                    onClick={() => setCurrentYear(y => y - 1)}
                    className="nav-btn"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="year-display">{currentYear}</span>
                  <button 
                    type="button"
                    onClick={() => setCurrentYear(y => y + 1)}
                    className="nav-btn"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="month-grid">
                  {availableMonths.map(month => {
                    const isSelected = selectedMonths.some(m => 
                      m.month === month.value && m.year === currentYear
                    );
                    return (
                      <button
                        key={month.value}
                        type={initialPayment ? "button" : "button"}
                        className={`month-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => !initialPayment && toggleMonth(month.value)}
                        disabled={initialPayment}
                      >
                        {month.label}
                      </button>
                    );
                  })}
                </div>
                {selectedMonths.length > 0 && (
                  <div className="selected-summary">
                    Selected: {selectedMonthsSummary}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mpesa_stk">M-Pesa STK</option>
                <option value="equity_bank">Equity Bank</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="partial">Partial</option>
              </select>
            </div>

            <div className="form-group span-full">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                placeholder="Additional details about this payment..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || selectedMonths.length === 0}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                initialPayment ? 'Update Payment' : `Create Payment${selectedMonths.length > 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentFormModal;

