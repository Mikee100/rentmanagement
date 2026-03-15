import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { tenantsAPI, housesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import './AssignTenant.css';

const AssignTenant = () => {
  const { houseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const apartmentId = searchParams.get('apartment');
  const toast = useToast();
  
  const [tenants, setTenants] = useState([]);
  const [house, setHouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all'); // 'all', 'unassigned', 'assigned'
  const [tenantSort, setTenantSort] = useState('name'); // 'name', 'email', 'phone'

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTenantData, setNewTenantData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    leaseStartDate: new Date().toISOString().split('T')[0],
    leaseEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, [houseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, houseRes] = await Promise.all([
        tenantsAPI.getAll(),
        houseId ? housesAPI.getById(houseId) : Promise.resolve({ data: null })
      ]);
      
      setTenants(tenantsRes.data.filter((t) => {
        const status = (t.status || '').toLowerCase();
        return status === 'active';
      }));
      
      if (houseRes.data) {
        setHouse(houseRes.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading data');
      setLoading(false);
    }
  };

  const handleAssignTenant = async (tenantId) => {
    if (!houseId) {
      toast.error('Unit ID is required');
      return;
    }
    
    setSubmitting(true);
    try {
      await housesAPI.assignTenant(houseId, tenantId);
      toast.success('Tenant assigned successfully');
      
      // Navigate back to apartment detail page if we have apartmentId
      if (apartmentId) {
        navigate(`/apartments/${apartmentId}`);
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error('Error assigning tenant:', error);
      const errorMessage = error.response?.data?.message || 'Error assigning tenant. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAddTenant = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Create the tenant
      const res = await tenantsAPI.create(newTenantData);
      const newTenant = res.data;
      
      // 2. Assign the tenant to the house
      await housesAPI.assignTenant(houseId, newTenant._id);
      
      toast.success('Tenant created and assigned successfully');
      
      if (apartmentId) {
        navigate(`/apartments/${apartmentId}`);
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error('Error in quick add tenant:', error);
      const errorMessage = error.response?.data?.message || 'Error creating and assigning tenant';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter and sort tenants
  let filteredTenants = [...tenants];
  
  // Filter by search
  if (tenantSearch) {
    const searchLower = tenantSearch.toLowerCase();
    filteredTenants = filteredTenants.filter(tenant => 
      `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchLower) ||
      tenant.email.toLowerCase().includes(searchLower) ||
      tenant.phone.includes(searchLower)
    );
  }
  
  // Filter by assignment status
  if (tenantFilter === 'unassigned') {
    filteredTenants = filteredTenants.filter(tenant => !tenant.house);
  } else if (tenantFilter === 'assigned') {
    filteredTenants = filteredTenants.filter(tenant => tenant.house);
  }
  
  // Sort tenants
  filteredTenants.sort((a, b) => {
    switch (tenantSort) {
      case 'email':
        return a.email.localeCompare(b.email);
      case 'phone':
        return a.phone.localeCompare(b.phone);
      case 'name':
      default:
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    }
  });

  if (loading) {
    return <LoadingSpinner text="Loading tenants..." fullScreen />;
  }

  return (
    <div className="assign-tenant-page">
      <div className="assign-tenant-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="header-content">
          <h1>Assign Tenant</h1>
          {house && (
            <p className="subtitle">Select or add a tenant for Unit {house.houseNumber}</p>
          )}
        </div>
        <div className="header-actions">
          <button 
            className={`btn-toggle-add ${showAddForm ? 'btn-cancel' : 'btn-primary'}`}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : '+ Add New Tenant'}
          </button>
        </div>
      </div>

      <div className="assign-tenant-content">
        {showAddForm ? (
          <div className="quick-add-tenant-section">
            <div className="card-full">
              <h2>Quick Add Tenant</h2>
              <p>Fill in the details to create and assign a new tenant to this unit.</p>
              
              <form onSubmit={handleQuickAddTenant} className="quick-add-form">
                <div className="form-row-full">
                  <div className="form-group-full">
                    <label>First Name</label>
                    <input
                      type="text"
                      required
                      value={newTenantData.firstName}
                      onChange={(e) => setNewTenantData({...newTenantData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="form-group-full">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={newTenantData.lastName}
                      onChange={(e) => setNewTenantData({...newTenantData, lastName: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-row-full">
                  <div className="form-group-full">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={newTenantData.email}
                      onChange={(e) => setNewTenantData({...newTenantData, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group-full">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={newTenantData.phone}
                      onChange={(e) => setNewTenantData({...newTenantData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-row-full">
                  <div className="form-group-full">
                    <label>Lease Start Date</label>
                    <input
                      type="date"
                      value={newTenantData.leaseStartDate}
                      onChange={(e) => setNewTenantData({...newTenantData, leaseStartDate: e.target.value})}
                    />
                  </div>
                  <div className="form-group-full">
                    <label>Lease End Date</label>
                    <input
                      type="date"
                      value={newTenantData.leaseEndDate}
                      onChange={(e) => setNewTenantData({...newTenantData, leaseEndDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-actions-full">
                  <button type="submit" className="btn-save-assign" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create and Assign Tenant'}
                  </button>
                  <button 
                    type="button" 
                    className="btn-text" 
                    onClick={() => setShowAddForm(false)}
                  >
                    Select from existing instead
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : tenants.length === 0 ? (
          <div className="empty-state-full">
            <div className="empty-icon">👥</div>
            <h2>No Tenants Available</h2>
            <p>You can add a new tenant directly or go to the tenants page.</p>
            <div className="empty-actions">
              <button className="btn-primary" onClick={() => setShowAddForm(true)}>
                Add First Tenant
              </button>
              <button className="btn-secondary" onClick={() => navigate('/tenants')}>
                Go to Tenants Page
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search and Filter Controls */}
            <div className="tenant-selector-controls-full">
              <div className="search-control-group-full">
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="tenant-search-input-full"
                  autoFocus
                />
              </div>
              <div className="filter-control-group-full">
                <select
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                  className="tenant-filter-select-full"
                >
                  <option value="all">All Tenants ({tenants.length})</option>
                  <option value="unassigned">Unassigned ({tenants.filter(t => !t.house).length})</option>
                  <option value="assigned">Already Assigned ({tenants.filter(t => t.house).length})</option>
                </select>
                <select
                  value={tenantSort}
                  onChange={(e) => setTenantSort(e.target.value)}
                  className="tenant-sort-select-full"
                >
                  <option value="name">Sort by Name</option>
                  <option value="email">Sort by Email</option>
                  <option value="phone">Sort by Phone</option>
                </select>
              </div>
            </div>
            
            {/* Results Count */}
            <div className="results-count-full">
              {filteredTenants.length === 0 ? (
                <span>No tenants found matching your search</span>
              ) : (
                <span>Showing {filteredTenants.length} of {tenants.length} tenants</span>
              )}
            </div>
            
            {/* Tenant List */}
            {filteredTenants.length > 0 && (
              <div className="tenant-list-full">
                {filteredTenants.map((tenant) => {
                  const isAssigned = !!tenant.house;
                  return (
                    <div 
                      key={tenant._id} 
                      className={`tenant-card-full ${isAssigned ? 'tenant-assigned' : 'tenant-available'}`}
                      onClick={() => {
                        if (!isAssigned) {
                          handleAssignTenant(tenant._id);
                        }
                      }}
                    >
                      <div className="tenant-card-content">
                        <div className="tenant-avatar-large">
                          {tenant.firstName.charAt(0)}{tenant.lastName.charAt(0)}
                        </div>
                        <div className="tenant-info-full">
                          <div className="tenant-name-full">
                            {tenant.firstName} {tenant.lastName}
                            {isAssigned && (
                              <span className="assigned-badge-full">Already Assigned</span>
                            )}
                          </div>
                          <div className="tenant-contact-full">
                            <span className="contact-item-full">
                              <span className="contact-icon">📧</span>
                              {tenant.email}
                            </span>
                            <span className="contact-item-full">
                              <span className="contact-icon">📞</span>
                              {tenant.phone}
                            </span>
                          </div>
                          {tenant.house && (
                            <div className="tenant-current-unit-full">
                              Currently assigned to: Unit {tenant.house?.houseNumber || 'N/A'}
                            </div>
                          )}
                        </div>
                        {!isAssigned && (
                          <button 
                            className="btn-assign-tenant-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignTenant(tenant._id);
                            }}
                            disabled={submitting}
                          >
                            Assign →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {submitting && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default AssignTenant;
