import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantsAPI, apartmentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import './Tenants.css';

const Tenants = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [selectedApartment, setSelectedApartment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bankAccountNumber: '',
    bankName: 'Equity',
    leaseStartDate: '',
    leaseEndDate: '',
    emergencyContact: {
      name: '',
      phone: '',
    },
    status: 'active',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [tenants, selectedApartment, searchQuery]);

  const fetchData = async () => {
    try {
      const [tenantsRes, apartmentsRes] = await Promise.all([
        tenantsAPI.getAll(),
        apartmentsAPI.getAll()
      ]);
      setTenants(tenantsRes.data);
      setApartments(apartmentsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const filterTenants = () => {
    let filtered = [...tenants];

    // Filter by apartment
    if (selectedApartment !== 'all') {
      filtered = filtered.filter(tenant => 
        tenant.house?.apartment?._id === selectedApartment || 
        tenant.house?.apartment === selectedApartment
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tenant =>
        tenant.firstName.toLowerCase().includes(query) ||
        tenant.lastName.toLowerCase().includes(query) ||
        tenant.email.toLowerCase().includes(query) ||
        tenant.phone.includes(query) ||
        tenant.house?.houseNumber?.toLowerCase().includes(query)
      );
    }

    setFilteredTenants(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedTenant) {
        await tenantsAPI.update(selectedTenant._id, formData);
        toast.success('Tenant updated successfully');
      } else {
        await tenantsAPI.create(formData);
        toast.success('Tenant created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving tenant:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error saving tenant. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone,
      bankAccountNumber: tenant.bankAccountNumber || '',
      bankName: tenant.bankName || 'Equity',
      leaseStartDate: tenant.leaseStartDate ? tenant.leaseStartDate.split('T')[0] : '',
      leaseEndDate: tenant.leaseEndDate ? tenant.leaseEndDate.split('T')[0] : '',
      emergencyContact: tenant.emergencyContact || { name: '', phone: '' },
      status: tenant.status,
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setTenantToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await tenantsAPI.delete(tenantToDelete);
      toast.success('Tenant deleted successfully');
      setShowDeleteConfirm(false);
      setTenantToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting tenant. Please try again.';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      bankAccountNumber: '',
      bankName: 'Equity',
      leaseStartDate: '',
      leaseEndDate: '',
      emergencyContact: {
        name: '',
        phone: '',
      },
      status: 'active',
    });
    setSelectedTenant(null);
  };

  if (loading) {
    return <LoadingSpinner text="Loading tenants..." fullScreen />;
  }

  return (
    <div className="tenants-page">
      {/* Compact Header */}
      <div className="tenants-header">
        <div className="header-left">
          <h1>Tenants</h1>
          <span className="count-badge">{filteredTenants.length} {filteredTenants.length === 1 ? 'tenant' : 'tenants'}</span>
        </div>
        <button className="btn-add" onClick={() => { resetForm(); setShowModal(true); }}>
          + Add Tenant
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="tenants-controls">
        <div className="controls-left">
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={selectedApartment}
            onChange={(e) => setSelectedApartment(e.target.value)}
          >
            <option value="all">All Apartments</option>
            {apartments.map(apt => (
              <option key={apt._id} value={apt._id}>{apt.name}</option>
            ))}
          </select>
        </div>
        <div className="controls-right">
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
              </svg>
            </button>
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredTenants.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">👤</span>
          <p>No tenants found</p>
          {selectedApartment !== 'all' || searchQuery ? (
            <button className="btn-clear-filters" onClick={() => { setSelectedApartment('all'); setSearchQuery(''); }}>
              Clear Filters
            </button>
          ) : null}
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-container">
          <table className="tenants-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>House</th>
                <th>Lease Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <tr key={tenant._id} onClick={() => navigate(`/tenants/${tenant._id}`)}>
                  <td>
                    <div className="tenant-name-cell">
                      <div className="tenant-avatar-small">
                        {tenant.firstName[0]}{tenant.lastName[0]}
                      </div>
                      <div>
                        <div className="name">{tenant.firstName} {tenant.lastName}</div>
                        <div className="email-small">{tenant.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-cell">
                      <span>{tenant.phone}</span>
                    </div>
                  </td>
                  <td>
                    {tenant.house ? (
                      <div className="house-cell">
                        <span className="house-number">{tenant.house.houseNumber}</span>
                        <span className="apartment-name">{tenant.house.apartment?.name || 'N/A'}</span>
                      </div>
                    ) : (
                      <span className="not-assigned">Not Assigned</span>
                    )}
                  </td>
                  <td>
                    <div className="lease-cell">
                      <div>{tenant.leaseStartDate ? new Date(tenant.leaseStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</div>
                      <div className="lease-end">{tenant.leaseEndDate ? new Date(tenant.leaseEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${tenant.status}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="table-actions">
                      <button className="btn-view-small" onClick={() => navigate(`/tenants/${tenant._id}`)}>
                        View
                      </button>
                      <button className="btn-edit-small" onClick={() => handleEdit(tenant)}>
                        Edit
                      </button>
                      <button className="btn-delete-small" onClick={() => handleDelete(tenant._id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid-container">
          {filteredTenants.map((tenant) => (
            <div key={tenant._id} className="tenant-card" onClick={() => navigate(`/tenants/${tenant._id}`)}>
              <div className="card-header">
                <div className="card-avatar">
                  {tenant.firstName[0]}{tenant.lastName[0]}
                </div>
                <span className={`status-badge status-${tenant.status}`}>
                  {tenant.status}
                </span>
              </div>
              <div className="card-body">
                <h3 className="card-name">{tenant.firstName} {tenant.lastName}</h3>
                <div className="card-info">
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">{tenant.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{tenant.phone}</span>
                  </div>
                  {tenant.house ? (
                    <div className="info-row">
                      <span className="info-label">House</span>
                      <span className="info-value">{tenant.house.houseNumber} - {tenant.house.apartment?.name || 'N/A'}</span>
                    </div>
                  ) : (
                    <div className="info-row">
                      <span className="not-assigned">Not Assigned</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn-view-small" onClick={() => navigate(`/tenants/${tenant._id}`)}>
                  View
                </button>
                <button className="btn-edit-small" onClick={() => handleEdit(tenant)}>
                  Edit
                </button>
                <button className="btn-delete-small" onClick={() => handleDelete(tenant._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedTenant ? 'Edit Tenant' : 'Add Tenant'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Bank Account Number (Equity)</label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    placeholder="e.g., 1234567890"
                  />
                  <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    Used to automatically match payments from Equity Bank
                  </small>
                </div>
                <div className="form-group">
                  <label>Bank Name</label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  >
                    <option value="Equity">Equity</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Note</label>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Houses are assigned from the Apartment detail page
                </p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Lease Start Date</label>
                  <input
                    type="date"
                    value={formData.leaseStartDate}
                    onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Lease End Date</label>
                  <input
                    type="date"
                    value={formData.leaseEndDate}
                    onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Emergency Contact Name</label>
                <input
                  type="text"
                  value={formData.emergencyContact.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="past">Past</option>
                </select>
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
        onClose={() => { setShowDeleteConfirm(false); setTenantToDelete(null); }}
        onConfirm={confirmDelete}
        title="Delete Tenant"
        message="Are you sure you want to delete this tenant? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {submitting && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default Tenants;
