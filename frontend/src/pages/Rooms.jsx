import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import RoomCard from '../components/RoomCard';
import './Rooms.css';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    fetchRooms();
    fetchBuildings();
  }, []);

  const fetchRooms = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (buildingFilter) params.building = buildingFilter;
      const res = await api.get('/rooms', { params });
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const res = await api.get('/rooms/buildings');
      setBuildings(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchRooms(), 300);
    return () => clearTimeout(timer);
  }, [search, typeFilter, buildingFilter]);

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 32 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 2 }}>Browse Rooms</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Find and book the perfect space</p>
      </div>

      {/* Filters */}
      <div className="rooms-filter-bar">
        <input
          type="text"
          className="form-input rooms-search-input"
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-select rooms-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="classroom">Classroom</option>
          <option value="seminar_hall">Seminar Hall</option>
          <option value="meeting_room">Meeting Room</option>
          <option value="conference_room">Conference Room</option>
          <option value="lab">Lab</option>
        </select>
        <select className="form-select rooms-filter-select" value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)}>
          <option value="">All Buildings</option>
          {buildings.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {(search || typeFilter || buildingFilter) && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => { setSearch(''); setTypeFilter(''); setBuildingFilter(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
      </p>

      {loading ? (
        <div className="room-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: 260, borderRadius: 16 }}></div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass" style={{ textAlign: 'center', padding: 60, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
          <h3>No rooms found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters</p>
        </div>
      ) : (
        <div className="room-grid">
          {rooms.map(room => (
            <RoomCard key={room._id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Rooms;
