# Mass-Assignment Vulnerability Fix

## Problem Statement

### Original Vulnerability

The application had critical mass-assignment vulnerabilities in update endpoints where `req.body` was passed directly to database update operations without field validation:

```javascript
// VULNERABLE CODE (REMOVED)
const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, {
  new: true,
  runValidators: true
});
```

### Attack Scenarios

#### 1. Privilege Escalation in Booking Updates

A regular user could escalate their booking privileges:

```bash
# Attacker request
PUT /api/bookings/123
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "approved",           # Bypass approval process
  "priorityLevel": 1,              # Escalate priority
  "adminOverride": true,           # Claim admin override
  "user": "attacker_user_id"       # Transfer ownership
}
```

**Impact:**
- ✅ Bypass approval workflow (pending → approved)
- ✅ Escalate priority to highest level
- ✅ Transfer booking ownership to another user
- ✅ Set admin override flag
- ✅ Manipulate check-in status
- ✅ Modify confirmation codes

#### 2. Room Configuration Tampering

An admin could accidentally or maliciously modify protected fields:

```bash
PUT /api/rooms/456
Authorization: Bearer <admin_token>

{
  "name": "Updated Room",
  "isActive": false,              # Bypass soft-delete workflow
  "_id": "different_id",          # Attempt ID manipulation
  "createdAt": "2020-01-01"       # Manipulate timestamps
}
```

#### 3. IDOR (Insecure Direct Object Reference)

Combined with the mass-assignment, users could:
- Transfer bookings to other users
- Modify other users' booking details
- Claim ownership of bookings they don't own

---

## Solution: Field Whitelisting

### Implementation

All update and create endpoints now use explicit field whitelisting:

#### 1. Booking Updates (`bookingController.js`)

```javascript
// SECURITY: Whitelist mutable fields to prevent mass-assignment
const allowedUserFields = ['title', 'purpose', 'attendeeCount'];
const allowedAdminFields = [...allowedUserFields, 'date', 'startTime', 'endTime'];

const allowedFields = req.user.role === 'admin' ? allowedAdminFields : allowedUserFields;
const updates = {};

// Only copy whitelisted fields from req.body
allowedFields.forEach(field => {
  if (req.body[field] !== undefined) {
    updates[field] = req.body[field];
  }
});

// Reject if trying to update protected fields
const protectedFields = ['status', 'user', 'room', 'priorityLevel', 'adminOverride', 
                         'confirmationCode', 'checkedIn', 'checkInTime', 'cancelledBy',
                         'cancelReason', 'autoReleaseAt', 'recurrenceGroupId'];
const attemptedProtectedFields = protectedFields.filter(field => req.body[field] !== undefined);

if (attemptedProtectedFields.length > 0) {
  return res.status(400).json({
    message: 'Cannot update protected fields',
    error: 'PROTECTED_FIELDS',
    attemptedFields: attemptedProtectedFields
  });
}

// Apply updates
Object.assign(booking, updates);
await booking.save();
```

**Allowed Fields:**
- **Users:** `title`, `purpose`, `attendeeCount`
- **Admins:** `title`, `purpose`, `attendeeCount`, `date`, `startTime`, `endTime`

**Protected Fields:**
- `status` - Use `/api/bookings/:id/status` endpoint
- `user` - Cannot transfer ownership
- `room` - Cannot change room after creation
- `priorityLevel` - System-managed
- `adminOverride` - Admin-only via override endpoint
- `confirmationCode` - System-generated
- `checkedIn`, `checkInTime` - Use check-in endpoint
- `cancelledBy`, `cancelReason` - Use cancellation endpoint
- `autoReleaseAt` - System-managed
- `recurrenceGroupId` - Immutable

#### 2. Room Updates (`roomController.js`)

```javascript
// SECURITY: Whitelist mutable fields
const allowedFields = [
  'name', 'type', 'capacity', 'building', 'floor', 'amenities',
  'description', 'isAvailable', 'operatingHoursStart', 'operatingHoursEnd',
  'bufferMinutes', 'requiresApproval', 'internalNotes'
];

const updates = {};
allowedFields.forEach(field => {
  if (req.body[field] !== undefined) {
    updates[field] = req.body[field];
  }
});

// Reject protected fields
const protectedFields = ['isActive', '_id', 'createdAt', 'updatedAt'];
const attemptedProtectedFields = protectedFields.filter(field => req.body[field] !== undefined);

if (attemptedProtectedFields.length > 0) {
  return res.status(400).json({
    message: 'Cannot update protected fields',
    error: 'PROTECTED_FIELDS',
    attemptedFields: attemptedProtectedFields,
    hint: 'Use DELETE endpoint to deactivate rooms'
  });
}
```

**Protected Fields:**
- `isActive` - Use DELETE endpoint for soft-delete
- `_id` - Immutable
- `createdAt`, `updatedAt` - System-managed

#### 3. Room Creation (`roomController.js`)

```javascript
// SECURITY: Whitelist fields for room creation
const allowedFields = [
  'name', 'type', 'capacity', 'building', 'floor', 'amenities',
  'description', 'isAvailable', 'operatingHoursStart', 'operatingHoursEnd',
  'bufferMinutes', 'requiresApproval', 'internalNotes'
];

const roomData = {};
allowedFields.forEach(field => {
  if (req.body[field] !== undefined) {
    roomData[field] = req.body[field];
  }
});

const room = await Room.create(roomData);
```

---

## Error Handling

### Client-Side Response

When attempting to update protected fields:

```json
{
  "message": "Cannot update protected fields",
  "error": "PROTECTED_FIELDS",
  "attemptedFields": ["status", "priorityLevel", "adminOverride"],
  "hint": "Use the appropriate endpoint for status changes, cancellations, or check-ins"
}
```

