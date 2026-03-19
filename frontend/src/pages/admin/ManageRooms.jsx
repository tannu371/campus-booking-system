import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './Admin.css';

const ManageRooms = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: 'classroom', capacity: '', building: '',
    floor: '', amenities: '', description: '', isAvailable: true
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
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', type: 'classroom', capacity: '', building: '',
      floor: '', amenities: '', description: '', isAvailable: true
    });
    setEditRoom(null);
    setShowForm(false);
  };

  const openEdit = (room) => {
    setEditRoom(room);
    setFormData({
      name: room.name,
      type: room.type,
      capacity: room.capacity,
      building: room.building,
      floor: room.floor,
      amenities: room.amenities?.join(', ') || '',
      description: room.description || '',
      isAvailable: room.isAvailable
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      capacity: parseInt(formData.capacity),
      floor: parseInt(formData.floor),
      amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean)
    };
    try {
      if (editRoom) {
        await api.put(`/rooms/${editRoom._id}`, data);
        toast.success('Room updated');
      } else {
        await api.post('/rooms', data);
        toast.success('Room created');
      }
      resetForm();
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save room');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this room?')) return;
    try {
      await api.delete(`/rooms/${id}`);
      toast.success('Room deleted');
      fetchRooms();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const typeLabels = {
    classroom: 'Classroom', seminar_hall: 'Seminar Hall',
    meeting_room: 'Meeting Room', conference_room: 'Conference Room', lab: 'Lab'
  };

  return (
    <div className="page">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1 className="page-title">Manage Rooms</h1>
            <p className="page-subtitle">Add, edit, and manage campus facilities</p>
          </div>
          <div className="admin-nav">
            <Link to="/admin" className="admin-nav-link">Overview</Link>
            <Link to="/admin/rooms" className="admin-nav-link active">Rooms</Link>
            <Link to="/admin/bookings" className="admin-nav-link">Bookings</Link>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }} style={{ marginBottom: 24 }}>
          + Add New Room
        </button>

        {showForm && (
          <div className="modal-overlay" onClick={resetForm}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
              <div className="modal-header">
                <h2 className="modal-title">{editRoom ? 'Edit Room' : 'Add New Room'}</h2>
                <button className="modal-close" onClick={resetForm}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="room-form-grid">
                  <div className="form-group">
                    <label className="form-label">Room Name *</label>
                    <input type="text" className="form-input" value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select className="form-select" value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="classroom">Classroom</option>
                      <option value="seminar_hall">Seminar Hall</option>
                      <option value="meeting_room">Meeting Room</option>
                      <option value="conference_room">Conference Room</option>
                      <option value="lab">Lab</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Capacity *</label>
                    <input type="number" className="form-input" value={formData.capacity}
                      onChange={e => setFormData({...formData, capacity: e.target.value})} required min="1" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Building *</label>
                    <input type="text" className="form-input" value={formData.building}
                      onChange={e => setFormData({...formData, building: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Floor *</label>
                    <input type="number" className="form-input" value={formData.floor}
                      onChange={e => setFormData({...formData, floor: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Available</label>
                    <select className="form-select" value={formData.isAvailable}
                      onChange={e => setFormData({...formData, isAvailable: e.target.value === 'true'})}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className="form-group room-form-full">
                    <label className="form-label">Amenities (comma-separated)</label>
                    <input type="text" className="form-input" placeholder="Projector, Whiteboard, AC, WiFi"
                      value={formData.amenities}
                      onChange={e => setFormData({...formData, amenities: e.target.value})} />
                  </div>
                  <div className="form-group room-form-full">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
                  </div>
                </div>
                <div className="booking-actions">
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="btn btn-primary">
                    {editRoom ? 'Update Room' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="skeleton" style={{ height: 300, borderRadius: 16 }}></div>
        ) : rooms.length === 0 ? (
          <div className="rooms-empty">
            <div className="empty-icon">🏢</div>
            <h3>No rooms yet</h3>
            <p>Add your first room to get started.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Building</th>
                  <th>Floor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room._id}>
                    <td style={{ fontWeight: 600 }}>{room.name}</td>
                    <td><span className="badge badge-type">{typeLabels[room.type]}</span></td>
                    <td>{room.capacity}</td>
                    <td>{room.building}</td>
                    <td>{room.floor}</td>
                    <td>
                      <span className={room.isAvailable ? 'text-success' : 'text-danger'} style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                        {room.isAvailable ? '● Available' : '● Unavailable'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(room)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(room._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageRooms;
