import { useState, useEffect } from 'react';
import { reportsAPI, tenantsAPI, apartmentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/export';
import './Reports.css';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('income');
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedApartment, setSelectedApartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Report data
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [tenantLedger, setTenantLedger] = useState(null);
  const [outstandingBalances, setOutstandingBalances] = useState(null);
  const [revenueByApartment, setRevenueByApartment] = useState(null);
  
  const toast = useToast();

  useEffect(() => {
    fetchTenants();
    fetchApartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'income') {
      fetchIncomeStatement();
    } else if (activeTab === 'outstanding') {
      fetchOutstandingBalances();
    } else if (activeTab === 'revenue') {
      fetchRevenueByApartment();
    } else if (activeTab === 'ledger' && selectedTenant) {
      fetchTenantLedger();
    }
  }, [activeTab, startDate, endDate, selectedTenant, selectedApartment]);

  const fetchTenants = async () => {
    try {
      const response = await tenantsAPI.getAll();
      setTenants(response.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchApartments = async () => {
    try {
      const response = await apartmentsAPI.getAll();
      setApartments(response.data);
    } catch (error) {
      console.error('Error fetching apartments:', error);
    }
  };

  const fetchIncomeStatement = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedApartment) params.apartmentId = selectedApartment;
      
      const response = await reportsAPI.getIncomeStatement(params);
      setIncomeStatement(response.data);
    } catch (error) {
      console.error('Error fetching income statement:', error);
      toast.error('Failed to fetch income statement');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantLedger = async () => {
    if (!selectedTenant) return;
    
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await reportsAPI.getTenantLedger(selectedTenant, params);
      setTenantLedger(response.data);
    } catch (error) {
      console.error('Error fetching tenant ledger:', error);
      toast.error('Failed to fetch tenant ledger');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingBalances = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getOutstandingBalances();
      setOutstandingBalances(response.data);
    } catch (error) {
      console.error('Error fetching outstanding balances:', error);
      toast.error('Failed to fetch outstanding balances');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueByApartment = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await reportsAPI.getRevenueByApartment(params);
      setRevenueByApartment(response.data);
    } catch (error) {
      console.error('Error fetching revenue by apartment:', error);
      toast.error('Failed to fetch revenue by apartment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `KSh ${(amount || 0).toLocaleString()}`;
  };

  const exportReport = (format) => {
    let data = [];
    let filename = 'report';
    let title = 'Report';

    switch (activeTab) {
      case 'income':
        if (!incomeStatement) return;
        data = [
          { label: 'Revenue', value: formatCurrency(incomeStatement.revenue.total) },
          { label: 'Expenses', value: formatCurrency(incomeStatement.expenses.total) },
          { label: 'Net Income', value: formatCurrency(incomeStatement.netIncome) }
        ];
        filename = 'income-statement';
        title = 'Income Statement';
        break;
      case 'outstanding':
        if (!outstandingBalances) return;
        data = outstandingBalances.balances.map(b => ({
          'Tenant': `${b.tenant.firstName} ${b.tenant.lastName}`,
          'Apartment': b.apartment?.name || 'N/A',
          'House': b.house?.houseNumber || 'N/A',
          'Outstanding Balance': formatCurrency(b.currentBalance)
        }));
        filename = 'outstanding-balances';
        title = 'Outstanding Balances';
        break;
      case 'revenue':
        if (!revenueByApartment) return;
        data = revenueByApartment.apartments.map(a => ({
          'Apartment': a.apartmentName,
          'Revenue': formatCurrency(a.revenue),
          'Late Fees': formatCurrency(a.lateFees),
          'Total': formatCurrency(a.total),
          'Payments': a.paymentCount,
          'Tenants': a.tenantCount
        }));
        filename = 'revenue-by-apartment';
        title = 'Revenue by Apartment';
        break;
      case 'ledger':
        if (!tenantLedger) return;
        data = tenantLedger.payments.map(p => ({
          'Date': new Date(p.paymentDate).toLocaleDateString(),
          'Expected': formatCurrency(p.expectedAmount || p.amount),
          'Paid': formatCurrency(p.paidAmount || p.amount),
          'Deficit': formatCurrency(p.deficit || 0),
          'Late Fee': formatCurrency(p.lateFee || 0),
          'Status': p.status,
          'Method': p.paymentMethod
        }));
        filename = `tenant-ledger-${tenantLedger.tenant.name}`;
        title = `Tenant Ledger - ${tenantLedger.tenant.name}`;
        break;
    }

    if (format === 'pdf') {
      const columns = Object.keys(data[0] || {}).map(key => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
      }));
      exportToPDF(data, columns, title, filename);
    } else if (format === 'excel') {
      exportToExcel(data, filename);
    } else if (format === 'csv') {
      exportToCSV(data, filename);
    }
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <div className="date-filters">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
            className="date-input"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
            className="date-input"
          />
        </div>
      </div>

      <div className="reports-tabs">
        <button
          className={activeTab === 'income' ? 'active' : ''}
          onClick={() => setActiveTab('income')}
        >
          Income Statement
        </button>
        <button
          className={activeTab === 'outstanding' ? 'active' : ''}
          onClick={() => setActiveTab('outstanding')}
        >
          Outstanding Balances
        </button>
        <button
          className={activeTab === 'revenue' ? 'active' : ''}
          onClick={() => setActiveTab('revenue')}
        >
          Revenue by Apartment
        </button>
        <button
          className={activeTab === 'ledger' ? 'active' : ''}
          onClick={() => setActiveTab('ledger')}
        >
          Tenant Ledger
        </button>
      </div>

      <div className="report-filters">
        {activeTab === 'income' && (
          <select
            value={selectedApartment}
            onChange={(e) => setSelectedApartment(e.target.value)}
            className="filter-select"
          >
            <option value="">All Apartments</option>
            {apartments.map(apt => (
              <option key={apt._id} value={apt._id}>{apt.name}</option>
            ))}
          </select>
        )}
        {activeTab === 'ledger' && (
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="filter-select"
            required
          >
            <option value="">Select Tenant</option>
            {tenants.map(tenant => (
              <option key={tenant._id} value={tenant._id}>
                {tenant.firstName} {tenant.lastName}
              </option>
            ))}
          </select>
        )}
        <div className="export-buttons">
          <button className="btn-export" onClick={() => exportReport('pdf')}>
            📄 PDF
          </button>
          <button className="btn-export" onClick={() => exportReport('excel')}>
            📊 Excel
          </button>
          <button className="btn-export" onClick={() => exportReport('csv')}>
            📋 CSV
          </button>
        </div>
      </div>

      <div className="report-content">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {activeTab === 'income' && incomeStatement && (
              <div className="income-statement">
                <h2>Income Statement</h2>
                <div className="statement-period">
                  {incomeStatement.period.startDate && incomeStatement.period.endDate ? (
                    <p>
                      Period: {new Date(incomeStatement.period.startDate).toLocaleDateString()} - {new Date(incomeStatement.period.endDate).toLocaleDateString()}
                    </p>
                  ) : (
                    <p>All Time</p>
                  )}
                </div>
                
                <div className="statement-section">
                  <h3>Revenue</h3>
                  <div className="statement-row">
                    <span>Rent Revenue:</span>
                    <span className="amount">{formatCurrency(incomeStatement.revenue.rent)}</span>
                  </div>
                  <div className="statement-row">
                    <span>Late Fees:</span>
                    <span className="amount">{formatCurrency(incomeStatement.revenue.lateFees)}</span>
                  </div>
                  <div className="statement-row total">
                    <span>Total Revenue:</span>
                    <span className="amount">{formatCurrency(incomeStatement.revenue.total)}</span>
                  </div>
                </div>

                <div className="statement-section">
                  <h3>Expenses</h3>
                  <div className="statement-row">
                    <span>Total Expenses:</span>
                    <span className="amount expense">{formatCurrency(incomeStatement.expenses.total)}</span>
                  </div>
                  {Object.entries(incomeStatement.expenses.byCategory).map(([category, amount]) => (
                    <div key={category} className="statement-row sub-item">
                      <span>{category}:</span>
                      <span className="amount expense">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="statement-section net-income">
                  <div className="statement-row total">
                    <span>Net Income:</span>
                    <span className={`amount ${incomeStatement.netIncome >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(incomeStatement.netIncome)}
                    </span>
                  </div>
                </div>

                <div className="statement-summary">
                  <p>Total Payments: {incomeStatement.paymentCount}</p>
                  <p>Total Expenses: {incomeStatement.expenseCount}</p>
                </div>
              </div>
            )}

            {activeTab === 'outstanding' && outstandingBalances && (
              <div className="outstanding-balances">
                <h2>Outstanding Balances</h2>
                <div className="summary-card">
                  <h3>Total Outstanding</h3>
                  <p className="large-amount">{formatCurrency(outstandingBalances.totalOutstanding)}</p>
                  <p className="sub-text">{outstandingBalances.tenantCount} tenants with outstanding balances</p>
                </div>

                <div className="balances-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Apartment</th>
                        <th>House</th>
                        <th>Total Expected</th>
                        <th>Total Paid</th>
                        <th>Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingBalances.balances.map((balance, index) => (
                        <tr key={index}>
                          <td>{balance.tenant.firstName} {balance.tenant.lastName}</td>
                          <td>{balance.apartment?.name || 'N/A'}</td>
                          <td>{balance.house?.houseNumber || 'N/A'}</td>
                          <td>{formatCurrency(balance.totalExpected)}</td>
                          <td>{formatCurrency(balance.totalPaid)}</td>
                          <td className="outstanding">{formatCurrency(balance.currentBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'revenue' && revenueByApartment && (
              <div className="revenue-by-apartment">
                <h2>Revenue by Apartment</h2>
                <div className="summary-card">
                  <h3>Total Revenue</h3>
                  <p className="large-amount">{formatCurrency(revenueByApartment.totalRevenue)}</p>
                </div>

                <div className="revenue-grid">
                  {revenueByApartment.apartments.map((apt, index) => (
                    <div key={index} className="revenue-card">
                      <h3>{apt.apartmentName}</h3>
                      <div className="revenue-details">
                        <div className="revenue-row">
                          <span>Revenue:</span>
                          <span>{formatCurrency(apt.revenue)}</span>
                        </div>
                        <div className="revenue-row">
                          <span>Late Fees:</span>
                          <span>{formatCurrency(apt.lateFees)}</span>
                        </div>
                        <div className="revenue-row total">
                          <span>Total:</span>
                          <span>{formatCurrency(apt.total)}</span>
                        </div>
                        <div className="revenue-stats">
                          <span>{apt.paymentCount} payments</span>
                          <span>{apt.tenantCount} tenants</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ledger' && (
              <>
                {!selectedTenant ? (
                  <div className="empty-state">
                    <p>Please select a tenant to view their ledger</p>
                  </div>
                ) : tenantLedger ? (
                  <div className="tenant-ledger">
                    <h2>Tenant Ledger</h2>
                    <div className="ledger-header">
                      <div className="tenant-info">
                        <h3>{tenantLedger.tenant.name}</h3>
                        <p>{tenantLedger.tenant.email}</p>
                        <p>{tenantLedger.tenant.phone}</p>
                        <p>House: {tenantLedger.tenant.house} - {tenantLedger.tenant.apartment}</p>
                      </div>
                      <div className="ledger-summary">
                        <div className="summary-item">
                          <span>Total Paid:</span>
                          <span>{formatCurrency(tenantLedger.summary.totalPaid)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Total Expected:</span>
                          <span>{formatCurrency(tenantLedger.summary.totalExpected)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Total Deficit:</span>
                          <span className="negative">{formatCurrency(tenantLedger.summary.totalDeficit)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Current Balance:</span>
                          <span className={tenantLedger.summary.currentBalance > 0 ? 'negative' : 'positive'}>
                            {formatCurrency(tenantLedger.summary.currentBalance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ledger-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Expected</th>
                            <th>Paid</th>
                            <th>Deficit</th>
                            <th>Late Fee</th>
                            <th>Balance</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tenantLedger.payments.map((payment) => (
                            <tr key={payment._id}>
                              <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                              <td>{formatCurrency(payment.expectedAmount || payment.amount)}</td>
                              <td>{formatCurrency(payment.paidAmount || payment.amount)}</td>
                              <td>{formatCurrency(payment.deficit || 0)}</td>
                              <td>{formatCurrency(payment.lateFee || 0)}</td>
                              <td className={payment.runningBalance > 0 ? 'negative' : 'positive'}>
                                {formatCurrency(payment.runningBalance)}
                              </td>
                              <td>
                                <span className={`status-badge ${payment.status}`}>
                                  {payment.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No ledger data available</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;

