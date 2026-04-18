import { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

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
        showToast('Time slot conflicts with an existing booking', 'error');
      } else if (errData?.errors) {
        showToast(errData.errors[0]?.message || 'Validation failed', 'error');
      } else {
        showToast(errData?.message || 'Failed to create booking', 'error');
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
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
