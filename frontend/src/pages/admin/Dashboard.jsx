import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const [statsRes, roomsRes] = await Promise.all([
        api.get('/bookings/stats'),
        api.get('/rooms')
      ]);
      setStats({
        ...statsRes.data,
        totalRooms: roomsRes.data.length
      });
    } catch (err) {
      console.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="grid grid-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Manage campus facilities and bookings</p>
          </div>
          <div className="admin-nav">
            <Link to="/admin" className="admin-nav-link active">Overview</Link>
            <Link to="/admin/rooms" className="admin-nav-link">Rooms</Link>
            <Link to="/admin/bookings" className="admin-nav-link">Bookings</Link>
          </div>
        </div>

        {stats && (
          <>
            <div className="grid grid-4 stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.totalRooms}</div>
                <div className="stat-label">Total Rooms</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.totalBookings}</div>
                <div className="stat-label">Total Bookings</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {stats.pendingBookings}
                </div>
                <div className="stat-label">Pending Approval</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ background: 'var(--gradient-secondary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {stats.approvedBookings}
                </div>
                <div className="stat-label">Approved</div>
              </div>
            </div>

            {stats.bookingsPerRoom && stats.bookingsPerRoom.length > 0 && (
              <div className="admin-section glass">
                <h3 className="detail-section-title">Bookings by Room</h3>
                <div className="usage-chart">
                  {stats.bookingsPerRoom.map((item, i) => {
                    const maxCount = Math.max(...stats.bookingsPerRoom.map(r => r.count));
                    const percent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={i} className="usage-bar-row">
                        <span className="usage-bar-label">{item.roomName}</span>
                        <div className="usage-bar-track">
                          <div
                            className="usage-bar-fill"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <span className="usage-bar-count">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="admin-quick-actions">
              <Link to="/admin/rooms" className="quick-action glass">
                <span className="quick-action-icon">🏢</span>
                <span className="quick-action-text">Manage Rooms</span>
                <span className="quick-action-arrow">→</span>
              </Link>
              <Link to="/admin/bookings" className="quick-action glass">
                <span className="quick-action-icon">📋</span>
                <span className="quick-action-text">Manage Bookings</span>
                <span className="quick-action-arrow">→</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
