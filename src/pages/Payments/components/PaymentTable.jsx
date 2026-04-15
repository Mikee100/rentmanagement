import { useMemo } from 'react';
import { Edit3, Trash2, FileText } from 'lucide-react';
import TablePagination from '../../../components/TablePagination';
import { generatePaymentReceipt } from '../../../utils/receipt';
import './PaymentTable.css';

const PaymentTable = ({ 
  payments, 
  onEdit, 
  onDelete, 
  sortField, 
  sortOrder, 
  onSort, 
  paginatedData, 
  currentPage, 
  totalPages, 
  onPageChange, 
  pageSize,
  onPageSizeChange,
  totalItems 
}) => {
  const getStatusColor = (status) => {
    const colors = {
      paid: '#10b981',
      pending: '#f59e0b',
      overdue: '#ef4444',
      partial: '#3b82f6'
    };
    return colors[status] || '#6b7280';
  };

  const formatPaymentMethod = (method) => {
    const map = {
      cash: 'Cash',
      bank_transfer: 'Bank',
      equity_bank: 'Equity',
      mpesa_stk: 'M-Pesa',
      mobile_money: 'Mobile',
      paybill: 'Paybill'
    };
    return map[method] || method?.toUpperCase() || 'N/A';
  };

  const tableData = useMemo(() => 
    paginatedData.map(payment => ({
      id: payment._id,
      date: payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A',
      tenant: payment.tenant ? `${payment.tenant.firstName} ${payment.tenant.lastName}`.trim() : 'N/A',
      house: payment.house ? `${payment.house.houseNumber} (${payment.house.apartment?.name || '-'})` : 'N/A',
      amount: payment.paidAmount || payment.amount || 0,
      dueDate: payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A',
      method: formatPaymentMethod(payment.paymentMethod),
      status: payment.status,
      monthYear: `${payment.month}/${payment.year}`,
      transactionId: payment.transactionId,
      isAdvance: payment.isAdvance,
      deficit: payment.deficit,
      overpayment: payment.overpayment,
      lateFee: payment.lateFee,
      carriedForward: payment.carriedForward,
      paymentSource: payment.paymentSource
    })), [paginatedData]
  );

  const getSortIcon = (field) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  if (!tableData.length) {
    return (
      <div className="empty-state-modern">
        <div className="empty-icon">📊</div>
        <h3>No Payments Found</h3>
        <p>Try adjusting your filters or create your first payment</p>
      </div>
    );
  }

  return (
    <div className="payment-table-container">
      <div className="table-wrapper">
        <table className="payment-table-modern">
          <thead>
            <tr>
              <th className="sortable" onClick={() => onSort('paymentDate')}>
                Date {getSortIcon('paymentDate')}
              </th>
              <th className="sortable" onClick={() => onSort('tenant')}>
                Tenant {getSortIcon('tenant')}
              </th>
              <th className="sortable" onClick={() => onSort('house')}>
                House {getSortIcon('house')}
              </th>
              <th className="sortable" onClick={() => onSort('amount')}>
                Amount {getSortIcon('amount')}
              </th>
              <th className="sortable" onClick={() => onSort('dueDate')}>
                Due {getSortIcon('dueDate')}
              </th>
              <th className="sortable" onClick={() => onSort('paymentMethod')}>
                Method {getSortIcon('paymentMethod')}
              </th>
              <th className="sortable" onClick={() => onSort('status')}>
                Status {getSortIcon('status')}
              </th>
              <th>Month</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map(row => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td className="tenant-cell">{row.tenant}</td>
                <td className="house-cell">
                  <span className="house-number">{row.house.split(' ')[0]}</span>
                  {row.house.includes('(') && <span className="apt-name">{row.house.split('(')[1]?.replace(')', '')}</span>}
                </td>
                <td>
                  <div className="amount-stack">
                    <div className="main-amount">
                      KSh {row.amount.toLocaleString()}
                    </div>
                    {row.deficit > 0 && (
                      <div className="amount-detail negative">Deficit: KSh {row.deficit.toLocaleString()}</div>
                    )}
                    {row.overpayment > 0 && (
                      <div className="amount-detail positive">Overpaid: KSh {row.overpayment.toLocaleString()}</div>
                    )}
                    {row.lateFee > 0 && (
                      <div className="amount-detail negative">+Late: KSh {row.lateFee.toLocaleString()}</div>
                    )}
                  </div>
                </td>
                <td>{row.dueDate}</td>
                <td className="method-cell">
                  <span className="method-badge">{row.method}</span>
                  {row.paymentSource === 'equity_bank' && <span className="source-badge auto">AUTO</span>}
                  {row.paymentSource === 'webhook' && <span className="source-badge webhook">WEB</span>}
                  {row.transactionId && (
                    <span className="txn-id" title={row.transactionId}>
                      {row.transactionId.slice(0,8)}...
                    </span>
                  )}
                </td>
                <td>
                  <span 
                    className="status-badge" 
                    style={{ '--status-color': getStatusColor(row.status) }}
                  >
                    {row.status}
                  </span>
                  {row.isAdvance && <span className="status-badge advance">ADV</span>}
                </td>
                <td>{row.monthYear}</td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button 
                      className="action-btn receipt"
                      onClick={() => generatePaymentReceipt(payments.find(p => p._id === row.id))}
                      title="Download Receipt"
                      aria-label="Download receipt"
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      className="action-btn edit"
                      onClick={() => onEdit(payments.find(p => p._id === row.id))}
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => onDelete(row.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination-wrapper">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default PaymentTable;

