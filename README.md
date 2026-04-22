# 🏫 Campus Room & Facility Booking System

A production-grade web application for booking campus facilities — classrooms, seminar halls, labs, and meeting rooms — with conflict-free scheduling, real-time availability calendars, comprehensive audit logging, and a full admin dashboard.

## ✨ Features

### User Features
- 🔍 Smart room search with type, building, and capacity filters
- 📅 Interactive FullCalendar view for real-time room availability
- 📝 Book rooms with attendee count and purpose tracking
- ⏳ Approval-aware booking flow: request-only rooms create `pending` bookings
- ✔️ Check-in system for approved bookings (only allowed during the booked time slot)
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
- ⚡ **Atomic conflict detection** with MongoDB transactions and unique indexes (multi-instance safe)
- 🔁 Approval-room conflict policy: multiple `pending` requests can coexist; only `approved` blocks slot
- 🛡️ Booking validation: time order, duration limits, operating hours, capacity, advance window
- 📝 Non-blocking audit logging for every system action (19 action types)
- 🔄 Alternative room suggestions when a conflict is detected
- 🔒 Role-based booking limits (admin: 50, faculty: 20, staff: 10, student: 5)
- 🏗️ **Production-ready:** Horizontal scaling support (PM2 cluster, Kubernetes replicas)

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite) |
| Styling | Vanilla CSS (glassmorphism, dark theme, animations) |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
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
│   ├── config/               # DB connection
│   ├── middleware/            # JWT auth + admin guard
│   ├── models/               # User, Room, Booking, AuditLog, RevokedToken
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
- MongoDB (required for persistent data)

#### MongoDB (macOS / Homebrew)

If `npm run dev` shows `ECONNREFUSED 127.0.0.1:27017`, MongoDB isn’t running yet.

Install + start MongoDB with Homebrew:

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

Quick verify:

```bash
nc -z 127.0.0.1 27017 && echo "mongo up"
```

#### MongoDB (Windows)

If `npm run dev` shows `ECONNREFUSED 127.0.0.1:27017`, MongoDB isn’t running yet.

Option A (recommended): install MongoDB Community Server and run it as a Windows Service.

- Download “MongoDB Community Server” from the official MongoDB website and install it.
- During installation, select **“Install MongoDB as a Service”**.
- After install, ensure the service is running:

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

Quick verify (PowerShell):

```powershell
Test-NetConnection 127.0.0.1 -Port 27017
```

Option B (if you use winget): install via Windows Package Manager (package name can vary by machine):

```powershell
winget search mongodb
winget install MongoDB.Server
```

Then start the MongoDB service as above.

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
   ```

   **⚠️ SECURITY: Configure secrets before starting**
   
   Copy the example environment file and configure your secrets:
   ```bash
   cp .env.example .env
   ```
   
   **Required:** Generate a secure JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   
   Update `.env` with your generated JWT_SECRET.

   Start the server:
   ```bash
   npm run dev
   ```
   The server starts on port **5001**.

   #### Seed accounts + persistence
   - **Seed login accounts** (admin/faculty/student/staff) exist only after the database is seeded.
   - If you want seed accounts to appear automatically on a fresh database, set:
     - `AUTO_SEED_ON_EMPTY=true` (seeds **only when the DB is empty**)
   - To keep data created from the frontend **persistent**, run a real MongoDB and keep:
     - `ALLOW_IN_MEMORY_DB=false`
   - If you don’t want to install MongoDB (demo-only), you can use an ephemeral in-memory DB:
     - set `ALLOW_IN_MEMORY_DB=true` (data will reset on restart)

   If you ever want to reset back to seed data (this clears the DB), run:

   ```bash
   npm run seed
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

### Login Credentials

These accounts are available **after seeding** (either auto-seed on empty DB, or `npm run seed`):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@campus.edu` | Configured via `SEED_ADMIN_PASSWORD` |
| Faculty | `sarah@campus.edu` | Configured via `SEED_FACULTY_PASSWORD` |
| Student | `john@campus.edu` | Configured via `SEED_USER_PASSWORD` |
| Staff | `carol@campus.edu` | Configured via `SEED_STAFF_PASSWORD` |

**Note:** Default development passwords are set in `.env`.

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Rotate refresh token + issue new access token |
| POST | `/api/auth/logout` | Clear refresh cookie + end session |
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

### Check-in Policy

- **Who can check in**: the booking owner (or an admin)
- **Allowed only if**: booking status is `approved`
- **Time window**: check-in is allowed **only during the booked time slot** (not before start, not after end)

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

### Integration DB Fallback

Integration tests first try `mongodb-memory-server`. If that fails on your machine, tests now fall back to:

- `TEST_MONGO_URI` (if provided), or
- `mongodb://localhost:27017/campus-booking-test`

Example:

```bash
TEST_MONGO_URI="mongodb://localhost:27017/campus-booking-test" npm run test:integration
```

