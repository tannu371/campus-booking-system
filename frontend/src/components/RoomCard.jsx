import { Link } from 'react-router-dom';
import './RoomCard.css';

const RoomCard = ({ room }) => {
  const typeLabels = {
    classroom: 'Classroom',
    seminar_hall: 'Seminar Hall',
    meeting_room: 'Meeting Room',
    conference_room: 'Conference Room',
    lab: 'Lab'
  };

  const typeColors = {
    classroom: '#3b82f6',
    seminar_hall: '#8b5cf6',
    meeting_room: '#f59e0b',
    conference_room: '#ef4444',
    lab: '#22c55e'
  };

  const color = typeColors[room.type] || '#6b7280';

  return (
    <Link to={`/rooms/${room._id}`} className="room-card glass" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="room-card-color-bar" style={{ background: color }}></div>

      <div className="room-card-body">
        <div className="room-card-top">
          <h3 className="room-card-name">{room.name}</h3>
          {room.requiresApproval && (
            <span className="badge room-card-approval-badge">
              Approval
            </span>
          )}
        </div>

        <span className="badge room-card-type-badge" style={{ background: `${color}20`, color }}>
          {typeLabels[room.type] || room.type}
        </span>

        <div className="room-card-details">
          <span>📍 {room.building} · Floor {room.floor}</span>
          <span>👥 Capacity: {room.capacity}</span>
          <span>🕐 {room.operatingHoursStart || '07:00'} – {room.operatingHoursEnd || '22:00'}</span>
        </div>

        {room.amenities && room.amenities.length > 0 && (
          <div className="room-card-amenities">
            {room.amenities.slice(0, 4).map((a, i) => (
              <span key={i} className="amenity-tag">{a}</span>
            ))}
            {room.amenities.length > 4 && (
              <span className="amenity-more">+{room.amenities.length - 4} more</span>
            )}
          </div>
        )}

        {room.description && (
          <p className="room-card-desc">
            {room.description}
          </p>
        )}

        {!room.isAvailable && (
          <div className="room-card-unavailable">
            ⚠️ Currently unavailable
          </div>
        )}
      </div>
    </Link>
  );
};

export default RoomCard;
