import { useEffect, useState } from 'react';
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
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { apartmentsAPI, housesAPI, tenantsAPI, paymentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import RevenueChart from '../components/charts/RevenueChart';
import OccupancyChart from '../components/charts/OccupancyChart';
import PaymentHistoryChart from '../components/charts/PaymentHistoryChart';
import './Dashboard.css';

const StatCard = ({ title, value, icon: Icon, color, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="card-premium dashboard-stat-card"
  >
    <div className="stat-card-header">
      <div className="stat-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
        <Icon size={24} />
      </div>
      <div className="stat-trend">
        <ArrowUpRight size={16} />
        <span>+12%</span>
      </div>
    </div>
    <div className="stat-card-body">
      <h3 className="stat-title">{title}</h3>
      <div className="stat-value-container">
        <span className="stat-value">{value}</span>
      </div>
    </div>
    <div className="stat-card-footer">
      <div className="progress-bar-bg">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '70%' }}
          transition={{ duration: 1, delay: 0.5 }}
          className="progress-bar-fill"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const toast = useToast();
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [apartmentsRes, housesRes, tenantsRes, paymentsRes, revenueRes, paymentStatusRes, occupancyRes] = await Promise.all([
        apartmentsAPI.getAll(),
        housesAPI.getAll(),
        tenantsAPI.getAll(),
        paymentsAPI.getAll(),
        paymentsAPI.getRevenueTrend(6),
        paymentsAPI.getPaymentStatus(6),
        housesAPI.getOccupancyAnalytics(),
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
      setLoading(false);
    } catch (error) {
      toast.error('Error loading dashboard data');
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Initializing Dashboard..." fullScreen />;

  const statItems = [
    { title: 'Apartments', value: stats.totalApartments, icon: Building2, color: '#6366f1' },
    { title: 'Total Units', value: stats.totalHouses, icon: Home, color: '#10b981' },
    { title: 'Occupied', value: stats.occupiedHouses, icon: CheckCircle2, color: '#8b5cf6' },
    { title: 'Available', value: stats.availableHouses, icon: PlusCircle, color: '#3b82f6' },
    { title: 'Maintenance', value: stats.maintenanceHouses, icon: Wrench, color: '#f59e0b' },
    { title: 'Active Tenants', value: stats.totalTenants, icon: Users, color: '#ec4899' },
    { title: 'Revenue (KES)', value: stats.monthlyRevenue.toLocaleString(), icon: Banknote, color: '#10b981' },
    { title: 'Total Invoices', value: stats.totalPayments, icon: BarChart3, color: '#6366f1' },
  ];

  return (
    <div className="dashboard-modern-container">
      <header className="dashboard-header-premium">
        <div>
          <h1 className="greeting-text">Welcome back, Admin</h1>
          <p className="welcome-subtext">Here's what's happening with your properties today.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">Download Report</button>
          <button className="btn-primary">Generate Rent</button>
        </div>
      </header>

      <div className="stats-grid-modern">
        {statItems.map((item, index) => (
          <StatCard key={index} {...item} index={index} />
        ))}
      </div>

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

