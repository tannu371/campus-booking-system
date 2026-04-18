import { Link, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const navItems = [
  { path: '/admin', label: 'Overview', icon: '📊', exact: true },
  { path: '/admin/rooms', label: 'Rooms', icon: '🏢' },
  { path: '/admin/bookings', label: 'Bookings', icon: '📅' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' }
];

const AdminLayout = ({ children }) => {
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-icon">⚙️</span>
          <span className="sidebar-title">Admin Panel</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive(item) ? 'sidebar-active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to="/" className="sidebar-back">← Back to Site</Link>
        </div>
      </aside>
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
