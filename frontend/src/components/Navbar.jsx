import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu on escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">🏫</span>
            <span className="brand-text">CampusBook</span>
          </Link>

          <div className="navbar-right">
            {/* Desktop nav links */}
            <div className="navbar-links-desktop">
              <Link to="/rooms" className="nav-link">Browse Rooms</Link>
              {user ? (
                <>
                  <Link to="/my-bookings" className="nav-link">My Bookings</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="nav-link nav-admin">Admin</Link>
                  )}
                  <div className="nav-user">
                    <span className="nav-user-name">{user.name}</span>
                    <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="nav-auth">
                  <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
                  <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
                </div>
              )}
            </div>

            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* Hamburger button — mobile only */}
            <button
              className="hamburger-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
              <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {menuOpen && <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)} />}
      <div className={`mobile-menu ${menuOpen ? 'mobile-menu-open' : ''}`}>
        <div className="mobile-menu-links">
          <Link to="/rooms" className="mobile-menu-link">
            <span>📚</span> Browse Rooms
          </Link>
          {user ? (
            <>
              <Link to="/my-bookings" className="mobile-menu-link">
                <span>📅</span> My Bookings
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="mobile-menu-link mobile-menu-admin">
                  <span>⚙️</span> Admin Panel
                </Link>
              )}
              <div className="mobile-menu-divider" />
              <div className="mobile-menu-user">
                <span className="mobile-menu-user-name">{user.name}</span>
                <span className="mobile-menu-user-email">{user.email}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-danger mobile-menu-logout">
                Logout
              </button>
            </>
          ) : (
            <div className="mobile-menu-auth">
              <Link to="/login" className="btn btn-secondary mobile-menu-auth-btn">Sign In</Link>
              <Link to="/register" className="btn btn-primary mobile-menu-auth-btn">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
