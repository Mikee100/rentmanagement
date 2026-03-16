import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { housesAPI, paymentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './UnitDetail.css';

const UnitDetail = () => {
  const { houseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [house, setHouse] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'mobile_money',
    transactionCode: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [houseId]);

  const fetchData = async () => {
    try {
      const [houseRes, paymentsRes] = await Promise.all([
        housesAPI.getById(houseId),
        paymentsAPI.getByHouse(houseId),
      ]);

      setHouse(houseRes.data);
      setPayments(paymentsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading unit details:', error);
      setLoading(false);
    }
  };

  const getCurrentMonthDue = () => {
    if (!house) return 0;
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();

    const currentMonthPayments = payments.filter(
      (p) => p.month === currentMonth && p.year === currentYear
    );

    const totalPaid = currentMonthPayments.reduce(
      (sum, p) => sum + (p.paidAmount || p.amount || 0),
      0
    );

    const expected = house.rentAmount || 0;
    return Math.max(0, expected - totalPaid);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!house) return;

    if (!paymentForm.amount) {
      toast.error('Please enter an amount.');
      return;
    }

    if (!house.tenant) {
      toast.error('This house has no tenant assigned. Assign a tenant before recording payments.');
      return;
    }

    setSubmitting(true);
    try {
      const tenantName = house.tenant
        ? `${house.tenant.firstName} ${house.tenant.lastName}`
        : '';

      const payload = {
        houseNumber: house.houseNumber,
        amount: parseFloat(paymentForm.amount),
        transactionId: paymentForm.transactionCode || undefined,
        referenceNumber: paymentForm.transactionCode || undefined,
        receivedFrom: tenantName,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes,
      };

      await paymentsAPI.receivePayment(payload);
      toast.success('Payment recorded successfully');
      setPaymentForm({
        amount: '',
        paymentMethod: 'mobile_money',
        transactionCode: '',
        notes: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error recording payment:', error);
      const errorMessage =
        error.response?.data?.message || 'Error recording payment. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (house?.apartment?._id) {
      navigate(`/apartments/${house.apartment._id}`);
    } else {
      navigate('/apartments');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading house details..." fullScreen />;
  }

  if (!house) {
    return <div className="error">House not found</div>;
  }

  const currentMonthDue = getCurrentMonthDue();

  return (
    <div className="unit-detail-page">
      <div className="unit-header-compact">
        <button className="btn-back-compact" onClick={handleBack}>
          ←
        </button>
        <div className="unit-header-info">
          <h1>House {house.houseNumber}</h1>
          <p className="unit-header-subtitle">
            {house.apartment?.name} · {house.apartment?.address}
          </p>
        </div>
        <div className="unit-header-meta">
          <span className={`status-badge-compact status-${house.status}`}>
            {house.status}
          </span>
        </div>
      </div>

      <div className="unit-summary-grid">
        <div className="unit-summary-card">
          <div className="summary-label">Monthly Rent</div>
          <div className="summary-value">
            KSh {(house.rentAmount || 0).toLocaleString()}
          </div>
        </div>
        <div className="unit-summary-card">
          <div className="summary-label">Current Month Due</div>
          <div className={`summary-value ${currentMonthDue > 0 ? 'danger' : 'success'}`}>
            KSh {(currentMonthDue || 0).toLocaleString()}
          </div>
        </div>
        {house.tenant && (
          <div className="unit-summary-card">
            <div className="summary-label">Tenant</div>
            <div className="summary-value">
              {house.tenant.firstName} {house.tenant.lastName}
            </div>
            <div className="summary-subvalue">
              {house.tenant.phone} · {house.tenant.email}
            </div>
          </div>
        )}
      </div>

      <div className="unit-detail-layout">
        <div className="unit-payments-section">
          <h2 className="section-title">Payment History</h2>
          {payments.length > 0 ? (
            <div className="payments-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Month/Year</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Transaction Code</th>
                  </tr>
                </thead>
                <tbody>
                  {payments
                    .slice()
                    .sort(
                      (a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)
                    )
                    .map((payment) => (
                      <tr key={payment._id}>
                        <td>
                          {payment.paymentDate
                            ? new Date(payment.paymentDate).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td>
                          {payment.month}/{payment.year}
                        </td>
                        <td>
                          KSh{' '}
                          {(payment.paidAmount || payment.amount || 0).toLocaleString()}
                        </td>
                        <td>
                          <span
                            className={`status-badge status-${payment.status}`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td>{payment.paymentMethod || 'N/A'}</td>
                        <td>
                          {payment.transactionId
                            ? payment.transactionId
                            : payment.referenceNumber || 'N/A'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No payments recorded for this house yet.</p>
            </div>
          )}
        </div>

        <div className="unit-payment-form-card">
          <h2 className="section-title">Add Payment for This House</h2>
          {house.tenant ? (
            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label>Amount (KSh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  required
                />
                <small>
                  Monthly rent: KSh {(house.rentAmount || 0).toLocaleString()}
                </small>
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentMethod: e.target.value,
                    })
                  }
                >
                  <option value="mobile_money">Mobile Money (M-Pesa)</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="online">Online</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>M-Pesa / Transaction Code (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.transactionCode}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      transactionCode: e.target.value,
                    })
                  }
                  placeholder="e.g., QFG123XYZ or bank transaction reference"
                />
              </div>
              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  rows="3"
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  placeholder="Additional details about this payment"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Save Payment
                </button>
              </div>
            </form>
          ) : (
            <div className="empty-state">
              <p>
                This house has no tenant assigned. Assign a tenant before recording
                payments for this house.
              </p>
            </div>
          )}
        </div>
      </div>

      {submitting && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default UnitDetail;

