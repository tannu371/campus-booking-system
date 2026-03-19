import { useState } from 'react';
import './BookingModal.css';

const BookingModal = ({ room, onClose, onSubmit, existingBooking }) => {
  const [formData, setFormData] = useState({
    title: existingBooking?.title || '',
    date: existingBooking?.date ? new Date(existingBooking.date).toISOString().split('T')[0] : '',
    startTime: existingBooking?.startTime || '',
    endTime: existingBooking?.endTime || '',
    purpose: existingBooking?.purpose || ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        room: room._id
      });
    } finally {
      setSubmitting(false);
    }
  };

  const timeSlots = [];
  for (let h = 7; h <= 21; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal booking-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {existingBooking ? 'Modify Booking' : 'Book Room'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="booking-room-info">
          <span className="booking-room-name">{room.name}</span>
          <span className="booking-room-detail">{room.building} • Floor {room.floor} • {room.capacity} seats</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Booking Title *</label>
            <input
              type="text"
              name="title"
              className="form-input"
              placeholder="e.g., Team Meeting, Lecture, Workshop"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              name="date"
              className="form-input"
              value={formData.date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <select
                name="startTime"
                className="form-select"
                value={formData.startTime}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <select
                name="endTime"
                className="form-select"
                value={formData.endTime}
                onChange={handleChange}
                required
              >
                <option value="">Select</option>
                {timeSlots.filter(s => s > formData.startTime).map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Purpose</label>
            <textarea
              name="purpose"
              className="form-textarea"
              placeholder="Describe the purpose of your booking..."
              value={formData.purpose}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className="booking-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Processing...' : existingBooking ? 'Update Booking' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
