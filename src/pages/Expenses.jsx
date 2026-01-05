import { useEffect, useState } from 'react';
import { expensesAPI, apartmentsAPI, housesAPI, maintenanceAPI } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import './Expenses.css';

const Expenses = () => {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [houses, setHouses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [filters, setFilters] = useState({
    apartment: '',
    category: '',
    startDate: '',
    endDate: ''
  });
  const [formData, setFormData] = useState({
    apartment: '',
    house: '',
    category: 'other',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    vendor: '',
    paymentMethod: 'cash',
    receipt: '',
    notes: '',
    maintenanceRequest: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    fetchSummary();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [expensesRes, apartmentsRes, housesRes] = await Promise.all([
        expensesAPI.getAll(filters),
        apartmentsAPI.getAll(),
        housesAPI.getAll()
      ]);
      setExpenses(expensesRes.data);
      setApartments(apartmentsRes.data);
      setHouses(housesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const summaryRes = await expensesAPI.getSummary(filters);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        house: formData.house || null,
        maintenanceRequest: formData.maintenanceRequest || null
      };

      if (selectedExpense) {
        await expensesAPI.update(selectedExpense._id, data);
        toast.success('Expense updated successfully');
      } else {
        await expensesAPI.create(data);
        toast.success('Expense created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchData();
      fetchSummary();
    } catch (error) {
      console.error('Error saving expense:', error);
      const errorMessage = error.response?.data?.message || 'Error saving expense';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setFormData({
      apartment: expense.apartment._id || expense.apartment,
      house: expense.house?._id || expense.house || '',
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expenseDate ? expense.expenseDate.split('T')[0] : new Date().toISOString().split('T')[0],
      vendor: expense.vendor || '',
      paymentMethod: expense.paymentMethod,
      receipt: expense.receipt || '',
      notes: expense.notes || '',
      maintenanceRequest: expense.maintenanceRequest?._id || expense.maintenanceRequest || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setExpenseToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await expensesAPI.delete(expenseToDelete);
      toast.success('Expense deleted successfully');
      setShowDeleteConfirm(false);
      setExpenseToDelete(null);
      fetchData();
      fetchSummary();
    } catch (error) {
      console.error('Error deleting expense:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting expense';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      apartment: '',
      house: '',
      category: 'other',
      description: '',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      vendor: '',
      paymentMethod: 'cash',
      receipt: '',
      notes: '',
      maintenanceRequest: ''
    });
    setSelectedExpense(null);
  };

  const getCategoryColor = (category) => {
    const colors = {
      maintenance: '#ef4444',
      repair: '#f59e0b',
      utilities: '#3b82f6',
      insurance: '#10b981',
      taxes: '#8b5cf6',
      legal: '#ec4899',
      marketing: '#06b6d4',
      supplies: '#84cc16',
      other: '#6b7280'
    };
    return colors[category] || colors.other;
  };

  if (loading) {
    return <LoadingSpinner text="Loading expenses..." fullScreen />;
  }

  return (
    <div className="expenses">
      <div className="page-header">
        <h1>Expenses</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          Add Expense
        </button>
      </div>

      {summary && (
        <div className="expense-summary">
          <div className="summary-card">
            <h3>Total Expenses</h3>
            <p className="summary-value">KSh {summary.total.toLocaleString()}</p>
            <p className="summary-count">{summary.count} expenses</p>
          </div>
          {summary.byCategory && Object.keys(summary.byCategory).length > 0 && (
            <div className="category-breakdown">
              <h4>By Category</h4>
              <div className="category-list">
                {Object.entries(summary.byCategory).map(([category, amount]) => (
                  <div key={category} className="category-item">
                    <span className="category-name">{category.replace('_', ' ')}</span>
                    <span className="category-amount">KSh {amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="filters">
        <select
          value={filters.apartment}
          onChange={(e) => setFilters({ ...filters, apartment: e.target.value })}
        >
          <option value="">All Apartments</option>
          {apartments.map(apt => (
            <option key={apt._id} value={apt._id}>{apt.name}</option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="maintenance">Maintenance</option>
          <option value="repair">Repair</option>
          <option value="utilities">Utilities</option>
          <option value="insurance">Insurance</option>
          <option value="taxes">Taxes</option>
          <option value="legal">Legal</option>
          <option value="marketing">Marketing</option>
          <option value="supplies">Supplies</option>
          <option value="other">Other</option>
        </select>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          placeholder="Start Date"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          placeholder="End Date"
        />
      </div>

      <div className="expenses-table">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Apartment</th>
              <th>House</th>
              <th>Amount</th>
              <th>Vendor</th>
              <th>Payment Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense._id}>
                <td>{new Date(expense.expenseDate).toLocaleDateString()}</td>
                <td>{expense.description}</td>
                <td>
                  <span
                    className="category-badge"
                    style={{ backgroundColor: getCategoryColor(expense.category) }}
                  >
                    {expense.category.replace('_', ' ')}
                  </span>
                </td>
                <td>{expense.apartment?.name || 'N/A'}</td>
                <td>{expense.house?.houseNumber || 'N/A'}</td>
                <td><strong>KSh {expense.amount.toLocaleString()}</strong></td>
                <td>{expense.vendor || 'N/A'}</td>
                <td>{expense.paymentMethod.replace('_', ' ')}</td>
                <td>
                  <div className="table-actions">
                    <button className="btn-edit" onClick={() => handleEdit(expense)}>
                      Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(expense._id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedExpense ? 'Edit Expense' : 'Add Expense'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Apartment</label>
                <select
                  value={formData.apartment}
                  onChange={(e) => setFormData({ ...formData, apartment: e.target.value, house: '' })}
                  required
                >
                  <option value="">Select Apartment</option>
                  {apartments.map(apt => (
                    <option key={apt._id} value={apt._id}>{apt.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>House (Optional)</label>
                <select
                  value={formData.house}
                  onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                >
                  <option value="">Select House (Optional)</option>
                  {houses
                    .filter(h => !formData.apartment || h.apartment?._id === formData.apartment || h.apartment === formData.apartment)
                    .map(house => (
                      <option key={house._id} value={house._id}>
                        {house.houseNumber} - {house.apartment?.name || 'N/A'}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="repair">Repair</option>
                    <option value="utilities">Utilities</option>
                    <option value="insurance">Insurance</option>
                    <option value="taxes">Taxes</option>
                    <option value="legal">Legal</option>
                    <option value="marketing">Marketing</option>
                    <option value="supplies">Supplies</option>
                    <option value="other">Other</option>
                  </select>
                </div>
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
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Vendor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
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
                    <option value="credit_card">Credit Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Receipt URL (Optional)</label>
                <input
                  type="url"
                  value={formData.receipt}
                  onChange={(e) => setFormData({ ...formData, receipt: e.target.value })}
                  placeholder="https://..."
                />
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setExpenseToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {submitting && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default Expenses;

