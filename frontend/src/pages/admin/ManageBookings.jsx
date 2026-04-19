import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';

const ManageBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchBookings();
  }, [user, page, statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/bookings', { params });
      setBookings(res.data.bookings || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status, reason = '') => {
    try {
      await api.put(`/bookings/${id}/status`, { status, reason });
      showToast(`Booking ${status}`, 'success');
      fetchBookings();
    } catch (err) {
      const errData = err.response?.data;
      if (err.response?.status === 409 && errData?.error === 'APPROVAL_CONFLICT') {
        showToast('Already approved for that time slot', 'error');
        return;
      }
      showToast(errData?.message || 'Failed to update', 'error');
    }
  };

  const statusBadge = (status) => {
    const styles = {
      pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
      approved: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
      rejected: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
      cancelled: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' },
      completed: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
      no_show: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }
    };
    const s = styles[status] || styles.pending;
    return <span className="badge" style={{ background: s.bg, color: s.color, fontSize: '0.72rem', padding: '2px 8px' }}>{status}</span>;
  };

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1>Manage Bookings</h1>
        <p>Review, approve, and manage all bookings</p>
      </div>

      <div className="admin-filter-bar">
        <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="admin-section" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : bookings.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No bookings found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Code', 'Title', 'Room', 'User', 'Date & Time', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {b.confirmationCode || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{b.title}</strong>
                    {b.attendeeCount && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.attendeeCount} attendees</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.88rem' }}>{b.room?.name || 'N/A'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '0.88rem' }}>{b.user?.name || 'N/A'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.user?.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                    {new Date(b.date).toLocaleDateString()}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.startTime} – {b.endTime}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {statusBadge(b.status)}
                    {b.checkedIn && <span className="badge" style={{ marginLeft: 4, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '0.65rem', padding: '1px 5px' }}>✓ In</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="table-actions">
                      {b.status === 'pending' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(b._id, 'approved')}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleStatusUpdate(b._id, 'rejected', 'Rejected by admin')}>Reject</button>
                        </>
                      )}
                      {b.status === 'approved' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleStatusUpdate(b._id, 'cancelled', 'Cancelled by admin')}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageBookings;
