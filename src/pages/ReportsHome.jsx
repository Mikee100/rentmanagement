import { Link } from 'react-router-dom';
import './Reports.css';

const REPORT_LINKS = [
  {
    path: '/reports/income-statement',
    title: 'Income Statement',
    caption: 'Revenue vs expenses'
  },
  {
    path: '/reports/outstanding-balances',
    title: 'Outstanding Balances',
    caption: 'Who still owes what'
  },
  {
    path: '/reports/revenue-by-apartment',
    title: 'Revenue by Apartment',
    caption: 'Building-level performance'
  },
  {
    path: '/reports/tenant-ledger',
    title: 'Tenant Ledger',
    caption: 'Payment history by tenant'
  },
  {
    path: '/reports/monthly-houses',
    title: 'Monthly Houses',
    caption: 'Unit-level collections'
  },
  {
    path: '/reports/monthly-apartments',
    title: 'Monthly Apartments',
    caption: 'Revenue + issues by building'
  }
];

const ReportsHome = () => {
  return (
    <div className="reports-page">
      <div className="page-header reports-header-hero">
        <div className="reports-header-text">
          <h1>Reports & Analytics</h1>
          <p className="reports-subtitle">
            Slice your data by time, building, and tenant, then export polished PDFs for stakeholders.
          </p>
        </div>
      </div>

      <div className="reports-home-grid">
        {REPORT_LINKS.map((report) => (
          <Link key={report.path} to={report.path} className="report-link-card">
            <span className="report-link-title">{report.title}</span>
            <span className="report-link-caption">{report.caption}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ReportsHome;
