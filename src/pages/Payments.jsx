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
    months: [{ month: getCurrentMonth(), year: new Date().getFullYear() }],
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

  const availableMonths = [
    { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' }, { value: '04', label: 'Apr' },
    { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' }, { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' }
  ];

  const [formData, setFormData] = useState({
    tenant: '',
    house: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentMethod: 'cash',
    status: 'pending',
    months: [{ month: getCurrentMonth(), year: new Date().getFullYear() }],
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
    if (formData.months.length === 0) {
      toast.warning('Please select at least one month');
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        year: parseInt(formData.year),
      };

      if (selectedPayment) {
        // When editing, we only update the single payment record
        const editData = {
          ...data,
          month: formData.months[0].month,
          year: formData.months[0].year
        };
        await paymentsAPI.update(selectedPayment._id, editData);
        toast.success('Payment updated successfully');
      } else {
        await paymentsAPI.create(data);
        toast.success(`${formData.months.length} payment(s) created successfully`);
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
      months: [{ month: payment.month, year: payment.year }],
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
    if (tenant) {
      // Find all houses assigned to this tenant from the global houses array (most reliable)
      const tenantHouses = houses.filter(h => h.tenant && (h.tenant._id === tenantId || h.tenant === tenantId));
      
      if (tenantHouses.length > 0) {
        const house = tenantHouses[0];
        setFormData({
          ...formData,
          tenant: tenantId,
          house: house._id,
          amount: (house.rentAmount * formData.months.length).toString()
        });
      } else if (tenant.houses && tenant.houses.length > 0) {
        // Fallback to what's in the tenant object
        const houseData = tenant.houses[0];
        const houseId = houseData._id || houseData;
        const rentAmount = houseData.rentAmount || houses.find(h => h._id === houseId)?.rentAmount || 0;
        
        setFormData({
          ...formData,
          tenant: tenantId,
          house: houseId,
          amount: (rentAmount * formData.months.length).toString()
        });
      } else {
        setFormData({ ...formData, tenant: tenantId, house: '', amount: '' });
      }
    } else {
      setFormData({ ...formData, tenant: tenantId, house: '', amount: '' });
    }
  };

  const handleMonthToggle = (monthValue) => {
    const isSelected = formData.months.some(m => m.month === monthValue && m.year === formData.year);
    let newMonths;
    if (isSelected) {
      newMonths = formData.months.filter(m => !(m.month === monthValue && m.year === formData.year));
    } else {
      newMonths = [...formData.months, { month: monthValue, year: formData.year }];
    }
    
    // Sort months chronologically
    newMonths.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return parseInt(a.month) - parseInt(b.month);
    });

    // Auto-calculate amount if house is selected
    const house = houses.find(h => h._id === formData.house);
    let newAmount = formData.amount;
    if (house) {
        newAmount = (house.rentAmount * newMonths.length).toString();
    }

    setFormData({
      ...formData,
      months: newMonths,
      amount: newAmount
    });
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
      months: [{ month: String(currentDate.getMonth() + 1).padStart(2, '0'), year: currentDate.getFullYear() }],
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
        months: mpesaForm.months,
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

  const handleMpesaMonthToggle = (monthValue) => {
    const isSelected = mpesaForm.months.some(m => m.month === monthValue && m.year === mpesaForm.year);
    let newMonths;
    if (isSelected) {
      newMonths = mpesaForm.months.filter(m => !(m.month === monthValue && m.year === mpesaForm.year));
    } else {
      newMonths = [...mpesaForm.months, { month: monthValue, year: mpesaForm.year }];
    }
    
    // Sort months
    newMonths.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return parseInt(a.month) - parseInt(b.month);
    });

    setMpesaForm({
      ...mpesaForm,
      months: newMonths
    });
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
                months: [{ month: getCurrentMonth(), year: new Date().getFullYear() }],
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
                      Deficit: KSh {(payment.deficit || 0).toLocaleString()}
                    </span>
                  )}
                  {payment.overpayment > 0 && (
                    <span style={{ color: '#8e44ad', fontSize: '0.85rem', display: 'block', fontWeight: 'bold' }}>
                      Overpaid: KSh {(payment.overpayment || 0).toLocaleString()}
                    </span>
                  )}
                  {payment.lateFee > 0 && (
                    <span style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'block' }}>
                      + KSh {(payment.lateFee || 0).toLocaleString()} late fee
                    </span>
                  )}
                  {payment.carriedForward > 0 && (
                    <span style={{ color: 'var(--warning)', fontSize: '0.85rem', display: 'block' }}>
                      Carried Forward: KSh {(payment.carriedForward || 0).toLocaleString()}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(payment.status) }}
                    >
                      {payment.status}
                    </span>
                    {payment.isAdvance && (
                      <span
                        className="status-badge"
                        style={{ backgroundColor: '#8e44ad', fontSize: '0.7rem' }}
                        title="Payment for a future month"
                      >
                        ADVANCE
                      </span>
                    )}
                  </div>
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
          <div className="modal-premium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h2>{selectedPayment ? 'Edit Payment' : 'Add Payment'}</h2>
              <button className="btn-close-sm" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-premium-body">
                <div className="form-group-premium">
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
                <div className="form-group-premium">
                  <label>House</label>
                  <select
                    value={formData.house}
                    onChange={(e) => {
                      const hId = e.target.value;
                      const houseObj = houses.find(h => h._id === hId);
                      setFormData({ 
                        ...formData, 
                        house: hId,
                        amount: houseObj ? (houseObj.rentAmount * formData.months.length).toString() : formData.amount
                      });
                    }}
                    required
                    disabled={!formData.tenant}
                  >
                    <option value="">Select House</option>
                    {formData.tenant && (() => {
                      const tenant = tenants.find(t => t._id === formData.tenant);
                      // Collect all possible houses either from global houses state or tenant'shouses array
                      const globalTenantHouses = houses.filter(h => h.tenant && (h.tenant._id === formData.tenant || h.tenant === formData.tenant));
                      const tenantObjectHouses = tenant?.houses || [];
                      
                      const allHouseOptions = [...globalTenantHouses];
                      tenantObjectHouses.forEach(th => {
                        const thId = th._id || th;
                        if (!allHouseOptions.some(h => h._id === thId)) {
                           const found = houses.find(h => h._id === thId);
                           if (found) allHouseOptions.push(found);
                           else if (th.rentAmount !== undefined) allHouseOptions.push(th); // If it's a populated object
                        }
                      });

                      return allHouseOptions.map((house) => {
                        const hId = house._id || house;
                        const houseNumber = house.houseNumber || 'N/A';
                        const apartmentName = house.apartment?.name || 'N/A';
                        const rentAmount = house.rentAmount || 0;
                        
                        return (
                          <option key={hId} value={hId}>
                            {houseNumber} - {apartmentName} (KSh {(rentAmount).toLocaleString()}/month)
                          </option>
                        );
                      });
                    })()}
                  </select>
                </div>
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>Amount (KSh)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-premium">
                    <label>Payment Date</label>
                    <input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-premium">
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
                <div className="month-year-selection-premium">
                  <div className="form-group-premium">
                    <label>Year</label>
                    <div className="year-selector-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button" 
                        className="btn-icon-sm" 
                        onClick={() => setFormData(prev => ({ ...prev, year: prev.year - 1 }))}
                      >
                        ←
                      </button>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                        style={{ width: '80px', textAlign: 'center' }}
                        required
                      />
                      <button 
                        type="button" 
                        className="btn-icon-sm" 
                        onClick={() => setFormData(prev => ({ ...prev, year: prev.year + 1 }))}
                      >
                        →
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group-premium" style={{ gridColumn: 'span 2' }}>
                    <label>Select Months {selectedPayment ? '(Read-only when editing)' : '(Multi-select allowed)'}</label>
                    <div className="month-grid-premium" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(4, 1fr)', 
                      gap: '8px',
                      marginTop: '8px' 
                    }}>
                      {availableMonths.map((m) => {
                        const isSelected = formData.months.some(sm => sm.month === m.value && sm.year === formData.year);
                        return (
                          <button
                            key={m.value}
                            type="button"
                            disabled={selectedPayment && !isSelected}
                            className={`month-chip-premium ${isSelected ? 'active' : ''}`}
                            onClick={() => handleMonthToggle(m.value)}
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-subtle)',
                              background: isSelected ? 'var(--primary)' : 'var(--bg-main)',
                              color: isSelected ? 'white' : 'var(--text-main)',
                              cursor: (selectedPayment && !isSelected) ? 'not-allowed' : 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: isSelected ? '600' : '400',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {formData.months.length > 0 && (
                  <div className="selected-months-summary" style={{ 
                    marginBottom: '1rem', 
                    padding: '10px', 
                    background: 'var(--bg-subtle)', 
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    borderLeft: '4px solid var(--primary)'
                  }}>
                    <strong>Selected:</strong> {formData.months.map(m => `${availableMonths.find(am => am.value === m.month)?.label} ${m.year}`).join(', ')}
                    {formData.months.length > 1 && (
                        <div style={{ marginTop: '4px', opacity: 0.8 }}>
                            Total of {formData.months.length} months selected.
                        </div>
                    )}
                  </div>
                )}
                <div className="form-group-premium">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    placeholder="Additional payment details..."
                  />
                </div>
              </div>
              <div className="modal-premium-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceiveModal && (
        <div className="modal-overlay" onClick={() => { setShowReceiveModal(false); resetReceiveForm(); }}>
          <div className="modal-premium" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h2>💰 Receive Payment</h2>
              <button className="btn-close-sm" onClick={() => { setShowReceiveModal(false); resetReceiveForm(); }}>×</button>
            </div>
            <div className="modal-premium-body">
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Enter house number to receive and record a payment
              </p>

              <div className="house-search-section">
                <div className="form-group-premium">
                  <label>House Number</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="text"
                      value={houseSearch}
                      onChange={(e) => setHouseSearch(e.target.value)}
                      placeholder="e.g., 101, 201"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchHouse()}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSearchHouse}
                      disabled={searching}
                    >
                      {searching ? '...' : 'Search'}
                    </button>
                  </div>
                </div>

                {searchedHouse && (
                  <div className="house-info-card" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                    {searchedHouse.canReceivePayment ? (
                      <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div><strong>House:</strong> {searchedHouse.house.houseNumber} | {searchedHouse.house.apartment?.name}</div>
                        <div><strong>Tenant:</strong> {searchedHouse.house.tenant?.firstName} {searchedHouse.house.tenant?.lastName}</div>
                        <div style={{ color: 'var(--primary)', fontWeight: '700' }}><strong>Rent:</strong> KSh {(searchedHouse.house.rentAmount || 0).toLocaleString()}</div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--danger)', padding: '0.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: '600' }}>
                        ⚠️ No tenant assigned to this house.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {searchedHouse && searchedHouse.canReceivePayment && (
                <form onSubmit={handleReceivePayment}>
                  <div className="form-group-premium">
                    <label>Amount Received (KSh)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={receiveFormData.amount}
                      onChange={(e) => setReceiveFormData({ ...receiveFormData, amount: e.target.value })}
                      required
                      placeholder={searchedHouse.house.rentAmount}
                    />
                  </div>

                  <div className="form-row-premium">
                    <div className="form-group-premium">
                      <label>Transaction ID</label>
                      <input
                        type="text"
                        value={receiveFormData.transactionId}
                        onChange={(e) => setReceiveFormData({ ...receiveFormData, transactionId: e.target.value })}
                        placeholder="TXN123..."
                      />
                    </div>
                    <div className="form-group-premium">
                      <label>Reference</label>
                      <input
                        type="text"
                        value={receiveFormData.referenceNumber}
                        onChange={(e) => setReceiveFormData({ ...receiveFormData, referenceNumber: e.target.value })}
                        placeholder="REF789..."
                      />
                    </div>
                  </div>

                  <div className="form-group-premium">
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

                  <div className="form-group-premium">
                    <label>Notes</label>
                    <textarea
                      value={receiveFormData.notes}
                      onChange={(e) => setReceiveFormData({ ...receiveFormData, notes: e.target.value })}
                      rows="2"
                    />
                  </div>

                  <div className="modal-premium-footer" style={{ padding: '1rem 0 0', border: 'none', background: 'transparent' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => { setShowReceiveModal(false); resetReceiveForm(); }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={submitting}>
                      {submitting ? 'Processing...' : '✅ Record Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showMpesaModal && (
        <div className="modal-overlay" onClick={() => setShowMpesaModal(false)}>
          <div className="modal-premium" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h2 style={{ background: 'linear-gradient(135deg, #00A86B 0%, #008B5A 100%)', WebkitBackgroundClip: 'text' }}>📱 M-Pesa STK Push</h2>
              <button className="btn-close-sm" onClick={() => setShowMpesaModal(false)}>×</button>
            </div>
            <form onSubmit={handleMpesaPayment}>
              <div className="modal-premium-body">
                <div className="form-group-premium">
                  <label>House Number</label>
                  <input
                    type="text"
                    value={mpesaForm.houseNumber}
                    onChange={(e) => setMpesaForm({ ...mpesaForm, houseNumber: e.target.value })}
                    placeholder="e.g., 101"
                    required
                  />
                </div>
                <div className="form-group-premium">
                  <label>Phone Number (M-Pesa)</label>
                  <input
                    type="tel"
                    value={mpesaForm.phoneNumber}
                    onChange={(e) => setMpesaForm({ ...mpesaForm, phoneNumber: e.target.value })}
                    placeholder="e.g., 254712345678"
                    required
                  />
                </div>
                <div className="form-group-premium">
                  <label>Amount (KSh)</label>
                  <input
                    type="number"
                    value={mpesaForm.amount}
                    onChange={(e) => setMpesaForm({ ...mpesaForm, amount: e.target.value })}
                    placeholder="Enter amount"
                    required
                  />
                </div>
                <div className="month-year-selection-premium">
                  <div className="form-group-premium">
                    <label>Year</label>
                    <div className="year-selector-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button" 
                        className="btn-icon-sm" 
                        onClick={() => setMpesaForm(prev => ({ ...prev, year: prev.year - 1 }))}
                      >
                        ←
                      </button>
                      <input
                        type="number"
                        value={mpesaForm.year}
                        onChange={(e) => setMpesaForm({ ...mpesaForm, year: parseInt(e.target.value) })}
                        style={{ width: '80px', textAlign: 'center' }}
                        required
                      />
                      <button 
                        type="button" 
                        className="btn-icon-sm" 
                        onClick={() => setMpesaForm(prev => ({ ...prev, year: prev.year + 1 }))}
                      >
                        →
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group-premium" style={{ gridColumn: 'span 2' }}>
                    <label>Select Months</label>
                    <div className="month-grid-premium" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(4, 1fr)', 
                      gap: '8px',
                      marginTop: '8px' 
                    }}>
                      {availableMonths.map((m) => {
                        const isSelected = mpesaForm.months.some(sm => sm.month === m.value && sm.year === mpesaForm.year);
                        return (
                          <button
                            key={m.value}
                            type="button"
                            className={`month-chip-premium ${isSelected ? 'active' : ''}`}
                            onClick={() => handleMpesaMonthToggle(m.value)}
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid var(--border-subtle)',
                              background: isSelected ? '#00A86B' : 'var(--bg-main)',
                              color: isSelected ? 'white' : 'var(--text-main)',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: isSelected ? '600' : '400',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {mpesaForm.months.length > 0 && (
                  <div className="selected-months-summary" style={{ 
                    marginBottom: '1rem', 
                    padding: '10px', 
                    background: 'rgba(0, 168, 107, 0.1)', 
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    borderLeft: '4px solid #00A86B'
                  }}>
                    <strong>Selected:</strong> {mpesaForm.months.map(m => `${availableMonths.find(am => am.value === m.month)?.label} ${m.year}`).join(', ')}
                  </div>
                )}
              </div>
              <div className="modal-premium-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowMpesaModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#00A86B' }} disabled={mpesaLoading}>
                  {mpesaLoading ? 'Initiating...' : 'Send STK Push'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGenerateRentModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateRentModal(false)}>
          <div className="modal-premium" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h2>📅 Generate Rent</h2>
              <button className="btn-close-sm" onClick={() => setShowGenerateRentModal(false)}>×</button>
            </div>
            <GenerateRentModal 
              onSubmit={handleGenerateMonthlyRent} 
              onClose={() => setShowGenerateRentModal(false)}
              loading={submitting}
            />
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => { setShowDeleteConfirm(false); setPaymentToDelete(null); }}
          onConfirm={confirmDelete}
          title="Delete Payment"
          message="Are you sure you want to delete this payment record? This action cannot be undone."
          type="danger"
        />
      )}

      {(submitting || mpesaLoading) && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default Payments;

