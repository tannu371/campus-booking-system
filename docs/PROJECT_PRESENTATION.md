# Project Presentation Guide

Use this document as your complete script to present the Campus Booking System.

## 1) Presentation Goal

Show that the project is:

- functionally complete for room booking operations
- secure against common web/API abuse cases
- tested with meaningful automated coverage
- production-conscious in architecture and runtime behavior

## 2) Suggested 12-15 Minute Flow

### Slide 1 - Problem & Scope (1 min)

- Campus teams need conflict-free room booking with governance.
- This project supports user self-service and admin controls.

### Slide 2 - Architecture (2 min)

- Frontend: React + Vite
- Backend: Express API
- Database: MongoDB with Mongoose
- Security middleware + validation + rate limiting
- Role model: user, staff, faculty, admin

### Slide 3 - Core Features (2 min)

- Search and discover rooms
- Create bookings with validation and overlap protection
- Approval flow for controlled rooms
- Admin operations: manage rooms, users, booking status
- Audit logs for traceability

### Slide 4 - Security Hardening (2-3 min)

Highlight implemented controls:

- Auth model: short-lived access token + refresh token rotation
- Revocation (`jti`) and forced logout behavior
- CORS allowlist, CSP header, route throttling
- Route-level schema validation
- NoSQL/regex input hardening
- Soft-delete visibility enforcement
- Timezone-safe check-in windows
- HTML escaping in email templates

### Slide 5 - Testing & Quality (2-3 min)

Show test strategy:

- Unit tests for pure logic
- Integration tests for endpoints and flow behavior
- Security tests for abuse cases

Run and show commands:

```bash
cd backend
npm test
npm run test:integration
npm run test:security
npm run test:coverage
```

Dependency integrity/security checks:

```bash
npm run dep:check
npm run audit:prod
```

### Slide 6 - Live Demo (3-4 min)

## 3) Demo Script (Step-by-Step)

### Demo Setup

1. Start backend and frontend.
2. Log in as admin in one browser tab.
3. Log in as normal user in another tab or incognito window.

### Demo Steps

1. **Room Discovery**
   - Filter by building/type/capacity.
   - Open a room and show details.

2. **Booking Creation**
   - Create a booking as user.
   - Show success details.

3. **Conflict Handling**
   - Attempt overlapping booking.
   - Show conflict response/handling.

4. **Approval Workflow**
   - Create booking for approval-required room.
   - Switch to admin and approve/reject.

5. **Check-in Window**
   - Show check-in behavior (only during valid time window).

6. **Admin Controls**
   - Soft-delete a room.
   - Show that deactivated room is hidden in reads/lists.
   - Update user status/role.

7. **Audit Visibility**
   - Show recent audit entries for actions performed in demo.

## 4) Test Coverage Talking Points

Use these points while showing terminal output:

- Validation failures are tested (invalid time, attendee bounds, enum values, invalid IDs).
- Soft-delete behavior is tested for room reads and booking list filtering.
- Concurrency and booking conflict behavior have integration coverage.
- Security-specific tests cover injection-style payload handling.

If asked about confidence:

- Explain that tests cover both happy path and abuse/edge cases.
- Mention route-layer validation + controller checks + DB constraints as layered protection.

## 5) Risks & Next Improvements

Useful to mention proactively:

- Add Redis-backed token revocation for distributed scale.
- Add performance/load test report artifact to CI.
- Add e2e browser tests for full UI journey.
- Add centralized security event dashboarding.

## 6) Presenter Checklist

Before presentation:

- [ ] `backend/.env` is configured
- [ ] MongoDB is running
- [ ] Backend starts cleanly
- [ ] Frontend starts cleanly
- [ ] Test commands pass (or have latest known pass output ready)
- [ ] Seed/demo accounts available
- [ ] Demo data prepared (at least one room per workflow)
- [ ] Backup demo path ready in case of network/service hiccups

## 7) One-Minute Closing Script

"This project delivers a full booking lifecycle with admin governance, auditable operations, and layered security controls. We validated key workflows through integration and security-focused testing, and the architecture is ready for incremental production hardening such as Redis-backed revocation and expanded CI quality gates."

