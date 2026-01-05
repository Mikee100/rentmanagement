import { useEffect, useState } from 'react';
import { configAPI, paymentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './PaybillConfig.css';

const PaybillConfig = () => {
  const toast = useToast();
  const [config, setConfig] = useState({
    paybillNumber: '',
    businessName: 'Rent Management System',
    paymentInstructions: '',
    mobileMoneyProvider: 'mpesa',
    bankAccount: {
      accountNumber: '',
      bankName: '',
      accountName: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testData, setTestData] = useState({
    accountNumber: '',
    amount: '',
    transactionId: '',
    phoneNumber: ''
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await configAPI.get();
      setConfig(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching config:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await configAPI.update(config);
      toast.success('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving config:', error);
      const errorMessage = error.response?.data?.message || 'Error saving configuration';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const generateInstructions = () => {
    const instructions = `To pay rent via ${config.mobileMoneyProvider.toUpperCase()}:

1. Go to ${config.mobileMoneyProvider === 'mpesa' ? 'M-Pesa' : config.mobileMoneyProvider.toUpperCase()} menu
2. Select "Pay Bill"
3. Enter Business Number: ${config.paybillNumber || '[SET PAYBILL NUMBER]'}
4. Enter Account Number: [YOUR HOUSE NUMBER] (e.g., 101, 201, 301)
5. Enter Amount: [Your rent amount]
6. Enter your PIN
7. Confirm payment

Your house number is your account number for payment.`;
    
    setConfig({ ...config, paymentInstructions: instructions });
  };

  const handleTestPaybill = async (e) => {
    e.preventDefault();
    if (!testData.accountNumber || !testData.amount) {
      toast.warning('Please enter account number (house number) and amount');
      return;
    }

    setSaving(true);
    try {
      const result = await paymentsAPI.receivePaybillPayment({
        paybillNumber: config.paybillNumber,
        accountNumber: testData.accountNumber,
        amount: parseFloat(testData.amount),
        transactionId: testData.transactionId || `TEST-${Date.now()}`,
        phoneNumber: testData.phoneNumber,
        paymentMethod: 'mobile_money',
        notes: 'Test payment'
      });
      
      toast.success(`Test payment successful! Receipt: ${result.data.receiptNumber}, Tenant: ${result.data.tenant.name}`);
      setTestData({ accountNumber: '', amount: '', transactionId: '', phoneNumber: '' });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error processing test payment';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading configuration..." fullScreen />;
  }

  return (
    <div className="paybill-config">
      <div className="page-header">
        <h1>Paybill Configuration</h1>
      </div>

      <div className="config-card">
        <h2>Paybill Settings</h2>
        <p className="description">
          Configure your paybill number so tenants can pay rent using their house number as the account number.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Paybill Number</label>
            <input
              type="text"
              value={config.paybillNumber}
              onChange={(e) => setConfig({ ...config, paybillNumber: e.target.value })}
              placeholder="e.g., 123456"
              required
            />
            <small>This is your business/paybill number from your mobile money provider</small>
          </div>

          <div className="form-group">
            <label>Business Name</label>
            <input
              type="text"
              value={config.businessName}
              onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
              placeholder="Your business name"
            />
          </div>

          <div className="form-group">
            <label>Mobile Money Provider</label>
            <select
              value={config.mobileMoneyProvider}
              onChange={(e) => setConfig({ ...config, mobileMoneyProvider: e.target.value })}
            >
              <option value="mpesa">M-Pesa</option>
              <option value="mtn">MTN Mobile Money</option>
              <option value="airtel">Airtel Money</option>
              <option value="orange">Orange Money</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Payment Instructions</label>
            <button
              type="button"
              className="btn-secondary"
              onClick={generateInstructions}
              style={{ marginBottom: '8px' }}
            >
              Generate Instructions
            </button>
            <textarea
              value={config.paymentInstructions}
              onChange={(e) => setConfig({ ...config, paymentInstructions: e.target.value })}
              rows="8"
              placeholder="Instructions for tenants on how to pay via paybill..."
            />
          </div>

          <div className="form-section">
            <h3>Bank Account (Optional)</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  value={config.bankAccount?.accountNumber || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    bankAccount: { ...config.bankAccount, accountNumber: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={config.bankAccount?.bankName || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    bankAccount: { ...config.bankAccount, bankName: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Account Name</label>
                <input
                  type="text"
                  value={config.bankAccount?.accountName || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    bankAccount: { ...config.bankAccount, accountName: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      <div className="info-card">
        <h3>How Paybill Works</h3>
        <ol>
          <li>Tenants use your paybill number as the <strong>Business Number</strong></li>
          <li>Tenants enter their <strong>House Number</strong> as the <strong>Account Number</strong></li>
          <li>System automatically matches the house number to the tenant</li>
          <li>Payment is recorded automatically when received</li>
        </ol>
        <p className="note">
          <strong>Note:</strong> You'll need to set up webhook integration with your mobile money provider 
          to automatically receive payment notifications. Contact your provider for webhook setup.
        </p>
      </div>

      <div className="test-section">
        <button
          className="btn-secondary"
          onClick={() => setTestMode(!testMode)}
        >
          {testMode ? 'Hide' : 'Show'} Test Payment
        </button>

        {testMode && (
          <div className="test-payment-card">
            <h3>Test Paybill Payment</h3>
            <p className="description">Test the paybill system by simulating a payment</p>
            <form onSubmit={handleTestPaybill}>
              <div className="form-row">
                <div className="form-group">
                  <label>Account Number (House Number)</label>
                  <input
                    type="text"
                    value={testData.accountNumber}
                    onChange={(e) => setTestData({ ...testData, accountNumber: e.target.value })}
                    placeholder="e.g., 101, 201"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Amount (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={testData.amount}
                    onChange={(e) => setTestData({ ...testData, amount: e.target.value })}
                    placeholder="1200"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Transaction ID (Optional)</label>
                  <input
                    type="text"
                    value={testData.transactionId}
                    onChange={(e) => setTestData({ ...testData, transactionId: e.target.value })}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={testData.phoneNumber}
                    onChange={(e) => setTestData({ ...testData, phoneNumber: e.target.value })}
                    placeholder="+254712345678"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Test Payment
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {saving && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default PaybillConfig;

