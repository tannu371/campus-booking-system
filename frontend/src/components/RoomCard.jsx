import { Link } from 'react-router-dom';
import './RoomCard.css';

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

const RoomCard = ({ room }) => {
  return (
    <Link to={`/rooms/${room._id}`} className="room-card card">
      <div className="room-card-image">
        <div className="room-card-icon">{typeIcons[room.type] || '🏫'}</div>
        <div className="room-card-badge badge badge-type">
          {typeLabels[room.type] || room.type}
        </div>
      </div>
      <div className="card-body">
        <h3 className="room-card-name">{room.name}</h3>
        <div className="room-card-details">
          <span className="room-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {room.capacity} seats
          </span>
          <span className="room-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {room.building}, Floor {room.floor}
          </span>
        </div>
        {room.amenities && room.amenities.length > 0 && (
          <div className="room-card-amenities">
            {room.amenities.slice(0, 3).map((amenity, i) => (
              <span key={i} className="amenity-tag">{amenity}</span>
            ))}
            {room.amenities.length > 3 && (
              <span className="amenity-more">+{room.amenities.length - 3}</span>
            )}
          </div>
        )}
        <div className="room-card-footer">
          <span className={`room-status ${room.isAvailable ? 'status-available' : 'status-unavailable'}`}>
            {room.isAvailable ? '● Available' : '● Unavailable'}
          </span>
          <span className="room-book-cta">Book Now →</span>
        </div>
      </div>
    </Link>
  );
};

export default RoomCard;
