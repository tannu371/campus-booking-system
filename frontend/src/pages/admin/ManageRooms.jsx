import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AdminLayout from '../../components/AdminLayout';

const ManageRooms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm] = useState({
    name: '', type: 'classroom', capacity: '', building: '', floor: '',
    amenities: '', description: '', isAvailable: true,
    operatingHoursStart: '07:00', operatingHoursEnd: '22:00',
    bufferMinutes: 10, requiresApproval: false, internalNotes: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchRooms();
  }, [user]);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      showToast('Failed to load rooms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        capacity: parseInt(form.capacity),
        floor: parseInt(form.floor),
        bufferMinutes: parseInt(form.bufferMinutes) || 10,
        amenities: form.amenities.split(',').map(a => a.trim()).filter(Boolean)
      };
      if (editRoom) {
        await api.put(`/rooms/${editRoom._id}`, data);
        showToast('Room updated', 'success');
      } else {
        await api.post('/rooms', data);
        showToast('Room created', 'success');
      }
      resetForm();
      fetchRooms();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save room', 'error');
    }
  };

  const handleEdit = (room) => {
    setEditRoom(room);
    setForm({
      name: room.name, type: room.type, capacity: room.capacity.toString(),
      building: room.building, floor: room.floor.toString(),
      amenities: (room.amenities || []).join(', '),
      description: room.description || '', isAvailable: room.isAvailable,
      operatingHoursStart: room.operatingHoursStart || '07:00',
      operatingHoursEnd: room.operatingHoursEnd || '22:00',
      bufferMinutes: room.bufferMinutes || 10,
      requiresApproval: room.requiresApproval || false,
      internalNotes: room.internalNotes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this room? Existing bookings will not be cancelled.')) return;
    try {
      await api.delete(`/rooms/${id}`);
      showToast('Room deactivated', 'success');
      fetchRooms();
    } catch (err) {
      showToast('Failed to deactivate', 'error');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditRoom(null);
    setForm({ name: '', type: 'classroom', capacity: '', building: '', floor: '', amenities: '', description: '', isAvailable: true, operatingHoursStart: '07:00', operatingHoursEnd: '22:00', bufferMinutes: 10, requiresApproval: false, internalNotes: '' });
  };

  const typeBadge = (type) => {
    const colors = { classroom: '#3b82f6', seminar_hall: '#8b5cf6', meeting_room: '#f59e0b', conference_room: '#ef4444', lab: '#22c55e' };
    return <span className="badge" style={{ background: `${colors[type] || '#6b7280'}20`, color: colors[type] || '#6b7280', fontSize: '0.72rem', padding: '2px 8px' }}>{type.replace('_', ' ')}</span>;
  };

  return (
    <AdminLayout>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1>Manage Rooms</h1>
          <p>{rooms.length} rooms configured</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Add Room</button>
      </div>

      {/* Room Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <h2>{editRoom ? 'Edit Room' : 'Add New Room'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="room-form-grid">
                <div className="form-group">
                  <label className="form-label">Room Name *</label>
                  <input className="form-input" name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select className="form-select" name="type" value={form.type} onChange={handleChange}>
                    <option value="classroom">Classroom</option>
                    <option value="seminar_hall">Seminar Hall</option>
                    <option value="meeting_room">Meeting Room</option>
                    <option value="conference_room">Conference Room</option>
                    <option value="lab">Lab</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Building *</label>
                  <input className="form-input" name="building" value={form.building} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Floor *</label>
                  <input className="form-input" type="number" name="floor" value={form.floor} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity *</label>
                  <input className="form-input" type="number" name="capacity" value={form.capacity} onChange={handleChange} required min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Buffer (min)</label>
                  <input className="form-input" type="number" name="bufferMinutes" value={form.bufferMinutes} onChange={handleChange} min="0" max="60" />
                </div>
                <div className="form-group">
                  <label className="form-label">Opens At</label>
                  <input className="form-input" type="time" name="operatingHoursStart" value={form.operatingHoursStart} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Closes At</label>
                  <input className="form-input" type="time" name="operatingHoursEnd" value={form.operatingHoursEnd} onChange={handleChange} />
                </div>
                <div className="form-group room-form-full">
                  <label className="form-label">Amenities (comma separated)</label>
                  <input className="form-input" name="amenities" value={form.amenities} onChange={handleChange} placeholder="Projector, WiFi, AC..." />
                </div>
                <div className="form-group room-form-full">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" name="description" value={form.description} onChange={handleChange} rows="2"></textarea>
                </div>
                <div className="form-group room-form-full">
                  <label className="form-label">Internal Notes (admin only)</label>
                  <textarea className="form-textarea" name="internalNotes" value={form.internalNotes} onChange={handleChange} rows="2"></textarea>
                </div>
                <div className="form-group" style={{ display: 'flex', gap: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
                    <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={handleChange} /> Available
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
                    <input type="checkbox" name="requiresApproval" checked={form.requiresApproval} onChange={handleChange} /> Requires Approval
                  </label>
                </div>
              </div>
              <div className="booking-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editRoom ? 'Update' : 'Create'} Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rooms Table */}
      <div className="admin-section" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Room', 'Building', 'Type', 'Capacity', 'Hours', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => (
                <tr key={room._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <strong>{room.name}</strong>
                    {room.requiresApproval && <span className="badge" style={{ marginLeft: 6, fontSize: '0.65rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 6px' }}>Approval</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.88rem' }}>{room.building} · F{room.floor}</td>
                  <td style={{ padding: '12px 16px' }}>{typeBadge(room.type)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{room.capacity}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{room.operatingHoursStart}–{room.operatingHoursEnd}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge" style={{ background: room.isAvailable ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: room.isAvailable ? '#22c55e' : '#ef4444', fontSize: '0.72rem', padding: '2px 8px' }}>
                      {room.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="table-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(room)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(room._id)}>Deactivate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageRooms;
