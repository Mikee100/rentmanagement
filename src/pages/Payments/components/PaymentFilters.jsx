import { useState } from 'react';
import { Search, Filter, Calendar, DollarSign, ChevronDown } from 'lucide-react';
import SearchBar from '../../../components/SearchBar';
import './PaymentFilters.css';

const PaymentFilters = ({ 
  searchQuery, 
  setSearchQuery, 
  filters, 
  updateFilter, 
  clearFilters,
  paginatedData,
  totalItems 
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [isExpanded, setIsExpanded] = useState(false);

  const statusOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'partial', label: 'Partial' }
  ];

  const methodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'mpesa_stk', label: 'M-Pesa STK' },
    { value: 'equity_bank', label: 'Equity Bank' },
    { value: 'mobile_money', label: 'Mobile Money' }
  ];

  const toggleFilter = (filterKey, value) => {
    updateFilter(filterKey, filters[filterKey] === value ? '' : value);
  };

  const resultsSummary = totalItems > 0 
    ? `${paginatedData.length} of ${totalItems} payments`
    : 'No payments match filters';

  return (
    <div className="payment-filters-modern">
      <div className="filters-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="filters-title">
          <Filter size={20} />
          <span>Filters</span>
          <span className="results-count">({resultsSummary})</span>
        </div>
        <ChevronDown className={`expand-icon ${isExpanded ? 'rotated' : ''}`} size={20} />
      </div>

      {isExpanded && (
        <div className="filters-content">
          <div className="search-section">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search payments by tenant, house, notes..."
              icon={Search}
            />
          </div>

          <div className="filters-tabs">
            <button 
              className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              Basic
            </button>
            <button 
              className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
              onClick={() => setActiveTab('advanced')}
            >
              Advanced
            </button>
          </div>

          <div className="filters-grid">
            {activeTab === 'basic' && (
              <>
                <div className="filter-group">
                  <label className="filter-label">Status</label>
                  <div className="filter-chips">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        className={`chip-btn ${filters.status === option.value ? 'active' : ''}`}
                        onClick={() => toggleFilter('status', option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Payment Method</label>
                  <div className="filter-chips">
                    {methodOptions.map(option => (
                      <button
                        key={option.value}
                        className={`chip-btn ${filters.paymentMethod === option.value ? 'active' : ''}`}
                        onClick={() => toggleFilter('paymentMethod', option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'advanced' && (
              <div className="advanced-filters">
                <div className="filter-row">
                  <div className="filter-group date-range">
                    <label className="filter-label">
                      <Calendar size={16} />
                      Date Range
                    </label>
                    <div className="date-inputs">
                      <input
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(e) => updateFilter('startDate', e.target.value)}
                        className="date-input"
                      />
                      <span className="date-separator">to</span>
                      <input
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(e) => updateFilter('endDate', e.target.value)}
                        className="date-input"
                      />
                    </div>
                  </div>

                  <div className="filter-group amount-range">
                    <label className="filter-label">
                      <DollarSign size={16} />
                      Amount Range
                    </label>
                    <div className="amount-inputs">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.amountMin || ''}
                        onChange={(e) => updateFilter('amountMin', e.target.value)}
                        className="amount-input"
                      />
                      <span className="range-separator">—</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.amountMax || ''}
                        onChange={(e) => updateFilter('amountMax', e.target.value)}
                        className="amount-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="filters-actions">
            {Object.values(filters).some(v => v) && (
              <button className="btn-clear" onClick={clearFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentFilters;

