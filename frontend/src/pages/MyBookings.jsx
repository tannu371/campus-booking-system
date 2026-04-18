import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/mine');
      setBookings(res.data);
    } catch (err) {
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await api.delete(`/bookings/${id}`);
      showToast('Booking cancelled', 'success');
      fetchBookings();
    } catch (err) {
      showToast('Failed to cancel', 'error');
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await api.put(`/bookings/${id}/checkin`);
      showToast('Checked in successfully! ✓', 'success');
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to check in', 'error');
    }
  };

  const filtered = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return ['approved', 'pending'].includes(b.status) && new Date(b.date) >= new Date(new Date().toDateString());
    if (filter === 'past') return new Date(b.date) < new Date(new Date().toDateString()) || ['completed', 'no_show'].includes(b.status);
    return b.status === filter;
  });

  const statusColors = {
    approved: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Approved' },
    pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Pending' },
    rejected: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Rejected' },
    cancelled: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: 'Cancelled' },
    completed: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Completed' },
    no_show: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'No Show' }
  };

  const isToday = (date) => new Date(date).toDateString() === new Date().toDateString();
  const canCheckIn = (b) => b.status === 'approved' && !b.checkedIn && isToday(b.date);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>My Bookings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{bookings.length} total bookings</p>
        </div>
        <Link to="/rooms" className="btn btn-primary">+ New Booking</Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'pending', label: 'Pending' },
          { key: 'past', label: 'Past' },
          { key: 'cancelled', label: 'Cancelled' }
        ].map(f => (
          <button key={f.key} className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="glass" style={{ textAlign: 'center', padding: 60, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📅</div>
          <h3>No bookings found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            {filter === 'all' ? "You haven't made any bookings yet." : `No ${filter} bookings.`}
          </p>
          <Link to="/rooms" className="btn btn-primary">Browse Rooms</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(b => {
            const st = statusColors[b.status] || statusColors.pending;
            return (
              <div key={b._id} className="glass" style={{ padding: 20, borderRadius: 'var(--radius-lg)', borderLeft: `4px solid ${st.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{b.title}</h3>
                      <span className="badge" style={{ background: st.bg, color: st.color, fontSize: '0.7rem', padding: '2px 8px' }}>{st.label}</span>
                      {b.checkedIn && <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '0.65rem', padding: '1px 6px' }}>✓ Checked In</span>}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>🏢 {b.room?.name || 'Room'}</span>
                      <span>📅 {new Date(b.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span>🕐 {b.startTime} – {b.endTime}</span>
                      {b.attendeeCount && <span>👥 {b.attendeeCount}</span>}
                    </div>
                    {b.purpose && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>{b.purpose}</p>}
                    {b.confirmationCode && (
                      <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Code: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.confirmationCode}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {canCheckIn(b) && (
                      <button className="btn btn-success" style={{ fontSize: '0.82rem', padding: '6px 14px' }} onClick={() => handleCheckIn(b._id)}>
                        ✓ Check In
                      </button>
                    )}
                    {['approved', 'pending'].includes(b.status) && (
                      <button className="btn btn-danger" style={{ fontSize: '0.82rem', padding: '6px 14px' }} onClick={() => handleCancel(b._id)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
