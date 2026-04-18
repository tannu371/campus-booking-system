import { Link } from 'react-router-dom';

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
      <div style={{
        height: 8,
        background: color,
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        margin: '-20px -20px 16px -20px'
      }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{room.name}</h3>
        {room.requiresApproval && (
          <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.65rem', padding: '2px 6px', flexShrink: 0 }}>
            Approval
          </span>
        )}
      </div>

      <span className="badge" style={{ background: `${color}20`, color, fontSize: '0.72rem', padding: '2px 8px', marginBottom: 10, display: 'inline-block' }}>
        {typeLabels[room.type] || room.type}
      </span>

      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        <span>📍 {room.building} · Floor {room.floor}</span>
        <span>👥 Capacity: {room.capacity}</span>
        <span>🕐 {room.operatingHoursStart || '07:00'} – {room.operatingHoursEnd || '22:00'}</span>
      </div>

      {room.amenities && room.amenities.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {room.amenities.slice(0, 4).map((a, i) => (
            <span key={i} style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)',
              color: 'var(--text-muted)'
            }}>{a}</span>
          ))}
          {room.amenities.length > 4 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{room.amenities.length - 4} more</span>
          )}
        </div>
      )}

      {room.description && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {room.description}
        </p>
      )}

      {!room.isAvailable && (
        <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
          ⚠️ Currently unavailable
        </div>
      )}
    </Link>
  );
};

export default RoomCard;
