import { useState, useEffect } from 'react';
import api from '../services/api';
import RoomCard from '../components/RoomCard';
import './Rooms.css';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    capacity: '',
    search: ''
  });

  useEffect(() => {
    fetchRooms();
  }, [filters.type, filters.capacity]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.capacity) params.capacity = filters.capacity;
      if (filters.search) params.search = filters.search;
      const res = await api.get('/rooms', { params });
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRooms();
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Browse Rooms</h1>
          <p className="page-subtitle">Find and book the perfect space for your needs</p>
        </div>

        <div className="rooms-filters glass">
          <form onSubmit={handleSearch} className="filters-form">
            <div className="filter-group">
              <input
                type="text"
                className="form-input"
                placeholder="Search rooms..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <select
                className="form-select"
                value={filters.type}
                onChange={e => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="classroom">Classroom</option>
                <option value="seminar_hall">Seminar Hall</option>
                <option value="meeting_room">Meeting Room</option>
                <option value="conference_room">Conference Room</option>
                <option value="lab">Lab</option>
              </select>
            </div>
            <div className="filter-group">
              <select
                className="form-select"
                value={filters.capacity}
                onChange={e => setFilters({ ...filters, capacity: e.target.value })}
              >
                <option value="">Any Capacity</option>
                <option value="10">10+ seats</option>
                <option value="25">25+ seats</option>
                <option value="50">50+ seats</option>
                <option value="100">100+ seats</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <div className="grid grid-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card">
                <div className="skeleton" style={{ height: 160 }}></div>
                <div className="card-body">
                  <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 12 }}></div>
                  <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }}></div>
                  <div className="skeleton" style={{ height: 14, width: '60%' }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rooms-empty">
            <div className="empty-icon">🏫</div>
            <h3>No rooms found</h3>
            <p>Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <>
            <p className="rooms-count">{rooms.length} room{rooms.length !== 1 ? 's' : ''} found</p>
            <div className="grid grid-3">
              {rooms.map(room => (
                <RoomCard key={room._id} room={room} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Rooms;
