import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './Admin.css';

const ManageBookings = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchBookings();
  }, [user, filter]);

  const fetchBookings = async () => {
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await api.get('/bookings', { params });
      setBookings(res.data);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/status`, { status });
      toast.success(`Booking ${status}`);
      fetchBookings();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="page">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1 className="page-title">Manage Bookings</h1>
            <p className="page-subtitle">Review and manage all booking requests</p>
          </div>
          <div className="admin-nav">
            <Link to="/admin" className="admin-nav-link">Overview</Link>
            <Link to="/admin/rooms" className="admin-nav-link">Rooms</Link>
            <Link to="/admin/bookings" className="admin-nav-link active">Bookings</Link>
          </div>
        </div>

        <div className="bookings-filters" style={{ marginBottom: 24 }}>
          {['', 'pending', 'approved', 'rejected', 'cancelled'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'filter-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 300, borderRadius: 16 }}></div>
        ) : bookings.length === 0 ? (
          <div className="rooms-empty">
            <div className="empty-icon">📋</div>
            <h3>No bookings found</h3>
            <p>{filter ? `No ${filter} bookings.` : 'No bookings yet.'}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Room</th>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id}>
                    <td>{b.user?.name || 'Unknown'}</td>
                    <td>{b.room?.name || 'Unknown'}</td>
                    <td style={{ fontWeight: 500 }}>{b.title}</td>
                    <td>{formatDate(b.date)}</td>
                    <td>{b.startTime} - {b.endTime}</td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td>
                      <div className="table-actions">
                        {b.status === 'pending' && (
                          <>
                            <button className="btn btn-success btn-sm"
                              onClick={() => handleStatusUpdate(b._id, 'approved')}>
                              Approve
                            </button>
                            <button className="btn btn-danger btn-sm"
                              onClick={() => handleStatusUpdate(b._id, 'rejected')}>
                              Reject
                            </button>
                          </>
                        )}
                        {b.status === 'approved' && (
                          <button className="btn btn-danger btn-sm"
                            onClick={() => handleStatusUpdate(b._id, 'cancelled')}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageBookings;
