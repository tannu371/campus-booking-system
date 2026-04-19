import { useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import './BookingModal.css';

const RecurringBookingModal = ({ room, onClose, onBooked }) => {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    title: '',
    startDate: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendeeCount: '',
    frequency: 'WEEKLY',
    daysOfWeek: [],
    endType: 'count',
    count: 10,
    until: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [conflictDetails, setConflictDetails] = useState(null);

  const daysOptions = [
    { value: 'MO', label: 'Mon' },
    { value: 'TU', label: 'Tue' },
    { value: 'WE', label: 'Wed' },
    { value: 'TH', label: 'Thu' },
    { value: 'FR', label: 'Fri' },
    { value: 'SA', label: 'Sat' },
    { value: 'SU', label: 'Sun' }
  ];

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day]
    }));
  };

  const buildRecurrenceRule = () => {
    let rule = `FREQ=${form.frequency}`;
    
    if (form.frequency === 'WEEKLY' && form.daysOfWeek.length > 0) {
      rule += `;BYDAY=${form.daysOfWeek.join(',')}`;
    }
    
    if (form.endType === 'count') {
      rule += `;COUNT=${form.count}`;
    } else if (form.endType === 'until' && form.until) {
      const untilDate = form.until.replace(/-/g, '');
      rule += `;UNTIL=${untilDate}`;
    }
    
    return rule;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.frequency === 'WEEKLY' && form.daysOfWeek.length === 0) {
      showToast('Please select at least one day of the week', 'error');
      return;
    }
    
    setLoading(true);
    setConflictDetails(null);
    try {
      const recurrenceRule = buildRecurrenceRule();
      
      const data = {
        room: room._id,
        title: form.title,
        date: form.startDate,
        startTime: form.startTime,
        endTime: form.endTime,
        purpose: form.purpose,
        attendeeCount: form.attendeeCount ? parseInt(form.attendeeCount) : null,
        recurrenceRule
      };

      const res = await api.post('/bookings/recurring', data);
      setResult(res.data);
      
      showToast(
        `Created ${res.data.created} bookings${res.data.conflicts > 0 ? ` (${res.data.conflicts} conflicts skipped)` : ''}`,
        'success'
      );

      if (onBooked) onBooked(res.data);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.error === 'RECURRING_BOOKING_CONFLICT') {
        const occurrenceCount = errData.conflict_occurrences?.length || 0;
        setConflictDetails({
          message: errData.message,
          occurrences: errData.conflict_occurrences || []
        });
        showToast(
          occurrenceCount > 0
            ? `Recurring booking conflicts on ${occurrenceCount} occurrence(s)`
            : (errData?.message || 'Recurring booking has conflicts'),
          'error'
        );
      } else {
        showToast(errData?.message || 'Failed to create recurring booking', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔄</div>
            <h2 style={{ marginBottom: 8 }}>Recurring Booking Created!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              {result.created} bookings created successfully
            </p>
            {result.conflicts > 0 && (
              <div style={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: 16,
                fontSize: '0.85rem',
                color: '#f59e0b'
              }}>
                ⚠️ {result.conflicts} occurrences skipped due to conflicts
              </div>
            )}
            <div style={{
              background: 'var(--surface)',
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              marginBottom: 16
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                Recurrence Group ID
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600 }}>
                {result.groupId}
              </div>
            </div>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <h2>Create Recurring Booking</h2>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          {room.name} · {room.building} · Floor {room.floor}
        </div>
        
        <form onSubmit={handleSubmit}>
          {conflictDetails && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginBottom: 16
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Conflicting Occurrences</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                {conflictDetails.message}
              </div>
              {conflictDetails.occurrences.slice(0, 5).map((occurrence) => (
                <div
                  key={`${occurrence.index}-${occurrence.date}`}
                  style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}
                >
                  • {occurrence.dateLabel} ({occurrence.requestedStartTime} - {occurrence.requestedEndTime}) clashes with{' '}
                  {occurrence.conflictsWith?.map(b => `${b.title} (${b.startTime} - ${b.endTime})`).join(', ')}
                </div>
              ))}
              {conflictDetails.occurrences.length > 5 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  +{conflictDetails.occurrences.length - 5} more conflicts
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input 
              className="form-input" 
              value={form.title} 
              onChange={e => setForm({ ...form, title: e.target.value })} 
              required 
              placeholder="e.g. Weekly Team Meeting" 
            />
          </div>

          <div className="booking-datetime-grid">
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input 
                className="form-input" 
                type="date" 
                value={form.startDate} 
                onChange={e => setForm({ ...form, startDate: e.target.value })} 
                required 
                min={new Date().toISOString().split('T')[0]} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input 
                className="form-input" 
                type="time" 
                value={form.startTime} 
                onChange={e => setForm({ ...form, startTime: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input 
                className="form-input" 
                type="time" 
                value={form.endTime} 
                onChange={e => setForm({ ...form, endTime: e.target.value })} 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Frequency *</label>
            <select 
              className="form-input" 
              value={form.frequency} 
              onChange={e => setForm({ ...form, frequency: e.target.value })}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          {form.frequency === 'WEEKLY' && (
            <div className="form-group">
              <label className="form-label">Days of Week *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {daysOptions.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    className={`btn ${form.daysOfWeek.includes(day.value) ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Repeat Until</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  checked={form.endType === 'count'} 
                  onChange={() => setForm({ ...form, endType: 'count' })} 
                />
                <span>After</span>
              </label>
              <input 
                className="form-input" 
                type="number" 
                value={form.count} 
                onChange={e => setForm({ ...form, count: e.target.value })} 
                disabled={form.endType !== 'count'}
                min="1"
                max="500"
                style={{ width: 80 }}
              />
              <span>occurrences</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  checked={form.endType === 'until'} 
                  onChange={() => setForm({ ...form, endType: 'until' })} 
                />
                <span>Until</span>
              </label>
              <input 
                className="form-input" 
                type="date" 
                value={form.until} 
                onChange={e => setForm({ ...form, until: e.target.value })} 
                disabled={form.endType !== 'until'}
                min={form.startDate || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Attendees</label>
            <input 
              className="form-input" 
              type="number" 
              value={form.attendeeCount} 
              onChange={e => setForm({ ...form, attendeeCount: e.target.value })} 
              placeholder={`Max ${room.capacity}`} 
              min="1" 
              max={room.capacity} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Purpose</label>
            <textarea 
              className="form-textarea" 
              value={form.purpose} 
              onChange={e => setForm({ ...form, purpose: e.target.value })} 
              rows="2" 
              placeholder="Brief description..."
            />
          </div>

          <div className="booking-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Recurring Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecurringBookingModal;
