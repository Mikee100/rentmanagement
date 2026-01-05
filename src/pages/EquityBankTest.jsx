import { useState } from 'react';
import { equityBankAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './EquityBankTest.css';

const EquityBankTest = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    accountNumber: '',
    amount: '',
    transactionId: '',
    referenceNumber: '',
    transactionDate: new Date().toISOString().slice(0, 16),
    payerName: '',
    notes: ''
  });

  const handleVerifyAccount = async (e) => {
    e.preventDefault();
    if (!formData.accountNumber.trim()) {
      toast.warning('Please enter an account number');
      return;
    }

    setVerifying(true);
    try {
      const response = await equityBankAPI.verifyAccount(formData.accountNumber.trim());
      setAccountInfo(response.data);
      toast.success('Account verified successfully!');
    } catch (error) {
      console.error('Error verifying account:', error);
      const errorMessage = error.response?.data?.message || 'Account not found';
      toast.error(errorMessage);
      setAccountInfo(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleTestPayment = async (e) => {
    e.preventDefault();
    
    if (!formData.accountNumber || !formData.amount) {
      toast.warning('Please enter account number and amount');
      return;
    }

    if (!accountInfo) {
      toast.warning('Please verify the account number first');
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        accountNumber: formData.accountNumber.trim(),
        amount: parseFloat(formData.amount),
        transactionId: formData.transactionId || `TEST-${Date.now()}`,
        referenceNumber: formData.referenceNumber || formData.transactionId || `REF-${Date.now()}`,
        transactionDate: formData.transactionDate ? new Date(formData.transactionDate).toISOString() : new Date().toISOString(),
        payerName: formData.payerName || accountInfo.tenant?.firstName + ' ' + accountInfo.tenant?.lastName,
        notes: formData.notes || 'Test payment from Equity Bank integration'
      };

      const response = await equityBankAPI.manualPayment(paymentData);
      toast.success(`Payment recorded successfully! Receipt: ${response.data.receiptNumber}`);
      
      // Reset form but keep account number
      setFormData({
        ...formData,
        amount: '',
        transactionId: '',
        referenceNumber: '',
        transactionDate: new Date().toISOString().slice(0, 16),
        payerName: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      const errorMessage = error.response?.data?.message || 'Error recording payment';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="equity-bank-test-page">
      <div className="test-header">
        <h1>🏦 Equity Bank Integration Test</h1>
        <p className="test-description">
          Test the Equity Bank payment integration by verifying account numbers and recording test payments.
        </p>
      </div>

      <div className="test-container">
        {/* Step 1: Verify Account */}
        <div className="test-section">
          <h2>Step 1: Verify Account Number</h2>
          <p className="section-description">
            Enter your Equity Bank account number to verify it's registered in the system.
          </p>
          
          <form onSubmit={handleVerifyAccount} className="verify-form">
            <div className="form-group">
              <label>Equity Bank Account Number</label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="e.g., 1234567890"
                required
              />
            </div>
            <button type="submit" className="btn-verify" disabled={verifying}>
              {verifying ? 'Verifying...' : 'Verify Account'}
            </button>
          </form>

          {verifying && <LoadingSpinner text="Verifying account..." />}

          {accountInfo && (
            <div className="account-info-card">
              <h3>✅ Account Verified</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Tenant:</span>
                  <span className="info-value">
                    {accountInfo.tenant?.firstName} {accountInfo.tenant?.lastName}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{accountInfo.tenant?.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{accountInfo.tenant?.phone}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Account Number:</span>
                  <span className="info-value">{accountInfo.tenant?.bankAccountNumber}</span>
                </div>
                {accountInfo.house && (
                  <>
                    <div className="info-item">
                      <span className="info-label">House:</span>
                      <span className="info-value">{accountInfo.house.houseNumber}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Apartment:</span>
                      <span className="info-value">{accountInfo.house.apartment?.name || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Monthly Rent:</span>
                      <span className="info-value">KSh {accountInfo.house.rentAmount?.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Test Payment */}
        {accountInfo && (
          <div className="test-section">
            <h2>Step 2: Test Payment Entry</h2>
            <p className="section-description">
              Simulate a payment from Equity Bank. This will create a payment record in the system.
            </p>

            <form onSubmit={handleTestPayment} className="payment-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder={accountInfo.house?.rentAmount || '0'}
                    required
                  />
                  {accountInfo.house && (
                    <small className="form-hint">
                      Monthly rent: KSh {accountInfo.house.rentAmount?.toLocaleString()}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Transaction Date</label>
                  <input
                    type="datetime-local"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Transaction ID</label>
                  <input
                    type="text"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                    placeholder={`TEST-${Date.now()}`}
                  />
                  <small className="form-hint">Leave empty to auto-generate</small>
                </div>
                <div className="form-group">
                  <label>Reference Number</label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Payer Name</label>
                <input
                  type="text"
                  value={formData.payerName}
                  onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                  placeholder={`${accountInfo.tenant?.firstName} ${accountInfo.tenant?.lastName}`}
                />
                <small className="form-hint">Leave empty to use tenant name</small>
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Test payment from Equity Bank integration"
                  rows="3"
                />
              </div>

              <button type="submit" className="btn-test-payment" disabled={loading}>
                {loading ? 'Processing...' : 'Record Test Payment'}
              </button>
            </form>

            {loading && <LoadingSpinner text="Recording payment..." />}
          </div>
        )}

        {/* Instructions */}
        <div className="test-section instructions-section">
          <h2>📋 How to Test</h2>
          <ol className="instructions-list">
            <li>
              <strong>Add your account number to a tenant:</strong>
              <ul>
                <li>Go to Tenants page</li>
                <li>Edit a tenant (or create a new one)</li>
                <li>Enter your Equity Bank account number</li>
                <li>Save the tenant</li>
              </ul>
            </li>
            <li>
              <strong>Verify your account:</strong>
              <ul>
                <li>Enter your account number above</li>
                <li>Click "Verify Account"</li>
                <li>You should see your tenant information</li>
              </ul>
            </li>
            <li>
              <strong>Test a payment:</strong>
              <ul>
                <li>Enter payment amount</li>
                <li>Optionally enter transaction ID and reference</li>
                <li>Click "Record Test Payment"</li>
                <li>Check the Payments page to see your payment</li>
              </ul>
            </li>
            <li>
              <strong>View the payment:</strong>
              <ul>
                <li>Go to Payments page</li>
                <li>Filter by "Equity Bank" payment method</li>
                <li>Look for the "AUTO" badge on your payment</li>
              </ul>
            </li>
          </ol>
        </div>

        {/* Important Notes */}
        <div className="test-section notes-section">
          <h2>⚠️ Important Notes</h2>
          <ul className="notes-list">
            <li>
              <strong>This is a test:</strong> The payment will be recorded in the system but no actual money is transferred.
            </li>
            <li>
              <strong>Account must be registered:</strong> The account number must be added to a tenant's profile first.
            </li>
            <li>
              <strong>Real webhook:</strong> When Equity Bank sends real webhooks, they will automatically process the same way.
            </li>
            <li>
              <strong>Duplicate prevention:</strong> Using the same transaction ID twice will be rejected.
            </li>
            <li>
              <strong>Check Payments page:</strong> After recording a test payment, go to the Payments page to see it listed.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EquityBankTest;

