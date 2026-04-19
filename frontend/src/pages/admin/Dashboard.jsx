import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/AdminLayout';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, roomsRes, activityRes] = await Promise.all([
        api.get('/bookings/stats'),
        api.get('/rooms'),
        api.get('/audit/recent?limit=8').catch(() => ({ data: [] }))
      ]);
      setStats({
        ...statsRes.data,
        totalRooms: roomsRes.data.length
      });
      setActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
    } catch (err) {
      console.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const formatActivityAction = (log) => {
    const actionLabels = {
      BOOKING_CREATED: '📅 created a booking',
      BOOKING_CANCELLED: '❌ cancelled a booking',
      BOOKING_APPROVED: '✅ approved a booking',
      BOOKING_REJECTED: '🚫 rejected a booking',
      BOOKING_CHECKED_IN: '✔️ checked in',
      ADMIN_OVERRIDE: '⚡ performed an admin override',
      ROOM_CREATED: '🏢 added a new room',
      ROOM_UPDATED: '✏️ updated a room',
      ROOM_DEACTIVATED: '🔴 deactivated a room',
      USER_REGISTERED: '👤 registered',
      USER_SUSPENDED: '⚠️ suspended a user',
      USER_LOGIN: '🔑 logged in'
    };
    const performer = log.performedBy?.name || 'System';
    const action = actionLabels[log.action] || log.action;
    const detail = log.details?.room || log.details?.title || log.details?.name || '';
    return { performer, action, detail };
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-stats-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }}></div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1>Dashboard Overview</h1>
        <p>Monitor campus facilities and booking activity</p>
      </div>

      {/* Needs Attention */}
      {stats && (stats.pendingBookings > 0) && (
        <div className="attention-panel">
          <div className="attention-title">⚡ Needs Attention</div>
          {stats.pendingBookings > 0 && (
            <div className="attention-item">
              <span>🟡 {stats.pendingBookings} booking{stats.pendingBookings !== 1 ? 's' : ''} awaiting approval</span>
              <Link to="/admin/bookings">Review Now →</Link>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.totalRooms}</div>
              <div className="admin-stat-label">Total Rooms</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.totalBookings}</div>
              <div className="admin-stat-label">Total Bookings</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value accent">{stats.pendingBookings}</div>
              <div className="admin-stat-label">Pending Approval</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value secondary">{stats.approvedBookings}</div>
              <div className="admin-stat-label">Approved</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.todayBookings || 0}</div>
              <div className="admin-stat-label">Today's Bookings</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.totalUsers || 0}</div>
              <div className="admin-stat-label">Active Users</div>
            </div>
          </div>

          <div className="dashboard-bottom-grid">
            {/* Bookings by Room */}
            {stats.bookingsPerRoom && stats.bookingsPerRoom.length > 0 && (
              <div className="admin-section">
                <h3 className="admin-section-title">📊 Bookings by Room</h3>
                <div className="usage-chart">
                  {stats.bookingsPerRoom.slice(0, 8).map((item, i) => {
                    const maxCount = Math.max(...stats.bookingsPerRoom.map(r => r.count));
                    const percent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={i} className="usage-bar-row">
                        <span className="usage-bar-label">{item.roomName}</span>
                        <div className="usage-bar-track">
                          <div className="usage-bar-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="usage-bar-count">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="admin-section">
              <h3 className="admin-section-title">🕐 Recent Activity</h3>
              {activity.length > 0 ? (
                <div className="activity-feed">
                  {activity.map((log, i) => {
                    const { performer, action, detail } = formatActivityAction(log);
                    return (
                      <div key={i} className="activity-item">
                        <div className="activity-dot"></div>
                        <div className="activity-content">
                          <strong>{performer}</strong> {action}
                          {detail && <> · <em>{detail}</em></>}
                        </div>
                        <div className="activity-time">{timeAgo(log.createdAt)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent activity</p>
              )}
              <div style={{ marginTop: 12 }}>
                <Link to="/admin/audit" style={{ fontSize: '0.85rem', fontWeight: 600 }}>View Full Audit Log →</Link>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="admin-quick-actions">
            <Link to="/admin/rooms" className="quick-action glass">
              <span className="quick-action-icon">🏢</span>
              <span className="quick-action-text">Manage Rooms</span>
              <span className="quick-action-arrow">→</span>
            </Link>
            <Link to="/admin/bookings" className="quick-action glass">
              <span className="quick-action-icon">📅</span>
              <span className="quick-action-text">Manage Bookings</span>
              <span className="quick-action-arrow">→</span>
            </Link>
            <Link to="/admin/users" className="quick-action glass">
              <span className="quick-action-icon">👥</span>
              <span className="quick-action-text">Manage Users</span>
              <span className="quick-action-arrow">→</span>
            </Link>
            <Link to="/admin/analytics" className="quick-action glass">
              <span className="quick-action-icon">📈</span>
              <span className="quick-action-text">View Analytics</span>
              <span className="quick-action-arrow">→</span>
            </Link>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default Dashboard;
