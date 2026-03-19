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

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [room, setRoom] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoom();
    fetchBookings();
  }, [id]);

  const fetchRoom = async () => {
    try {
      const res = await api.get(`/rooms/${id}`);
      setRoom(res.data);
    } catch (err) {
      toast.error('Room not found');
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

  const handleBook = async (bookingData) => {
    try {
      await api.post('/bookings', bookingData);
      toast.success('Room booked successfully!');
      setShowBooking(false);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    }
  };

  const calendarEvents = bookings.map(b => ({
    title: b.title || 'Booked',
    start: `${new Date(b.date).toISOString().split('T')[0]}T${b.startTime}`,
    end: `${new Date(b.date).toISOString().split('T')[0]}T${b.endTime}`,
    backgroundColor: b.status === 'approved' ? '#6C5CE7' : '#FDCB6E',
    borderColor: 'transparent'
  }));

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
          <div className="room-detail-info">
            <div className="room-detail-header glass-strong">
              <div className="room-detail-icon-wrap">
                <span className="room-detail-icon">{typeIcons[room.type] || '🏫'}</span>
              </div>
              <div>
                <div className="badge badge-type" style={{ marginBottom: 8 }}>
                  {typeLabels[room.type] || room.type}
                </div>
                <h1 className="room-detail-name">{room.name}</h1>
                <p className="room-detail-location">
                  📍 {room.building}, Floor {room.floor}
                </p>
              </div>
            </div>

            <div className="room-detail-meta glass">
              <div className="meta-item">
                <span className="meta-label">Capacity</span>
                <span className="meta-value">{room.capacity} seats</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Status</span>
                <span className={`meta-value ${room.isAvailable ? 'text-success' : 'text-danger'}`}>
                  {room.isAvailable ? '● Available' : '● Unavailable'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Building</span>
                <span className="meta-value">{room.building}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Floor</span>
                <span className="meta-value">{room.floor}</span>
              </div>
            </div>

            {room.amenities && room.amenities.length > 0 && (
              <div className="room-detail-amenities glass">
                <h3 className="detail-section-title">Amenities</h3>
                <div className="amenities-list">
                  {room.amenities.map((a, i) => (
                    <span key={i} className="amenity-chip">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {room.description && (
              <div className="room-detail-desc glass">
                <h3 className="detail-section-title">Description</h3>
                <p>{room.description}</p>
              </div>
            )}

            {user && room.isAvailable && (
              <button
                className="btn btn-primary btn-lg book-room-btn"
                onClick={() => setShowBooking(true)}
              >
                Book This Room
              </button>
            )}

            {!user && (
              <p className="login-prompt">
                <a href="/login">Sign in</a> to book this room
              </p>
            )}
          </div>

          <div className="room-detail-calendar glass">
            <h3 className="detail-section-title">Availability Calendar</h3>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
              }}
              events={calendarEvents}
              height="auto"
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              weekends={true}
              nowIndicator={true}
            />
          </div>
        </div>

        {showBooking && (
          <BookingModal
            room={room}
            onClose={() => setShowBooking(false)}
            onSubmit={handleBook}
          />
        )}
      </div>
    </div>
  );
};

export default RoomDetail;
