import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import './BookingModal.css';

const BookingModal = ({ room, selectedDate, selectedTime, onClose, onBooked }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    title: '',
    date: selectedDate || '',
    startTime: selectedTime || '',
    endTime: '',
    purpose: '',
    attendeeCount: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [conflict, setConflict] = useState(null);

  useEffect(() => {
    if (selectedDate) setForm(f => ({ ...f, date: selectedDate }));
    if (selectedTime) setForm(f => ({ ...f, startTime: selectedTime }));
  }, [selectedDate, selectedTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        room: room._id,
        title: form.title,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose,
        attendeeCount: form.attendeeCount ? parseInt(form.attendeeCount) : null
      };

      const res = await api.post('/bookings', data);
      const booking = res.data;

      setSuccess({
        confirmationCode: booking.confirmationCode,
        status: booking.status,
        title: booking.title
      });

      showToast(
        booking.status === 'pending'
          ? 'Booking submitted for approval!'
          : 'Room booked successfully!',
        'success'
      );

      if (onBooked) onBooked(booking);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.error === 'BOOKING_CONFLICT') {
        setConflict({
          message: errData.message,
          conflictingBookings: errData.conflicting_bookings || [],
          alternativeRooms: errData.alternative_rooms || [],
          bufferMinutes: errData.buffer_minutes || 0
        });
        showToast(errData.message || 'Time slot conflicts with an existing booking', 'error');
      } else if (err.response?.status === 401) {
        showToast('Session expired. Please log in again.', 'error');
      } else if (errData?.errors) {
        showToast(errData.errors[0]?.message || 'Validation failed', 'error');
      } else {
        showToast(errData?.message || 'Failed to create booking. Please try another slot.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>
              {success.status === 'pending' ? '📋' : '✅'}
            </div>
            <h2 style={{ marginBottom: 8 }}>
              {success.status === 'pending' ? 'Submitted for Approval' : 'Booking Confirmed!'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{success.title}</p>
            {success.confirmationCode && (
              <div style={{
                background: 'var(--surface)',
                padding: '12px 20px',
                borderRadius: 'var(--radius-md)',
                display: 'inline-block',
                marginBottom: 16
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Confirmation Code</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, letterSpacing: 2 }}>
                  {success.confirmationCode}
                </div>
              </div>
            )}
            {success.status === 'pending' && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                This room requires admin approval. You'll be notified when it's approved.
              </p>
            )}
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  if (conflict) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ marginBottom: 8 }}>Booking Conflict</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              {conflict.message}
            </p>
            
            {conflict.conflictingBookings.length > 0 && (
              <div style={{ 
                background: 'rgba(239,68,68,0.1)', 
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: 16,
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
                  Conflicting Bookings:
                </div>
                {conflict.conflictingBookings.map((cb, i) => (
                  <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    • {cb.title} ({cb.startTime} - {cb.endTime})
                  </div>
                ))}
                {conflict.bufferMinutes > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    Note: {conflict.bufferMinutes} minute buffer time applied
                  </div>
                )}
              </div>
            )}

            {conflict.alternativeRooms && conflict.alternativeRooms.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>
                  Alternative Rooms Available:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {conflict.alternativeRooms.map((alt) => (
                    <a
                      key={alt._id}
                      href={`/rooms/${alt._id}`}
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none', fontSize: '0.85rem' }}
                    >
                      {alt.name} - {alt.building}, Floor {alt.floor} (Capacity: {alt.capacity})
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConflict(null)}>
                Try Different Time
              </button>
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Book {room.name}</h2>
        {room.requiresApproval && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#f59e0b' }}>
            ⚠️ This room requires admin approval
          </div>
        )}
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          {room.building} · Floor {room.floor} · Capacity {room.capacity} · Hours {room.operatingHoursStart || '07:00'}–{room.operatingHoursEnd || '22:00'}
          {room.bufferMinutes > 0 && ` · ${room.bufferMinutes}min buffer`}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Study Group, Workshop..." />
          </div>
          <div className="booking-datetime-grid">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">Start *</label>
              <input className="form-input" type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">End *</label>
              <input className="form-input" type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Attendees</label>
            <input className="form-input" type="number" value={form.attendeeCount} onChange={e => setForm({ ...form, attendeeCount: e.target.value })} placeholder={`Max ${room.capacity}`} min="1" max={room.capacity} />
          </div>
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <textarea className="form-textarea" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} rows="2" placeholder="Brief description..."></textarea>
          </div>
          <div className="booking-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Booking...' : room.requiresApproval ? 'Submit for Approval' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
