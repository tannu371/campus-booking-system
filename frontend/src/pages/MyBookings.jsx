import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './MyBookings.css';

const priorityLabels = {
  1: { label: 'Critical', color: '#ef4444' },
  2: { label: 'High', color: '#f59e0b' },
  3: { label: 'Medium', color: '#3b82f6' },
  4: { label: 'Normal', color: '#6b7280' },
  5: { label: 'Low', color: '#9ca3af' }
};

const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [cancelRecurringModal, setCancelRecurringModal] = useState(null);

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

  const handleCancelRecurring = async (groupId, scope, fromDate) => {
    try {
      await api.delete(`/bookings/recurring/${groupId}`, {
        data: { scope, fromDate }
      });
      showToast(`Recurring booking cancelled (${scope})`, 'success');
      setCancelRecurringModal(null);
      fetchBookings();
    } catch (err) {
      showToast('Failed to cancel recurring booking', 'error');
    }
  };

  const formatAutoReleaseTime = (autoReleaseAt) => {
    if (!autoReleaseAt) return null;
    const date = new Date(autoReleaseAt);
    const now = new Date();
    if (date < now) return 'Expired';
    
    const diff = date - now;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
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
    no_show: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'No Show' },
    auto_released: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Auto-Released' }
  };

  const isToday = (date) => new Date(date).toDateString() === new Date().toDateString();
  const canCheckIn = (b) => b.status === 'approved' && !b.checkedIn && isToday(b.date);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <div className="my-bookings-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>My Bookings</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{bookings.length} total bookings</p>
        </div>
        <Link to="/rooms" className="btn btn-primary">+ New Booking</Link>
      </div>

      {/* Filter tabs */}
      <div className="my-bookings-filters">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'pending', label: 'Pending' },
          { key: 'past', label: 'Past' },
          { key: 'cancelled', label: 'Cancelled' }
        ].map(f => (
          <button key={f.key} className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '8px 16px' }}
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
            const priority = priorityLabels[b.priorityLevel] || priorityLabels[4];
            const autoReleaseTime = formatAutoReleaseTime(b.autoReleaseAt);
            
            return (
              <div key={b._id} className="glass booking-card" style={{ borderLeft: `4px solid ${st.color}` }}>
                <div className="booking-card-inner">
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{b.title}</h3>
                      <span className="badge" style={{ background: st.bg, color: st.color, fontSize: '0.7rem', padding: '2px 8px' }}>
                        {st.label}
                      </span>
                      {b.checkedIn && (
                        <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '0.65rem', padding: '1px 6px' }}>
                          ✓ Checked In
                        </span>
                      )}
                      {b.priorityLevel && b.priorityLevel < 4 && (
                        <span className="badge" style={{ background: `${priority.color}20`, color: priority.color, fontSize: '0.65rem', padding: '1px 6px' }}>
                          {priority.label} Priority
                        </span>
                      )}
                      {b.recurrenceGroupId && (
                        <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: '0.65rem', padding: '1px 6px' }}>
                          🔄 Recurring
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>🏢 {b.room?.name || 'Room'}</span>
                      <span>📅 {new Date(b.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span>🕐 {b.startTime} – {b.endTime}</span>
                      {b.attendeeCount && <span>👥 {b.attendeeCount}</span>}
                    </div>
                    {b.purpose && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>{b.purpose}</p>}
                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {b.confirmationCode && (
                        <span>
                          Code: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.confirmationCode}</span>
                        </span>
                      )}
                      {autoReleaseTime && b.status === 'approved' && !b.checkedIn && (
                        <span style={{ color: '#f59e0b' }}>
                          ⏱️ Auto-release in {autoReleaseTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="booking-card-actions">
                    {canCheckIn(b) && (
                      <button className="btn btn-success btn-sm" onClick={() => handleCheckIn(b._id)}>
                        ✓ Check In
                      </button>
                    )}
                    {['approved', 'pending'].includes(b.status) && !b.recurrenceGroupId && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b._id)}>
                        Cancel
                      </button>
                    )}
                    {['approved', 'pending'].includes(b.status) && b.recurrenceGroupId && b.isRecurringParent && (
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => setCancelRecurringModal({ groupId: b.recurrenceGroupId, date: b.date })}
                      >
                        Cancel Series
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Cancel Recurring Booking Modal */}
      {cancelRecurringModal && (
        <div className="modal-overlay" onClick={() => setCancelRecurringModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Cancel Recurring Booking</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Choose which bookings to cancel:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleCancelRecurring(cancelRecurringModal.groupId, 'THIS_ONLY', cancelRecurringModal.date)}
              >
                This Booking Only
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleCancelRecurring(cancelRecurringModal.groupId, 'THIS_AND_FUTURE', cancelRecurringModal.date)}
              >
                This and Future Bookings
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleCancelRecurring(cancelRecurringModal.groupId, 'ALL')}
              >
                All Bookings in Series
              </button>
              <button 
                className="btn btn-ghost" 
                onClick={() => setCancelRecurringModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
