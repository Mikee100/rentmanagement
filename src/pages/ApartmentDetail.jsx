import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apartmentsAPI, housesAPI, tenantsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import './ApartmentDetail.css';

const ApartmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [apartment, setApartment] = useState(null);
  const [houses, setHouses] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditApartmentModal, setShowEditApartmentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [houseToDelete, setHouseToDelete] = useState(null);
  const [houseToRemove, setHouseToRemove] = useState(null);
  const [apartmentFormData, setApartmentFormData] = useState({
    name: '',
    address: '',
    description: '',
    manager: {
      name: '',
      phone: '',
      email: ''
    }
  });
  const [houseFormData, setHouseFormData] = useState({
    houseNumber: '',
    rentAmount: '',
    status: 'available',
    description: '',
    amenities: '',
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [apartmentRes, housesRes, tenantsRes] = await Promise.all([
        apartmentsAPI.getById(id),
        housesAPI.getByApartment(id),
        tenantsAPI.getAll(),
      ]);
      setApartment(apartmentRes.data.apartment);
      setHouses(housesRes.data);
      setTenants(tenantsRes.data.filter((t) => {
        const status = (t.status || '').toLowerCase();
        return status === 'active';
      }));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const tenantsRes = await tenantsAPI.getAll();
      const availableTenants = tenantsRes.data.filter((t) => {
        const status = (t.status || '').toLowerCase();
        return status === 'active';
      });
      setTenants(availableTenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleHouseSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amenitiesArray = houseFormData.amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a);

      const data = {
        ...houseFormData,
        apartment: id,
        rentAmount: parseFloat(houseFormData.rentAmount),
        amenities: amenitiesArray,
      };

      if (selectedHouse) {
        await housesAPI.update(selectedHouse._id, data);
        toast.success('Unit updated successfully');
      } else {
        await housesAPI.create(data);
        toast.success('Unit created successfully');
      }
      setShowHouseModal(false);
      resetHouseForm();
      fetchData();
    } catch (error) {
      console.error('Error saving house:', error);
      const errorMessage = error.response?.data?.message || 'Error saving house. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditHouse = (house) => {
    setSelectedHouse(house);
    setHouseFormData({
      houseNumber: house.houseNumber,
      rentAmount: house.rentAmount,
      status: house.status,
      description: house.description || '',
      amenities: house.amenities?.join(', ') || '',
    });
    setShowHouseModal(true);
  };

  const handleDeleteHouse = (houseId) => {
    setHouseToDelete(houseId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteHouse = async () => {
    try {
      await housesAPI.delete(houseToDelete);
      toast.success('Unit deleted successfully');
      setShowDeleteConfirm(false);
      setHouseToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting house:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting house. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleAssignTenant = async (houseId, tenantId) => {
    setSubmitting(true);
    try {
      await housesAPI.assignTenant(houseId, tenantId);
      toast.success('Tenant assigned successfully');
      setShowAssignModal(false);
      setSelectedHouse(null);
      fetchData();
    } catch (error) {
      console.error('Error assigning tenant:', error);
      const errorMessage = error.response?.data?.message || 'Error assigning tenant. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTenant = (houseId) => {
    setHouseToRemove(houseId);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveTenant = async () => {
    try {
      await housesAPI.removeTenant(houseToRemove);
      toast.success('Tenant removed successfully');
      setShowRemoveConfirm(false);
      setHouseToRemove(null);
      fetchData();
    } catch (error) {
      console.error('Error removing tenant:', error);
      const errorMessage = error.response?.data?.message || 'Error removing tenant. Please try again.';
      toast.error(errorMessage);
    }
  };

  const resetHouseForm = () => {
    setHouseFormData({
      houseNumber: '',
      rentAmount: '',
      status: 'available',
      description: '',
      amenities: '',
    });
    setSelectedHouse(null);
  };

  const handleEditApartment = () => {
    setApartmentFormData({
      name: apartment.name || '',
      address: apartment.address || '',
      description: apartment.description || '',
      manager: apartment.manager || {
        name: '',
        phone: '',
        email: ''
      }
    });
    setShowEditApartmentModal(true);
  };

  const handleUpdateApartment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apartmentsAPI.update(id, apartmentFormData);
      toast.success('Apartment updated successfully!');
      setShowEditApartmentModal(false);
      fetchData();
    } catch (error) {
      console.error('Error updating apartment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error updating apartment. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#16a34a';
      case 'occupied':
        return '#dc2626';
      case 'maintenance':
        return '#f59e0b';
      default:
        return '#94a3b8';
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading apartment details..." fullScreen />;
  }

  if (!apartment) {
    return <div className="error">Apartment not found</div>;
  }

  return (
    <div className="apartment-detail-page">
      {/* Compact Header */}
      <div className="apartment-header-compact">
        <button className="btn-back-compact" onClick={() => navigate('/apartments')}>
          ←
        </button>
        <div className="apartment-info-compact">
          <div>
            <h1>{apartment.name}</h1>
            <p className="apartment-address-compact">{apartment.address}</p>
          </div>
        </div>
        <div className="header-actions-compact">
          <button className="btn-edit-compact" onClick={handleEditApartment}>
            Edit
          </button>
          <button className="btn-add-compact" onClick={() => { resetHouseForm(); setShowHouseModal(true); }}>
            + Add Unit
          </button>
        </div>
      </div>

      {/* Compact Stats Bar */}
      <div className="stats-bar-compact">
        <div className="stat-compact">
          <span className="stat-label-compact">Total</span>
          <span className="stat-value-compact">{apartment.totalHouses || houses.length}</span>
        </div>
        <div className="stat-compact">
          <span className="stat-label-compact">Occupied</span>
          <span className="stat-value-compact occupied">{houses.filter((h) => h.status === 'occupied').length}</span>
        </div>
        <div className="stat-compact">
          <span className="stat-label-compact">Available</span>
          <span className="stat-value-compact available">{houses.filter((h) => h.status === 'available').length}</span>
        </div>
        <div className="stat-compact">
          <span className="stat-label-compact">Maintenance</span>
          <span className="stat-value-compact maintenance">{houses.filter((h) => h.status === 'maintenance').length}</span>
        </div>
      </div>

      {/* Units Section */}
      <div className="units-section">
        <div className="section-header-compact">
          <h2>Units ({houses.length})</h2>
        </div>
        <div className="units-grid">
          {houses
            .sort((a, b) => a.houseNumber.localeCompare(b.houseNumber))
            .map((house) => (
              <div key={house._id} className="unit-card">
                <div className="unit-header-compact">
                  <div className="unit-number-compact">Unit {house.houseNumber}</div>
                  <span className="status-badge-compact" style={{ backgroundColor: getStatusColor(house.status) }}>
                    {house.status}
                  </span>
                </div>
                <div className="unit-details-compact">
                  <div className="unit-detail-row">
                    <span className="detail-label-compact">Rent</span>
                    <span className="detail-value-compact">KSh {house.rentAmount.toLocaleString()}/mo</span>
                  </div>
                  {house.tenant && (
                    <div className="unit-detail-row">
                      <span className="detail-label-compact">Tenant</span>
                      <span className="detail-value-compact tenant-name">{house.tenant.firstName} {house.tenant.lastName}</span>
                    </div>
                  )}
                </div>
                <div className="unit-actions-compact">
                  <button className="btn-action-small" onClick={() => handleEditHouse(house)}>
                    Edit
                  </button>
                  {house.tenant ? (
                    <button className="btn-action-small btn-remove-small" onClick={() => handleRemoveTenant(house._id)}>
                      Remove
                    </button>
                  ) : (
                    <button className="btn-action-small btn-assign-small" onClick={async () => {
                      setSelectedHouse(house);
                      await fetchTenants();
                      setShowAssignModal(true);
                    }}>
                      Assign
                    </button>
                  )}
                  <button className="btn-action-small btn-delete-small" onClick={() => handleDeleteHouse(house._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Modals */}
      {showHouseModal && (
        <div className="modal-overlay" onClick={() => { setShowHouseModal(false); resetHouseForm(); }}>
          <div className="modal-content-compact" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedHouse ? 'Edit Unit' : 'Add Unit'}</h2>
            <form onSubmit={handleHouseSubmit}>
              <div className="form-group">
                <label>Unit Number</label>
                <input
                  type="text"
                  value={houseFormData.houseNumber}
                  onChange={(e) => setHouseFormData({ ...houseFormData, houseNumber: e.target.value })}
                  required
                  placeholder="e.g., 101, 102"
                />
              </div>
              <div className="form-group">
                <label>Rent Amount (KSh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={houseFormData.rentAmount}
                  onChange={(e) => setHouseFormData({ ...houseFormData, rentAmount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={houseFormData.status}
                  onChange={(e) => setHouseFormData({ ...houseFormData, status: e.target.value })}
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={houseFormData.description}
                  onChange={(e) => setHouseFormData({ ...houseFormData, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Amenities (comma-separated)</label>
                <input
                  type="text"
                  value={houseFormData.amenities}
                  onChange={(e) => setHouseFormData({ ...houseFormData, amenities: e.target.value })}
                  placeholder="Parking, AC, Balcony"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" className="btn-secondary" onClick={() => { setShowHouseModal(false); resetHouseForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && selectedHouse && (
        <div className="modal-overlay" onClick={() => { setShowAssignModal(false); setSelectedHouse(null); }}>
          <div className="modal-content-compact" onClick={(e) => e.stopPropagation()}>
            <h2>Assign Tenant to Unit {selectedHouse.houseNumber}</h2>
            {tenants.length === 0 ? (
              <div>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No available tenants. Please create a tenant first.
                </p>
                <button className="btn-primary" onClick={() => { setShowAssignModal(false); setSelectedHouse(null); navigate('/tenants'); }}>
                  Go to Tenants
                </button>
              </div>
            ) : (
              <div className="tenant-list-compact">
                {tenants.map((tenant) => (
                  <div key={tenant._id} className="tenant-item-compact" onClick={() => handleAssignTenant(selectedHouse._id, tenant._id)}>
                    <div className="tenant-name-compact">{tenant.firstName} {tenant.lastName}</div>
                    <div className="tenant-contact-compact">{tenant.email} • {tenant.phone}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => { setShowAssignModal(false); setSelectedHouse(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditApartmentModal && (
        <div className="modal-overlay" onClick={() => setShowEditApartmentModal(false)}>
          <div className="modal-content-compact" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Apartment</h2>
            <form onSubmit={handleUpdateApartment}>
              <div className="form-group">
                <label>Apartment Name *</label>
                <input
                  type="text"
                  value={apartmentFormData.name}
                  onChange={(e) => setApartmentFormData({ ...apartmentFormData, name: e.target.value })}
                  required
                  placeholder="e.g., Sunset Apartments"
                />
              </div>
              <div className="form-group">
                <label>Address *</label>
                <input
                  type="text"
                  value={apartmentFormData.address}
                  onChange={(e) => setApartmentFormData({ ...apartmentFormData, address: e.target.value })}
                  required
                  placeholder="e.g., 123 Main Street, City"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={apartmentFormData.description}
                  onChange={(e) => setApartmentFormData({ ...apartmentFormData, description: e.target.value })}
                  rows="4"
                  placeholder="Apartment description and features..."
                />
              </div>
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>Manager Information</h3>
                <div className="form-group">
                  <label>Manager Name</label>
                  <input
                    type="text"
                    value={apartmentFormData.manager?.name || ''}
                    onChange={(e) => setApartmentFormData({
                      ...apartmentFormData,
                      manager: { ...apartmentFormData.manager, name: e.target.value }
                    })}
                    placeholder="Manager full name"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={apartmentFormData.manager?.phone || ''}
                      onChange={(e) => setApartmentFormData({
                        ...apartmentFormData,
                        manager: { ...apartmentFormData.manager, phone: e.target.value }
                      })}
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={apartmentFormData.manager?.email || ''}
                      onChange={(e) => setApartmentFormData({
                        ...apartmentFormData,
                        manager: { ...apartmentFormData.manager, email: e.target.value }
                      })}
                      placeholder="manager@example.com"
                    />
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Save Changes</button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditApartmentModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setHouseToDelete(null); }}
        onConfirm={confirmDeleteHouse}
        title="Delete Unit"
        message="Are you sure you want to delete this unit? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmModal
        isOpen={showRemoveConfirm}
        onClose={() => { setShowRemoveConfirm(false); setHouseToRemove(null); }}
        onConfirm={confirmRemoveTenant}
        title="Remove Tenant"
        message="Are you sure you want to remove the tenant from this unit?"
        confirmText="Remove"
        cancelText="Cancel"
        type="warning"
      />

      {submitting && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default ApartmentDetail;
