import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, Users, Home, Settings,
  TrendingUp, CreditCard, AlertCircle, Plus,
  ChevronLeft, Edit3, Trash2, UserMinus,
  UserPlus, Info, Wrench, Receipt, DollarSign
} from 'lucide-react';
import { apartmentsAPI, housesAPI, tenantsAPI, paymentsAPI, maintenanceAPI, expensesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import OccupancyChart from '../components/charts/OccupancyChart';
import './ApartmentDetail.css';

const StatCard = ({ icon: Icon, label, value, subtitle, trend, colorClass }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`premium-stat-card ${colorClass}`}
  >
    <div className="stat-card-header">
      <div className="stat-icon-wrapper">
        <Icon size={20} />
      </div>
      {trend && (
        <span className={`stat-trend ${trend > 0 ? 'up' : 'down'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="stat-card-body">
      <span className="stat-label">{label}</span>
      <h3 className="stat-value">{value}</h3>
      <p className="stat-subtitle">{subtitle}</p>
    </div>
  </motion.div>
);

const ApartmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [apartment, setApartment] = useState(null);
  const [houses, setHouses] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unitFilter, setUnitFilter] = useState('all');
  const [unitSearch, setUnitSearch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showHouseModal, setShowHouseModal] = useState(false);
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
      const [apartmentRes, housesRes, tenantsRes, paymentsRes, maintenanceRes, expensesRes] = await Promise.all([
        apartmentsAPI.getById(id),
        housesAPI.getByApartment(id),
        tenantsAPI.getAll(),
        paymentsAPI.getByApartment(id).catch(() => ({ data: [] })),
        maintenanceAPI.getAll({ apartment: id }).catch(() => ({ data: [] })),
        expensesAPI.getByApartment(id).catch(() => ({ data: [] })),
      ]);
      setApartment(apartmentRes.data.apartment);
      setHouses(housesRes.data);
      setTenants(tenantsRes.data.filter((t) => {
        const status = (t.status || '').toLowerCase();
        return status === 'active';
      }));
      setPayments(paymentsRes.data || []);
      setMaintenanceRequests(maintenanceRes.data || []);
      setExpenses(expensesRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
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

  // Calculate financial metrics
  const calculateFinancials = () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const monthlyPayments = payments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      return paymentDate.getMonth() + 1 === currentMonth && paymentDate.getFullYear() === currentYear;
    });

    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);
    const outstandingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue' || p.status === 'partial');
    const outstandingAmount = outstandingPayments.reduce((sum, p) => sum + (p.deficit || p.expectedAmount - (p.paidAmount || 0)), 0);

    const totalExpected = houses.filter(h => h.status === 'occupied').reduce((sum, h) => sum + h.rentAmount, 0);
    const collectionRate = totalExpected > 0 ? ((monthlyRevenue / totalExpected) * 100).toFixed(1) : 0;

    const avgRent = houses.length > 0 ? houses.reduce((sum, h) => sum + h.rentAmount, 0) / houses.length : 0;

    const ytdPayments = payments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      return paymentDate.getFullYear() === currentYear;
    });
    const ytdRevenue = ytdPayments.reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);

    const lateFees = monthlyPayments.reduce((sum, p) => sum + (p.lateFee || 0), 0);

    return {
      monthlyRevenue,
      outstandingAmount,
      collectionRate,
      avgRent,
      ytdRevenue,
      lateFees
    };
  };

  const financials = useMemo(() => calculateFinancials(), [payments, houses]);

  // Filter units logic
  const filteredHouses = useMemo(() => {
    return houses.filter(house => {
      const matchesFilter = unitFilter === 'all' || house.status === unitFilter;
      const matchesSearch = !unitSearch ||
        house.houseNumber.toLowerCase().includes(unitSearch.toLowerCase()) ||
        (house.tenant && `${house.tenant.firstName} ${house.tenant.lastName}`.toLowerCase().includes(unitSearch.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [houses, unitFilter, unitSearch]);
  const occupiedCount = houses.filter(h => h.status === 'occupied').length;
  const availableCount = houses.filter(h => h.status === 'available').length;
  const maintenanceCount = houses.filter(h => h.status === 'maintenance').length;
  const recentPayments = payments.slice(0, 8);
  const activeMaintenance = maintenanceRequests.filter(m => m.status !== 'completed' && m.status !== 'cancelled').slice(0, 5);

  if (loading) return <LoadingSpinner text="Loading apartment details..." fullScreen />;
  if (!apartment) return <div className="error-container">Apartment not found</div>;

  return (
    <div className="apartment-premium-view">
      {/* Hero Section */}
      <header className="apartment-hero">
        <div className="hero-top-nav">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="back-btn-minimal"
            onClick={() => navigate('/apartments')}
          >
            <ChevronLeft size={20} /> Back to Buildings
          </motion.button>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hero-actions"
          >
            <button className="action-btn-glass" onClick={handleEditApartment}>
              <Edit3 size={16} /> Edit Building
            </button>
            <button className="action-btn-primary" onClick={() => { resetHouseForm(); setShowHouseModal(true); }}>
              <Plus size={16} /> Add Unit
            </button>
          </motion.div>
        </div>

        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="building-identity"
          >
            <div className="building-logo">
              <Building2 size={32} color="white" />
            </div>
            <div className="building-text">
              <h1 className="building-name">{apartment.name}</h1>
              <p className="building-address">
                <MapPin size={14} /> {apartment.address}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="building-quick-stats"
          >
            <div className="quick-stat-item">
              <span className="qs-label">Occupancy</span>
              <span className="qs-value">{houses.length > 0 ? Math.round((occupiedCount / houses.length) * 100) : 0}%</span>
            </div>
            <div className="divider-v" />
            <div className="quick-stat-item">
              <span className="qs-label">Units</span>
              <span className="qs-value">{houses.length}</span>
            </div>
            <div className="divider-v" />
            <div className="quick-stat-item">
              <span className="qs-label">Manager</span>
              <span className="qs-value">{apartment.manager?.name || 'Not Assigned'}</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="apartment-main-grid">
        {/* Navigation Tabs */}
        <nav className="apartment-nav-pills">
          {[
            { id: 'overview', label: 'Dashboard', icon: TrendingUp },
            { id: 'units', label: `Units (${houses.length})`, icon: Home },
            { id: 'payments', label: 'Financials', icon: CreditCard },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
          ].map(tab => (
            <button
              key={tab.id}
              className={`nav-pill ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="tab-content-wrapper"
          >
            {activeTab === 'overview' && (
              <div className="overview-tab-grid">
                {/* Building Analytics Widgets */}
                <div className="analytics-widgets">
                  <StatCard
                    icon={DollarSign}
                    label="Monthly Revenue"
                    value={`KSh ${financials.monthlyRevenue.toLocaleString()}`}
                    subtitle="Collected this month"
                    colorClass="indigo"
                  />
                  <StatCard
                    icon={AlertCircle}
                    label="Outstanding"
                    value={`KSh ${financials.outstandingAmount.toLocaleString()}`}
                    subtitle="Pending collections"
                    colorClass="rose"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Collection Rate"
                    value={`${financials.collectionRate}%`}
                    subtitle="Target: 95%"
                    trend={2.4}
                    colorClass="emerald"
                  />
                  <StatCard
                    icon={Receipt}
                    label="Avg Rent/Unit"
                    value={`KSh ${Math.round(financials.avgRent).toLocaleString()}`}
                    subtitle="Current average"
                    colorClass="amber"
                  />
                </div>

                <div className="middle-layout">
                  <div className="chart-wrapper-premium card-premium">
                    <div className="card-header-minimal">
                      <h3>Occupancy Status</h3>
                    </div>
                    <OccupancyChart
                      occupied={occupiedCount}
                      available={availableCount}
                      maintenance={maintenanceCount}
                    />
                  </div>

                  <div className="recent-activity card-premium">
                    <div className="card-header-minimal">
                      <h3>Recent Payments</h3>
                      <button className="text-btn" onClick={() => setActiveTab('payments')}>View All</button>
                    </div>
                    <div className="activity-list">
                      {recentPayments.map(p => (
                        <div key={p._id} className="activity-item">
                          <div className={`activity-icon-sm ${p.status}`}>
                            <CreditCard size={14} />
                          </div>
                          <div className="activity-info">
                            <span className="activity-title">{p.tenant?.firstName} {p.tenant?.lastName}</span>
                            <span className="activity-sub">Unit {p.house?.houseNumber} • {new Date(p.paymentDate).toLocaleDateString()}</span>
                          </div>
                          <div className="activity-amount">
                            +KSh {p.amount?.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'units' && (
              <div className="units-tab-view">
                <div className="units-toolbar">
                  <div className="search-group">
                    <Home size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search units, tenants..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                    />
                  </div>
                  <div className="filter-group">
                    {['all', 'available', 'occupied', 'maintenance'].map(status => (
                      <button
                        key={status}
                        className={`filter-btn ${unitFilter === status ? 'active' : ''}`}
                        onClick={() => setUnitFilter(status)}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="units-premium-grid">
                  {filteredHouses.sort((a, b) => a.houseNumber.localeCompare(b.houseNumber)).map(house => {
                    const housePayments = payments.filter(p => p.house?._id === house._id || p.house === house._id);
                    const outstanding = housePayments
                      .filter(p => ['pending', 'overdue', 'partial'].includes(p.status))
                      .reduce((sum, p) => sum + (p.deficit || 0), 0);

                    return (
                      <motion.div
                        layout
                        key={house._id}
                        className={`unit-premium-card ${house.status}`}
                      >
                        <div className="unit-card-main">
                          <div className="unit-card-head">
                            <span className="unit-badge">Unit {house.houseNumber}</span>
                            <div className={`status-dot ${house.status}`} />
                          </div>

                          <div className="unit-occupant">
                            {house.tenant ? (
                              <div className="occupant-info">
                                <div className="occupant-avatar">
                                  {house.tenant.firstName[0]}{house.tenant.lastName[0]}
                                </div>
                                <div className="occupant-text">
                                  <span className="occ-name">{house.tenant.firstName} {house.tenant.lastName}</span>
                                  <span className="occ-sub">Active Tenant</span>
                                </div>
                              </div>
                            ) : (
                              <div className="occupant-empty">
                                <Users size={20} />
                                <span>No active tenant</span>
                              </div>
                            )}
                          </div>

                          <div className="unit-metrics">
                            <div className="u-metric">
                              <span className="um-label">Rent</span>
                              <span className="um-value">KSh {house.rentAmount.toLocaleString()}</span>
                            </div>
                            {outstanding > 0 && (
                              <div className="u-metric danger">
                                <span className="um-label">Arrears</span>
                                <span className="um-value">KSh {outstanding.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="unit-card-actions">
                          <button className="u-action" onClick={() => handleEditHouse(house)} title="Settings">
                            <Settings size={16} />
                          </button>
                          {house.tenant ? (
                            <button className="u-action danger" onClick={() => handleRemoveTenant(house._id)} title="Evict/Remove">
                              <UserMinus size={16} />
                            </button>
                          ) : (
                            <button className="u-action success" onClick={() => navigate(`/assign-tenant/${house._id}?apartment=${id}`)} title="Assign">
                              <UserPlus size={16} />
                            </button>
                          )}
                          <button className="u-action info" onClick={() => navigate(`/units/${house._id}`)} title="History">
                            <Info size={16} />
                          </button>
                          <button className="u-action danger" onClick={() => handleDeleteHouse(house._id)} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="payments-tab-view card-premium">
                <div className="payments-table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Tenant</th>
                        <th>Unit</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 20).map(p => (
                        <tr key={p._id}>
                          <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                          <td>
                            <div className="table-tenant-cell">
                              <div className="mini-avatar">{p.tenant?.firstName?.[0]}</div>
                              {p.tenant?.firstName} {p.tenant?.lastName}
                            </div>
                          </td>
                          <td><span className="unit-tag">{p.house?.houseNumber}</span></td>
                          <td><span className="amount-cell">KSh {p.amount?.toLocaleString()}</span></td>
                          <td><span className={`badge-status ${p.status}`}>{p.status}</span></td>
                          <td>{p.paymentMethod || 'MPesa'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="maintenance-tab-view">
                <div className="maintenance-grid">
                  {maintenanceRequests.map(m => (
                    <div key={m._id} className="maintenance-card-premium card-premium">
                      <div className="m-card-header">
                        <div className={`m-priority-indicator ${m.priority}`} />
                        <span className="m-category">{m.category}</span>
                        <span className={`m-status-badge ${m.status}`}>{m.status}</span>
                      </div>
                      <h4 className="m-title">{m.title}</h4>
                      <p className="m-desc">{m.description}</p>
                      <div className="m-footer">
                        <span className="m-unit"><Home size={12} /> Unit {m.house?.houseNumber}</span>
                        <span className="m-date">{new Date(m.requestedDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      {showHouseModal && (
        <div className="modal-overlay" onClick={() => { setShowHouseModal(false); resetHouseForm(); }}>
          <div className="modal-premium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h2>{selectedHouse ? 'Edit Unit' : 'Add Unit'}</h2>
              <button className="btn-close-sm" onClick={() => { setShowHouseModal(false); resetHouseForm(); }}>×</button>
            </div>
            <form onSubmit={handleHouseSubmit}>
              <div className="modal-premium-body">
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>Unit Number</label>
                    <input
                      type="text"
                      value={houseFormData.houseNumber}
                      onChange={(e) => setHouseFormData({ ...houseFormData, houseNumber: e.target.value })}
                      required
                      placeholder="e.g., 101, 102"
                    />
                  </div>
                  <div className="form-group-premium">
                    <label>Rent Amount (KSh)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={houseFormData.rentAmount}
                      onChange={(e) => setHouseFormData({ ...houseFormData, rentAmount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group-premium">
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
                <div className="form-group-premium">
                  <label>Description</label>
                  <textarea
                    value={houseFormData.description}
                    onChange={(e) => setHouseFormData({ ...houseFormData, description: e.target.value })}
                    rows="3"
                    placeholder="Brief description of the unit..."
                  />
                </div>
                <div className="form-group-premium">
                  <label>Amenities (comma-separated)</label>
                  <input
                    type="text"
                    value={houseFormData.amenities}
                    onChange={(e) => setHouseFormData({ ...houseFormData, amenities: e.target.value })}
                    placeholder="Parking, AC, Balcony"
                  />
                </div>
              </div>
              <div className="modal-premium-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowHouseModal(false); resetHouseForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditApartmentModal && (
        <div className="modal-overlay" onClick={() => setShowEditApartmentModal(false)}>
          <div className="modal-premium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-premium-header">
              <h2>Edit Apartment</h2>
              <button className="btn-close-sm" onClick={() => setShowEditApartmentModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateApartment}>
              <div className="modal-premium-body">
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>Apartment Name *</label>
                    <input
                      type="text"
                      value={apartmentFormData.name}
                      onChange={(e) => setApartmentFormData({ ...apartmentFormData, name: e.target.value })}
                      required
                      placeholder="e.g., Sunset Apartments"
                    />
                  </div>
                  <div className="form-group-premium">
                    <label>Address *</label>
                    <input
                      type="text"
                      value={apartmentFormData.address}
                      onChange={(e) => setApartmentFormData({ ...apartmentFormData, address: e.target.value })}
                      required
                      placeholder="e.g., 123 Main Street, City"
                    />
                  </div>
                </div>
                <div className="form-group-premium">
                  <label>Description</label>
                  <textarea
                    value={apartmentFormData.description}
                    onChange={(e) => setApartmentFormData({ ...apartmentFormData, description: e.target.value })}
                    rows="4"
                    placeholder="Apartment description and features..."
                  />
                </div>
                
                <div style={{ marginTop: '1rem', marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '1.5px solid var(--border-subtle)' }}>
                  <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: '700' }}>Manager Information</h3>
                  <div className="form-group-premium">
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
                  <div className="form-row-premium">
                    <div className="form-group-premium">
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
                    <div className="form-group-premium">
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
              </div>
              <div className="modal-premium-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditApartmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Save Changes'}
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
