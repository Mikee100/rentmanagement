import { useEffect, useState } from 'react';
import { paymentsAPI, tenantsAPI, housesAPI, mpesaAPI, apartmentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import GenerateRentModal from '../components/GenerateRentModal';
import SearchBar from '../components/SearchBar';
import TablePagination from '../components/TablePagination';
import { useTable } from '../hooks/useTable';
import { exportPaymentsToPDF, exportToExcel, exportToCSV } from '../utils/export';
import { generatePaymentReceipt } from '../utils/receipt';
import './Payments.css';

const Payments = () => {
  const toast = useToast();
  const getCurrentMonth = () => {
    return String(new Date().getMonth() + 1).padStart(2, '0');
  };

  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [houses, setHouses] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    searchQuery,
    setSearchQuery,
    filters,
    updateFilter,
    clearFilters,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedData,
    totalPages,
    totalItems
  } = useTable(payments, { initialSortField: 'paymentDate', initialSortOrder: 'desc' });
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [showGenerateRentModal, setShowGenerateRentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [mpesaForm, setMpesaForm] = useState({
    phoneNumber: '',
    amount: '',
    houseNumber: '',
    month: getCurrentMonth(),
    year: new Date().getFullYear()
  });
  const [houseSearch, setHouseSearch] = useState('');
  const [searchedHouse, setSearchedHouse] = useState(null);
  const [searching, setSearching] = useState(false);
  const [receiveFormData, setReceiveFormData] = useState({
    houseNumber: '',
    amount: '',
    transactionId: '',
    referenceNumber: '',
    receivedFrom: '',
    paymentMethod: 'bank_transfer',
    notes: ''
  });

  const [formData, setFormData] = useState({
    tenant: '',
    house: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentMethod: 'cash',
    status: 'pending',
    month: getCurrentMonth(),
    year: new Date().getFullYear(),
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, tenantsRes, housesRes, apartmentsRes] = await Promise.all([
        paymentsAPI.getAll(),
        tenantsAPI.getAll(),
        housesAPI.getAll(),
        apartmentsAPI.getAll(),
      ]);
      setPayments(paymentsRes.data);
      setTenants(tenantsRes.data.filter((t) => t.status === 'active'));
      setHouses(housesRes.data);
      setApartments(apartmentsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        year: parseInt(formData.year),
      };

      if (selectedPayment) {
        await paymentsAPI.update(selectedPayment._id, data);
        toast.success('Payment updated successfully');
      } else {
        await paymentsAPI.create(data);
        toast.success('Payment created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving payment:', error);
      const errorMessage = error.response?.data?.message || 'Error saving payment. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (payment) => {
    setSelectedPayment(payment);
    setFormData({
      tenant: payment.tenant._id || payment.tenant,
      house: payment.house._id || payment.house,
      amount: payment.amount,
      paymentDate: payment.paymentDate ? payment.paymentDate.split('T')[0] : '',
      dueDate: payment.dueDate ? payment.dueDate.split('T')[0] : '',
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      month: payment.month,
      year: payment.year,
      notes: payment.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setPaymentToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await paymentsAPI.delete(paymentToDelete);
      toast.success('Payment deleted successfully');
      setShowDeleteConfirm(false);
      setPaymentToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting payment:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting payment. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleTenantChange = (tenantId) => {
    const tenant = tenants.find((t) => t._id === tenantId);
    if (tenant && tenant.house) {
      setFormData({
        ...formData,
        tenant: tenantId,
        house: tenant.house._id || tenant.house,
      });
    } else {
      setFormData({ ...formData, tenant: tenantId });
    }
  };

  const resetForm = () => {
    const currentDate = new Date();
    setFormData({
      tenant: '',
      house: '',
      amount: '',
      paymentDate: currentDate.toISOString().split('T')[0],
      dueDate: '',
      paymentMethod: 'cash',
      status: 'pending',
      month: String(currentDate.getMonth() + 1).padStart(2, '0'),
      year: currentDate.getFullYear(),
      notes: '',
    });
    setSelectedPayment(null);
  };

  useEffect(() => {
    const currentDate = new Date();
    setFormData(prev => ({
      ...prev,
      month: prev.month || String(currentDate.getMonth() + 1).padStart(2, '0'),
    }));
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return '#27ae60';
      case 'pending':
        return '#f39c12';
      case 'overdue':
        return '#e74c3c';
      case 'partial':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const formatPaymentMethod = (method) => {
    const methodMap = {
      'cash': 'Cash',
      'check': 'Check',
      'bank_transfer': 'Bank Transfer',
      'equity_bank': 'Equity Bank',
      'mobile_money': 'Mobile Money',
      'mpesa_stk': 'M-Pesa STK',
      'paybill': 'Paybill',
      'online': 'Online',
      'other': 'Other'
    };
    return methodMap[method] || method || 'N/A';
  };

  if (loading) {
    return <LoadingSpinner text="Loading payments..." fullScreen />;
  }

  const handleGenerateMonthlyRent = async (formData) => {
    setSubmitting(true);
    try {
      const result = await paymentsAPI.generateMonthlyRent({
        month: formData.month,
        year: formData.year,
        lateFeePercentage: formData.lateFeePercentage || 5,
        gracePeriodDays: formData.gracePeriodDays || 5
      });
      toast.success(`Generated ${result.data.generated} payments${result.data.errors > 0 ? ` (${result.data.errors} errors)` : ''}`);
      setShowGenerateRentModal(false);
      fetchData();
    } catch (error) {
      console.error('Error generating payments:', error);
      const errorMessage = error.response?.data?.message || 'Error generating monthly rent payments';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOverdue = async () => {
    setSubmitting(true);
    try {
      const result = await paymentsAPI.checkOverdue({
        lateFeePercentage: 5,
        gracePeriodDays: 5
      });
      toast.success(`Updated ${result.data.updated} payments to overdue status`);
      fetchData();
    } catch (error) {
      console.error('Error checking overdue:', error);
      const errorMessage = error.response?.data?.message || 'Error checking overdue payments';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchHouse = async () => {
    if (!houseSearch.trim()) {
      toast.warning('Please enter a house number');
      return;
    }

    setSearching(true);
    try {
      const result = await paymentsAPI.searchHouse(houseSearch.trim());
      setSearchedHouse(result.data);
      setReceiveFormData({
        ...receiveFormData,
        houseNumber: houseSearch.trim(),
        amount: result.data.house.rentAmount || '',
        receivedFrom: result.data.house.tenant 
          ? `${result.data.house.tenant.firstName} ${result.data.house.tenant.lastName}`
          : ''
      });
    } catch (error) {
      console.error('Error searching house:', error);
      const errorMessage = error.response?.data?.message || 'House not found';
      toast.error(errorMessage);
      setSearchedHouse(null);
    } finally {
      setSearching(false);
    }
  };

  const handleMpesaPayment = async (e) => {
    e.preventDefault();
    if (!mpesaForm.houseNumber || !mpesaForm.phoneNumber || !mpesaForm.amount) {
      toast.warning('Please fill in all required fields');
      return;
    }

    setMpesaLoading(true);
    try {
      const result = await mpesaAPI.initiateSTKPush({
        phoneNumber: mpesaForm.phoneNumber,
        amount: parseFloat(mpesaForm.amount),
        houseNumber: mpesaForm.houseNumber.trim(),
        month: mpesaForm.month,
        year: mpesaForm.year
      });

      toast.success(`${result.data.message}\n\nPlease check your phone to complete the payment.`);
      setShowMpesaModal(false);
      setMpesaForm({
        phoneNumber: '',
        amount: '',
        houseNumber: '',
        month: getCurrentMonth(),
        year: new Date().getFullYear()
      });
      
      // Refresh data after a delay to check payment status
      setTimeout(() => {
        fetchData();
      }, 5000);
    } catch (error) {
      console.error('Error initiating M-Pesa payment:', error);
      const errorMessage = error.response?.data?.message || 'Error initiating M-Pesa payment';
      toast.error(errorMessage);
    } finally {
      setMpesaLoading(false);
    }
  };

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await paymentsAPI.receivePayment(receiveFormData);
      toast.success(`Payment received successfully! Receipt Number: ${result.data.receiptNumber}`);
      setShowReceiveModal(false);
      resetReceiveForm();
      fetchData();
    } catch (error) {
      console.error('Error receiving payment:', error);
      const errorMessage = error.response?.data?.message || 'Error receiving payment';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetReceiveForm = () => {
    setReceiveFormData({
      houseNumber: '',
      amount: '',
      transactionId: '',
      referenceNumber: '',
      receivedFrom: '',
      paymentMethod: 'bank_transfer',
      notes: ''
    });
    setHouseSearch('');
    setSearchedHouse(null);
  };

  return (
    <div className="payments">
      <div className="page-header">
        <h1>Payments</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => exportPaymentsToPDF(payments)}>
            📄 Export PDF
          </button>
          <button className="btn-secondary" onClick={() => exportToExcel(payments.map(p => ({
            Date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A',
            Tenant: p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : 'N/A',
            House: p.house ? p.house.houseNumber : 'N/A',
            Amount: p.paidAmount || p.amount || 0,
            Status: p.status,
            Method: p.paymentMethod
          })), 'payments')}>
            📊 Export Excel
          </button>
          <button className="btn-secondary" onClick={() => exportToCSV(payments.map(p => ({
            Date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A',
            Tenant: p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : 'N/A',
            House: p.house ? p.house.houseNumber : 'N/A',
            Amount: p.paidAmount || p.amount || 0,
            Status: p.status,
            Method: p.paymentMethod
          })), 'payments')}>
            📋 Export CSV
          </button>
          <button className="btn-secondary" onClick={() => setShowGenerateRentModal(true)}>
            Generate Monthly Rent
          </button>
          <button className="btn-secondary" onClick={handleCheckOverdue}>
            Check Overdue
          </button>
          <button 
            className="btn-primary" 
            style={{ background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)' }}
            onClick={() => { resetReceiveForm(); setShowReceiveModal(true); }}
          >
            💰 Receive Payment
          </button>
          <button 
            className="btn-primary" 
            style={{ background: 'linear-gradient(135deg, #00A86B 0%, #008B5A 100%)' }}
            onClick={() => {
              setMpesaForm({
                phoneNumber: '',
                amount: '',
                houseNumber: '',
                month: getCurrentMonth(),
                year: new Date().getFullYear()
              });
              setShowMpesaModal(true);
            }}
          >
            📱 M-Pesa Payment
          </button>
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            Add Payment
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search payments..."
          />
          <select
            className="filter-select"
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="partial">Partial</option>
          </select>
          <select
            className="filter-select"
            value={filters.paymentMethod || ''}
            onChange={(e) => updateFilter('paymentMethod', e.target.value)}
          >
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="equity_bank">Equity Bank</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="mpesa_stk">M-Pesa STK</option>
            <option value="paybill">Paybill</option>
            <option value="online">Online</option>
            <option value="other">Other</option>
          </select>
          <input
            type="date"
            className="filter-input"
            value={filters.startDate || ''}
            onChange={(e) => updateFilter('startDate', e.target.value)}
            placeholder="Start Date"
          />
          <input
            type="date"
            className="filter-input"
            value={filters.endDate || ''}
            onChange={(e) => updateFilter('endDate', e.target.value)}
            placeholder="End Date"
          />
          <input
            type="number"
            className="filter-input"
            value={filters.amountMin || ''}
            onChange={(e) => updateFilter('amountMin', e.target.value ? parseFloat(e.target.value) : '')}
            placeholder="Min Amount"
          />
          <input
            type="number"
            className="filter-input"
            value={filters.amountMax || ''}
            onChange={(e) => updateFilter('amountMax', e.target.value ? parseFloat(e.target.value) : '')}
            placeholder="Max Amount"
          />
          {(filters.status || filters.paymentMethod || filters.startDate || filters.endDate || filters.amountMin || filters.amountMax || searchQuery) && (
            <button className="btn-secondary" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="payments-table">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('paymentDate')} className="sortable">
                Date {sortField === 'paymentDate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('tenant')} className="sortable">
                Tenant {sortField === 'tenant' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('house')} className="sortable">
                House {sortField === 'house' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('amount')} className="sortable">
                Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('dueDate')} className="sortable">
                Due Date {sortField === 'dueDate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('paymentMethod')} className="sortable">
                Method {sortField === 'paymentMethod' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Month/Year</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  No payments found
                </td>
              </tr>
            ) : (
              paginatedData.map((payment) => (
              <tr key={payment._id}>
                <td>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}</td>
                <td>
                  {payment.tenant?.firstName} {payment.tenant?.lastName}
                </td>
                <td>
                  {payment.house
                    ? `${payment.house.houseNumber} (${payment.house.apartment?.name || 'N/A'})`
                    : 'N/A'}
                </td>
                <td>
                  KSh {(payment.paidAmount || payment.amount || 0).toLocaleString()}
                  {payment.deficit > 0 && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'block' }}>
                      Deficit: KSh {payment.deficit.toLocaleString()}
                    </span>
                  )}
                  {payment.lateFee > 0 && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'block' }}>
                      + KSh {payment.lateFee.toLocaleString()} late fee
                    </span>
                  )}
                  {payment.carriedForward > 0 && (
                    <span style={{ color: 'var(--warning)', fontSize: '0.85rem', display: 'block' }}>
                      Carried Forward: KSh {payment.carriedForward.toLocaleString()}
                    </span>
                  )}
                </td>
                <td>{payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>{formatPaymentMethod(payment.paymentMethod)}</span>
                    {payment.paymentSource === 'equity_bank' && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '2px 6px', 
                        background: '#00A86B', 
                        color: 'white', 
                        borderRadius: '4px',
                        fontWeight: '500'
                      }} title="Auto-processed from Equity Bank webhook">
                        AUTO
                      </span>
                    )}
                    {payment.paymentSource === 'webhook' && payment.paymentMethod !== 'equity_bank' && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '2px 6px', 
                        background: '#3498db', 
                        color: 'white', 
                        borderRadius: '4px',
                        fontWeight: '500'
                      }} title="Auto-processed via webhook">
                        WEBHOOK
                      </span>
                    )}
                    {payment.transactionId && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        color: 'var(--text-secondary)',
                        fontFamily: 'monospace'
                      }} title={`Transaction ID: ${payment.transactionId}`}>
                        {payment.transactionId.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(payment.status) }}
                  >
                    {payment.status}
                  </span>
                </td>
                <td>{payment.month}/{payment.year}</td>
                <td>
                  <div className="table-actions">
                    <button 
                      className="btn-receipt" 
                      onClick={() => generatePaymentReceipt(payment)}
                      title="Download Receipt"
                    >
                      🧾 Receipt
                    </button>
                    <button className="btn-edit" onClick={() => handleEdit(payment)}>
                      Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(payment._id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageSizeChange={setPageSize}
        />
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedPayment ? 'Edit Payment' : 'Add Payment'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tenant</label>
                <select
                  value={formData.tenant}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  required
                >
                  <option value="">Select Tenant</option>
                  {tenants.map((tenant) => (
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
                  onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                  required
                >
                  <option value="">Select House</option>
                  {houses.map((house) => (
                    <option key={house._id} value={house._id}>
                      {house.houseNumber} - {house.apartment?.name || 'N/A'} (KSh {house.rentAmount.toLocaleString()}/month)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="equity_bank">Equity Bank</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Month</label>
                  <input
                    type="text"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    placeholder="01-12"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Save</button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceiveModal && (
        <div className="modal-overlay" onClick={() => { setShowReceiveModal(false); resetReceiveForm(); }}>
          <div className="modal-content receive-payment-modal" onClick={(e) => e.stopPropagation()}>
            <h2>💰 Receive Payment</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Enter house number to receive and record a payment
            </p>
            
            <div className="house-search-section">
              <div className="form-group">
                <label>House Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={houseSearch}
                    onChange={(e) => setHouseSearch(e.target.value)}
                    placeholder="e.g., 101, 201, 301"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchHouse()}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSearchHouse}
                    disabled={searching}
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {searchedHouse && (
                <div className="house-info-card">
                  {searchedHouse.canReceivePayment ? (
                    <>
                      <div className="info-row">
                        <strong>House:</strong> {searchedHouse.house.houseNumber}
                      </div>
                      <div className="info-row">
                        <strong>Apartment:</strong> {searchedHouse.house.apartment?.name}
                      </div>
                      <div className="info-row">
                        <strong>Tenant:</strong> {searchedHouse.house.tenant?.firstName} {searchedHouse.house.tenant?.lastName}
                      </div>
                      <div className="info-row">
                        <strong>Monthly Rent:</strong> KSh {searchedHouse.house.rentAmount.toLocaleString()}
                      </div>
                      <div className="info-row">
                        <strong>Email:</strong> {searchedHouse.house.tenant?.email}
                      </div>
                      <div className="info-row">
                        <strong>Phone:</strong> {searchedHouse.house.tenant?.phone}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--danger)', padding: '16px', textAlign: 'center' }}>
                      ⚠️ This house has no tenant assigned. Please assign a tenant first.
                    </div>
                  )}
                </div>
              )}
            </div>

            {searchedHouse && searchedHouse.canReceivePayment && (
              <form onSubmit={handleReceivePayment}>
                <div className="form-group">
                  <label>Amount Received (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={receiveFormData.amount}
                    onChange={(e) => setReceiveFormData({ ...receiveFormData, amount: e.target.value })}
                    required
                    placeholder={searchedHouse.house.rentAmount}
                  />
                  <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    Expected: KSh {searchedHouse.house.rentAmount.toLocaleString()}
                  </small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Transaction ID (Optional)</label>
                    <input
                      type="text"
                      value={receiveFormData.transactionId}
                      onChange={(e) => setReceiveFormData({ ...receiveFormData, transactionId: e.target.value })}
                      placeholder="e.g., TXN123456"
                    />
                  </div>
                  <div className="form-group">
                    <label>Reference Number (Optional)</label>
                    <input
                      type="text"
                      value={receiveFormData.referenceNumber}
                      onChange={(e) => setReceiveFormData({ ...receiveFormData, referenceNumber: e.target.value })}
                      placeholder="e.g., REF789"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Received From</label>
                    <input
                      type="text"
                      value={receiveFormData.receivedFrom}
                      onChange={(e) => setReceiveFormData({ ...receiveFormData, receivedFrom: e.target.value })}
                      placeholder="Name of payer"
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={receiveFormData.paymentMethod}
                      onChange={(e) => setReceiveFormData({ ...receiveFormData, paymentMethod: e.target.value })}
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="online">Online</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    value={receiveFormData.notes}
                    onChange={(e) => setReceiveFormData({ ...receiveFormData, notes: e.target.value })}
                    rows="3"
                    placeholder="Additional notes about this payment"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)' }}>
                    ✅ Record Payment
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setShowReceiveModal(false); resetReceiveForm(); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showMpesaModal && (
        <div className="modal-overlay" onClick={() => setShowMpesaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📱 Pay via M-Pesa STK Push</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Enter house number and phone number to receive an M-Pesa prompt
            </p>
            <form onSubmit={handleMpesaPayment}>
              <div className="form-group">
                <label>House Number</label>
                <input
                  type="text"
                  value={mpesaForm.houseNumber}
                  onChange={(e) => setMpesaForm({ ...mpesaForm, houseNumber: e.target.value })}
                  placeholder="e.g., 101, 201, 301"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={mpesaForm.phoneNumber}
                  onChange={(e) => setMpesaForm({ ...mpesaForm, phoneNumber: e.target.value })}
                  placeholder="254712345678 or 0712345678"
                  required
                />
                <small>Enter the M-Pesa registered phone number</small>
              </div>
              <div className="form-group">
                <label>Amount (KSh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={mpesaForm.amount}
                  onChange={(e) => setMpesaForm({ ...mpesaForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Month</label>
                  <input
                    type="text"
                    value={mpesaForm.month}
                    onChange={(e) => setMpesaForm({ ...mpesaForm, month: e.target.value })}
                    placeholder="01-12"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={mpesaForm.year}
                    onChange={(e) => setMpesaForm({ ...mpesaForm, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={mpesaLoading}
                  style={{ background: 'linear-gradient(135deg, #00A86B 0%, #008B5A 100%)' }}
                >
                  {mpesaLoading ? 'Processing...' : '📱 Send M-Pesa Prompt'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowMpesaModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setPaymentToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Generate Rent Modal */}
      <GenerateRentModal
        isOpen={showGenerateRentModal}
        onClose={() => setShowGenerateRentModal(false)}
        onConfirm={handleGenerateMonthlyRent}
      />

      {(submitting || mpesaLoading) && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default Payments;

