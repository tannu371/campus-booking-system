import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BookingModal from '../components/BookingModal';
import RecurringBookingModal from '../components/RecurringBookingModal';
import './RoomDetail.css';

const typeLabels = {
  classroom: 'Classroom',
  seminar_hall: 'Seminar Hall',
  meeting_room: 'Meeting Room',
  conference_room: 'Conference Room',
  lab: 'Lab'
};

const typeIcons = {
  classroom: '📚',
  seminar_hall: '🎤',
  meeting_room: '🤝',
  conference_room: '💼',
  lab: '🔬'
};

const formatCompactTimeLabel = (time) => {
  if (!time) return '';
  const [hourString, minuteString = '00'] = time.split(':');
  const hour24 = parseInt(hourString, 10);
  const minutes = parseInt(minuteString, 10);

  if (Number.isNaN(hour24) || Number.isNaN(minutes)) return time;

  const period = hour24 >= 12 ? 'pm' : 'am';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')}${period}`;
};

const toLocalDateKey = (dateValue) => {
  // Always resolve using local date parts to avoid timezone day shifts.
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return typeof dateValue === 'string' && dateValue.length >= 10
      ? dateValue.slice(0, 10)
      : '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [room, setRoom] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchRoom();
    fetchBookings();
  }, [id]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchRoom = async () => {
    try {
      const res = await api.get(`/rooms/${id}`);
      setRoom(res.data);
    } catch (err) {
      showToast('Room not found', 'error');
      navigate('/rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get(`/bookings/room/${id}`);
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to load bookings');
    }
  };

  const handleBooked = () => {
    setShowBooking(false);
    setShowRecurring(false);
    fetchBookings();
  };

  const statusColors = {
    approved: '#22c55e',
    pending: '#f59e0b',
    rejected: '#6b7280',
    cancelled: '#6b7280'
  };

  const statusLabels = {
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
    cancelled: 'Cancelled'
  };

  const calendarEvents = bookings.map(b => ({
    title: b.title || 'Untitled',
    start: `${toLocalDateKey(b.date)}T${b.startTime}`,
    end: `${toLocalDateKey(b.date)}T${b.endTime}`,
    backgroundColor: statusColors[b.status] || '#E67E22',
    borderColor: 'transparent',
    classNames: [`booking-status-${b.status}`],
    extendedProps: {
      bookingTitle: b.title || 'Untitled',
      bookedBy: b.user?.name || 'Unknown',
      email: b.user?.email || '',
      status: b.status,
      startTime: b.startTime,
      endTime: b.endTime,
      date: new Date(b.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
      purpose: b.purpose || '',
      attendees: b.attendees || 0
    }
  }));

  const handleEventClick = (info) => {
    const props = info.event.extendedProps;
    setSelectedEvent(props);
  };

  const renderEventContent = (eventInfo) => {
    const { event, view } = eventInfo;
    const props = event.extendedProps;
    const isDesktopWeekView = !isMobile && view.type === 'timeGridWeek';

    if (!isDesktopWeekView) {
      return (
        <div className="calendar-event-compact">
          {formatCompactTimeLabel(props.startTime)}
        </div>
      );
    }

    return (
      <div className="calendar-event-detailed">
        <div className="calendar-event-title">{props.bookingTitle}</div>
        <div className="calendar-event-meta">{props.bookedBy}</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="skeleton" style={{ height: 200, marginBottom: 24 }}></div>
          <div className="skeleton" style={{ height: 400 }}></div>
        </div>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="page">
      <div className="container">
        <button className="btn btn-ghost back-btn" onClick={() => navigate('/rooms')}>
          ← Back to Rooms
        </button>

        <div className="room-detail-layout">
          {/* Left / Top: Room Info */}
          <div className="room-detail-info">
            {/* Compact header */}
            <div className="room-detail-header glass-strong">
              <div className="room-detail-icon-wrap">
                <span className="room-detail-icon">{typeIcons[room.type] || '🏫'}</span>
              </div>
              <div className="room-detail-header-text">
                <div className="badge badge-type" style={{ marginBottom: 4 }}>
                  {typeLabels[room.type] || room.type}
                </div>
                <h1 className="room-detail-name">{room.name}</h1>
                <p className="room-detail-location">
                  📍 {room.building}, Floor {room.floor}
                </p>
              </div>
            </div>

            {/* Compact meta — all in one card */}
            <div className="room-detail-meta-compact glass">
              <div className="meta-chip">
                <span className="meta-chip-icon">👥</span>
                <span className="meta-chip-text">{room.capacity} seats</span>
              </div>
              <div className="meta-chip-divider" />
              <div className="meta-chip">
                <span className={`meta-chip-dot ${room.isAvailable ? 'dot-green' : 'dot-red'}`} />
                <span className="meta-chip-text">{room.isAvailable ? 'Available' : 'Unavailable'}</span>
              </div>
              <div className="meta-chip-divider" />
              <div className="meta-chip">
                <span className="meta-chip-icon">🕐</span>
                <span className="meta-chip-text">{room.operatingHoursStart || '07:00'} – {room.operatingHoursEnd || '22:00'}</span>
              </div>
              <div className="meta-chip-divider" />
              <div className="meta-chip">
                <span className="meta-chip-icon">⏱️</span>
                <span className="meta-chip-text">{room.bufferMinutes || 10}min buffer</span>
              </div>
            </div>

            {/* Amenities — inline */}
            {room.amenities && room.amenities.length > 0 && (
              <div className="room-detail-amenities-inline">
                <span className="amenities-label">Amenities:</span>
                {room.amenities.map((a, i) => (
                  <span key={i} className="amenity-chip-sm">{a}</span>
                ))}
              </div>
            )}

            {/* Description — only if exists */}
            {room.description && (
              <p className="room-detail-desc-inline">{room.description}</p>
            )}

            {room.requiresApproval && (
              <div className="room-approval-notice">
                ⚠️ This room requires admin approval for bookings
              </div>
            )}

            {user && room.isAvailable && (
              <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
                <button
                  className="btn btn-primary btn-lg book-room-btn"
                  onClick={() => setShowBooking(true)}
                >
                  {room.requiresApproval ? 'Request Booking' : 'Book This Room'}
                </button>
                <button
                  className="btn btn-secondary btn-lg"
                  onClick={() => setShowRecurring(true)}
                >
                  🔄 Create Recurring Booking
                </button>
              </div>
            )}

            {!user && (
              <p className="login-prompt">
                <a href="/login">Sign in</a> to book this room
              </p>
            )}
          </div>

          {/* Right / Bottom: Calendar */}
          <div className="room-detail-calendar glass">
            <h3 className="detail-section-title">Availability Calendar</h3>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={isMobile ? 'dayGridMonth' : 'timeGridWeek'}
              headerToolbar={isMobile ? {
                left: 'prev,next',
                center: 'title',
                right: 'today'
              } : {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
              }}
              events={calendarEvents}
              height={isMobile ? 'auto' : 'auto'}
              contentHeight={isMobile ? 300 : undefined}
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              weekends={true}
              nowIndicator={true}
              dayMaxEvents={isMobile ? 2 : undefined}
              fixedWeekCount={false}
              eventClick={handleEventClick}
              eventDisplay="block"
              displayEventTime={false}
              eventContent={renderEventContent}
            />
          </div>
        </div>

        {/* Booking Modal */}
        {showBooking && (
          <BookingModal
            room={room}
            onClose={() => setShowBooking(false)}
            onBooked={handleBooked}
          />
        )}

        {/* Recurring Booking Modal */}
        {showRecurring && (
          <RecurringBookingModal
            room={room}
            onClose={() => setShowRecurring(false)}
            onBooked={handleBooked}
          />
        )}

        {/* Booking Detail Dialog */}
        {selectedEvent && (
          <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="modal booking-detail-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Booking Details</h2>
                <button className="btn btn-icon btn-ghost" onClick={() => setSelectedEvent(null)}>✕</button>
              </div>
              <div className="booking-detail-content">
                <div className="booking-detail-row">
                  <span className="booking-detail-label">Title</span>
                  <span className="booking-detail-value">{selectedEvent.bookingTitle}</span>
                </div>
                <div className="booking-detail-row">
                  <span className="booking-detail-label">Booked By</span>
                  <span className="booking-detail-value">
                    {selectedEvent.bookedBy}
                    {selectedEvent.email && <span className="booking-detail-sub">{selectedEvent.email}</span>}
                  </span>
                </div>
                <div className="booking-detail-row">
                  <span className="booking-detail-label">Date</span>
                  <span className="booking-detail-value">{selectedEvent.date}</span>
                </div>
                <div className="booking-detail-row">
                  <span className="booking-detail-label">Time</span>
                  <span className="booking-detail-value">{selectedEvent.startTime} – {selectedEvent.endTime}</span>
                </div>
                <div className="booking-detail-row">
                  <span className="booking-detail-label">Status</span>
                  <span className="booking-detail-value">
                    <span className="badge" style={{
                      background: `${statusColors[selectedEvent.status]}20`,
                      color: statusColors[selectedEvent.status],
                      padding: '3px 10px',
                      fontSize: '0.8rem'
                    }}>
                      {statusLabels[selectedEvent.status] || selectedEvent.status}
                    </span>
                  </span>
                </div>
                {selectedEvent.attendees > 0 && (
                  <div className="booking-detail-row">
                    <span className="booking-detail-label">Attendees</span>
                    <span className="booking-detail-value">{selectedEvent.attendees}</span>
                  </div>
                )}
                {selectedEvent.purpose && (
                  <div className="booking-detail-row">
                    <span className="booking-detail-label">Purpose</span>
                    <span className="booking-detail-value">{selectedEvent.purpose}</span>
                  </div>
                )}
              </div>
              <div className="booking-detail-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomDetail;
