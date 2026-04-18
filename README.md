# 🏫 Campus Room & Facility Booking System

A production-grade web application for booking campus facilities — classrooms, seminar halls, labs, and meeting rooms — with conflict-free scheduling, real-time availability calendars, comprehensive audit logging, and a full admin dashboard.

## ✨ Features

### User Features
- 🔍 Smart room search with type, building, and capacity filters
- 📅 Interactive FullCalendar view for real-time room availability
- 📝 Book rooms with attendee count and purpose tracking
- ✔️ Check-in system for approved bookings
- 🔖 Unique confirmation codes for every booking
- ✏️ Cancel bookings with reason tracking
- 🔐 Account suspension awareness (login blocked when suspended)

### Admin Features
- 📊 **Dashboard** — Stats overview, attention panel for pending approvals, activity feed, room usage charts
- 🏢 **Room Management** — Add/edit rooms with operating hours, buffer times, approval requirements, and soft-delete
- 📅 **Booking Management** — Approve/reject/cancel with audit trail, admin override capability
- 👥 **User Management** — Search, role changes (with auto-adjusted limits), suspend/activate accounts
- 📈 **Analytics** — Daily booking trend charts, no-show rates, status breakdowns, top rooms
- 📋 **Audit Log** — Complete system action history with expandable JSON details

### System Integrity
- ⚡ Atomic conflict detection with configurable buffer times between bookings
- 🛡️ Booking validation: time order, duration limits, operating hours, capacity, advance window
- 📝 Non-blocking audit logging for every system action (19 action types)
- 🔄 Alternative room suggestions when a conflict is detected
- 🔒 Role-based booking limits (admin: 50, faculty: 20, staff: 10, student: 5)

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite) |
| Styling | Vanilla CSS (glassmorphism, dark theme, animations) |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose (with `mongodb-memory-server` fallback) |
| Auth | JWT + bcrypt |
| Calendar | FullCalendar.js |
| Email | Nodemailer (Gmail SMTP) |

## 📁 Project Structure

```
campus-booking-system/
├── frontend/
│   └── src/
│       ├── components/       # AdminLayout, BookingModal, RoomCard, Navbar
│       ├── pages/
│       │   ├── admin/        # Dashboard, ManageRooms/Bookings/Users, Analytics, AuditLog
│       │   ├── Home.jsx      # Landing page
│       │   ├── Rooms.jsx     # Room browser with filters
│       │   ├── RoomDetail.jsx # Room detail + calendar
│       │   ├── MyBookings.jsx # User bookings with check-in
│       │   └── Login/Register
│       ├── context/          # Auth, Theme, Toast providers
│       └── services/         # Axios API client
├── backend/
│   ├── config/               # DB connection (with memory-server fallback)
│   ├── middleware/            # JWT auth + admin guard
│   ├── models/               # User, Room, Booking, AuditLog
│   ├── controllers/          # auth, booking, room, user, audit
│   ├── routes/               # auth, booking, room, user, audit
│   ├── utils/                # bookingValidator, auditLogger, emailTemplates
│   ├── seedData.js           # Reusable seed module
│   └── server.js             # Express app with auto-seed
└── docs/                     # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (optional — app falls back to in-memory MongoDB automatically)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tannu371/campus-booking-system.git
   cd campus-booking-system
   ```

2. **Backend setup**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   The server starts on port **5001** and auto-seeds with sample data if the database is empty.

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@campus.edu` | `admin123` |
| Faculty | `sarah@campus.edu` | `faculty123` |
| Student | `john@campus.edu` | `user123` |
| Staff | `carol@campus.edu` | `staff123` |

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms` | List rooms (with search/filter) |
| GET | `/api/rooms/buildings` | Get unique buildings |
| GET | `/api/rooms/:id` | Get room details |
| GET | `/api/rooms/:id/schedule` | Get room schedule for a date |
| GET | `/api/rooms/:id/utilization` | Get utilization stats (admin) |
| POST | `/api/rooms` | Create room (admin) |
| PUT | `/api/rooms/:id` | Update room (admin) |
| DELETE | `/api/rooms/:id` | Soft-delete room (admin) |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create booking (with conflict check) |
| GET | `/api/bookings/mine` | Get my bookings |
| GET | `/api/bookings` | List all bookings (admin) |
| GET | `/api/bookings/stats` | Booking statistics (admin) |
| GET | `/api/bookings/room/:roomId` | Room bookings |
| PUT | `/api/bookings/:id` | Update booking |
| PUT | `/api/bookings/:id/status` | Approve/reject (admin) |
| PUT | `/api/bookings/:id/checkin` | Check in |
| POST | `/api/bookings/override` | Admin override |
| DELETE | `/api/bookings/:id` | Cancel booking |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users with stats |
| GET | `/api/users/stats` | User statistics |
| GET | `/api/users/:id` | User profile + history |
| PUT | `/api/users/:id/status` | Suspend/activate |
| PUT | `/api/users/:id/role` | Change role |

### Audit (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit` | Paginated audit logs |
| GET | `/api/audit/recent` | Recent activity feed |
| GET | `/api/audit/actions` | Available action types |

## 🧪 Testing

### Test Suite — 129 Tests, 10 Suites

The project includes a comprehensive test suite based on the [testing strategy](docs/testing.md), adapted for MongoDB/Mongoose.

```
tests/
├── unit/                          # 67 tests — pure function validation
│   ├── timeValidator.test.js      # Time order, duration, future/advance limits
│   ├── overlapDetector.test.js    # Overlap detection + buffer conflicts
│   ├── policyValidator.test.js    # Capacity, operating hours, compound validation
│   └── confirmationCode.test.js   # Code format, uniqueness, character set
├── integration/                   # 47 tests — API + in-memory MongoDB
│   ├── bookingCreation.test.js    # Create, conflicts, input validation, auth
│   ├── bookingCancellation.test.js # Cancel, permissions, admin override
│   ├── bookingCheckIn.test.js     # Check-in, wrong user, status guards
│   ├── roomApi.test.js            # CRUD, search, filters, soft-delete
│   └── userApi.test.js            # List, suspend, activate, role change
└── edge/                          # 15 tests — boundary + security
    └── edgeCases.test.js          # Duration limits, injection, XSS, JWT tampering
```

### Commands

```bash
npm test               # Run all 129 tests (~6s)
npm run test:unit      # Unit tests only (67 tests, ~0.4s)
npm run test:integration  # Integration tests (47 tests, ~5s)
npm run test:edge      # Edge case tests (15 tests, ~3s)
npm run test:coverage  # Full run with Istanbul coverage report
```

### Coverage Highlights

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| `bookingValidator.js` | 98.9% | 91.5% | 100% | 100% |
| `auth.js` (middleware) | 100% | 83.3% | 100% | 100% |
| `emailTemplates.js` | 93.8% | 66.7% | 66.7% | 100% |

## 📄 License

MIT
