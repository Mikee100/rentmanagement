import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Home,
  CheckCircle2,
  PlusCircle,
  Wrench,
  Users,
  Banknote,
  BarChart3,
  TrendingUp,
  Clock,
  ArrowRight,
  ReceiptText,
  FileText,
  UserPlus,
  Building
} from 'lucide-react';
import { apartmentsAPI, housesAPI, tenantsAPI, paymentsAPI, maintenanceAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import RevenueChart from '../components/charts/RevenueChart';
import OccupancyChart from '../components/charts/OccupancyChart';
import PaymentHistoryChart from '../components/charts/PaymentHistoryChart';
import './Dashboard.css';

const StatCard = ({ title, value, icon: Icon, color, index, subtitle, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className={`card-premium dashboard-stat-card ${onClick ? 'is-clickable' : ''}`}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={(e) => {
      if (!onClick) return;
      if (e.key === 'Enter' || e.key === ' ') onClick();
    }}
  >
    <div className="stat-card-header">
      <div className="stat-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
        <Icon size={24} />
      </div>
      {onClick && (
        <div className="stat-action-hint" aria-hidden="true">
          <ArrowRight size={16} />
        </div>
      )}
    </div>
    <div className="stat-card-body">
      <h3 className="stat-title">{title}</h3>
      <div className="stat-value-container">
        <span className="stat-value">{value}</span>
      </div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  </motion.div>
);

const Dashboard = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalApartments: 0,
    totalHouses: 0,
    occupiedHouses: 0,
    availableHouses: 0,
    maintenanceHouses: 0,
    totalTenants: 0,
    totalPayments: 0,
    monthlyRevenue: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [paymentStatusData, setPaymentStatusData] = useState([]);
  const [occupancyData, setOccupancyData] = useState({ occupied: 0, available: 0, maintenance: 0 });
  const [recentPayments, setRecentPayments] = useState([]);
  const [openMaintenance, setOpenMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        apartmentsRes,
        housesRes,
        tenantsRes,
        paymentsRes,
        revenueRes,
        paymentStatusRes,
        occupancyRes,
        maintenanceRes,
      ] = await Promise.all([
        apartmentsAPI.getAll(),
        housesAPI.getAll(),
        tenantsAPI.getAll(),
        paymentsAPI.getAll(),
        paymentsAPI.getRevenueTrend(6),
        paymentsAPI.getPaymentStatus(6),
        housesAPI.getOccupancyAnalytics(),
        maintenanceAPI.getAll({}),
      ]);

      const houses = housesRes.data;
      const payments = paymentsRes.data;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = payments
        .filter(p => p.year === currentYear && p.month === String(currentMonth + 1).padStart(2, '0') && p.status === 'paid')
        .reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);

      setStats({
        totalApartments: apartmentsRes.data.length,
        totalHouses: houses.length,
        occupiedHouses: houses.filter((h) => h.status === 'occupied').length,
        availableHouses: houses.filter((h) => h.status === 'available').length,
        maintenanceHouses: houses.filter((h) => h.status === 'maintenance').length,
        totalTenants: tenantsRes.data.filter((t) => t.status === 'active').length,
        totalPayments: payments.length,
        monthlyRevenue,
      });

      setRevenueData(revenueRes.data);
      setPaymentStatusData(paymentStatusRes.data);
      setOccupancyData(occupancyRes.data);
      setRecentPayments(
        [...payments]
          .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0))
          .slice(0, 6)
      );
      setOpenMaintenance(
        [...(maintenanceRes.data || [])]
          .filter((r) => r.status !== 'completed' && r.status !== 'cancelled')
          .sort((a, b) => new Date(b.requestedDate || 0) - new Date(a.requestedDate || 0))
          .slice(0, 6)
      );
      setLoading(false);
    } catch (error) {
      toast.error('Error loading dashboard data');
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Initializing Dashboard..." fullScreen />;

  const totalUnits = stats.totalHouses || 0;
  const occupancyRate = totalUnits > 0 ? Math.round((stats.occupiedHouses / totalUnits) * 100) : 0;
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  const statItems = [
    { title: 'Apartments', value: stats.totalApartments, icon: Building2, color: '#6366f1', subtitle: 'Buildings under management', onClick: () => navigate('/apartments') },
    { title: 'Total Houses', value: stats.totalHouses, icon: Home, color: '#10b981', subtitle: `Occupancy ${occupancyRate}%`, onClick: () => navigate('/apartments') },
    { title: 'Occupied', value: stats.occupiedHouses, icon: CheckCircle2, color: '#8b5cf6', subtitle: 'Units with active tenants' },
    { title: 'Available', value: stats.availableHouses, icon: PlusCircle, color: '#3b82f6', subtitle: 'Ready to assign', onClick: () => navigate('/assign-tenant') },
    { title: 'Maintenance', value: stats.maintenanceHouses, icon: Wrench, color: '#f59e0b', subtitle: 'Units needing attention', onClick: () => navigate('/maintenance') },
    { title: 'Active Tenants', value: stats.totalTenants, icon: Users, color: '#ec4899', subtitle: 'Currently renting', onClick: () => navigate('/tenants') },
    { title: 'Revenue (KES)', value: (stats.monthlyRevenue || 0).toLocaleString(), icon: Banknote, color: '#10b981', subtitle: 'Paid this month', onClick: () => navigate('/payments') },
    { title: 'Total Invoices', value: stats.totalPayments, icon: BarChart3, color: '#6366f1', subtitle: 'All payment records', onClick: () => navigate('/payments') },
  ];

  return (
    <div className="dashboard-modern-container">
      <header className="dashboard-header-premium">
        <div>
          <h1 className="greeting-text">Welcome back, Admin</h1>
          <p className="welcome-subtext">Here's what's happening with your properties today.</p>
          <div className="dashboard-meta">
            <Clock size={16} />
            <span>{todayLabel}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/reports')}>
            <FileText size={16} style={{ marginRight: 8 }} />
            Reports
          </button>
          <button className="btn-primary" onClick={() => navigate('/payments')}>
            <ReceiptText size={16} style={{ marginRight: 8 }} />
            Payments
          </button>
        </div>
      </header>

      <div className="stats-grid-modern">
        {statItems.map((item, index) => (
          <StatCard key={index} {...item} index={index} />
        ))}
      </div>

      <section className="dashboard-lower-grid">
        <div className="card-premium dashboard-quick-actions">
          <div className="section-header">
            <h3 className="section-title">Quick actions</h3>
            <span className="section-subtitle">Jump straight to common tasks</span>
          </div>
          <div className="quick-actions-grid">
            <button className="quick-action" onClick={() => navigate('/payments')}>
              <div className="qa-icon" style={{ color: 'var(--success)', background: 'rgba(16,185,129,0.12)' }}>
                <ReceiptText size={18} />
              </div>
              <div className="qa-text">
                <div className="qa-title">Record payment</div>
                <div className="qa-subtitle">Receive or add rent payment</div>
              </div>
              <ArrowRight size={16} className="qa-arrow" />
            </button>

            <button className="quick-action" onClick={() => navigate('/maintenance')}>
              <div className="qa-icon" style={{ color: 'var(--warning)', background: 'rgba(245,158,11,0.12)' }}>
                <Wrench size={18} />
              </div>
              <div className="qa-text">
                <div className="qa-title">Create maintenance</div>
                <div className="qa-subtitle">Log a new request</div>
              </div>
              <ArrowRight size={16} className="qa-arrow" />
            </button>

            <button className="quick-action" onClick={() => navigate('/tenants')}>
              <div className="qa-icon" style={{ color: 'var(--secondary)', background: 'rgba(236,72,153,0.12)' }}>
                <UserPlus size={18} />
              </div>
              <div className="qa-text">
                <div className="qa-title">Manage tenants</div>
                <div className="qa-subtitle">Add, view, or update tenants</div>
              </div>
              <ArrowRight size={16} className="qa-arrow" />
            </button>

            <button className="quick-action" onClick={() => navigate('/apartments')}>
              <div className="qa-icon" style={{ color: 'var(--primary)', background: 'rgba(99,102,241,0.12)' }}>
                <Building size={18} />
              </div>
              <div className="qa-text">
                <div className="qa-title">Manage apartments</div>
                <div className="qa-subtitle">Buildings & units overview</div>
              </div>
              <ArrowRight size={16} className="qa-arrow" />
            </button>
          </div>
        </div>

        <div className="card-premium dashboard-recent">
          <div className="section-header">
            <h3 className="section-title">Recent</h3>
            <span className="section-subtitle">Latest payments and open maintenance</span>
          </div>

          <div className="recent-columns">
            <div className="recent-column">
              <div className="recent-column-header">
                <h4>Payments</h4>
                <button className="link-btn" onClick={() => navigate('/payments')}>View all</button>
              </div>
              <div className="recent-list">
                {recentPayments.length === 0 ? (
                  <div className="empty-state">No payments found.</div>
                ) : (
                  recentPayments.map((p) => (
                    <button key={p._id} className="recent-item" onClick={() => navigate('/payments')}>
                      <div className="recent-main">
                        <div className="recent-title">
                          {(p.tenant?.firstName || 'Tenant')} {(p.tenant?.lastName || '')}
                        </div>
                        <div className="recent-subtitle">
                          {p.house?.houseNumber ? `House ${p.house.houseNumber}` : 'House'}
                          {p.paymentDate ? ` • ${new Date(p.paymentDate).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <div className="recent-meta">
                        <div className={`pill pill-${p.status}`}>{p.status}</div>
                        <div className="recent-amount">KSh {(p.paidAmount || p.amount || 0).toLocaleString()}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="recent-column">
              <div className="recent-column-header">
                <h4>Maintenance</h4>
                <button className="link-btn" onClick={() => navigate('/maintenance')}>View all</button>
              </div>
              <div className="recent-list">
                {openMaintenance.length === 0 ? (
                  <div className="empty-state">No open maintenance requests.</div>
                ) : (
                  openMaintenance.map((r) => (
                    <button key={r._id} className="recent-item" onClick={() => navigate('/maintenance')}>
                      <div className="recent-main">
                        <div className="recent-title">{r.title || 'Maintenance request'}</div>
                        <div className="recent-subtitle">
                          {r.house?.houseNumber ? `House ${r.house.houseNumber}` : 'House'}
                          {r.requestedDate ? ` • ${new Date(r.requestedDate).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <div className="recent-meta">
                        <div className={`pill pill-${r.status}`}>{String(r.status || '').replace('_', ' ')}</div>
                        <div className={`pill pill-priority-${r.priority}`}>{r.priority}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="charts-section-modern">
        <div className="chart-card-premium glass">
          <div className="chart-header">
            <h3 className="chart-title">Revenue Forecast</h3>
            <TrendingUp size={20} className="chart-icon" />
          </div>
          <RevenueChart data={revenueData} />
        </div>
        <div className="chart-card-premium glass">
          <div className="chart-header">
            <h3 className="chart-title">Occupancy Split</h3>
            <Users size={20} className="chart-icon" />
          </div>
          <OccupancyChart
            occupied={occupancyData.occupied}
            available={occupancyData.available}
            maintenance={occupancyData.maintenance}
          />
        </div>
        <div className="chart-card-premium glass full-width">
          <div className="chart-header">
            <h3 className="chart-title">Payment Collections</h3>
            <Banknote size={20} className="chart-icon" />
          </div>
          <PaymentHistoryChart data={paymentStatusData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

