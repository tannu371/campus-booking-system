import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import MyBookings from './pages/MyBookings';
import Dashboard from './pages/admin/Dashboard';
import ManageRooms from './pages/admin/ManageRooms';
import ManageBookings from './pages/admin/ManageBookings';
import ManageUsers from './pages/admin/ManageUsers';
import Analytics from './pages/admin/Analytics';
import AuditLog from './pages/admin/AuditLog';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/rooms/:id" element={<RoomDetail />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/rooms" element={<ManageRooms />} />
              <Route path="/admin/bookings" element={<ManageBookings />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/analytics" element={<Analytics />} />
              <Route path="/admin/audit" element={<AuditLog />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
