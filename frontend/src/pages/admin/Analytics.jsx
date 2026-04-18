import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/AdminLayout';

const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/bookings/stats?period=30');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <AdminLayout><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics...</div></AdminLayout>;

  const maxTrend = stats?.bookingTrend ? Math.max(...stats.bookingTrend.map(d => d.count), 1) : 1;

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <h1>Analytics</h1>
        <p>Campus booking insights and trends (last 30 days)</p>
      </div>

      {stats && (
        <>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.totalBookings}</div>
              <div className="admin-stat-label">Total Bookings</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value accent">{stats.recentBookings}</div>
              <div className="admin-stat-label">Last 30 Days</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value secondary">{stats.todayBookings || 0}</div>
              <div className="admin-stat-label">Today</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.noShowRate || '0.0'}%</div>
              <div className="admin-stat-label">No-Show Rate</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.checkedInToday || 0}</div>
              <div className="admin-stat-label">Checked In Today</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{stats.cancelledBookings}</div>
              <div className="admin-stat-label">Cancelled</div>
            </div>
          </div>

          {/* Booking Trend Chart */}
          {stats.bookingTrend && stats.bookingTrend.length > 0 && (
            <div className="admin-section">
              <h3 className="admin-section-title">📈 Daily Booking Volume</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 180, paddingTop: 20 }}>
                {stats.bookingTrend.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{d.count}</span>
                    <div style={{
                      width: '100%',
                      maxWidth: 32,
                      height: `${(d.count / maxTrend) * 140}px`,
                      minHeight: 4,
                      background: 'var(--gradient-primary)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.5s ease'
                    }}></div>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                      {d._id.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
            {/* Status Breakdown */}
            <div className="admin-section">
              <h3 className="admin-section-title">📊 Booking Status</h3>
              <div className="usage-chart">
                {[
                  { label: 'Approved', count: stats.approvedBookings, color: '#22c55e' },
                  { label: 'Pending', count: stats.pendingBookings, color: '#f59e0b' },
                  { label: 'Cancelled', count: stats.cancelledBookings, color: '#ef4444' },
                  { label: 'Rejected', count: stats.rejectedBookings, color: '#6b7280' }
                ].map((item, i) => {
                  const max = Math.max(stats.approvedBookings, stats.pendingBookings, stats.cancelledBookings, stats.rejectedBookings, 1);
                  return (
                    <div key={i} className="usage-bar-row">
                      <span className="usage-bar-label">{item.label}</span>
                      <div className="usage-bar-track">
                        <div className="usage-bar-fill" style={{ width: `${(item.count / max) * 100}%`, background: item.color }}></div>
                      </div>
                      <span className="usage-bar-count">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Rooms */}
            {stats.bookingsPerRoom && stats.bookingsPerRoom.length > 0 && (
              <div className="admin-section">
                <h3 className="admin-section-title">🏢 Most Booked Rooms</h3>
                <div className="usage-chart">
                  {stats.bookingsPerRoom.slice(0, 6).map((item, i) => {
                    const max = Math.max(...stats.bookingsPerRoom.map(r => r.count), 1);
                    return (
                      <div key={i} className="usage-bar-row">
                        <span className="usage-bar-label" title={item.building}>{item.roomName}</span>
                        <div className="usage-bar-track">
                          <div className="usage-bar-fill" style={{ width: `${(item.count / max) * 100}%` }}></div>
                        </div>
                        <span className="usage-bar-count">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default Analytics;
