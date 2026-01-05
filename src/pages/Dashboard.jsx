import { useEffect, useState } from 'react';
import { apartmentsAPI, housesAPI, tenantsAPI, paymentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import RevenueChart from '../components/charts/RevenueChart';
import OccupancyChart from '../components/charts/OccupancyChart';
import PaymentHistoryChart from '../components/charts/PaymentHistoryChart';
import './Dashboard.css';

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

      const apartments = apartmentsRes.data;
      const houses = housesRes.data;
      const tenants = tenantsRes.data;
      const payments = paymentsRes.data;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyPayments = payments.filter(
        (p) => p.year === currentYear && p.month === String(currentMonth + 1).padStart(2, '0')
      );
      const monthlyRevenue = monthlyPayments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);

      setStats({
        totalApartments: apartments.length,
        totalHouses: houses.length,
        occupiedHouses: houses.filter((h) => h.status === 'occupied').length,
        availableHouses: houses.filter((h) => h.status === 'available').length,
        maintenanceHouses: houses.filter((h) => h.status === 'maintenance').length,
        totalTenants: tenants.filter((t) => t.status === 'active').length,
        totalPayments: payments.length,
        monthlyRevenue,
      });

      setRevenueData(revenueRes.data);
      setPaymentStatusData(paymentStatusRes.data);
      setOccupancyData(occupancyRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error loading dashboard data');
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." fullScreen />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Overview of your rental management system</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'rgb(37, 99, 235)' }}>
            🏢
          </div>
          <div className="stat-content">
            <h3>Total Apartments</h3>
            <p className="stat-value">{stats.totalApartments}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(22, 163, 74, 0.1)', color: 'rgb(22, 163, 74)' }}>
            🏠
          </div>
          <div className="stat-content">
            <h3>Total Houses</h3>
            <p className="stat-value">{stats.totalHouses}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(22, 163, 74, 0.1)', color: 'rgb(22, 163, 74)' }}>
            ✅
          </div>
          <div className="stat-content">
            <h3>Occupied</h3>
            <p className="stat-value">{stats.occupiedHouses}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' }}>
            🆕
          </div>
          <div className="stat-content">
            <h3>Available</h3>
            <p className="stat-value">{stats.availableHouses}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'rgb(245, 158, 11)' }}>
            🔧
          </div>
          <div className="stat-content">
            <h3>Maintenance</h3>
            <p className="stat-value">{stats.maintenanceHouses}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'rgb(139, 92, 246)' }}>
            👥
          </div>
          <div className="stat-content">
            <h3>Active Tenants</h3>
            <p className="stat-value">{stats.totalTenants}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)' }}>
            💰
          </div>
          <div className="stat-content">
            <h3>Monthly Revenue</h3>
            <p className="stat-value">KSh {stats.monthlyRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' }}>
            📊
          </div>
          <div className="stat-content">
            <h3>Total Payments</h3>
            <p className="stat-value">{stats.totalPayments}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-card">
          <RevenueChart data={revenueData} title="Revenue Trend (Last 6 Months)" />
        </div>
        <div className="chart-card">
          <OccupancyChart
            occupied={occupancyData.occupied}
            available={occupancyData.available}
            maintenance={occupancyData.maintenance}
            title="Occupancy Status"
          />
        </div>
        <div className="chart-card chart-full-width">
          <PaymentHistoryChart data={paymentStatusData} title="Payment Status (Last 6 Months)" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
