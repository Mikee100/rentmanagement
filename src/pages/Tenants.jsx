import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantsAPI, apartmentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import './Tenants.css';

const Tenants = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isCaretaker, isSuperadmin } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all|active|inactive|past
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
    // Auto-select caretaker's apartment
    if (isCaretaker() && user?.apartment?._id) {
      setSelectedApartment(user.apartment._id);
    }
  }, []);

  useEffect(() => {
    filterTenants();
  }, [tenants, selectedApartment, statusFilter, searchQuery]);

  const fetchData = async () => {
    try {
      // Always fetch all tenants, filter on frontend for apartment
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

    const normalizeId = (value) => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'object') {
        if (value._id) return String(value._id);
        if (value.id) return String(value.id);
      }
      return String(value);
    };

    const getHouseApartmentId = (house) => {
      if (!house || !house.apartment) return '';
      return normalizeId(house.apartment);
    };

    // Filter by apartment
    if (selectedApartment !== 'all') {
      const selectedApartmentId = normalizeId(selectedApartment);
      filtered = filtered.filter((tenant) => {
        const candidateHouses = Array.isArray(tenant.houses)
          ? tenant.houses
          : tenant.house
            ? [tenant.house]
            : [];
        return candidateHouses.some((house) => getHouseApartmentId(house) === selectedApartmentId);
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => String(t.status || '').toLowerCase() === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tenant =>
        (tenant.firstName || '').toLowerCase().includes(query) ||
        (tenant.lastName || '').toLowerCase().includes(query) ||
        (tenant.email || '').toLowerCase().includes(query) ||
        (tenant.phone || '').includes(query) ||
        ((tenant.houses && tenant.houses[0]?.houseNumber) || tenant.house?.houseNumber || '').toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
      return aName.localeCompare(bName);
    });

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

  const totalTenants = tenants.length;

  return (
    <div className="tenants-page">
      <div className="tenants-header">
        <div>
          <h1>Tenants</h1>
          <div className="tenants-subtitle">
            Showing <strong>{filteredTenants.length}</strong> of {totalTenants}
          </div>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          Add Tenant
        </button>
      </div>

      <div className="tenants-filter-bar">
        <input
          type="text"
          placeholder="Search name, email, phone, house..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="tenants-search"
        />
        {(!isCaretaker() || isSuperadmin()) ? (
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
        ) : (
          <div className="filter-readonly">
            <span className="apartment-badge">{user?.apartment?.name || 'Dansu 2011'}</span>
            <small>✓ Your apartment</small>
          </div>
        )}
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="past">Past</option>
        </select>
        <button
          className="btn-secondary"
          onClick={() => {
            setSelectedApartment('all');
            setSearchQuery('');
            setStatusFilter('all');
          }}
        >
          Clear
        </button>
      </div>

      {filteredTenants.length === 0 ? (
        <div className="empty-state">
          <p>No tenants found</p>
          <button
            className="btn-secondary"
            onClick={() => {
              setSelectedApartment('all');
              setSearchQuery('');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="tenants-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>House</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => {
                const primaryHouse = (tenant.houses && tenant.houses.length > 0) ? tenant.houses[0] : tenant.house;
                let apartmentName = 'N/A';
                if (primaryHouse && primaryHouse.apartment && primaryHouse.apartment.name) {
                  apartmentName = primaryHouse.apartment.name;
                } else if (primaryHouse && primaryHouse.apartment) {
                  const apartmentId = typeof primaryHouse.apartment === 'object'
                    ? String(primaryHouse.apartment._id || primaryHouse.apartment.id || '')
                    : String(primaryHouse.apartment);
                  const apt = apartments.find(a => String(a._id) === apartmentId);
                  if (apt) apartmentName = apt.name;
                }
                return (
                  <tr key={tenant._id} onClick={() => navigate(`/tenants/${tenant._id}`)}>
                    <td>
                      <div className="tenant-name-simple">
                        <div>{tenant.firstName} {tenant.lastName}</div>
                      </div>
                    </td>
                    <td>
                      {primaryHouse ? (
                        <div className="house-cell-simple">
                          <span>{primaryHouse.houseNumber}</span>
                          <small>{apartmentName}</small>
                        </div>
                      ) : (
                        <span className="not-assigned">Not Assigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge status-${tenant.status}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="table-actions">
                        <button className="btn-view-small" onClick={() => navigate(`/tenants/${tenant._id}`)} title="View details">
                          View
                        </button>
                        <button className="btn-edit-small" onClick={() => handleEdit(tenant)} title="Edit tenant">
                          Edit
                        </button>
                        <button className="btn-delete-small" onClick={() => handleDelete(tenant._id)} title="Delete tenant">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-premium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h2>{selectedTenant ? 'Edit Tenant' : 'Add Tenant'}</h2>
              <button className="btn-close-sm" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-premium-body">
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      placeholder="Tenant's first name"
                    />
                  </div>
                  <div className="form-group-premium">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Tenant's last name"
                    />
                  </div>
                </div>
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="form-group-premium">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+123 456 789"
                    />
                  </div>
                </div>
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>Bank Account Number (Equity)</label>
                    <input
                      type="text"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      placeholder="e.g., 1234567890"
                    />
                    <small style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
                      Used to match payments from Equity Bank
                    </small>
                  </div>
                  <div className="form-group-premium">
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
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>Lease Start Date</label>
                    <input
                      type="date"
                      value={formData.leaseStartDate}
                      onChange={(e) => setFormData({ ...formData, leaseStartDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group-premium">
                    <label>Lease End Date</label>
                    <input
                      type="date"
                      value={formData.leaseEndDate}
                      onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>Emergency Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergencyContact.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                      })}
                      placeholder="Name"
                    />
                  </div>
                  <div className="form-group-premium">
                    <label>Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.emergencyContact.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                      })}
                      placeholder="Phone"
                    />
                  </div>
                </div>
                <div className="form-group-premium">
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
                <div className="form-group-premium">
                  <label>Note</label>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                    Houses are assigned from the Apartment detail page
                  </p>
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
                  {submitting ? 'Saving...' : 'Save Tenant'}
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
