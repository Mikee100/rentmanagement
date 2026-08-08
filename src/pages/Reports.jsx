import { useState, useEffect, useMemo, useRef } from 'react';
import { reportsAPI, tenantsAPI, apartmentsAPI } from '../services/api';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/export';
import './Reports.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const REPORT_META = {
  income: {
    title: 'Income Statement',
    caption: 'Revenue vs expenses'
  },
  outstanding: {
    title: 'Outstanding Balances',
    caption: 'Who still owes what'
  },
  revenue: {
    title: 'Revenue by Apartment',
    caption: 'Building-level performance'
  },
  ledger: {
    title: 'Tenant Ledger',
    caption: 'Payment history by tenant'
  },
  'apartment-units': {
    title: 'Monthly Houses',
    caption: 'Unit-level collections'
  },
  'apartments-monthly': {
    title: 'Monthly Apartments',
    caption: 'Revenue + issues by building'
  }
};

const Reports = ({ forcedTab = null, standalone = false }) => {
  const [activeTab, setActiveTab] = useState(forcedTab || 'income');
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedApartment, setSelectedApartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Report data
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [tenantLedger, setTenantLedger] = useState(null);
  const [outstandingBalances, setOutstandingBalances] = useState(null);
  const [revenueByApartment, setRevenueByApartment] = useState(null);
  const [revenueByApartmentMonthly, setRevenueByApartmentMonthly] = useState(null);
  const [apartmentMonthlyUnits, setApartmentMonthlyUnits] = useState(null);
  const [apartmentsMonthly, setApartmentsMonthly] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const toast = useToast();

  useEffect(() => {
    fetchTenants();
    fetchApartments();
  }, []);

  useEffect(() => {
    if (forcedTab && REPORT_META[forcedTab] && forcedTab !== activeTab) {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  useEffect(() => {
    if (activeTab === 'income') {
      fetchIncomeDashboard();
    } else if (activeTab === 'outstanding') {
      fetchOutstandingBalances();
    } else if (activeTab === 'revenue') {
      // Revenue view needs revenue, outstanding, and monthly series
      fetchRevenueByApartment();
      fetchOutstandingBalances();
      fetchRevenueByApartmentMonthly();
    } else if (activeTab === 'ledger' && selectedTenant) {
      fetchTenantLedger();
    } else if (activeTab === 'apartment-units' && selectedApartment && selectedMonth && selectedYear) {
      fetchApartmentMonthlyUnits();
    } else if (activeTab === 'apartments-monthly' && selectedMonth && selectedYear) {
      fetchApartmentsMonthly();
      fetchRevenueByApartmentMonthly();
    }
  }, [activeTab, startDate, endDate, selectedTenant, selectedApartment, selectedMonth, selectedYear]);

  const fetchTenants = async () => {
    try {
      const response = await tenantsAPI.getAll();
      setTenants(response.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchApartments = async () => {
    try {
      const response = await apartmentsAPI.getAll();
      setApartments(response.data);
    } catch (error) {
      console.error('Error fetching apartments:', error);
    }
  };

  const fetchIncomeStatement = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedApartment) params.apartmentId = selectedApartment;
      
      const response = await reportsAPI.getIncomeStatement(params);
      setIncomeStatement(response.data);
    } catch (error) {
      console.error('Error fetching income statement:', error);
      toast.error('Failed to fetch income statement');
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomeDashboard = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedApartment) params.apartmentId = selectedApartment;

      const [incomeResponse, revenueResponse, outstandingResponse, monthlyResponse] = await Promise.all([
        reportsAPI.getIncomeStatement(params),
        reportsAPI.getRevenueByApartment(params),
        reportsAPI.getOutstandingBalances(),
        reportsAPI.getRevenueByApartmentMonthly(params)
      ]);

      setIncomeStatement(incomeResponse.data);
      setRevenueByApartment(revenueResponse.data);
      setOutstandingBalances(outstandingResponse.data);
      setRevenueByApartmentMonthly(monthlyResponse.data);
    } catch (error) {
      console.error('Error fetching income dashboard data:', error);
      toast.error('Failed to fetch income analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantLedger = async () => {
    if (!selectedTenant) return;
    
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await reportsAPI.getTenantLedger(selectedTenant, params);
      setTenantLedger(response.data);
    } catch (error) {
      console.error('Error fetching tenant ledger:', error);
      toast.error('Failed to fetch tenant ledger');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutstandingBalances = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getOutstandingBalances();
      setOutstandingBalances(response.data);
    } catch (error) {
      console.error('Error fetching outstanding balances:', error);
      toast.error('Failed to fetch outstanding balances');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueByApartment = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await reportsAPI.getRevenueByApartment(params);
      setRevenueByApartment(response.data);
    } catch (error) {
      console.error('Error fetching revenue by apartment:', error);
      toast.error('Failed to fetch revenue by apartment');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueByApartmentMonthly = async () => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await reportsAPI.getRevenueByApartmentMonthly(params);
      setRevenueByApartmentMonthly(response.data);
    } catch (error) {
      console.error('Error fetching monthly revenue series:', error);
    }
  };

  const fetchApartmentMonthlyUnits = async () => {
    if (!selectedApartment) return;

    try {
      setLoading(true);
      const response = await reportsAPI.getMonthlyApartmentUnits({
        apartmentId: selectedApartment,
        month: selectedMonth,
        year: selectedYear,
      });
      setApartmentMonthlyUnits(response.data);
    } catch (error) {
      console.error('Error fetching monthly apartment units report:', error);
      toast.error('Failed to fetch monthly unit report');
    } finally {
      setLoading(false);
    }
  };

  const fetchApartmentsMonthly = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getApartmentsMonthly({
        month: selectedMonth,
        year: selectedYear,
      });
      setApartmentsMonthly(response.data);
    } catch (error) {
      console.error('Error fetching apartments monthly report:', error);
      toast.error('Failed to fetch apartments monthly report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `KSh ${(amount || 0).toLocaleString()}`;
  };

  const reportTitle = REPORT_META[activeTab]?.title || 'Reports & Analytics';
  const reportCaption = REPORT_META[activeTab]?.caption || 'Analytics report';

  const buildApartmentBalanceMap = () => {
    const map = {};
    if (!outstandingBalances || !outstandingBalances.balances) return map;

    outstandingBalances.balances.forEach((b) => {
      const name = b.apartment?.name || 'N/A';
      const curr = b.currentBalance || 0;
      if (!map[name]) {
        map[name] = { outstanding: 0, overpaid: 0 };
      }
      if (curr > 0) {
        map[name].outstanding += curr;
      } else if (curr < 0) {
        map[name].overpaid += Math.abs(curr);
      }
    });

    return map;
  };

  const incomeAnalytics = useMemo(() => {
    const apartmentsData = revenueByApartment?.apartments || [];
    const sorted = [...apartmentsData].sort((a, b) => (b.total || 0) - (a.total || 0));
    const topForBar = sorted.slice(0, 10);

    const barData = {
      labels: topForBar.map((a) => a.apartmentName),
      datasets: [
        {
          label: 'Total Collected (KSh)',
          data: topForBar.map((a) => a.total || 0),
          backgroundColor: 'rgba(37, 99, 235, 0.80)',
          borderColor: 'rgb(37, 99, 235)',
          borderWidth: 1
        }
      ]
    };

    const topForDonut = sorted.slice(0, 5);
    const othersTotal = sorted.slice(5).reduce((sum, a) => sum + (a.total || 0), 0);
    const donutLabels = topForDonut.map((a) => a.apartmentName);
    const donutValues = topForDonut.map((a) => a.total || 0);
    if (othersTotal > 0) {
      donutLabels.push('Others');
      donutValues.push(othersTotal);
    }

    const donutData = {
      labels: donutLabels,
      datasets: [
        {
          data: donutValues,
          backgroundColor: [
            'rgba(37, 99, 235, 0.85)',
            'rgba(22, 163, 74, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(14, 116, 144, 0.85)',
            'rgba(219, 39, 119, 0.85)',
            'rgba(100, 116, 139, 0.85)'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    };

    const totalCollected = revenueByApartment?.totalRevenue || 0;
    const totalOutstanding = outstandingBalances?.totalOutstanding || 0;
    const netPosition = totalCollected - totalOutstanding;

    return {
      barData,
      donutData,
      hasChartData: sorted.length > 0,
      totalCollected,
      totalOutstanding,
      netPosition,
      apartmentCount: apartmentsData.length
    };
  }, [revenueByApartment, outstandingBalances]);

  const incomeBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Collections by Apartment (All-Time)'
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `KSh ${(ctx.parsed.y || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `KSh ${Number(value).toLocaleString()}`
        },
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  const incomeDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: 'Collection Share by Apartment'
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: KSh ${(ctx.parsed || 0).toLocaleString()}`
        }
      }
    }
  };

  const monthlyPerformanceChart = useMemo(() => {
    const labels = revenueByApartmentMonthly?.labels || [];
    const series = revenueByApartmentMonthly?.series || [];

    const palette = [
      '#2563eb', '#16a34a', '#f59e0b', '#0891b2', '#db2777',
      '#7c3aed', '#ea580c', '#334155', '#0d9488', '#dc2626'
    ];

    const topSeries = [...series]
      .map((s) => ({
        ...s,
        total: (s.values || []).reduce((sum, v) => sum + v, 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return {
      hasData: labels.length > 0 && topSeries.length > 0,
      data: {
        labels,
        datasets: topSeries.map((s, idx) => ({
          label: s.apartmentName,
          data: s.values || [],
          backgroundColor: `${palette[idx % palette.length]}bb`,
          borderColor: palette[idx % palette.length],
          borderWidth: 1
        }))
      }
    };
  }, [revenueByApartmentMonthly]);

  const monthlyPerformanceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: 'Monthly Performance by Apartment (Allocated Month)'
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: KSh ${(ctx.parsed.y || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `KSh ${Number(value).toLocaleString()}`
        },
        grid: {
          color: 'rgba(0,0,0,0.06)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const monthlyApartmentsComparisonChart = useMemo(() => {
    const list = apartmentsMonthly?.apartments || [];
    if (!list.length) return { hasData: false };

    const labels = list.map((a) => a.apartmentName);
    const expected = list.map((a) => a.totalExpected || 0);
    const paid = list.map((a) => a.totalPaid || 0);
    const outstanding = list.map((a) => a.outstanding || 0);

    return {
      hasData: true,
      data: {
        labels,
        datasets: [
          {
            label: 'Expected Rent',
            data: expected,
            backgroundColor: 'rgba(99, 102, 241, 0.85)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Total Collected',
            data: paid,
            backgroundColor: 'rgba(34, 197, 94, 0.85)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Outstanding Deficit',
            data: outstanding,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      }
    };
  }, [apartmentsMonthly]);

  const monthlyApartmentsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: `Apartment Performance Comparison (${selectedMonth}/${selectedYear})`,
        font: { size: 14, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: KSh ${(ctx.parsed.y || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => `KSh ${Number(v).toLocaleString()}` },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: { grid: { display: false } }
    }
  };

  const multiMonthBarChart = useMemo(() => {
    const labels = revenueByApartmentMonthly?.labels || [];
    const series = revenueByApartmentMonthly?.series || [];

    if (!labels.length || !series.length) return { hasData: false };

    const palette = [
      'rgba(37, 99, 235, 0.85)',
      'rgba(22, 163, 74, 0.85)',
      'rgba(245, 158, 11, 0.85)',
      'rgba(14, 116, 144, 0.85)',
      'rgba(219, 39, 119, 0.85)',
      'rgba(124, 58, 237, 0.85)',
      'rgba(234, 88, 12, 0.85)',
      'rgba(51, 65, 85, 0.85)'
    ];
    const borderPalette = [
      '#2563eb', '#16a34a', '#f59e0b', '#0891b2', '#db2777',
      '#7c3aed', '#ea580c', '#334155'
    ];

    const topSeries = [...series]
      .map((s) => ({
        ...s,
        total: (s.values || []).reduce((sum, v) => sum + v, 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return {
      hasData: true,
      data: {
        labels,
        datasets: topSeries.map((s, idx) => ({
          label: s.apartmentName,
          data: s.values || [],
          backgroundColor: palette[idx % palette.length],
          borderColor: borderPalette[idx % borderPalette.length],
          borderWidth: 1,
          borderRadius: 4
        }))
      }
    };
  }, [revenueByApartmentMonthly]);

  const multiMonthBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Apartment Revenue Comparison Across Months',
        font: { size: 14, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: KSh ${(ctx.parsed.y || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => `KSh ${Number(v).toLocaleString()}` },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: { grid: { display: false } }
    }
  };

  const unitPerformanceChart = useMemo(() => {
    const units = apartmentMonthlyUnits?.units || [];
    if (!units.length) return { hasData: false };

    const labels = units.map((u) => `House ${u.houseNumber}`);
    const expected = units.map((u) => u.totalExpected || 0);
    const paid = units.map((u) => u.totalPaid || 0);
    const due = units.map((u) => u.totalDeficit || 0);

    return {
      hasData: true,
      data: {
        labels,
        datasets: [
          {
            label: 'Expected Rent',
            data: expected,
            backgroundColor: 'rgba(99, 102, 241, 0.75)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Rent Paid',
            data: paid,
            backgroundColor: 'rgba(34, 197, 94, 0.85)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Outstanding Due',
            data: due,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      }
    };
  }, [apartmentMonthlyUnits]);

  const unitPerformanceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: `Unit Collections Breakdown (${apartmentMonthlyUnits?.apartment?.name || ''} - ${selectedMonth}/${selectedYear})`,
        font: { size: 14, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: KSh ${(ctx.parsed.y || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => `KSh ${Number(v).toLocaleString()}` },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: { grid: { display: false } }
    }
  };

  const outstandingByApartmentChart = useMemo(() => {
    const list = outstandingBalances?.byApartment || [];
    if (!list.length) return { hasData: false };

    const labels = list.map((a) => a.apartmentName);
    const data = list.map((a) => a.totalOutstanding || 0);

    return {
      hasData: true,
      data: {
        labels,
        datasets: [
          {
            label: 'Total Outstanding Balance (KSh)',
            data,
            backgroundColor: 'rgba(239, 68, 68, 0.80)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      }
    };
  }, [outstandingBalances]);

  const outstandingByApartmentOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Outstanding Debt by Apartment',
        font: { size: 14, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `Outstanding: KSh ${(ctx.parsed.x || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { callback: (v) => `KSh ${Number(v).toLocaleString()}` },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      y: { grid: { display: false } }
    }
  };

  // Chart refs for income statement PDF export
  const incomeBarRef = useRef(null);
  const incomeDonutRef = useRef(null);
  const incomeMonthlyRef = useRef(null);

  const exportApartmentUnitsPDF = () => {
    if (!apartmentMonthlyUnits) return;

    const doc = new jsPDF();
    const report = apartmentMonthlyUnits;
    const title = 'Monthly House Report';
    const period = `${selectedMonth}/${selectedYear}`;

    // Header band
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 24, 'F');
    doc.setTextColor(255);
    doc.setFontSize(13);
    doc.text('Rent Management System', 14, 11);
    doc.setFontSize(17);
    doc.text(title, 14, 19);

    // Meta
    const metaY = 30;
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.text(report.apartment.name || 'Apartment', 14, metaY);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Period: ${period}`, 14, metaY + 6);
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      14,
      metaY + 12
    );

    // Main table
    const tableStartY = metaY + 18;
    const body = report.units.map((unit) => ([
      unit.houseNumber,
      unit.tenantName || '—',
      (unit.rentAmount || 0).toLocaleString(),
      (unit.totalExpected || 0).toLocaleString(),
      (unit.totalPaid || 0).toLocaleString(),
      (unit.totalDeficit || 0).toLocaleString(),
      (unit.advanceReceived || 0).toLocaleString(),
      unit.isCleared ? 'Cleared' : 'Due'
    ]));

    autoTable(doc, {
      startY: tableStartY,
      head: [['House', 'Tenant', 'Rent', 'Expected', 'Paid', 'Due', 'Advance', 'Status']],
      body,
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: [31, 41, 55]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 18 }
      }
    });

    // Summary block
    const afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : tableStartY + 10;
    const pageHeight = doc.internal.pageSize.getHeight();
    const needsNewPage = pageHeight - afterTableY < 70;

    if (needsNewPage) {
      doc.addPage();
    }

    const summaryTitleY = needsNewPage ? 24 : afterTableY;
    const summaryTableY = summaryTitleY + 6;

    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text('Summary', 14, summaryTitleY);

    autoTable(doc, {
      startY: summaryTableY,
      head: [['Metric', 'Amount (KSh)']],
      body: [
        ['Total Expected', report.summary.totalExpected.toLocaleString()],
        ['Total Collected', report.summary.totalPaid.toLocaleString()],
        ['Total Deficit', report.summary.totalDeficit.toLocaleString()],
        ['Advance Received (Future months paid now)', (report.summary.advanceReceived || 0).toLocaleString()]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [15, 23, 42]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { halign: 'right' }
      }
    });

    // Insights / notes
    const notesStartY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : summaryTableY) + 10;
    const totalUnits = report.units.length;
    const clearedUnits = report.units.filter((u) => u.isCleared).length;
    const dueUnitRecords = report.units.filter((u) => !u.isCleared && (u.totalDeficit || 0) > 0);
    const dueUnits = dueUnitRecords.length;

    const notes = [];
    notes.push(
      `This report summarizes rent performance for ${totalUnits} houses in ${report.apartment.name} for ${period}.`
    );

    if (clearedUnits > 0) {
      notes.push(
        `${clearedUnits} house(s) are fully cleared for this period.`
      );
    }

    if (dueUnits > 0 && report.summary.totalDeficit > 0) {
      notes.push(
        `${dueUnits} house(s) still have outstanding balances, contributing to the total deficit shown above.`
      );

      const detailed = dueUnitRecords.slice(0, 5).map((u) => {
        const tenantLabel = u.tenantName ? ` (${u.tenantName})` : '';
        const deficit = u.totalDeficit || 0;
        return `House ${u.houseNumber}${tenantLabel}: Due KSh ${deficit.toLocaleString()}.`;
      });

      if (detailed.length > 0) {
        notes.push(
          `Key outstanding cases: ${detailed.join(' ')}`
        );
      }
    } else if (report.summary.totalDeficit === 0 && report.summary.totalPaid >= report.summary.totalExpected) {
      notes.push(
        `All rent for this period has been fully collected; there are no outstanding balances.`
      );
    }

    notes.push(
      `Any advance payments or adjustments are reflected in individual house balances where applicable.`
    );
    if ((report.summary.advanceReceived || 0) > 0) {
      notes.push(
        `Advance collections received during this period (paid for future months): KSh ${(report.summary.advanceReceived || 0).toLocaleString()}.`
      );

      const items = Array.isArray(report.summary.advanceReceivedItems)
        ? report.summary.advanceReceivedItems
        : [];
      if (items.length > 0) {
        const top = items.slice(0, 8).map((i) => {
          const who = i.tenantName ? `${i.tenantName}` : 'Unknown tenant';
          const houseLabel = i.houseNumber ? `House ${i.houseNumber}` : 'House';
          const periodLabel = `${String(i.forMonth || '').padStart(2, '0')}/${i.forYear || ''}`;
          const amt = (i.amount || 0).toLocaleString();
          return `${houseLabel} (${who}): KSh ${amt} paid for ${periodLabel}.`;
        });
        notes.push(`Advance details: ${top.join(' ')}`);
        if (items.length > top.length) {
          notes.push(`(Showing ${top.length} of ${items.length} advance entries.)`);
        }
      }
    }
    notes.push(
      `Caretaker or management houses (if configured in the apartment settings) may be excluded from billing totals.`
    );

    // Notes heading
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Notes', 14, notesStartY);

    // Render each note as its own paragraph for readability
    doc.setFontSize(8.5);
    const maxWidth = doc.internal.pageSize.getWidth() - 28;
    let currentY = notesStartY + 5;

    notes.forEach((note, index) => {
      if (!note) return;
      const wrappedLines = doc.splitTextToSize(note, maxWidth);
      if (index > 0) {
        currentY += 3; // extra spacing between paragraphs
      }
      doc.text(wrappedLines, 14, currentY);
      currentY += wrappedLines.length * 4;
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.text(
        `Generated by Rent Management System • ${new Date().toLocaleString()}`,
        14,
        footerY
      );
      const pageLabel = `Page ${i} of ${pageCount}`;
      const textWidth = doc.getTextWidth(pageLabel);
      doc.text(pageLabel, doc.internal.pageSize.getWidth() - 14 - textWidth, footerY);
    }

    doc.save(
      `apartment-houses-${report.apartment.name}-${selectedMonth}-${selectedYear}.pdf`
    );
  };

  const exportIncomeStatementPDF = () => {
    if (!incomeStatement) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 14;
    const contentWidth = pageWidth - marginLeft * 2;

    // ── Header band ────────────────────────────────────────────────
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.text('Rent Management System', marginLeft, 10);
    doc.setFontSize(17);
    doc.text('Income Statement', marginLeft, 20);

    // Period / date
    const periodText =
      incomeStatement.period?.startDate && incomeStatement.period?.endDate
        ? `${new Date(incomeStatement.period.startDate).toLocaleDateString()} – ${new Date(incomeStatement.period.endDate).toLocaleDateString()}`
        : 'All Time';

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Period: ${periodText}`, marginLeft, 34);
    doc.text(`Generated: ${new Date().toLocaleString()}`, marginLeft, 39);

    // ── Summary KPI boxes ────────────────────────────────────────────
    const kpiY = 46;
    const kpiW = (contentWidth - 8) / 3;
    const kpiH = 18;
    const kpis = [
      { label: 'Total Revenue', value: `KSh ${(incomeStatement.revenue.total || 0).toLocaleString()}`, color: [22, 163, 74] },
      { label: 'Total Expenses', value: `KSh ${(incomeStatement.expenses.total || 0).toLocaleString()}`, color: [239, 68, 68] },
      { label: 'Net Income', value: `KSh ${(incomeStatement.netIncome || 0).toLocaleString()}`, color: incomeStatement.netIncome >= 0 ? [37, 99, 235] : [239, 68, 68] }
    ];

    kpis.forEach((kpi, i) => {
      const x = marginLeft + i * (kpiW + 4);
      doc.setFillColor(...kpi.color.map(c => Math.round(c * 0.15 + 240)));
      doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'F');
      doc.setDrawColor(...kpi.color);
      doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'S');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 3, kpiY + 5);
      doc.setFontSize(10);
      doc.setTextColor(...kpi.color);
      doc.setFont(undefined, 'bold');
      doc.text(kpi.value, x + 3, kpiY + 13);
      doc.setFont(undefined, 'normal');
    });

    // ── Revenue & Expenses Table ─────────────────────────────────────
    const tableStartY = kpiY + kpiH + 8;
    const revenueRows = [['Rent Revenue', `KSh ${(incomeStatement.revenue.rent || 0).toLocaleString()}`]];
    const expenseRows = Object.entries(incomeStatement.expenses.byCategory || {}).map(([cat, amt]) => [
      cat,
      `KSh ${(amt || 0).toLocaleString()}`
    ]);
    if (expenseRows.length === 0) {
      expenseRows.push(['Total Expenses', `KSh ${(incomeStatement.expenses.total || 0).toLocaleString()}`]);
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [['Revenue', 'Amount (KSh)']],
      body: [
        ...revenueRows,
        [{ content: 'TOTAL REVENUE', styles: { fontStyle: 'bold' } }, { content: `KSh ${(incomeStatement.revenue.total || 0).toLocaleString()}`, styles: { fontStyle: 'bold', halign: 'right' } }]
      ],
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
      columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right' } },
      tableWidth: contentWidth * 0.5
    });

    const revenueTableEnd = doc.lastAutoTable?.finalY || tableStartY + 30;

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: marginLeft + contentWidth * 0.5 + 4 },
      head: [['Expenses', 'Amount (KSh)']],
      body: [
        ...expenseRows,
        [{ content: 'TOTAL EXPENSES', styles: { fontStyle: 'bold' } }, { content: `KSh ${(incomeStatement.expenses.total || 0).toLocaleString()}`, styles: { fontStyle: 'bold', halign: 'right' } }]
      ],
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
      columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right' } },
      tableWidth: contentWidth * 0.5
    });

    const expenseTableEnd = doc.lastAutoTable?.finalY || tableStartY + 30;
    let currentY = Math.max(revenueTableEnd, expenseTableEnd) + 8;

    // Net income highlight bar
    const netColor = (incomeStatement.netIncome || 0) >= 0 ? [22, 163, 74] : [239, 68, 68];
    doc.setFillColor(...netColor.map(c => Math.round(c * 0.12 + 235)));
    doc.rect(marginLeft, currentY, contentWidth, 10, 'F');
    doc.setDrawColor(...netColor);
    doc.rect(marginLeft, currentY, contentWidth, 10, 'S');
    doc.setFontSize(10);
    doc.setTextColor(...netColor);
    doc.setFont(undefined, 'bold');
    doc.text('NET INCOME', marginLeft + 3, currentY + 7);
    const netValText = `KSh ${(incomeStatement.netIncome || 0).toLocaleString()}`;
    const netValWidth = doc.getTextWidth(netValText);
    doc.text(netValText, marginLeft + contentWidth - netValWidth - 3, currentY + 7);
    doc.setFont(undefined, 'normal');
    currentY += 18;

    // ── Payment & Expense count ──────────────────────────────────────
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Payment Transactions: ${incomeStatement.paymentCount || 0}`, marginLeft, currentY);
    doc.text(`Total Expense Records: ${incomeStatement.expenseCount || 0}`, marginLeft + 80, currentY);
    currentY += 10;

    // ── Portfolio summary metrics ────────────────────────────────────
    if (incomeAnalytics) {
      autoTable(doc, {
        startY: currentY,
        head: [['Portfolio Metric', 'Value']],
        body: [
          ['Total Collected (All-Time)', `KSh ${(incomeAnalytics.totalCollected || 0).toLocaleString()}`],
          ['Total Outstanding (All-Time)', `KSh ${(incomeAnalytics.totalOutstanding || 0).toLocaleString()}`],
          ['Net Position', `KSh ${(incomeAnalytics.netPosition || 0).toLocaleString()}`],
          ['Apartments Covered', String(incomeAnalytics.apartmentCount || 0)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } },
        tableWidth: contentWidth * 0.7
      });
      currentY = (doc.lastAutoTable?.finalY || currentY) + 10;
    }

    // ── Apartment Collections Bar Chart ──────────────────────────────
    if (incomeBarRef.current && incomeAnalytics?.hasChartData) {
      try {
        const barImg = incomeBarRef.current.toBase64Image('image/png', 1.0);
        const remainingSpace = pageHeight - currentY - 20;
        const chartH = Math.min(70, remainingSpace - 10);
        if (chartH > 30) {
          doc.setFontSize(10);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, 'bold');
          doc.text('Collections by Apartment (All-Time)', marginLeft, currentY);
          doc.setFont(undefined, 'normal');
          currentY += 4;
          doc.addImage(barImg, 'PNG', marginLeft, currentY, contentWidth * 0.65, chartH);
          currentY += chartH + 8;
        } else {
          doc.addPage();
          currentY = 16;
          doc.setFontSize(10);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, 'bold');
          doc.text('Collections by Apartment (All-Time)', marginLeft, currentY);
          doc.setFont(undefined, 'normal');
          currentY += 4;
          doc.addImage(barImg, 'PNG', marginLeft, currentY, contentWidth * 0.65, 70);
          currentY += 78;
        }
      } catch (e) {
        console.warn('Could not export bar chart image:', e);
      }
    }

    // ── Revenue Share Doughnut Chart ─────────────────────────────────
    if (incomeDonutRef.current && incomeAnalytics?.hasChartData) {
      try {
        const donutImg = incomeDonutRef.current.toBase64Image('image/png', 1.0);
        const remainingSpace = pageHeight - currentY - 20;
        const chartH = Math.min(65, remainingSpace - 10);
        if (chartH > 30) {
          doc.setFontSize(10);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, 'bold');
          doc.text('Revenue Share by Apartment', marginLeft, currentY);
          doc.setFont(undefined, 'normal');
          currentY += 4;
          doc.addImage(donutImg, 'PNG', marginLeft + contentWidth * 0.3, currentY - chartH - 4, contentWidth * 0.4, chartH);
          // Place donut next to bar if on same page, otherwise just proceed
        } else {
          doc.addPage();
          currentY = 16;
          doc.setFontSize(10);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, 'bold');
          doc.text('Revenue Share by Apartment', marginLeft, currentY);
          doc.setFont(undefined, 'normal');
          currentY += 4;
          doc.addImage(donutImg, 'PNG', marginLeft, currentY, contentWidth * 0.6, 65);
          currentY += 73;
        }
      } catch (e) {
        console.warn('Could not export donut chart image:', e);
      }
    }

    // ── Monthly Performance Bar Chart ────────────────────────────────
    if (incomeMonthlyRef.current && monthlyPerformanceChart?.hasData) {
      try {
        const monthlyImg = incomeMonthlyRef.current.toBase64Image('image/png', 1.0);
        const remainingSpace = pageHeight - currentY - 20;
        const chartH = Math.min(72, remainingSpace - 10);
        if (chartH > 30) {
          doc.setFontSize(10);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, 'bold');
          doc.text('Monthly Performance by Apartment', marginLeft, currentY);
          doc.setFont(undefined, 'normal');
          currentY += 4;
          doc.addImage(monthlyImg, 'PNG', marginLeft, currentY, contentWidth, chartH);
          currentY += chartH + 8;
        } else {
          doc.addPage();
          currentY = 16;
          doc.setFontSize(10);
          doc.setTextColor(30, 64, 175);
          doc.setFont(undefined, 'bold');
          doc.text('Monthly Performance by Apartment', marginLeft, currentY);
          doc.setFont(undefined, 'normal');
          currentY += 4;
          doc.addImage(monthlyImg, 'PNG', marginLeft, currentY, contentWidth, 72);
          currentY += 80;
        }
      } catch (e) {
        console.warn('Could not export monthly chart image:', e);
      }
    }

    // ── Apartment-level table ────────────────────────────────────────
    if (revenueByApartment?.apartments?.length) {
      if (pageHeight - currentY < 50) {
        doc.addPage();
        currentY = 16;
      }
      doc.setFontSize(10);
      doc.setTextColor(30, 64, 175);
      doc.setFont(undefined, 'bold');
      doc.text('Revenue Breakdown by Apartment', marginLeft, currentY);
      doc.setFont(undefined, 'normal');
      currentY += 4;

      autoTable(doc, {
        startY: currentY,
        head: [['Apartment', 'Revenue Collected', 'Payments', 'Tenants']],
        body: revenueByApartment.apartments.map(a => [
          a.apartmentName,
          `KSh ${(a.total || a.revenue || 0).toLocaleString()}`,
          String(a.paymentCount || 0),
          String(a.tenantCount || 0)
        ]),
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [31, 41, 55] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { halign: 'right' },
          2: { halign: 'right', cellWidth: 22 },
          3: { halign: 'right', cellWidth: 20 }
        }
      });
      currentY = (doc.lastAutoTable?.finalY || currentY) + 10;
    }

    // ── Footer ───────────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const footerY = pageHeight - 10;
      doc.text(
        `Generated by Rent Management System • ${new Date().toLocaleString()}`,
        marginLeft,
        footerY
      );
      const pageLabel = `Page ${i} of ${totalPages}`;
      doc.text(pageLabel, pageWidth - marginLeft - doc.getTextWidth(pageLabel), footerY);
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`income-statement-${dateStr}.pdf`);
  };

  const exportApartmentsMonthlyPDF = () => {
    if (!apartmentsMonthly) return;

    // Landscape to avoid squeezed columns
    const doc = new jsPDF({ orientation: 'landscape' });
    const report = apartmentsMonthly;
    const title = 'Monthly Apartments Report';
    const period = `${selectedMonth}/${selectedYear}`;

    // Header band
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, 'F');
    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.text('Rent Management System', 14, 9);
    doc.setFontSize(16);
    doc.text(`${title} (${period})`, 14, 17);

    // Meta
    const metaY = 30;
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, metaY);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Apartments: ${report.apartments.length}`, 14, metaY + 6);

    const rows = report.apartments.map((apt) => ([
      apt.apartmentName || '—',
      String(apt.housesCount || 0),
      (apt.totalExpected || 0).toLocaleString(),
      (apt.totalPaid || 0).toLocaleString(),
      (apt.outstanding || 0).toLocaleString(),
      (apt.overpaid || 0).toLocaleString(),
      (apt.advanceReceived || 0).toLocaleString(),
      (apt.totalCollected || 0).toLocaleString(),
      String(apt.paymentCount || 0),
      String(apt.issues?.count || 0),
      (apt.issues?.totalCost || 0).toLocaleString(),
    ]));

    // Totals row
    rows.push([
      'TOTAL',
      String(report.totals.housesCount || 0),
      (report.totals.totalExpected || 0).toLocaleString(),
      (report.totals.totalPaid || 0).toLocaleString(),
      (report.totals.outstanding || 0).toLocaleString(),
      (report.totals.overpaid || 0).toLocaleString(),
      (report.totals.advanceReceived || 0).toLocaleString(),
      (report.totals.totalCollected || 0).toLocaleString(),
      String(report.totals.paymentCount || 0),
      String(report.totals.issuesCount || 0),
      (report.totals.issuesCost || 0).toLocaleString(),
    ]);

    autoTable(doc, {
      startY: metaY + 12,
      head: [[
        'Apartment',
        'Houses',
        'Expected',
        'Paid',
        'Outstanding',
        'Overpaid',
        'Advance Received',
        'Total Collected',
        'Payments',
        'Issues',
        'Issue Cost'
      ]],
      body: rows,
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [31, 41, 55],
        overflow: 'linebreak'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 40 }, // Apartment name
        1: { cellWidth: 14, halign: 'right' },
        2: { cellWidth: 22, halign: 'right' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 24, halign: 'right' },
        9: { cellWidth: 16, halign: 'right' },
        10: { cellWidth: 14, halign: 'right' },
        11: { cellWidth: 20, halign: 'right' }
      },
      didParseCell: (data) => {
        // Bold totals row
        const isTotalsRow = data.row.index === rows.length - 1;
        if (isTotalsRow) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    // Notes section
    const afterTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : metaY + 30;
    const pageHeight = doc.internal.pageSize.getHeight();
    const needsNewPage = pageHeight - afterTableY < 50;
    if (needsNewPage) doc.addPage();

    const notesY = needsNewPage ? 18 : afterTableY;
    const notes = Array.isArray(report.notes) ? report.notes : [];

    if (notes.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(30, 64, 175);
      doc.text('Notes', 14, notesY);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const maxWidth = doc.internal.pageSize.getWidth() - 28;
      let y = notesY + 6;
      notes.forEach((n, idx) => {
        const wrapped = doc.splitTextToSize(String(n), maxWidth);
        if (idx > 0) y += 2;
        doc.text(wrapped, 14, y);
        y += wrapped.length * 4;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.text(
        `Generated by Rent Management System • ${new Date().toLocaleString()}`,
        14,
        footerY
      );
      const pageLabel = `Page ${i} of ${pageCount}`;
      const textWidth = doc.getTextWidth(pageLabel);
      doc.text(pageLabel, doc.internal.pageSize.getWidth() - 14 - textWidth, footerY);
    }

    doc.save(`apartments-monthly-${selectedMonth}-${selectedYear}.pdf`);
  };

  const exportReport = (format) => {
    let data = [];
    let filename = 'report';
    let title = 'Report';

    switch (activeTab) {
      case 'income':
        if (!incomeStatement) return;
        data = [
          { label: 'Revenue', value: formatCurrency(incomeStatement.revenue.total) },
          { label: 'Expenses', value: formatCurrency(incomeStatement.expenses.total) },
          { label: 'Net Income', value: formatCurrency(incomeStatement.netIncome) }
        ];
        filename = 'income-statement';
        title = 'Income Statement';
        break;
      case 'outstanding':
        if (!outstandingBalances) return;
        data = outstandingBalances.balances.map(b => ({
          'Tenant': `${b.tenant.firstName} ${b.tenant.lastName}`,
          'Apartment': b.apartment?.name || 'N/A',
          'House': b.house?.houseNumber || 'N/A',
          'Outstanding Balance': formatCurrency(b.currentBalance)
        }));
        // Add totals row
        data.push({
          'Tenant': 'TOTAL',
          'Apartment': '',
          'House': '',
          'Outstanding Balance': formatCurrency(outstandingBalances.totalOutstanding)
        });
        filename = 'outstanding-balances';
        title = 'Outstanding Balances';
        break;
      case 'revenue':
        if (!revenueByApartment) return;
        {
          const balanceMap = buildApartmentBalanceMap();
          let totalOutstanding = 0;
          let totalOverpaid = 0;

          data = revenueByApartment.apartments.map(a => {
            const b = balanceMap[a.apartmentName] || { outstanding: 0, overpaid: 0 };
            totalOutstanding += b.outstanding;
            totalOverpaid += b.overpaid;
            return {
              'Apartment': a.apartmentName,
              'Revenue': formatCurrency(a.revenue),
              'Total Collected': formatCurrency(a.total),
              'Outstanding': formatCurrency(b.outstanding),
              'Overpaid': formatCurrency(b.overpaid),
              'Payments': a.paymentCount,
              'Tenants': a.tenantCount
            };
          });

          // Add totals row
          data.push({
            'Apartment': 'TOTAL',
            'Revenue': formatCurrency(revenueByApartment.totalRevenue),
            'Total Collected': formatCurrency(revenueByApartment.totalRevenue),
            'Outstanding': formatCurrency(totalOutstanding),
            'Overpaid': formatCurrency(totalOverpaid),
            'Payments': '',
            'Tenants': ''
          });
        }
        filename = 'revenue-by-apartment';
        title = 'Revenue by Apartment';
        break;
      case 'ledger':
        if (!tenantLedger) return;
        data = tenantLedger.payments.map(p => ({
          'Date': new Date(p.paymentDate).toLocaleDateString(),
          'House': p.house?.houseNumber || p.houseNumber || 'N/A',
          'Expected': formatCurrency(p.expectedAmount || p.amount),
          'Paid': formatCurrency(p.paidAmount || p.amount),
          'Deficit': formatCurrency(p.deficit || 0),
          'Status': p.status,
          'Method': p.paymentMethod
        }));
        // Add summary totals row
        data.push({
          'Date': '',
          'House': 'TOTAL',
          'Expected': formatCurrency(tenantLedger.summary.totalExpected),
          'Paid': formatCurrency(tenantLedger.summary.totalPaid),
          'Deficit': formatCurrency(tenantLedger.summary.totalDeficit),
          'Status': '',
          'Method': ''
        });
        filename = `tenant-ledger-${tenantLedger.tenant.name}`;
        title = `Tenant Ledger - ${tenantLedger.tenant.name}`;
        break;
      case 'apartment-units':
        if (!apartmentMonthlyUnits) return;
        data = apartmentMonthlyUnits.units.map((unit) => ({
          House: unit.houseNumber,
          Tenant: unit.tenantName || '—',
          Rent: formatCurrency(unit.rentAmount),
          Expected: formatCurrency(unit.totalExpected),
          Paid: formatCurrency(unit.totalPaid),
          Due: formatCurrency(unit.totalDeficit),
          Advance: formatCurrency(unit.advanceReceived || 0),
          Status: unit.isCleared ? 'Cleared' : 'Due',
        }));
        // Add totals row using summary
        data.push({
          House: 'TOTAL',
          Tenant: '',
          Rent: '',
          Expected: formatCurrency(apartmentMonthlyUnits.summary.totalExpected),
          Paid: formatCurrency(apartmentMonthlyUnits.summary.totalPaid),
          Due: formatCurrency(apartmentMonthlyUnits.summary.totalDeficit),
          Advance: formatCurrency(apartmentMonthlyUnits.summary.advanceReceived || 0),
          Status: 'Summary',
        });
        filename = `apartment-houses-${apartmentMonthlyUnits.apartment.name}-${selectedMonth}-${selectedYear}`;
        title = `Monthly Houses - ${apartmentMonthlyUnits.apartment.name} (${selectedMonth}/${selectedYear})`;
        break;
      case 'apartments-monthly':
        if (!apartmentsMonthly) return;
        data = apartmentsMonthly.apartments.map((apt) => ({
          Apartment: apt.apartmentName,
          Address: apt.address || '',
          Houses: apt.housesCount || 0,
          Expected: formatCurrency(apt.totalExpected || 0),
          Paid: formatCurrency(apt.totalPaid || 0),
          Outstanding: formatCurrency(apt.outstanding || 0),
          Overpaid: formatCurrency(apt.overpaid || 0),
          Advances: formatCurrency(apt.advances || 0),
          'Advance Received': formatCurrency(apt.advanceReceived || 0),
          Revenue: formatCurrency(apt.revenue),
          'Total Collected': formatCurrency(apt.totalCollected),
          Payments: apt.paymentCount,
          Issues: apt.issues?.count || 0,
          'Issue Cost': formatCurrency(apt.issues?.totalCost || 0),
        }));
        data.push({
          Apartment: 'TOTAL',
          Address: '',
          Houses: apartmentsMonthly.totals.housesCount || 0,
          Expected: formatCurrency(apartmentsMonthly.totals.totalExpected || 0),
          Paid: formatCurrency(apartmentsMonthly.totals.totalPaid || 0),
          Outstanding: formatCurrency(apartmentsMonthly.totals.outstanding || 0),
          Overpaid: formatCurrency(apartmentsMonthly.totals.overpaid || 0),
          Advances: formatCurrency(apartmentsMonthly.totals.advances || 0),
          'Advance Received': formatCurrency(apartmentsMonthly.totals.advanceReceived || 0),
          Revenue: formatCurrency(apartmentsMonthly.totals.revenue),
          'Total Collected': formatCurrency(apartmentsMonthly.totals.totalCollected),
          Payments: apartmentsMonthly.totals.paymentCount,
          Issues: apartmentsMonthly.totals.issuesCount,
          'Issue Cost': formatCurrency(apartmentsMonthly.totals.issuesCost),
        });
        filename = `apartments-monthly-${selectedMonth}-${selectedYear}`;
        title = `Monthly Apartments Report (${selectedMonth}/${selectedYear})`;
        break;
    }

    if (!data.length) {
      toast.warning('No data to export for this report.');
      return;
    }

    if (format === 'pdf') {
      // Use domain-specific rich PDF exporters
      if (activeTab === 'income') {
        exportIncomeStatementPDF();
        return;
      }
      if (activeTab === 'apartment-units') {
        exportApartmentUnitsPDF();
        return;
      }
      if (activeTab === 'apartments-monthly') {
        exportApartmentsMonthlyPDF();
        return;
      }

      const columns = Object.keys(data[0] || {}).map(key => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
      }));
      exportToPDF(data, columns, title, filename);
    } else if (format === 'excel') {
      exportToExcel(data, filename);
    } else if (format === 'csv') {
      exportToCSV(data, filename);
    }
  };

  return (
    <div className="reports-page">
      <div className="page-header reports-header-hero">
        <div className="reports-header-text">
          <h1>{standalone ? reportTitle : 'Reports & Analytics'}</h1>
          <p className="reports-subtitle">
            {standalone
              ? `${reportCaption}.`
              : 'Slice your data by time, building, and tenant, then export polished PDFs for stakeholders.'}
          </p>
        </div>
        <div className="date-filters">
          <div className="date-filter-group">
            <label>From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
          </div>
          <div className="date-filter-group">
            <label>To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
            />
          </div>
        </div>
      </div>

      <div className={`reports-layout ${standalone ? 'reports-layout-single' : ''}`}>
        {!standalone && (
        <aside className="reports-sidebar">
          <div className="reports-tabs-vertical">
            <button
              className={activeTab === 'income' ? 'active' : ''}
              onClick={() => setActiveTab('income')}
            >
              <span className="tab-title">Income Statement</span>
              <span className="tab-caption">Revenue vs expenses</span>
            </button>
            <button
              className={activeTab === 'outstanding' ? 'active' : ''}
              onClick={() => setActiveTab('outstanding')}
            >
              <span className="tab-title">Outstanding Balances</span>
              <span className="tab-caption">Who still owes what</span>
            </button>
            <button
              className={activeTab === 'revenue' ? 'active' : ''}
              onClick={() => setActiveTab('revenue')}
            >
              <span className="tab-title">Revenue by Apartment</span>
              <span className="tab-caption">Building-level performance</span>
            </button>
            <button
              className={activeTab === 'ledger' ? 'active' : ''}
              onClick={() => setActiveTab('ledger')}
            >
              <span className="tab-title">Tenant Ledger</span>
              <span className="tab-caption">Payment history by tenant</span>
            </button>
            <button
              className={activeTab === 'apartment-units' ? 'active' : ''}
              onClick={() => setActiveTab('apartment-units')}
            >
              <span className="tab-title">Monthly Houses</span>
              <span className="tab-caption">Unit-level collections</span>
            </button>
            <button
              className={activeTab === 'apartments-monthly' ? 'active' : ''}
              onClick={() => setActiveTab('apartments-monthly')}
            >
              <span className="tab-title">Monthly Apartments</span>
              <span className="tab-caption">Revenue + issues by building</span>
            </button>
          </div>

          <div className="reports-sidebar-footer">
            <div className="reports-hint">
              <span className="dot-live" />
              Filters and exports adapt to the selected report.
            </div>
          </div>
        </aside>
        )}

        <section className="reports-main">
          <div className="report-filters">
            <div className="report-filters-left">
              {activeTab === 'income' && (
                <select
                  value={selectedApartment}
                  onChange={(e) => setSelectedApartment(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Apartments</option>
                  {apartments.map((apt) => (
                    <option key={apt._id} value={apt._id}>
                      {apt.name}
                    </option>
                  ))}
                </select>
              )}

              {activeTab === 'apartment-units' && (
                <>
                  <select
                    value={selectedApartment}
                    onChange={(e) => setSelectedApartment(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Select Apartment</option>
                    {apartments.map((apt) => (
                      <option key={apt._id} value={apt._id}>
                        {apt.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="filter-select"
                  >
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <input
                    type="number"
                    className="date-input year-input"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  />
                </>
              )}

              {activeTab === 'apartments-monthly' && (
                <>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="filter-select"
                  >
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <input
                    type="number"
                    className="date-input year-input"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  />
                </>
              )}

              {activeTab === 'ledger' && (
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="filter-select"
                  required
                >
                  <option value="">Select Tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.firstName} {tenant.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="export-buttons">
              <button className="btn-export primary" onClick={() => exportReport('pdf')}>
                📄 Export PDF
              </button>
              <button className="btn-export" onClick={() => exportReport('excel')}>
                📊 Excel
              </button>
              <button className="btn-export" onClick={() => exportReport('csv')}>
                📋 CSV
              </button>
            </div>
          </div>

          <div className="report-content">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {activeTab === 'income' && incomeStatement && (
              <div className="income-statement">
                <h2>Income Statement</h2>
                <div className="statement-period">
                  {incomeStatement.period.startDate && incomeStatement.period.endDate ? (
                    <p>
                      Period: {new Date(incomeStatement.period.startDate).toLocaleDateString()} - {new Date(incomeStatement.period.endDate).toLocaleDateString()}
                    </p>
                  ) : (
                    <p>All Time</p>
                  )}
                </div>
                
                <div className="statement-section">
                  <h3>Revenue</h3>
                  <div className="statement-row">
                    <span>Rent Revenue:</span>
                    <span className="amount">{formatCurrency(incomeStatement.revenue.rent)}</span>
                  </div>
                  <div className="statement-row total">
                    <span>Total Revenue:</span>
                    <span className="amount">{formatCurrency(incomeStatement.revenue.total)}</span>
                  </div>
                </div>

                <div className="statement-section">
                  <h3>Expenses</h3>
                  <div className="statement-row">
                    <span>Total Expenses:</span>
                    <span className="amount expense">{formatCurrency(incomeStatement.expenses.total)}</span>
                  </div>
                  {Object.entries(incomeStatement.expenses.byCategory).map(([category, amount]) => (
                    <div key={category} className="statement-row sub-item">
                      <span>{category}:</span>
                      <span className="amount expense">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="statement-section net-income">
                  <div className="statement-row total">
                    <span>Net Income:</span>
                    <span className={`amount ${incomeStatement.netIncome >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(incomeStatement.netIncome)}
                    </span>
                  </div>
                </div>

                <div className="statement-summary">
                  <p>Total Payments: {incomeStatement.paymentCount}</p>
                  <p>Total Expenses: {incomeStatement.expenseCount}</p>
                </div>

                <div className="income-comparison-grid">
                  <div className="summary-card compact">
                    <h3>Total Collected (All-Time)</h3>
                    <p className="large-amount">{formatCurrency(incomeAnalytics.totalCollected)}</p>
                  </div>
                  <div className="summary-card compact">
                    <h3>Total Outstanding (All-Time)</h3>
                    <p className="large-amount danger">{formatCurrency(incomeAnalytics.totalOutstanding)}</p>
                  </div>
                  <div className="summary-card compact">
                    <h3>Net Position</h3>
                    <p className={`large-amount ${incomeAnalytics.netPosition >= 0 ? 'success' : 'danger'}`}>
                      {formatCurrency(incomeAnalytics.netPosition)}
                    </p>
                    <p className="sub-text">Across {incomeAnalytics.apartmentCount} apartment(s)</p>
                  </div>
                </div>

                {incomeAnalytics.hasChartData ? (
                  <div className="income-charts-grid">
                    <div className="chart-card">
                      <div className="chart-stage">
                        <Bar ref={incomeBarRef} data={incomeAnalytics.barData} options={incomeBarOptions} />
                      </div>
                    </div>
                    <div className="chart-card">
                      <div className="chart-stage donut">
                        <Doughnut ref={incomeDonutRef} data={incomeAnalytics.donutData} options={incomeDonutOptions} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No apartment comparison data available yet.</p>
                  </div>
                )}

                {monthlyPerformanceChart.hasData && (
                  <div className="chart-card monthly-performance-card">
                    <div className="chart-stage monthly-performance-stage">
                      <Bar ref={incomeMonthlyRef} data={monthlyPerformanceChart.data} options={monthlyPerformanceOptions} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'outstanding' && outstandingBalances && (
              <div className="outstanding-balances">
                <h2>Outstanding Balances</h2>
                <div className="summary-grid">
                  <div className="summary-card">
                    <h3>Total Outstanding</h3>
                    <p className="large-amount">{formatCurrency(outstandingBalances.totalOutstanding)}</p>
                    <p className="sub-text">{outstandingBalances.tenantCount} tenants with outstanding balances</p>
                  </div>
                  {outstandingBalances.byApartment && outstandingBalances.byApartment.map((apt, idx) => (
                    <div key={idx} className="summary-card apartment-summary">
                      <h3>{apt.apartmentName}</h3>
                      <p className="medium-amount">{formatCurrency(apt.totalOutstanding)}</p>
                      <p className="sub-text">{apt.tenantCount} tenants</p>
                    </div>
                  ))}
                </div>

                {outstandingByApartmentChart.hasData && (
                  <div className="chart-card report-chart-section">
                    <div className="chart-stage">
                      <Bar data={outstandingByApartmentChart.data} options={outstandingByApartmentOptions} />
                    </div>
                  </div>
                )}

                <div className="balances-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Tenant</th>
                        <th>Apartment</th>
                        <th>House</th>
                        <th>Total Expected</th>
                        <th>Total Paid</th>
                        <th>Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingBalances.balances.map((balance, index) => (
                        <tr key={index}>
                          <td>{balance.tenant.firstName} {balance.tenant.lastName}</td>
                          <td>{balance.apartment?.name || 'N/A'}</td>
                          <td>{balance.house?.houseNumber || 'N/A'}</td>
                          <td>{formatCurrency(balance.totalExpected)}</td>
                          <td>{formatCurrency(balance.totalPaid)}</td>
                          <td className="outstanding">{formatCurrency(balance.currentBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'revenue' && revenueByApartment && (
              <div className="revenue-by-apartment">
                <h2>Revenue by Apartment</h2>
                <div className="summary-card">
                  <h3>Portfolio Revenue</h3>
                  <p className="large-amount">{formatCurrency(revenueByApartment.totalRevenue)}</p>
                </div>

                {multiMonthBarChart.hasData && (
                  <div className="chart-card report-chart-section">
                    <div className="chart-stage monthly-performance-stage">
                      <Bar data={multiMonthBarChart.data} options={multiMonthBarOptions} />
                    </div>
                  </div>
                )}

                <div className="revenue-grid">
                  {(() => {
                    const balanceMap = buildApartmentBalanceMap();
                    return revenueByApartment.apartments.map((apt, index) => {
                      const balance = balanceMap[apt.apartmentName] || { outstanding: 0, overpaid: 0 };
                      return (
                        <div key={index} className="revenue-card">
                          <h3>{apt.apartmentName}</h3>
                          <div className="revenue-details">
                            <div className="revenue-row">
                              <span>Collected Revenue:</span>
                              <span>{formatCurrency(apt.revenue)}</span>
                            </div>
                            <div className="revenue-row total">
                              <span>Total Collected:</span>
                              <span>{formatCurrency(apt.total)}</span>
                            </div>
                            <div className="revenue-row">
                              <span>Outstanding:</span>
                              <span>{formatCurrency(balance.outstanding)}</span>
                            </div>
                            <div className="revenue-row">
                              <span>Overpaid:</span>
                              <span>{formatCurrency(balance.overpaid)}</span>
                            </div>
                            <div className="revenue-stats">
                              <span>{apt.paymentCount} payments</span>
                              <span>{apt.tenantCount} tenants</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {activeTab === 'ledger' && (
              <>
                {!selectedTenant ? (
                  <div className="empty-state">
                    <p>Please select a tenant to view their ledger</p>
                  </div>
                ) : tenantLedger ? (
                  <div className="tenant-ledger">
                    <h2>Tenant Ledger</h2>
                    <div className="ledger-header">
                      <div className="tenant-info">
                        <h3>{tenantLedger.tenant.name}</h3>
                        <p>{tenantLedger.tenant.email}</p>
                        <p>{tenantLedger.tenant.phone}</p>
                        <p>House: {tenantLedger.tenant.house} - {tenantLedger.tenant.apartment}</p>
                      </div>
                      <div className="ledger-summary">
                        <div className="summary-item">
                          <span>Total Paid:</span>
                          <span>{formatCurrency(tenantLedger.summary.totalPaid)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Total Expected:</span>
                          <span>{formatCurrency(tenantLedger.summary.totalExpected)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Total Deficit:</span>
                          <span className="negative">{formatCurrency(tenantLedger.summary.totalDeficit)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Current Balance:</span>
                          <span className={tenantLedger.summary.currentBalance > 0 ? 'negative' : 'positive'}>
                            {formatCurrency(tenantLedger.summary.currentBalance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ledger-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>House</th>
                            <th>Expected</th>
                            <th>Paid</th>
                            <th>Deficit</th>
                            <th>Balance</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tenantLedger.payments.map((payment) => (
                            <tr key={payment._id}>
                              <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                              <td>{payment.house?.houseNumber || payment.houseNumber || 'N/A'}</td>
                              <td>{formatCurrency(payment.expectedAmount || payment.amount)}</td>
                              <td>{formatCurrency(payment.paidAmount || payment.amount)}</td>
                              <td>{formatCurrency(payment.deficit || 0)}</td>
                              <td className={payment.runningBalance > 0 ? 'negative' : 'positive'}>
                                {formatCurrency(payment.runningBalance)}
                              </td>
                              <td>
                                <span className={`status-badge ${payment.status}`}>
                                  {payment.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No ledger data available</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'apartment-units' && (
              <>
                {!selectedApartment ? (
                  <div className="empty-state">
                    <p>Please select an apartment and month to view the report.</p>
                  </div>
                ) : apartmentMonthlyUnits ? (
                  <div className="apartment-units-report">
                    <h2>
                      Monthly House Report - {apartmentMonthlyUnits.apartment.name}{' '}
                      ({selectedMonth}/{selectedYear})
                    </h2>
                    
                    <div className="summary-grid monthly-summary">
                      <div className="summary-card">
                        <h3>Total Expected</h3>
                        <p className="medium-amount">{formatCurrency(apartmentMonthlyUnits.summary.totalExpected)}</p>
                      </div>
                      <div className="summary-card">
                        <h3>Total Paid</h3>
                        <p className="medium-amount success">{formatCurrency(apartmentMonthlyUnits.summary.totalPaid)}</p>
                      </div>
                      <div className="summary-card">
                        <h3>Total Outstanding</h3>
                        <p className="medium-amount danger">{formatCurrency(apartmentMonthlyUnits.summary.totalDeficit)}</p>
                      </div>
                    </div>

                    {unitPerformanceChart.hasData && (
                      <div className="chart-card report-chart-section">
                        <div className="chart-stage">
                          <Bar data={unitPerformanceChart.data} options={unitPerformanceOptions} />
                        </div>
                      </div>
                    )}

                    <div className="balances-table">
                      <table>
                        <thead>
                          <tr>
                            <th>House</th>
                            <th>Tenant</th>
                            <th>Rent</th>
                            <th>Expected</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th>Advance</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apartmentMonthlyUnits.units.map((unit) => {
                            const due = unit.totalDeficit;
                            const cleared = unit.isCleared;
                            return (
                              <tr key={unit.houseId}>
                                <td>{unit.houseNumber}</td>
                                <td>{unit.tenantName || '—'}</td>
                                <td>{formatCurrency(unit.rentAmount)}</td>
                                <td>{formatCurrency(unit.totalExpected)}</td>
                                <td>{formatCurrency(unit.totalPaid)}</td>
                                <td className={due > 0 ? 'outstanding' : ''}>
                                  {formatCurrency(due)}
                                </td>
                                <td>{formatCurrency(unit.advanceReceived || 0)}</td>
                                <td>
                                  <span
                                    className={
                                      cleared
                                        ? 'unit-status-icon unit-status-cleared'
                                        : 'unit-status-icon unit-status-due'
                                    }
                                  >
                                    {cleared ? '✅' : '❌'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No data available for the selected month.</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'apartments-monthly' && (
              <>
                {apartmentsMonthly ? (
                  <div className="apartments-monthly-report">
                    <h2>
                      Monthly Apartments Report ({selectedMonth}/{selectedYear})
                    </h2>

                    <div className="summary-grid monthly-summary">
                      <div className="summary-card">
                        <h3>Total Collected</h3>
                        <p className="medium-amount success">
                          {formatCurrency(apartmentsMonthly.totals.totalCollected)}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h3>Total Outstanding</h3>
                        <p className="medium-amount danger">
                          {formatCurrency(apartmentsMonthly.totals.outstanding || 0)}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h3>Total Overpaid</h3>
                        <p className="medium-amount">
                          {formatCurrency(apartmentsMonthly.totals.overpaid || 0)}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h3>Advance Received</h3>
                        <p className="medium-amount">
                          {formatCurrency(apartmentsMonthly.totals.advanceReceived || 0)}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h3>Total Payments</h3>
                        <p className="medium-amount">
                          {(apartmentsMonthly.totals.paymentCount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h3>Issues Logged</h3>
                        <p className="medium-amount danger">
                          {(apartmentsMonthly.totals.issuesCount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="summary-card">
                        <h3>Issue Cost</h3>
                        <p className="medium-amount danger">
                          {formatCurrency(apartmentsMonthly.totals.issuesCost || 0)}
                        </p>
                      </div>
                    </div>

                    {monthlyApartmentsComparisonChart.hasData && (
                      <div className="chart-card report-chart-section">
                        <div className="chart-stage">
                          <Bar data={monthlyApartmentsComparisonChart.data} options={monthlyApartmentsOptions} />
                        </div>
                      </div>
                    )}

                    {multiMonthBarChart.hasData && (
                      <div className="chart-card report-chart-section" style={{ marginTop: '16px' }}>
                        <div className="chart-stage monthly-performance-stage">
                          <Bar data={multiMonthBarChart.data} options={multiMonthBarOptions} />
                        </div>
                      </div>
                    )}

                    {Array.isArray(apartmentsMonthly.notes) && apartmentsMonthly.notes.length > 0 && (
                      <div className="statement-section">
                        <h3>Notes</h3>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {apartmentsMonthly.notes.map((n, idx) => (
                            <li key={idx} style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                              {n}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="balances-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Apartment</th>
                            <th>Houses</th>
                            <th>Expected</th>
                            <th>Paid</th>
                            <th>Outstanding</th>
                            <th>Overpaid</th>
                            <th>Advance Received</th>
                            <th>Revenue</th>
                            <th>Total Collected</th>
                            <th>Payments</th>
                            <th>Issues</th>
                            <th>Issue Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apartmentsMonthly.apartments.map((apt) => (
                            <tr key={apt.apartmentId}>
                              <td>{apt.apartmentName}</td>
                              <td>{(apt.housesCount || 0).toLocaleString()}</td>
                              <td>{formatCurrency(apt.totalExpected || 0)}</td>
                              <td>{formatCurrency(apt.totalPaid || 0)}</td>
                              <td className={(apt.outstanding || 0) > 0 ? 'outstanding' : ''}>
                                {formatCurrency(apt.outstanding || 0)}
                              </td>
                              <td>{formatCurrency(apt.overpaid || 0)}</td>
                              <td>{formatCurrency(apt.advanceReceived || 0)}</td>
                              <td>{formatCurrency(apt.revenue)}</td>
                              <td>{formatCurrency(apt.totalCollected)}</td>
                              <td>{(apt.paymentCount || 0).toLocaleString()}</td>
                              <td>{(apt.issues?.count || 0).toLocaleString()}</td>
                              <td>{formatCurrency(apt.issues?.totalCost || 0)}</td>
                            </tr>
                          ))}
                          <tr>
                            <td><strong>TOTAL</strong></td>
                            <td><strong>{(apartmentsMonthly.totals.housesCount || 0).toLocaleString()}</strong></td>
                            <td><strong>{formatCurrency(apartmentsMonthly.totals.totalExpected || 0)}</strong></td>
                            <td><strong>{formatCurrency(apartmentsMonthly.totals.totalPaid || 0)}</strong></td>
                            <td><strong>{formatCurrency(apartmentsMonthly.totals.outstanding || 0)}</strong></td>
                            <td><strong>{formatCurrency(apartmentsMonthly.totals.overpaid || 0)}</strong></td>
                            <td><strong>{formatCurrency(apartmentsMonthly.totals.advanceReceived || 0)}</strong></td>
                            <td><strong>{formatCurrency(apartmentsMonthly.totals.revenue)}</strong></td>
                            <td><strong>{formatCurrency(apartmentsMonthly.totals.totalCollected)}</strong></td>
                            <td><strong>{(apartmentsMonthly.totals.paymentCount || 0).toLocaleString()}</strong></td>
                            <td><strong>{(apartmentsMonthly.totals.issuesCount || 0).toLocaleString()}</strong></td>
                            <td><strong>{formatCurrency(apartmentsMonthly.totals.issuesCost || 0)}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No data available for the selected month.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Reports;

