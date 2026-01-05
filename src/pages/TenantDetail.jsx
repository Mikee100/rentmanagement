import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tenantsAPI, paymentsAPI, configAPI, mpesaAPI, maintenanceAPI } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingSpinner from '../components/LoadingSpinner';
import './TenantDetail.css';

const TenantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [paybillInfo, setPaybillInfo] = useState(null);
  const [mpesaForm, setMpesaForm] = useState({
    phoneNumber: '',
    amount: '',
    month: String(new Date().getMonth() + 1).padStart(2, '0'),
    year: new Date().getFullYear()
  });
  const [documentForm, setDocumentForm] = useState({
    type: 'other',
    name: '',
    url: ''
  });
  const [communicationForm, setCommunicationForm] = useState({
    type: 'email',
    subject: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
    fetchPaybillInfo();
  }, [id]);

  const fetchPaybillInfo = async () => {
    try {
      const response = await configAPI.getPaybillInfo();
      setPaybillInfo(response.data);
    } catch (error) {
      console.error('Error fetching paybill info:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [tenantRes, paymentsRes] = await Promise.all([
        tenantsAPI.getById(id),
        paymentsAPI.getByTenant(id)
      ]);
      setTenant(tenantRes.data);
      setPayments(paymentsRes.data);
      
      // Fetch maintenance requests if tenant has a house
      if (tenantRes.data.house) {
        try {
          const maintenanceRes = await maintenanceAPI.getAll({ house: tenantRes.data.house._id });
          setMaintenanceRequests(maintenanceRes.data);
        } catch (error) {
          console.error('Error fetching maintenance requests:', error);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await tenantsAPI.addDocument(id, documentForm);
      toast.success('Document added successfully');
      setShowDocumentModal(false);
      setDocumentForm({ type: 'other', name: '', url: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding document:', error);
      const errorMessage = error.response?.data?.message || 'Error adding document';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCommunication = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await tenantsAPI.addCommunication(id, communicationForm);
      toast.success('Communication log added successfully');
      setShowCommunicationModal(false);
      setCommunicationForm({
        type: 'email',
        subject: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error) {
      console.error('Error adding communication:', error);
      const errorMessage = error.response?.data?.message || 'Error adding communication';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = (docId) => {
    setDocToDelete(docId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDocument = async () => {
    try {
      await tenantsAPI.deleteDocument(id, docToDelete);
      toast.success('Document deleted successfully');
      setShowDeleteConfirm(false);
      setDocToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting document:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting document';
      toast.error(errorMessage);
    }
  };

  const handleMpesaPayment = async (e) => {
    e.preventDefault();
    if (!tenant.house) {
      toast.warning('Tenant has no house assigned');
      return;
    }

    setMpesaLoading(true);
    try {
      const result = await mpesaAPI.initiateSTKPush({
        phoneNumber: mpesaForm.phoneNumber,
        amount: parseFloat(mpesaForm.amount) || tenant.house.rentAmount,
        houseNumber: tenant.house.houseNumber,
        tenantId: tenant._id,
        month: mpesaForm.month,
        year: mpesaForm.year
      });

      toast.success(`${result.data.message}\n\nPlease check your phone to complete the payment.`);
      setShowMpesaModal(false);
      setMpesaForm({
        phoneNumber: tenant.phone || '',
        amount: tenant.house.rentAmount || '',
        month: String(new Date().getMonth() + 1).padStart(2, '0'),
        year: new Date().getFullYear()
      });
      
      setTimeout(() => {
        fetchData();
      }, 5000);
    } catch (error) {
      console.error('Error initiating M-Pesa payment:', error);
      const errorMessage = error.response?.data?.message || 'Error initiating M-Pesa payment';
      toast.error(errorMessage);
    } finally {
      setMpesaLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading tenant details..." fullScreen />;
  }

  if (!tenant) {
    return <div className="error">Tenant not found</div>;
  }

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.paidAmount || p.amount || 0) + (p.lateFee || 0), 0);
  
  const totalPending = payments
    .filter(p => p.status === 'pending' || p.status === 'overdue' || p.status === 'partial')
    .reduce((sum, p) => sum + (p.deficit || p.expectedAmount || p.amount || 0) + (p.lateFee || 0), 0);
  
  const totalDeficit = payments
    .reduce((sum, p) => sum + (p.deficit || 0), 0);

  return (
    <div className="tenant-detail-page">
      {/* Compact Header */}
      <div className="tenant-header-compact">
        <button className="btn-back-compact" onClick={() => navigate('/tenants')}>
          ←
        </button>
        <div className="tenant-header-content">
          <div className="tenant-avatar-compact">
            {tenant.firstName[0]}{tenant.lastName[0]}
          </div>
          <div className="tenant-info-compact">
            <div className="tenant-name-row">
              <h1>{tenant.firstName} {tenant.lastName}</h1>
              <span className={`status-badge-compact status-${tenant.status}`}>
                {tenant.status}
              </span>
            </div>
            <div className="tenant-contact-row">
              <span className="contact-item">{tenant.email}</span>
              <span className="contact-separator">•</span>
              <span className="contact-item">{tenant.phone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="quick-stats-bar">
        <div className="stat-box">
          <div className="stat-label">Total Paid</div>
          <div className="stat-value success">KSh {totalPaid.toLocaleString()}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Pending</div>
          <div className="stat-value warning">KSh {totalPending.toLocaleString()}</div>
        </div>
        {totalDeficit > 0 && (
          <div className="stat-box">
            <div className="stat-label">Deficit</div>
            <div className="stat-value danger">KSh {totalDeficit.toLocaleString()}</div>
          </div>
        )}
        <div className="stat-box">
          <div className="stat-label">Payments</div>
          <div className="stat-value">{payments.length}</div>
        </div>
        {tenant.house && (
          <div className="stat-box">
            <div className="stat-label">Monthly Rent</div>
            <div className="stat-value">KSh {tenant.house.rentAmount.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Modern Tabs */}
      <div className="modern-tabs">
        <button
          className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span>📊</span> Overview
        </button>
        <button
          className={`tab-item ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <span>💳</span> Payments <span className="badge">{payments.length}</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'maintenance' ? 'active' : ''}`}
          onClick={() => setActiveTab('maintenance')}
        >
          <span>🔧</span> Maintenance <span className="badge">{maintenanceRequests.length}</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'house-history' ? 'active' : ''}`}
          onClick={() => setActiveTab('house-history')}
        >
          <span>🏠</span> Move History
        </button>
        <button
          className={`tab-item ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <span>📄</span> Documents <span className="badge">{tenant.documents?.length || 0}</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'communication' ? 'active' : ''}`}
          onClick={() => setActiveTab('communication')}
        >
          <span>💬</span> Communication <span className="badge">{tenant.communicationLog?.length || 0}</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'payment-info' ? 'active' : ''}`}
          onClick={() => setActiveTab('payment-info')}
        >
          <span>💵</span> Payment Info
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content-wrapper">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="info-section">
              <h2 className="section-title">Lease Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Start Date</span>
                  <span className="info-value">{new Date(tenant.leaseStartDate).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">End Date</span>
                  <span className="info-value">{new Date(tenant.leaseEndDate).toLocaleDateString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <span className={`status-badge-modern status-${tenant.status}`}>{tenant.status}</span>
                </div>
              </div>
            </div>

            {tenant.house && (
              <div className="info-section">
                <h2 className="section-title">Current Residence</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">House Number</span>
                    <span className="info-value highlight">{tenant.house.houseNumber}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Apartment</span>
                    <span className="info-value">{tenant.house.apartment?.name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Address</span>
                    <span className="info-value">{tenant.house.apartment?.address || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Monthly Rent</span>
                    <span className="info-value highlight">KSh {tenant.house.rentAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {tenant.emergencyContact && (
              <div className="info-section">
                <h2 className="section-title">Emergency Contact</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Name</span>
                    <span className="info-value">{tenant.emergencyContact.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone</span>
                    <span className="info-value">{tenant.emergencyContact.phone}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="payments-content">
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Expected</th>
                    <th>Paid</th>
                    <th>Deficit</th>
                    <th>Carried Forward</th>
                    <th>Late Fee</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Period</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="empty-state">No payments found</td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment._id}>
                        <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td>KSh {(payment.expectedAmount || payment.amount || 0).toLocaleString()}</td>
                        <td>KSh {(payment.paidAmount || payment.amount || 0).toLocaleString()}</td>
                        <td className={payment.deficit > 0 ? 'deficit-amount' : 'no-deficit'}>
                          KSh {(payment.deficit || 0).toLocaleString()}
                        </td>
                        <td>KSh {(payment.carriedForward || 0).toLocaleString()}</td>
                        <td>KSh {(payment.lateFee || 0).toLocaleString()}</td>
                        <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge-modern status-${payment.status}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td>{payment.month}/{payment.year}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="maintenance-content">
            {maintenanceRequests.length === 0 ? (
              <div className="empty-state-large">
                <span className="empty-icon">🔧</span>
                <p>No maintenance requests found for this tenant's house.</p>
              </div>
            ) : (
              <div className="maintenance-list-modern">
                {maintenanceRequests.map((request) => (
                  <div key={request._id} className="maintenance-item-modern">
                    <div className="maintenance-header-modern">
                      <div>
                        <h3>{request.title}</h3>
                        <span className="maintenance-category">{request.category}</span>
                      </div>
                      <span className={`status-badge-modern status-${request.status}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="maintenance-description">{request.description}</p>
                    <div className="maintenance-meta">
                      <span className={`meta-tag priority-${request.priority}`}>Priority: {request.priority}</span>
                      <span className="meta-tag">Requested: {new Date(request.requestedDate).toLocaleDateString()}</span>
                      {request.completedDate && (
                        <span className="meta-tag">Completed: {new Date(request.completedDate).toLocaleDateString()}</span>
                      )}
                      {request.cost > 0 && (
                        <span className="meta-tag">Cost: KSh {request.cost.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'house-history' && (
          <div className="house-history-content">
            {!tenant.houseMoveHistory || tenant.houseMoveHistory.length === 0 ? (
              <div className="empty-state-large">
                <span className="empty-icon">🏠</span>
                <p>No house move history found.</p>
              </div>
            ) : (
              <div className="timeline">
                {tenant.houseMoveHistory.map((move, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <h3>Move #{tenant.houseMoveHistory.length - index}</h3>
                        <span className="timeline-date">{new Date(move.moveDate).toLocaleDateString()}</span>
                      </div>
                      <div className="move-details">
                        <div className="move-from-to">
                          <div className="move-location">
                            <span className="move-label">From</span>
                            <span className="move-value">House {move.fromHouse?.houseNumber || 'N/A'}</span>
                            {move.fromApartment?.name && (
                              <span className="move-apartment">{move.fromApartment.name}</span>
                            )}
                          </div>
                          <div className="move-arrow">→</div>
                          <div className="move-location">
                            <span className="move-label">To</span>
                            <span className="move-value">House {move.toHouse?.houseNumber || 'N/A'}</span>
                            {move.toApartment?.name && (
                              <span className="move-apartment">{move.toApartment.name}</span>
                            )}
                          </div>
                        </div>
                        {move.reason && (
                          <div className="move-reason">
                            <strong>Reason:</strong> {move.reason}
                          </div>
                        )}
                        {move.notes && (
                          <div className="move-notes">
                            <strong>Notes:</strong> {move.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="documents-content">
            <div className="section-header">
              <h2 className="section-title">Documents</h2>
              <button className="btn-primary-modern" onClick={() => setShowDocumentModal(true)}>
                + Add Document
              </button>
            </div>
            {tenant.documents && tenant.documents.length > 0 ? (
              <div className="documents-grid">
                {tenant.documents.map((doc) => (
                  <div key={doc._id} className="document-card">
                    <div className="document-icon">📄</div>
                    <div className="document-info">
                      <h3>{doc.name}</h3>
                      <p className="document-type">{doc.type}</p>
                      <p className="document-date">Uploaded: {new Date(doc.uploadedDate).toLocaleDateString()}</p>
                    </div>
                    <div className="document-actions">
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-view">
                          View
                        </a>
                      )}
                      <button className="btn-delete-modern" onClick={() => handleDeleteDocument(doc._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <span className="empty-icon">📄</span>
                <p>No documents uploaded</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'communication' && (
          <div className="communication-content">
            <div className="section-header">
              <h2 className="section-title">Communication Log</h2>
              <button className="btn-primary-modern" onClick={() => setShowCommunicationModal(true)}>
                + Add Log
              </button>
            </div>
            {tenant.communicationLog && tenant.communicationLog.length > 0 ? (
              <div className="communication-list-modern">
                {tenant.communicationLog
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((log, index) => (
                    <div key={index} className="communication-item-modern">
                      <div className="communication-icon">{log.type === 'email' ? '📧' : log.type === 'phone' ? '📞' : '👤'}</div>
                      <div className="communication-details">
                        <div className="communication-header-modern">
                          <h3>{log.subject}</h3>
                          <span className="communication-type-badge">{log.type}</span>
                        </div>
                        <p className="communication-notes">{log.notes}</p>
                        <div className="communication-footer">
                          <span>{new Date(log.date).toLocaleDateString()}</span>
                          {log.createdBy && <span>By: {log.createdBy}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <span className="empty-icon">💬</span>
                <p>No communication logs</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'payment-info' && (
          <div className="payment-info-content">
            {tenant.house && (
              <div className="quick-payment-card">
                <h3>Quick Payment</h3>
                <button
                  className="btn-mpesa-large"
                  onClick={() => {
                    setMpesaForm({
                      phoneNumber: tenant.phone || '',
                      amount: tenant.house.rentAmount || '',
                      month: String(new Date().getMonth() + 1).padStart(2, '0'),
                      year: new Date().getFullYear()
                    });
                    setShowMpesaModal(true);
                  }}
                >
                  📱 Pay via M-Pesa STK Push
                </button>
              </div>
            )}

            {paybillInfo && paybillInfo.paybillNumber ? (
              <div className="payment-instructions-modern">
                <h2>💳 How to Pay Rent</h2>
                <div className="payment-details-modern">
                  <div className="payment-detail-row">
                    <span className="detail-label">Paybill Number</span>
                    <span className="detail-value highlight">{paybillInfo.paybillNumber}</span>
                  </div>
                  <div className="payment-detail-row">
                    <span className="detail-label">Account Number</span>
                    <span className="detail-value highlight">{tenant.house?.houseNumber || 'N/A'}</span>
                  </div>
                  <div className="payment-detail-row">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value highlight">KSh {tenant.house?.rentAmount?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>
                <div className="instructions-modern">
                  <h3>Step-by-Step Instructions</h3>
                  <ol>
                    <li>Go to {paybillInfo.mobileMoneyProvider === 'mpesa' ? 'M-Pesa' : paybillInfo.mobileMoneyProvider?.toUpperCase()} menu</li>
                    <li>Select <strong>"Pay Bill"</strong></li>
                    <li>Enter Business Number: <strong>{paybillInfo.paybillNumber}</strong></li>
                    <li>Enter Account Number: <strong>{tenant.house?.houseNumber || 'Your House Number'}</strong></li>
                    <li>Enter Amount: <strong>KSh {tenant.house?.rentAmount?.toLocaleString() || 'Your Rent Amount'}</strong></li>
                    <li>Enter your PIN and confirm</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="empty-state-large">
                <span className="empty-icon">💵</span>
                <p>Paybill information is not configured yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showDocumentModal && (
        <div className="modal-overlay" onClick={() => setShowDocumentModal(false)}>
          <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
            <h2>Add Document</h2>
            <form onSubmit={handleAddDocument}>
              <div className="form-group">
                <label>Document Type</label>
                <select
                  value={documentForm.type}
                  onChange={(e) => setDocumentForm({ ...documentForm, type: e.target.value })}
                  required
                >
                  <option value="id">ID</option>
                  <option value="lease">Lease</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Document Name</label>
                <input
                  type="text"
                  value={documentForm.name}
                  onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Document URL</label>
                <input
                  type="url"
                  value={documentForm.url}
                  onChange={(e) => setDocumentForm({ ...documentForm, url: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary-modern">Add Document</button>
                <button type="button" className="btn-secondary-modern" onClick={() => setShowDocumentModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCommunicationModal && (
        <div className="modal-overlay" onClick={() => setShowCommunicationModal(false)}>
          <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
            <h2>Add Communication Log</h2>
            <form onSubmit={handleAddCommunication}>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={communicationForm.type}
                  onChange={(e) => setCommunicationForm({ ...communicationForm, type: e.target.value })}
                  required
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="in_person">In Person</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={communicationForm.date}
                  onChange={(e) => setCommunicationForm({ ...communicationForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={communicationForm.subject}
                  onChange={(e) => setCommunicationForm({ ...communicationForm, subject: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={communicationForm.notes}
                  onChange={(e) => setCommunicationForm({ ...communicationForm, notes: e.target.value })}
                  rows="4"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary-modern">Add Log</button>
                <button type="button" className="btn-secondary-modern" onClick={() => setShowCommunicationModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMpesaModal && tenant.house && (
        <div className="modal-overlay" onClick={() => setShowMpesaModal(false)}>
          <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
            <h2>📱 Pay via M-Pesa STK Push</h2>
            <p className="modal-description">Enter your phone number to receive an M-Pesa prompt</p>
            <form onSubmit={handleMpesaPayment}>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={mpesaForm.phoneNumber}
                  onChange={(e) => setMpesaForm({ ...mpesaForm, phoneNumber: e.target.value })}
                  placeholder="254712345678 or 0712345678"
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount (KSh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={mpesaForm.amount}
                  onChange={(e) => setMpesaForm({ ...mpesaForm, amount: e.target.value })}
                  placeholder={tenant.house.rentAmount}
                  required
                />
                <small>Monthly rent: KSh {tenant.house.rentAmount.toLocaleString()}</small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Month</label>
                  <input
                    type="text"
                    value={mpesaForm.month}
                    onChange={(e) => setMpesaForm({ ...mpesaForm, month: e.target.value })}
                    placeholder="01-12"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={mpesaForm.year}
                    onChange={(e) => setMpesaForm({ ...mpesaForm, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary-modern" disabled={mpesaLoading}>
                  {mpesaLoading ? 'Processing...' : '📱 Send M-Pesa Prompt'}
                </button>
                <button type="button" className="btn-secondary-modern" onClick={() => setShowMpesaModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDocToDelete(null); }}
        onConfirm={confirmDeleteDocument}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {(submitting || mpesaLoading) && <LoadingSpinner fullScreen />}
    </div>
  );
};

export default TenantDetail;
