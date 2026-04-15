import { useMemo } from 'react';
import { TrendingUp, DollarSign, AlertCircle, Activity, Download, Plus } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { exportPaymentsToPDF, exportToExcel, exportToCSV } from '../../../utils/export';
import './PaymentHeader.css';

const PaymentHeader = ({ payments, onGenerateRent, onCheckOverdue, onQuickReceive, onMpesaPayment, onAddPayment }) => {
  const toast = useToast();

  const metrics = useMemo(() => {
    const totalRevenue = payments.reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);
    const thisMonth = new Date().getMonth() + 1;
    const thisYear = new Date().getFullYear();
    const currentMonthPayments = payments.filter(p => 
      parseInt(p.month) === thisMonth && parseInt(p.year) === thisYear && p.status === 'paid'
    );
    const currentMonthCollected = currentMonthPayments.reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);
    const overdue = payments.filter(p => p.status === 'overdue').length;
    const collectionRate = payments.length > 0 ? ((payments.filter(p => p.status === 'paid').length / payments.length) * 100).toFixed(1) : 0;

    return {
      totalRevenue,
      currentMonthCollected,
      overdueCount: overdue,
      collectionRate
    };
  }, [payments]);

  const handleExport = (format) => {
    const exportData = payments.map(p => ({
      Date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A',
      Tenant: p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : 'N/A',
      House: p.house ? p.house.houseNumber : 'N/A',
      Amount: p.paidAmount || p.amount || 0,
      Status: p.status,
      Method: p.paymentMethod
    }));

    switch (format) {
      case 'pdf':
        exportPaymentsToPDF(payments);
        break;
      case 'excel':
        exportToExcel(exportData, 'payments');
        break;
      case 'csv':
        exportToCSV(exportData, 'payments');
        break;
    }
  };

  return (
    <div className="payment-header-modern">
      <div className="header-title-section">
        <h1 className="page-title">Payments</h1>
        <p className="page-subtitle">Manage rent collection and payment records</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card total-revenue">
          <div className="metric-icon">
            <DollarSign size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Revenue</span>
            <div className="metric-value">
              KSh {metrics.totalRevenue.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="metric-card current-month">
          <div className="metric-icon">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">This Month</span>
            <div className="metric-value">
              KSh {metrics.currentMonthCollected.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="metric-card overdue">
          <div className="metric-icon">
            <AlertCircle size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Overdue</span>
            <div className="metric-value">
              {metrics.overdueCount}
            </div>
          </div>
        </div>

        <div className="metric-card collection-rate">
          <div className="metric-icon">
            <Activity size={24} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Collection Rate</span>
            <div className="metric-value">
              {metrics.collectionRate}%
            </div>
          </div>
        </div>
      </div>

      <div className="header-actions-modern">
        <div className="action-group exports">
          <span className="group-label">Export</span>
          <div className="action-buttons">
            <button className="btn-export pdf" onClick={() => handleExport('pdf')} title="PDF">
              📄 PDF
            </button>
            <button className="btn-export excel" onClick={() => handleExport('excel')} title="Excel">
              📊 Excel
            </button>
            <button className="btn-export csv" onClick={() => handleExport('csv')} title="CSV">
              📋 CSV
            </button>
          </div>
        </div>

        <div className="action-group bulk">
          <span className="group-label">Bulk Actions</span>
          <div className="action-buttons">
            <button className="btn-secondary" onClick={onGenerateRent} title="Generate Monthly Rent">
              📅 Generate Rent
            </button>
            <button className="btn-secondary" onClick={onCheckOverdue} title="Check Overdue">
              ⚠️ Check Overdue
            </button>
          </div>
        </div>

        <div className="action-group quick">
          <span className="group-label">Quick Actions</span>
          <div className="action-buttons">
            <button 
              className="btn-primary receive" 
              onClick={onQuickReceive}
              title="Receive Payment"
            >
              💰 Receive
            </button>
            <button 
              className="btn-primary mpesa" 
              onClick={onMpesaPayment}
              title="M-Pesa STK Push"
            >
              📱 M-Pesa
            </button>
            <button 
              className="btn-primary add" 
              onClick={onAddPayment}
              title="Add Payment"
            >
              ➕ Add Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHeader;

