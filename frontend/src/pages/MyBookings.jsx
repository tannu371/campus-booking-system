import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BookingModal from '../components/BookingModal';
import './MyBookings.css';

const MyBookings = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editBooking, setEditBooking] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/mine');
      setBookings(res.data);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.delete(`/bookings/${id}`);
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (err) {
      toast.error('Failed to cancel booking');
    }
  };

  const handleModify = async (data) => {
    try {
      await api.put(`/bookings/${editBooking._id}`, data);
      toast.success('Booking updated');
      setEditBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">My Bookings</h1>
          <p className="page-subtitle">Manage your room reservations</p>
        </div>

        <div className="bookings-filters">
          {['all', 'approved', 'pending', 'cancelled', 'rejected'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'filter-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="filter-count">
                  {bookings.filter(b => b.status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bookings-loading">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 12 }}></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rooms-empty">
            <div className="empty-icon">📅</div>
            <h3>No bookings found</h3>
            <p>{filter === 'all' ? "You haven't booked any rooms yet." : `No ${filter} bookings.`}</p>
            <button className="btn btn-primary" onClick={() => navigate('/rooms')} style={{ marginTop: 16 }}>
              Browse Rooms
            </button>
          </div>
        ) : (
          <div className="bookings-list">
            {filtered.map(booking => (
              <div key={booking._id} className="booking-item glass">
                <div className="booking-item-main">
                  <div className="booking-item-info">
                    <h3 className="booking-item-title">{booking.title}</h3>
                    <p className="booking-item-room">
                      {booking.room?.name || 'Room'} • {booking.room?.building || ''}
                    </p>
                  </div>
                  <div className="booking-item-time">
                    <span className="booking-date">{formatDate(booking.date)}</span>
                    <span className="booking-time">{booking.startTime} - {booking.endTime}</span>
                  </div>
                  <span className={`badge badge-${booking.status}`}>
                    {booking.status}
                  </span>
                  {(booking.status === 'approved' || booking.status === 'pending') && (
                    <div className="booking-item-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditBooking(booking)}
                      >
                        Modify
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancel(booking._id)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                {booking.purpose && (
                  <p className="booking-item-purpose">{booking.purpose}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {editBooking && editBooking.room && (
          <BookingModal
            room={editBooking.room}
            existingBooking={editBooking}
            onClose={() => setEditBooking(null)}
            onSubmit={handleModify}
          />
        )}
      </div>
    </div>
  );
};

export default MyBookings;
