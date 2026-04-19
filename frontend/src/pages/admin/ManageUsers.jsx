import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';

const ManageUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchUsers();
    fetchStats();
  }, [user, page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/users', { params });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/users/stats');
      setStats(res.data);
    } catch (err) {}
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleStatusChange = async (userId, newStatus, reason = '') => {
    try {
      await api.put(`/users/${userId}/status`, { status: newStatus, reason });
      showToast(`User ${newStatus} successfully`, 'success');
      setSuspendReason('');
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast('Failed to update user status', 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      showToast(`Role updated to ${newRole}`, 'success');
      fetchUsers();
    } catch (err) {
      showToast('Failed to update role', 'error');
    }
  };

  const roleBadge = (role) => {
    const colors = { admin: '#ef4444', faculty: '#8b5cf6', staff: '#f59e0b', user: '#3b82f6' };
    return (
      <span className="badge" style={{ background: colors[role] || '#6b7280', color: '#fff', fontSize: '0.72rem', padding: '2px 8px' }}>
        {role}
      </span>
    );
  };

  const statusBadge = (status) => {
    const styles = {
      active: { background: 'rgba(34,197,94,0.15)', color: '#22c55e' },
      suspended: { background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
      deactivated: { background: 'rgba(107,114,128,0.15)', color: '#6b7280' }
    };
    const s = styles[status] || styles.active;
    return <span className="badge" style={{ ...s, fontSize: '0.72rem', padding: '2px 8px' }}>{status}</span>;
  };

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1>User Management</h1>
        <p>Manage campus users, roles, and access</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.totalUsers}</div>
            <div className="admin-stat-label">Total Users</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value secondary">{stats.activeUsers}</div>
            <div className="admin-stat-label">Active</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value accent">{stats.suspendedUsers}</div>
            <div className="admin-stat-label">Suspended</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-value">{stats.newThisMonth}</div>
            <div className="admin-stat-label">New This Month</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <form onSubmit={handleSearch} className="admin-filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, email, dept..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        <select className="form-select" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="user">Student</option>
          <option value="faculty">Faculty</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
        </select>
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
      </form>

      {/* Users Table */}
      <div className="admin-section" style={{ padding: 0, overflow: 'auto' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Bookings</th>
              <th style={thStyle}>Joined</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{u.name}</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                </td>
                <td style={tdStyle}>{u.department || '—'}</td>
                <td style={tdStyle}>{roleBadge(u.role)}</td>
                <td style={tdStyle}>{statusBadge(u.status)}</td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 600 }}>{u.activeBookings || 0}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}> / {u.bookingCount || 0} total</span>
                </td>
                <td style={{ ...tdStyle, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td style={tdStyle}>
                  <div className="table-actions">
                    {u.role !== 'admin' && (
                      <select
                        className="form-select"
                        style={{ fontSize: '0.8rem', padding: '6px 8px', maxWidth: 110 }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      >
                        <option value="user">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    {u.status === 'active' && u._id !== user._id && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setSelectedUser(u)}
                      >
                        Suspend
                      </button>
                    )}
                    {u.status === 'suspended' && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleStatusChange(u._id, 'active')}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button className="pagination-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Suspend Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Suspend {selectedUser.name}?</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '12px 0' }}>
              This will prevent the user from creating new bookings. Existing bookings will not be affected.
            </p>
            <div className="form-group">
              <label className="form-label">Reason for suspension</label>
              <textarea
                className="form-textarea"
                rows="3"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason..."
              ></textarea>
            </div>
            <div className="booking-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleStatusChange(selectedUser._id, 'suspended', suspendReason)}>
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '0.78rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  borderBottom: '2px solid var(--border)',
  background: 'var(--bg-secondary)'
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: '0.88rem'
};

export default ManageUsers;
