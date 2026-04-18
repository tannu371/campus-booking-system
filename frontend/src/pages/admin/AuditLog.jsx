import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/AdminLayout';

const AuditLog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchLogs();
  }, [user, page, actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 25 };
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/audit', { params });
      setLogs(res.data.logs || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const icons = {
    BOOKING_CREATED: '📅', BOOKING_CANCELLED: '❌', BOOKING_APPROVED: '✅',
    BOOKING_REJECTED: '🚫', BOOKING_CHECKED_IN: '✔️', ADMIN_OVERRIDE: '⚡',
    ROOM_CREATED: '🏢', ROOM_UPDATED: '🔧', ROOM_DEACTIVATED: '🔴',
    USER_REGISTERED: '👤', USER_SUSPENDED: '⚠️', USER_ACTIVATED: '🟢',
    USER_LOGIN: '🔑', USER_ROLE_CHANGED: '🏷️'
  };

  const fmt = (a) => (a || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1>Audit Log</h1>
        <p>Complete history of all system actions</p>
      </div>

      <div className="admin-filter-bar">
        <select className="form-select" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="BOOKING_CREATED">Booking Created</option>
          <option value="BOOKING_CANCELLED">Booking Cancelled</option>
          <option value="BOOKING_APPROVED">Booking Approved</option>
          <option value="BOOKING_REJECTED">Booking Rejected</option>
          <option value="ADMIN_OVERRIDE">Admin Override</option>
          <option value="ROOM_CREATED">Room Created</option>
          <option value="ROOM_UPDATED">Room Updated</option>
          <option value="USER_REGISTERED">User Registered</option>
          <option value="USER_SUSPENDED">User Suspended</option>
          <option value="USER_LOGIN">User Login</option>
        </select>
      </div>

      <div className="admin-section" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs found</div>
        ) : logs.map((log) => (
          <div key={log._id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>{icons[log.action] || '📋'}</span>
              <span className="badge" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>{fmt(log.action)}</span>
              <span style={{ flex: 1, fontSize: '0.88rem' }}>{log.performedBy?.name || 'System'}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            {expandedId === log._id && log.details && (
              <pre style={{ marginTop: 10, padding: 10, background: 'var(--surface)', borderRadius: 8, fontSize: '0.78rem', overflow: 'auto', maxHeight: 200 }}>
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
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

export default AuditLog;
