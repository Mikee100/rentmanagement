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
import RevenueChart from '../components/charts/RevenueChart';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [globalRentAmount, setGlobalRentAmount] = useState('');
  const [houseFormData, setHouseFormData] = useState({
    houseNumber: '',
    rentAmount: '',
    status: 'available',
    description: '',
    amenities: '',
  });
  const [financialsView, setFinancialsView] = useState('history');
  const [selectedHouses, setSelectedHouses] = useState([]);
  const [collectionMonth, setCollectionMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [collectionYear, setCollectionYear] = useState(new Date().getFullYear());
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [collectionReport, setCollectionReport] = useState(null);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [financialHistory, setFinancialHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchData();
    fetchHistory();
  }, [id]);

  useEffect(() => {
    fetchCollectionReport();
  }, [id, collectionMonth, collectionYear]);

  const fetchHistory = async () => {
    if (!id) return;
    setLoadingHistory(true);
    try {
      const res = await reportsAPI.getApartmentFinancialHistory(id);
      setFinancialHistory(res.data);
    } catch (error) {
      console.error('Error fetching financial history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchCollectionReport = async () => {
    if (!id) return;
    setLoadingCollection(true);
    try {
      const res = await reportsAPI.getMonthlyApartmentUnits({ 
        apartmentId: id, 
        month: collectionMonth, 
        year: collectionYear 
      });
      setCollectionReport(res.data);
    } catch (error) {
      console.error('Error fetching collection report:', error);
    } finally {
      setLoadingCollection(false);
    }
  };

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


  const handleSaveCollection = async () => {
    if (selectedHouses.length === 0) return;
    
    setBatchSubmitting(true);
    try {
      await paymentsAPI.batchMarkPaid({
        houseIds: selectedHouses,
        month: collectionMonth,
        year: parseInt(collectionYear),
        paymentMethod: 'cash'
      });
      
      toast.success(`Marked ${selectedHouses.length} houses as paid`);
      setSelectedHouses([]);
      fetchData();
    } catch (error) {
      console.error('Error saving batch collection:', error);
      toast.error(error.response?.data?.message || 'Error saving batch collection');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleExportHistory = () => {
    const doc = new jsPDF();
    const title = `Financial Performance Report`;
    const dateStr = new Date().toLocaleDateString();

    // Branded header band
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 26, 'F');
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.text('Rent Management System', 14, 12);
    doc.setFontSize(18);
    doc.text(title, 14, 21);

    // Apartment meta under header
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.text(apartment?.name || 'Apartment', 14, 34);
    if (apartment?.address) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(apartment.address, 14, 40);
    }
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on: ${dateStr}`, 14, 47);

    // Exclude caretaker house from all calculations
    const filteredPayments = payments.filter(
      (p) => !apartment?.caretakerHouse || String(p.house?._id || p.house) !== String(apartment.caretakerHouse)
    );

    const tableData = filteredPayments.slice(0, 100).map((p) => [
      new Date(p.paymentDate).toLocaleDateString(),
      `${p.tenant?.firstName || ''} ${p.tenant?.lastName || ''}`.trim() || 'N/A',
      p.house?.houseNumber || 'N/A',
      `KSh ${(p.paidAmount || p.amount || 0).toLocaleString()}`,
      p.status || 'N/A',
      p.paymentMethod || 'Manual'
    ]);

    // Section title for detail table
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('1. Payment History', 14, 55);

    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Tenant', 'House', 'Amount', 'Status', 'Method']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [31, 41, 55]
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 40 },
        2: { cellWidth: 18 },
        3: { cellWidth: 26 },
        4: { cellWidth: 20 },
        5: { cellWidth: 24 }
      }
    });

    const totalCollected = filteredPayments.reduce(
      (sum, p) => sum + (p.paidAmount || p.amount || 0),
      0
    );
    const totalExpected = filteredPayments.reduce((sum, p) => {
      if (typeof p.expectedAmount === 'number') {
        return sum + p.expectedAmount;
      }
      const baseAmount = p.paidAmount || p.amount || 0;
      const deficit = p.deficit || 0;
      return sum + baseAmount + deficit;
    }, 0);
    const totalDeficit = filteredPayments.reduce(
      (sum, p) => sum + (p.deficit || 0),
      0
    );

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 60;
    const summaryStartY = finalY + 14;

    // Section title for summary
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('2. Summary Overview', 14, summaryStartY - 6);

    autoTable(doc, {
      startY: summaryStartY,
      head: [['Metric', 'Amount (KSh)']],
      body: [
        ['Total Expected', totalExpected.toLocaleString()],
        ['Total Collected', totalCollected.toLocaleString()],
        ['Total Deficit', totalDeficit.toLocaleString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [76, 81, 191], textColor: 255, fontStyle: 'bold' },
      styles: {
        fontSize: 10,
        cellPadding: 5,
        textColor: [15, 23, 42]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { halign: 'right' }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated by Rent Management System - ${new Date().toLocaleString()}`,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(`${apartment?.name.replace(/\s+/g, '_')}_Financial_Report.pdf`);
  };

  const handleExportCollection = () => {
    const doc = new jsPDF(); 
    const title = `Monthly Collection Report`;
    const period = `${collectionMonth}/${collectionYear}`;

    // Branded header band
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 26, 'F');
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.text('Rent Management System', 14, 12);
    doc.setFontSize(18);
    doc.text(title, 14, 21);

    // Meta info row
    const metaY = 32;
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.text(apartment?.name || 'Apartment', 14, metaY);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Period: ${period}`, 14, metaY + 6);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, metaY + 12);

    // Exclude caretaker house from all calculations
    const filteredHouses = houses.filter(
      (h) => h.tenant && (!apartment?.caretakerHouse || String(h._id) !== String(apartment.caretakerHouse))
    );
    
    const tableData = filteredHouses.map(house => {
      const monthPayment = payments.find(p => 
        p.house?._id === house._id && 
        p.month === collectionMonth && 
        p.year === parseInt(collectionYear)
      );
      return [
        house.houseNumber,
        `${house.tenant?.firstName} ${house.tenant?.lastName}`,
        `KSh ${(house.rentAmount || 0).toLocaleString()}`,
        monthPayment?.status || 'unpaid',
        monthPayment?.paymentDate ? new Date(monthPayment.paymentDate).toLocaleDateString() : '-'
      ];
    });

    // Section title
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('1. Unit Collection Status', 14, 50);

    autoTable(doc, {
      startY: 56,
      head: [['House', 'Tenant', 'Expected', 'Status', 'Date Paid']],
      body: tableData,
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: [31, 41, 55]
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 46 },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 24 },
        4: { cellWidth: 26 }
      }
    });

    // Compute summary strictly excluding caretaker house
    const totalExpected = filteredHouses.reduce(
      (sum, h) => sum + (h.rentAmount || 0),
      0
    );
    const totalCollected = filteredHouses.reduce((sum, house) => {
      const monthPayment = payments.find(
        (p) =>
          (p.house?._id === house._id || p.house === house._id) &&
          p.month === collectionMonth &&
          p.year === parseInt(collectionYear)
      );
      return sum + (monthPayment?.paidAmount || monthPayment?.amount || 0);
    }, 0);
    const totalDeficit = Math.max(0, totalExpected - totalCollected);

    const afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 60;
    const pageHeight = doc.internal.pageSize.getHeight();
    const needsNewPage = pageHeight - afterTableY < 60;

    if (needsNewPage) {
      doc.addPage();
    }

    const summaryTitleY = needsNewPage ? 32 : afterTableY;
    const summaryTableStartY = summaryTitleY + 6;

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text('2. Collection Summary', 14, summaryTitleY);

    autoTable(doc, {
      startY: summaryTableStartY,
      head: [['Metric', 'Amount (KSh)']],
      body: [
        ['Total Expected', totalExpected.toLocaleString()],
        ['Total Collected', totalCollected.toLocaleString()],
        ['Total Deficit', totalDeficit.toLocaleString()]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: {
        fontSize: 10,
        cellPadding: 5,
        textColor: [15, 23, 42]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { halign: 'right' }
      }
    });

    // Add footer to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated by Rent Management System - ${new Date().toLocaleString()}`,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(`${apartment?.name.replace(/\s+/g, '_')}_Collection_${collectionMonth}_${collectionYear}.pdf`);
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

  const handleApplyGlobalRent = async (e) => {
    e.preventDefault();
    if (!globalRentAmount || isNaN(globalRentAmount)) {
      toast.error('Please enter a valid rent amount');
      return;
    }

    if (!window.confirm(`Are you sure you want to apply KSh ${globalRentAmount} rent to ALL units in this apartment? This cannot be undone.`)) {
      return;
    }

    setSubmitting(true);
    try {
      await apartmentsAPI.applyGlobalRent(id, parseFloat(globalRentAmount));
      toast.success(`Successfully updated rent for all units!`);
      setGlobalRentAmount('');
      fetchData();
    } catch (error) {
      console.error('Error applying global rent:', error);
      const errorMessage = error.response?.data?.message || 'Error applying global rent. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCaretakerHouseChange = async (houseId) => {
    setSubmitting(true);
    try {
      await apartmentsAPI.update(id, { caretakerHouse: houseId || null });
      toast.success('Caretaker house updated successfully');
      fetchData();
    } catch (error) {
      console.error('Error updating caretaker house:', error);
      const errorMessage = error.response?.data?.message || 'Error updating caretaker house. Please try again.';
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
      const isCaretaker = apartment?.caretakerHouse && String(p.house?._id || p.house) === String(apartment.caretakerHouse);
      return !isCaretaker && paymentDate.getMonth() + 1 === currentMonth && paymentDate.getFullYear() === currentYear;
    });

    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);
    const outstandingPayments = payments.filter(p => {
      const isCaretaker = apartment?.caretakerHouse && String(p.house?._id || p.house) === String(apartment.caretakerHouse);
      return !isCaretaker && (p.status === 'pending' || p.status === 'overdue' || p.status === 'partial');
    });
    const outstandingAmount = outstandingPayments.reduce((sum, p) => sum + (p.deficit || p.expectedAmount - (p.paidAmount || 0)), 0);

    const totalExpected = houses.filter(h => h.status === 'occupied' && (!apartment?.caretakerHouse || String(h._id) !== String(apartment.caretakerHouse))).reduce((sum, h) => sum + h.rentAmount, 0);
    const collectionRate = totalExpected > 0 ? ((monthlyRevenue / totalExpected) * 100).toFixed(1) : 0;

    const payingHouses = houses.filter(h => !apartment?.caretakerHouse || String(h._id) !== String(apartment.caretakerHouse));
    const avgRent = payingHouses.length > 0 ? payingHouses.reduce((sum, h) => sum + (h.rentAmount || 0), 0) / payingHouses.length : 0;

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
              <Plus size={16} /> Add House
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
              <span className="qs-label">Houses</span>
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
            { id: 'units', label: `Houses (${houses.length})`, icon: Home },
            { id: 'payments', label: 'Financials', icon: CreditCard },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
            { id: 'settings', label: 'Settings', icon: Settings },
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
                    value={`KSh ${(financials.monthlyRevenue || 0).toLocaleString()}`}
                    subtitle="Collected this month"
                    colorClass="indigo"
                  />
                  <StatCard
                    icon={AlertCircle}
                    label="Outstanding"
                    value={`KSh ${(financials.outstandingAmount || 0).toLocaleString()}`}
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
                    label="Avg Rent/House"
                    value={`KSh ${(Math.round(financials.avgRent) || 0).toLocaleString()}`}
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
                            <span className="activity-sub">House {p.house?.houseNumber} • {new Date(p.paymentDate).toLocaleDateString()}</span>
                          </div>
                          <div className="activity-amount">
                            +KSh {(p.amount || 0).toLocaleString()}
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
                      placeholder="Search houses, tenants..."
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
                            <span className="unit-badge">House {house.houseNumber}</span>
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
                              <span className="um-value">
                                {apartment?.caretakerHouse && String(apartment.caretakerHouse) === String(house._id) ? (
                                  <span style={{ color: '#8e44ad', fontSize: '0.8rem' }}>EXEMPT (Caretaker)</span>
                                ) : (
                                  `KSh ${(house.rentAmount || 0).toLocaleString()}`
                                )}
                              </span>
                            </div>
                            {outstanding > 0 && (
                              <div className="u-metric danger">
                                <span className="um-label">Arrears</span>
                                <span className="um-value">KSh {(outstanding || 0).toLocaleString()}</span>
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
                <div className="tab-sub-header">
                  <div className="tab-left-actions">
                    <div className="view-switcher">
                      <button 
                        className={`view-toggle-btn ${financialsView === 'history' ? 'active' : ''}`}
                        onClick={() => setFinancialsView('history')}
                      >
                        Payment History
                      </button>
                      <button 
                        className={`view-toggle-btn ${financialsView === 'collection' ? 'active' : ''}`}
                        onClick={() => setFinancialsView('collection')}
                      >
                        Monthly Collection
                      </button>
                    </div>
                    {financialsView === 'history' && (
                      <button className="btn-secondary-sm" onClick={handleExportHistory}>
                        <Receipt size={14} /> Export PDF
                      </button>
                    )}
                  </div>
                               {financialsView === 'collection' && (
                    <div className="collection-controls">
                      <div className="period-selector">
                        <select 
                          value={collectionMonth} 
                          onChange={(e) => setCollectionMonth(e.target.value)}
                        >
                          <option value="01">Jan</option>
                          <option value="02">Feb</option>
                          <option value="03">Mar</option>
                          <option value="04">Apr</option>
                          <option value="05">May</option>
                          <option value="06">Jun</option>
                          <option value="07">Jul</option>
                          <option value="08">Aug</option>
                          <option value="09">Sep</option>
                          <option value="10">Oct</option>
                          <option value="11">Nov</option>
                          <option value="12">Dec</option>
                        </select>
                        <select 
                          value={collectionYear} 
                          onChange={(e) => setCollectionYear(e.target.value)}
                        >
                          {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        className="btn-secondary-sm" 
                        onClick={handleExportCollection}
                      >
                         <Receipt size={14} /> Export Table
                      </button>
                      <button 
                        className="btn-primary-sm" 
                        disabled={selectedHouses.length === 0 || batchSubmitting}
                        onClick={handleSaveCollection}
                      >
                        {batchSubmitting ? 'Saving...' : `Mark Paid (${selectedHouses.length})`}
                      </button>
                    </div>
                  )}
                </div>

                {financialsView === 'history' && (
                  <div className="financial-analytics-section" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
                    {/* Trend Chart */}
                    <div className="trend-chart-wrapper card-premium" style={{ padding: '1.5rem' }}>
                      <div className="card-header-minimal" style={{ marginBottom: '1rem' }}>
                        <div className="header-with-icon" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <TrendingUp size={20} color="#6366f1" />
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Performance Trends</h3>
                        </div>
                      </div>
                      <div className="chart-container" style={{ height: '300px' }}>
                        {loadingHistory ? (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <LoadingSpinner text="Analyzing trends..." />
                          </div>
                        ) : financialHistory && financialHistory.length > 0 ? (
                          <RevenueChart 
                            title=""
                            showCollectionRate
                            data={(() => {
                              const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                              const sorted = [...financialHistory].sort((a, b) => {
                                if (a.year !== b.year) return a.year - b.year;
                                return parseInt(a.month) - parseInt(b.month);
                              });
                              const lastSix = sorted.slice(-6);
                              return lastSix.map((item) => {
                                const expected = item.totalExpected || 0;
                                const paid = item.totalPaid || 0;
                                const rate = expected > 0 ? (paid / expected) * 100 : 0;
                                return {
                                  label: `${monthNames[parseInt(item.month) - 1]} ${item.year}`,
                                  revenue: paid,
                                  collectionRate: parseFloat(rate.toFixed(1))
                                };
                              });
                            })()} 
                          />
                        ) : (
                          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No trend data available
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="financial-history-section card-premium" style={{ padding: '1.5rem' }}>
                      <div className="card-header-minimal" style={{ marginBottom: '1.5rem' }}>
                        <div className="header-with-icon" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <TrendingUp size={20} color="#6366f1" />
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Monthly Revenue Statistics</h3>
                        </div>
                        <span className="stats-badge-premium" style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '12px', fontWeight: '600' }}>Historical Performance</span>
                      </div>

                      {loadingHistory ? (
                        <div className="loading-history" style={{ padding: '2rem', textAlign: 'center' }}>
                          <LoadingSpinner text="Loading history..." />
                        </div>
                      ) : (financialHistory && financialHistory.length > 0) ? (
                        <div className="history-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
                          {financialHistory.slice(0, 6).map((item, idx) => {
                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            const monthName = monthNames[parseInt(item.month) - 1];
                            const collectionRate = item.totalExpected > 0 ? ((item.totalPaid / item.totalExpected) * 100).toFixed(1) : 0;
                            
                            return (
                              <motion.div 
                                key={`${item.year}-${item.month}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className="history-stat-box"
                                style={{ 
                                  background: 'white', 
                                  border: '1px solid var(--border-subtle)', 
                                  borderRadius: '12px', 
                                  padding: '1.25rem',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}
                              >
                                <div className="history-box-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                  <span className="h-month" style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{monthName} {item.year}</span>
                                  <span className={`h-rate ${parseFloat(collectionRate) >= 90 ? 'high' : 'low'}`} style={{ 
                                    fontSize: '0.75rem', 
                                    fontWeight: '700', 
                                    color: parseFloat(collectionRate) >= 90 ? '#10b981' : '#f59e0b'
                                  }}>
                                    {collectionRate}%
                                  </span>
                                </div>
                                <div className="h-amounts" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                  <div className="h-amt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span className="h-label" style={{ color: 'var(--text-muted)' }}>Expected</span>
                                    <span className="h-val" style={{ fontWeight: '600' }}>KSh {item.totalExpected.toLocaleString()}</span>
                                  </div>
                                  <div className="h-amt-item" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span className="h-label" style={{ color: 'var(--text-muted)' }}>Collected</span>
                                    <span className="h-val text-success" style={{ fontWeight: '600', color: '#10b981' }}>KSh {item.totalPaid.toLocaleString()}</span>
                                  </div>
                                </div>
                                <div className="h-progress-bar" style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div 
                                    className="h-progress-fill" 
                                    style={{ 
                                      width: `${Math.min(100, collectionRate)}%`,
                                      height: '100%',
                                      background: parseFloat(collectionRate) >= 90 ? '#10b981' : '#f59e0b',
                                      borderRadius: '3px'
                                    }}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="no-history-data" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <AlertCircle size={32} opacity={0.5} />
                          <p>No historical financial data found for this building.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {financialsView === 'collection' && collectionReport && (
                  <div className="collection-summary-grid">
                    <div className="summary-card gold">
                      <span className="summary-label">Total Expected</span>
                      <h4 className="summary-value">KSh {collectionReport.summary.totalExpected.toLocaleString()}</h4>
                    </div>
                    <div className="summary-card success">
                      <span className="summary-label">Total Collected</span>
                      <h4 className="summary-value">KSh {collectionReport.summary.totalPaid.toLocaleString()}</h4>
                    </div>
                    <div className="summary-card danger">
                      <span className="summary-label">Total Deficit</span>
                      <h4 className="summary-value">KSh {collectionReport.summary.totalDeficit.toLocaleString()}</h4>
                    </div>
                    <div className="summary-card purple">
                      <span className="summary-label">Advance Collections</span>
                      <h4 className="summary-value">KSh {collectionReport.summary.totalAdvance.toLocaleString()}</h4>
                    </div>
                    <div className="summary-card info">
                      <span className="summary-label">Total Overpayments</span>
                      <h4 className="summary-value">KSh {collectionReport.summary.totalOverpayment.toLocaleString()}</h4>
                    </div>
                  </div>
                )}

                <div className="payments-table-container">
                  {financialsView === 'history' ? (
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Tenant</th>
                          <th>House</th>
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
                  ) : (
                    <table className="premium-table collection-table">
                      <thead>
                        <tr>
                          <th>
                            <input 
                              type="checkbox" 
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedHouses(houses.filter(h => h.tenant).map(h => h._id));
                                } else {
                                  setSelectedHouses([]);
                                }
                              }}
                            />
                          </th>
                          <th>House</th>
                          <th>Tenant</th>
                          <th>Rent Amount</th>
                          <th>Status ({collectionMonth}/{collectionYear})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {houses.filter(h => h.tenant && (!apartment?.caretakerHouse || String(h._id) !== String(apartment.caretakerHouse))).map(house => {
                          const monthPayment = payments.find(p => 
                            p.house?._id === house._id && 
                            p.month === collectionMonth && 
                            p.year === parseInt(collectionYear)
                          );
                          const isPaid = monthPayment?.status === 'paid' || monthPayment?.amount === 0;
                          
                          return (
                            <tr key={house._id} className={`${isPaid ? 'row-paid' : ''}`}>
                              <td>
                                <input 
                                  type="checkbox" 
                                  disabled={isPaid}
                                  checked={selectedHouses.includes(house._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedHouses([...selectedHouses, house._id]);
                                    } else {
                                      setSelectedHouses(selectedHouses.filter(id => id !== house._id));
                                    }
                                  }}
                                />
                              </td>
                              <td><span className="unit-tag">{house.houseNumber}</span></td>
                              <td>{house.tenant?.firstName} {house.tenant?.lastName}</td>
                              <td>
                                KSh {house.rentAmount?.toLocaleString()}
                              </td>
                              <td>
                                <span className={`badge-status ${monthPayment?.status || 'unpaid'}`}>
                                  {monthPayment?.status || 'unpaid'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="summary-row-footer">
                          <td></td>
                          <td><strong>TOTALS</strong></td>
                          <td></td>
                          <td>
                            <strong>KSh {collectionReport?.summary?.totalExpected.toLocaleString()}</strong>
                          </td>
                          <td>
                            <div className="footer-status-summary">
                              <span className="text-success">Paid: KSh {collectionReport?.summary?.totalPaid.toLocaleString()}</span>
                              <span className="text-danger">Deficit: KSh {collectionReport?.summary?.totalDeficit.toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
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
                        <span className="m-unit"><Home size={12} /> House {m.house?.houseNumber}</span>
                        <span className="m-date">{new Date(m.requestedDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="settings-tab-view card-premium">
                <div className="card-header-minimal">
                  <h3>Apartment Settings</h3>
                </div>
                
                <div className="settings-sections">
                  <section className="settings-section">
                    <h4>Caretaker House Selection</h4>
                    <p className="settings-help-text">
                      Select the house where the caretaker lives. This house will be exempted from rent in monthly invoices.
                    </p>
                    <div className="form-group-premium">
                      <label>Caretaker House</label>
                      <select 
                        value={apartment.caretakerHouse || ''} 
                        onChange={(e) => handleCaretakerHouseChange(e.target.value)}
                        className="premium-select"
                      >
                        <option value="">None (No caretaker house assigned)</option>
                        {houses.map(h => (
                          <option key={h._id} value={h._id}>
                            House {h.houseNumber} {h.tenant ? `(${h.tenant.firstName} ${h.tenant.lastName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </section>

                  <div className="divider-h" />

                  <section className="settings-section">
                    <h4>Global Rent Update</h4>
                    <p className="settings-help-text">
                      Setting a global rent will update the rent amount for <strong>ALL</strong> houses in this apartment building simultaneously.
                    </p>
                    <form onSubmit={handleApplyGlobalRent} className="inline-form-premium">
                      <div className="form-group-premium">
                        <label>New Rent Amount (KSh)</label>
                        <div className="input-with-button">
                          <input 
                            type="number" 
                            placeholder="e.g. 15000"
                            value={globalRentAmount}
                            onChange={(e) => setGlobalRentAmount(e.target.value)}
                          />
                          <button type="submit" className="btn-primary" disabled={submitting}>
                            Apply to All Houses
                          </button>
                        </div>
                      </div>
                    </form>
                  </section>
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
              <h2>{selectedHouse ? 'Edit House' : 'Add House'}</h2>
              <button className="btn-close-sm" onClick={() => { setShowHouseModal(false); resetHouseForm(); }}>×</button>
            </div>
            <form onSubmit={handleHouseSubmit}>
              <div className="modal-premium-body">
                <div className="form-row-premium">
                  <div className="form-group-premium">
                    <label>House Number</label>
                    <input
                      type="text"
                      value={houseFormData.houseNumber}
                      onChange={(e) => setHouseFormData({ ...houseFormData, houseNumber: e.target.value })}
                      required
                      placeholder="e.g., 1, 2"
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
                    placeholder="Brief description of the house..."
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
