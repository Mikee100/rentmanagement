import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { maintenanceAPI, housesAPI, apartmentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import './Maintenance.css';

const Maintenance = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [houses, setHouses] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    apartment: ''
  });
  const [formData, setFormData] = useState({
    house: '',
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    status: 'pending'
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [requestsRes, housesRes, apartmentsRes] = await Promise.all([
        maintenanceAPI.getAll(filters),
        housesAPI.getAll(),
        apartmentsAPI.getAll()
      ]);
      setRequests(requestsRes.data);
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
      if (selectedRequest) {
        await maintenanceAPI.update(selectedRequest._id, formData);
        toast.success('Maintenance request updated successfully');
      } else {
        await maintenanceAPI.create(formData);
        toast.success('Maintenance request created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving maintenance request:', error);
      const errorMessage = error.response?.data?.message || 'Error saving maintenance request';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (request) => {
    setSelectedRequest(request);
    setFormData({
      house: request.house._id || request.house,
      title: request.title,
      description: request.description,
      category: request.category,
      priority: request.priority,
      status: request.status
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setRequestToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await maintenanceAPI.delete(requestToDelete);
      toast.success('Maintenance request deleted successfully');
      setShowDeleteConfirm(false);
      setRequestToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting request:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting request';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      house: '',
      title: '',
      description: '',
      category: 'other',
      priority: 'medium',
      status: 'pending'
    });
    setSelectedRequest(null);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading maintenance requests..." fullScreen />;
  }

  return (
    <div className="maintenance">
      <div className="page-header">
        <h1>Maintenance Requests</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          New Request
        </button>
      </div>

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <select
          value={filters.apartment}
          onChange={(e) => setFilters({ ...filters, apartment: e.target.value })}
        >
          <option value="">All Apartments</option>
          {apartments.map(apt => (
            <option key={apt._id} value={apt._id}>{apt.name}</option>
          ))}
        </select>
      </div>

      <div className="maintenance-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>House</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Requested Date</th>
              <th>Tenant</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request._id}>
                <td>{request.title}</td>
                <td>
                  {request.house?.houseNumber} - {request.apartment?.name}
                </td>
                <td>{request.category.replace('_', ' ')}</td>
                <td>
                  <span
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(request.priority) }}
                  >
                    {request.priority}
                  </span>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(request.status) }}
                  >
                    {request.status.replace('_', ' ')}
                  </span>
                </td>
                <td>{new Date(request.requestedDate).toLocaleDateString()}</td>
                <td>
                  {request.tenant
                    ? `${request.tenant.firstName} ${request.tenant.lastName}`
                    : 'N/A'}
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn-edit" onClick={() => handleEdit(request)}>
                      Edit
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(request._id)}>
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
            <h2>{selectedRequest ? 'Edit Request' : 'New Maintenance Request'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>House</label>
                <select
                  value={formData.house}
                  onChange={(e) => setFormData({ ...formData, house: e.target.value })}
                  required
                >
                  <option value="">Select House</option>
                  {houses.map(house => (
                    <option key={house._id} value={house._id}>
                      {house.houseNumber} - {house.apartment?.name || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="4"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="hvac">HVAC</option>
                    <option value="appliance">Appliance</option>
                    <option value="structural">Structural</option>
                    <option value="pest_control">Pest Control</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                {selectedRequest && (
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
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
        onClose={() => { setShowDeleteConfirm(false); setRequestToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete Maintenance Request"
        message="Are you sure you want to delete this maintenance request? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {submitting && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default Maintenance;

