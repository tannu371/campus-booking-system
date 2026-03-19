import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-badge">🏫 Campus Facility Booking</div>
          <h1 className="hero-title">
            Book Campus Rooms
            <span className="hero-title-gradient"> Effortlessly</span>
          </h1>
          <p className="hero-subtitle">
            Reserve classrooms, seminar halls, and meeting rooms in seconds.
            No more scheduling conflicts — just seamless booking.
          </p>
          <div className="hero-actions">
            <Link to="/rooms" className="btn btn-primary btn-lg">
              Browse Rooms
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
            {!user && (
              <Link to="/register" className="btn btn-secondary btn-lg">
                Create Account
              </Link>
            )}
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">50+</span>
              <span className="hero-stat-label">Rooms</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-value">24/7</span>
              <span className="hero-stat-label">Online Booking</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-value">Instant</span>
              <span className="hero-stat-label">Confirmation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Why CampusBook?</h2>
          <p className="section-subtitle">Everything you need to manage campus facility reservations</p>
          <div className="grid grid-3 features-grid">
            <div className="feature-card glass">
              <div className="feature-icon">📅</div>
              <h3 className="feature-title">Real-Time Availability</h3>
              <p className="feature-desc">
                See room availability in real-time with interactive calendar views. No more double bookings.
              </p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Instant Booking</h3>
              <p className="feature-desc">
                Book any available room in seconds. Select your time slot, confirm, and you're done.
              </p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">🔔</div>
              <h3 className="feature-title">Smart Notifications</h3>
              <p className="feature-desc">
                Get instant confirmations and reminders for your upcoming bookings.
              </p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">🏢</div>
              <h3 className="feature-title">Multiple Facility Types</h3>
              <p className="feature-desc">
                Classrooms, seminar halls, meeting rooms, labs — all in one platform.
              </p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">👨‍💼</div>
              <h3 className="feature-title">Admin Dashboard</h3>
              <p className="feature-desc">
                Powerful admin tools to manage rooms, approve bookings, and track facility usage.
              </p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Usage Analytics</h3>
              <p className="feature-desc">
                Detailed analytics and reports to optimize facility utilization across campus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card glass-strong">
            <h2 className="cta-title">Ready to simplify room booking?</h2>
            <p className="cta-text">Join now and start booking campus facilities in minutes.</p>
            <Link to={user ? '/rooms' : '/register'} className="btn btn-primary btn-lg">
              {user ? 'Browse Rooms' : 'Get Started Free'}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span>🏫</span>
            <span>CampusBook</span>
          </div>
          <p className="footer-text">© 2026 CampusBook. Campus Room & Facility Booking System.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
