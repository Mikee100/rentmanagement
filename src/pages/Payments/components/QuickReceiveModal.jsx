import { useState, useEffect } from 'react';
import { Search, Phone, DollarSign, CheckCircle } from 'lucide-react';
import { paymentsAPI, mpesaAPI, housesAPI } from '../../../services/api';
import { useToast } from '../../../components/Toast';
import LoadingSpinner from '../../../components/LoadingSpinner';
import './QuickReceiveModal.css';

const QuickReceiveModal = ({ 
  isOpen, 
  type = 'receive', // 'receive' or 'mpesa'
  onClose, 
  onPaymentRecorded,
  payments,
  houses 
}) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [houseSearch, setHouseSearch] = useState('');
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [formData, setFormData] = useState({
    houseNumber: '',
    amount: '',
    phoneNumber: '',
    transactionId: '',
    referenceNumber: '',
    paymentMethod: type === 'mpesa' ? 'mpesa_stk' : 'bank_transfer',
    notes: ''
  });

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setStep(1);
    setHouseSearch('');
    setSelectedHouse(null);
    setFormData({
      houseNumber: '',
      amount: '',
      phoneNumber: '',
      transactionId: '',
      referenceNumber: '',
      paymentMethod: type === 'mpesa' ? 'mpesa_stk' : 'bank_transfer',
      notes: ''
    });
  };

  const handleSearchHouse = async () => {
    if (!houseSearch.trim()) return;
    
    setSearching(true);
    try {
      const result = await paymentsAPI.searchHouse(houseSearch.trim());
      setSelectedHouse(result.data);
      setFormData(prev => ({
        ...prev,
        houseNumber: houseSearch.trim(),
        amount: result.data.house.rentAmount?.toString() || '',
        receivedFrom: result.data.tenantName || ''
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'House not found');
      setSelectedHouse(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let result;
      if (type === 'mpesa') {
        result = await mpesaAPI.initiateSTKPush({
          ...formData,
          amount: parseFloat(formData.amount),
          months: [{ month: new Date().getMonth() + 1, year: new Date().getFullYear() }]
        });
        toast.success(result.data.message);
      } else {
        result = await paymentsAPI.receivePayment(formData);
        toast.success(`Payment recorded! Receipt: ${result.data.receiptNumber}`);
        onPaymentRecorded?.();
      }
      
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const isReceiveStep = type === 'receive';

  if (!isOpen) return null;

  return (
    <div className="quick-modal-overlay" onClick={onClose}>
      <div className="quick-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-icon">
            {type === 'mpesa' ? '📱' : '💰'}
          </div>
          <div>
            <h2>{type === 'mpesa' ? 'M-Pesa STK Push' : 'Quick Receive Payment'}</h2>
            <div className="step-indicator">
              Step {step} of {isReceiveStep ? 2 : 1}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="house-search-section">
              <div className="search-container">
                <input
                  type="text"
                  value={houseSearch}
                  onChange={(e) => setHouseSearch(e.target.value)}
                  placeholder={`Enter house number (e.g. ${type === 'mpesa' ? '101' : '101'})`}
                  className="house-search-input"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchHouse()}
                />
                <button 
                  className="search-btn" 
                  onClick={handleSearchHouse}
                  disabled={searching}
                >
                  {searching ? <LoadingSpinner size="sm" /> : <Search size={18} />}
                </button>
              </div>

              {selectedHouse && (
                <div className={`house-card ${selectedHouse.canReceivePayment ? 'valid' : 'invalid'}`}>
                  <div className="house-info">
                    <div className="house-number-lg">{selectedHouse.house.houseNumber}</div>
                    <div className="tenant-name">
                      {selectedHouse.house.tenant?.firstName} {selectedHouse.house.tenant?.lastName}
                    </div>
                    <div className="rent-amount">
                      <DollarSign size={16} />
                      KSh {(selectedHouse.house.rentAmount || 0).toLocaleString()}
                    </div>
                  </div>
                  {!selectedHouse.canReceivePayment && (
                    <div className="warning">
                      <AlertCircle size={16} />
                      No active tenant assigned
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedHouse?.canReceivePayment && (
            <form onSubmit={handleSubmit} className="payment-form">
              <div className={`form-section ${step === 2 ? 'active' : ''}`}>
                <div className="form-group">
                  <label>Amount (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                    placeholder={selectedHouse.house.rentAmount}
                  />
                </div>

                {type === 'mpesa' && (
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      placeholder="2547XXXXXXXX"
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>{isReceiveStep ? 'Transaction ID' : 'Reference'}</label>
                  <input
                    type="text"
                    value={formData.transactionId || formData.referenceNumber}
                    onChange={(e) => setFormData({...formData, transactionId: e.target.value})}
                    placeholder="TXN123..."
                  />
                </div>

                {isReceiveStep && (
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Notes (optional)</label>
                  <textarea
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Payment details..."
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="modal-footer">
          {selectedHouse?.canReceivePayment ? (
            <>
              <button 
                className="btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSubmit}
                disabled={loading || !formData.amount}
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {type === 'mpesa' ? 'Send STK Push' : 'Record Payment'}
                  </>
                )}
              </button>
            </>
          ) : (
            <button 
              className="btn-primary full-width" 
              onClick={handleSearchHouse}
              disabled={searching}
            >
              {searching ? 'Searching...' : 'Search House'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickReceiveModal;

