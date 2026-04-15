import { useEffect, useState, useCallback } from 'react';
import { paymentsAPI, tenantsAPI, housesAPI, mpesaAPI, apartmentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import GenerateRentModal from '../components/GenerateRentModal';
import { useTable } from '../hooks/useTable';
import PaymentHeader from './components/PaymentHeader';
import PaymentFilters from './components/PaymentFilters';
import PaymentTable from './components/PaymentTable';
import QuickReceiveModal from './components/QuickReceiveModal';
import PaymentFormModal from './components/PaymentFormModal';
import './Payments.css';

const Payments = () => {
  const toast = useToast();
  
  // Data state
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [houses, setHouses] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Table state
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

  // Modal state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showQuickReceive, setShowQuickReceive] = useState(false);
  const [showQuickMpesa, setShowQuickMpesa] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [showGenerateRentModal, setShowGenerateRentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [paymentsRes, tenantsRes, housesRes, apartmentsRes] = await Promise.all([
        paymentsAPI.getAll(),
        tenantsAPI.getAll(),
        housesAPI.getAll(),
        apartmentsAPI.getAll(),
      ]);
      setPayments(paymentsRes.data);
      setTenants(tenantsRes.data.filter(t => t.status === 'active'));
      setHouses(housesRes.data);
      setApartments(apartmentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payments data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPayment = () => {
    setSelectedPayment(null);
    setShowAddEditModal(true);
  };

  const handleEditPayment = (payment) => {
    setSelectedPayment(payment);
    setShowAddEditModal(true);
  };

  const handleCloseAddEditModal = () => {
    setShowAddEditModal(false);
    setSelectedPayment(null);
  };

  const handlePaymentSaved = () => {
    fetchData();
  };

  const handleDeletePayment = (id) => {
    setPaymentToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await paymentsAPI.delete(paymentToDelete);
      toast.success('Payment deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Error deleting payment');
    } finally {
      setShowDeleteConfirm(false);
      setPaymentToDelete(null);
    }
  };

  const handleGenerateRent = () => {
    setShowGenerateRentModal(true);
  };

  const handleCheckOverdue = async () => {
    try {
      setSubmitting(true);
      const result = await paymentsAPI.checkOverdue({ lateFeePercentage: 5, gracePeriodDays: 5 });
      toast.success(`Updated ${result.data.updated} overdue payments`);
      fetchData();
    } catch (error) {
      toast.error('Error checking overdue payments');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading payments..." fullScreen />;
  }

  return (
    <div className="payments-modern">
      <PaymentHeader
        payments={payments}
        onAddPayment={handleAddPayment}
        onQuickReceive={() => setShowQuickReceive(true)}
        onMpesaPayment={() => setShowQuickMpesa(true)}
        onGenerateRent={handleGenerateRent}
        onCheckOverdue={handleCheckOverdue}
      />
      
      <PaymentFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        paginatedData={paginatedData}
        totalItems={totalItems}
      />
      
      <PaymentTable
        payments={payments}
        onEdit={handleEditPayment}
        onDelete={handleDeletePayment}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        paginatedData={paginatedData}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        totalItems={totalItems}
      />

      <PaymentFormModal
        isOpen={showAddEditModal}
        payment={selectedPayment}
        tenants={tenants}
        houses={houses}
        apartments={apartments}
        onClose={handleCloseAddEditModal}
        onSave={handlePaymentSaved}
      />

      <QuickReceiveModal
        isOpen={showQuickReceive}
        type="receive"
        onClose={() => setShowQuickReceive(false)}
        onPaymentRecorded={fetchData}
        payments={payments}
        houses={houses}
      />

      <QuickReceiveModal
        isOpen={showQuickMpesa}
        type="mpesa"
        onClose={() => setShowQuickMpesa(false)}
        payments={payments}
        houses={houses}
      />

      {showGenerateRentModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateRentModal(false)}>
          <div className="modal-premium" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h2>📅 Generate Rent</h2>
              <button className="btn-close-sm" onClick={() => setShowGenerateRentModal(false)}>×</button>
            </div>
            <GenerateRentModal 
              onSubmit={async (formData) => {
                try {
                  setSubmitting(true);
                  const result = await paymentsAPI.generateMonthlyRent(formData);
                  toast.success(`Generated ${result.data.generated} payments`);
                  setShowGenerateRentModal(false);
                  fetchData();
                } catch (error) {
                  toast.error('Error generating payments');
                } finally {
                  setSubmitting(false);
                }
              }} 
              onClose={() => setShowGenerateRentModal(false)}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Payment"
        message="Are you sure? This cannot be undone."
        type="danger"
      />

      {submitting && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default Payments;