### Coverage Highlights

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| `bookingValidator.js` | 98.9% | 91.5% | 100% | 100% |
| `auth.js` (middleware) | 100% | 83.3% | 100% | 100% |
| `emailTemplates.js` | 93.8% | 66.7% | 66.7% | 100% |

## ⚙️ Runtime Configuration

Backend environment flags in `backend/.env`:

- `MONGO_URI` — persistent MongoDB connection string
- `JWT_ACCESS_EXPIRES_IN=1h` — access token lifetime (default: `1h`)
- `JWT_REFRESH_EXPIRES_IN=7d` — refresh token lifetime (default: `7d`)
- `AUTO_SEED_ON_EMPTY=false` — keep `false` for normal usage; set `true` only for demo bootstrap
- `ALLOW_IN_MEMORY_DB=false` — keep `false` for persistence; set `true` only for ephemeral demo/testing

If `ALLOW_IN_MEMORY_DB` is enabled, data is not persistent across restarts.

## 🔒 Security

This application implements multiple security measures:

- ✅ **Hardened JWT Session Model** - Short-lived access tokens (default 1h) with rotating refresh tokens (default 7d) in `httpOnly`, `Secure` (prod), `SameSite=Strict` cookies
- ✅ **No localStorage Token Persistence** - Frontend keeps access token in memory only; session restore uses refresh cookie endpoint
- ✅ **Token Revocation** - Every JWT carries `jti`; revoked token IDs are stored server-side and blocked in auth middleware
- ✅ **Active-Status Enforcement** - Protected routes deny suspended/deactivated users even if their token is otherwise valid
- ✅ **JWT Authentication** - Required JWT_SECRET, server fails at boot if not configured
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **Environment-based Secrets** - Seed passwords configurable via environment variables
- ✅ **Role-based Access Control** - Admin, faculty, staff, and user roles with different permissions
- ✅ **Audit Logging** - Complete action history for security monitoring
- ✅ **Input Validation** - Request validation and sanitization
- ✅ **Regex Search Hardening** - User search/building inputs are escaped and length-limited before `$regex` use to prevent ReDoS and broad wildcard scans
- ✅ **CSP Header** - Content Security Policy header applied by backend to reduce XSS impact
- ✅ **Timezone-Stable Check-In Windows** - Check-in uses absolute UTC datetimes (`startDateTimeUtc` / `endDateTimeUtc`) instead of server-local `setHours()` math

### Security Hardening Details (Consolidated)

Backend markdown documents were consolidated into this README:
`backend/SECURITY.md`, `backend/SECURITY-SUMMARY.md`, `backend/SECURITY-FIXES-VERIFICATION.md`,
`backend/CONCURRENCY.md`, `backend/MASS-ASSIGNMENT-FIX.md`, `backend/RECURRING-QUOTA-FIX.md`,
and `backend/NOSQL-INJECTION-FIX.md`.

- **JWT/session hardening**: no insecure JWT fallback, boot-time `JWT_SECRET` requirement, short-lived access token (default `1h`), rotating refresh token (default `7d`) in `httpOnly`, `Secure` (prod), `SameSite=Strict` cookie.
- **Revocation + forced logout**: JWTs include `jti`, revoked token IDs are persisted in a revocation collection with TTL expiry, and `logout` revokes current access/refresh tokens.
- **Runtime account checks**: protected endpoints require `user.status === 'active'`, so suspension/deactivation takes effect immediately.
- **Seed safety**: all seed passwords come from `SEED_*_PASSWORD`; production blocks insecure auto-seed; no password logging.
- **NoSQL/ReDoS mitigation**: primitive-only query sanitization, enum/objectId/number/date validation, and escaped + length-limited regex search inputs.
- **Mass-assignment protection**: strict allowlists for room/booking create-update endpoints; protected fields rejected with explicit `PROTECTED_FIELDS` errors.
- **Recurring quota enforcement**: recurring bookings validate role quota before creation and return `RECURRING_QUOTA_EXCEEDED` on overflow.
- **Timezone consistency**: bookings persist `bookingDateKey` plus absolute UTC start/end datetimes; check-in authorization compares against UTC timestamps, preventing host/container timezone drift.
- **Defense in depth**: CSP header, role-based access, audit logs, and secure operational defaults.

## 🏗️ Concurrency & Multi-Instance Safety

The booking system uses **MongoDB transactions and partial unique indexes** to prevent double-booking across multiple server instances:

- ✅ **Atomic conflict detection** - Works in PM2 cluster mode, Kubernetes replicas, load-balanced setups
- ✅ **Database-level enforcement** - Unique index on `{ room, date, startTime }` for active bookings
- ✅ **Transaction support** - MongoDB sessions ensure atomicity and isolation
- ✅ **Graceful error handling** - Returns 409 with alternative rooms on concurrent conflicts

### Concurrency Notes

- Correctness is enforced at the database layer (transactions + partial unique index), not by in-memory locks.
- Unique index key: `{ room, date, startTime }` for active statuses to prevent duplicate active slot bookings.
- Under contention, expected behavior is conflict responses (`409` / `E11000` handling) rather than silent double-booking.

## 📄 License

MIT