### Client Implementation

```javascript
try {
  await updateBooking(bookingId, {
    title: 'Updated Title',
    purpose: 'Updated Purpose'
  });
} catch (error) {
  if (error.response?.data?.error === 'PROTECTED_FIELDS') {
    console.error('Attempted to update protected fields:', 
                  error.response.data.attemptedFields);
    showError('Cannot update system-managed fields. ' + 
              error.response.data.hint);
  }
}
```

---

## Verification

### Test Cases

#### Test 1: User Cannot Escalate Booking Status

```bash
# Setup: Create a pending booking
POST /api/bookings
{
  "room": "room_id",
  "title": "Test Booking",
  "date": "2026-05-01",
  "startTime": "10:00",
  "endTime": "11:00"
}
# Response: status = "pending"

# Attack: Try to approve own booking
PUT /api/bookings/<booking_id>
{
  "status": "approved"
}

# Expected Response: 400 Bad Request
{
  "message": "Cannot update protected fields",
  "error": "PROTECTED_FIELDS",
  "attemptedFields": ["status"]
}

# Verify: Booking status still "pending"
GET /api/bookings/<booking_id>
# Response: status = "pending" ✅
```

#### Test 2: User Cannot Transfer Booking Ownership

```bash
PUT /api/bookings/<booking_id>
{
  "user": "attacker_user_id"
}

# Expected: 400 Bad Request with PROTECTED_FIELDS error
# Verify: Booking user unchanged ✅
```

#### Test 3: User Cannot Set Admin Override

```bash
PUT /api/bookings/<booking_id>
{
  "adminOverride": true,
  "priorityLevel": 1
}

# Expected: 400 Bad Request
# Verify: adminOverride = false, priorityLevel unchanged ✅
```

#### Test 4: Admin Cannot Bypass Soft-Delete

```bash
PUT /api/rooms/<room_id>
{
  "isActive": false
}

# Expected: 400 Bad Request with PROTECTED_FIELDS error
# Verify: Must use DELETE endpoint ✅
```

#### Test 5: Valid Updates Work Correctly

```bash
# User updates allowed fields
PUT /api/bookings/<booking_id>
{
  "title": "Updated Title",
  "purpose": "Updated Purpose",
  "attendeeCount": 25
}

# Expected: 200 OK with updated booking
# Verify: Only allowed fields updated ✅
```

---

## Security Best Practices Applied

### 1. Principle of Least Privilege
- Users can only update fields relevant to their use case
- Admins get slightly more permissions but still restricted
- System-managed fields are completely protected

### 2. Defense in Depth
- Field whitelisting (primary defense)
- Protected field detection (secondary defense)
- Clear error messages (helps legitimate users)
- Audit logging (tracks all update attempts)

### 3. Fail Securely
- Unknown fields are silently ignored (no error)
- Protected fields trigger explicit rejection
- No partial updates on validation failure

### 4. Clear Separation of Concerns
- Status changes: `/api/bookings/:id/status`
- Cancellations: `DELETE /api/bookings/:id`
- Check-ins: `/api/bookings/:id/checkin`
- Admin overrides: `/api/bookings/override`
- General updates: `PUT /api/bookings/:id` (limited fields)

---

## Migration Guide

### For Existing Clients

If your client code was relying on updating protected fields:

**Before (INSECURE):**
```javascript
// This will now fail
await updateBooking(id, {
  title: 'New Title',
  status: 'approved'  // ❌ Protected field
});
```

**After (SECURE):**
```javascript
// Update allowed fields
await updateBooking(id, {
  title: 'New Title',
  purpose: 'Updated Purpose'
});

// Use dedicated endpoint for status
await updateBookingStatus(id, {
  status: 'approved'
});
```

### API Changes

| Old Approach | New Approach |
|-------------|--------------|
| `PUT /api/bookings/:id` with `status` | `PUT /api/bookings/:id/status` |
| `PUT /api/bookings/:id` with `checkedIn` | `PUT /api/bookings/:id/checkin` |
| `PUT /api/bookings/:id` with `cancelReason` | `DELETE /api/bookings/:id` |
| `PUT /api/rooms/:id` with `isActive: false` | `DELETE /api/rooms/:id` |

---

## Audit Log Analysis

Check for suspicious activity in existing deployments:

```javascript
// Find bookings with suspicious status changes
db.auditlogs.find({
  action: 'BOOKING_UPDATED',
  'details.after.status': { $exists: true }
});

// Find bookings with ownership transfers
db.auditlogs.find({
  action: 'BOOKING_UPDATED',
  'details.after.user': { $exists: true }
});

// Find bookings with priority escalation
db.auditlogs.find({
  action: 'BOOKING_UPDATED',
  'details.after.priorityLevel': { $lt: 3 }
});
```

---

## Summary

| Vulnerability | Status | Protection |
|--------------|--------|------------|
| Mass-assignment in booking updates | ✅ **FIXED** | Field whitelisting |
| Mass-assignment in room updates | ✅ **FIXED** | Field whitelisting |
| Mass-assignment in room creation | ✅ **FIXED** | Field whitelisting |
| IDOR via ownership transfer | ✅ **FIXED** | `user` field protected |
| Privilege escalation via status | ✅ **FIXED** | `status` field protected |
| Admin override bypass | ✅ **FIXED** | `adminOverride` protected |
| Priority manipulation | ✅ **FIXED** | `priorityLevel` protected |

**All mass-assignment vulnerabilities have been fixed with explicit field whitelisting and clear error messages.**

---

## References

- [OWASP Mass Assignment](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05-Testing_for_Mass_Assignment)
- [CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes](https://cwe.mitre.org/data/definitions/915.html)

**Last Updated:** 2026-04-22
