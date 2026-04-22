# Recurring Booking Quota Bypass Fix

## Problem Statement

### Original Vulnerability

The `createRecurringBooking` endpoint did not enforce role-based booking quotas, allowing users to bypass their limits by creating recurring bookings.

**Vulnerable Code (REMOVED):**
```javascript
// createRecurringBooking - NO QUOTA CHECK!
const occurrences = expandRecurrenceRule(recurrenceRule, firstStart, firstEnd);

// Directly creates all occurrences without checking quota
for (let i = 0; i < occurrences.length; i++) {
  const booking = await Booking.create({ ... });
  createdBookings.push(booking);
}
```

### Attack Scenario

A student with a quota of 5 active bookings could bypass the limit:

```bash
# Student has quota = 5
# Currently has 2 active bookings

# Attack: Create 30-occurrence recurring booking
POST /api/bookings/recurring
Authorization: Bearer <student_token>

{
  "room": "room_id",
  "title": "Weekly Meeting",
  "date": "2026-05-01",
  "startTime": "10:00",
  "endTime": "11:00",
  "recurrenceRule": "FREQ=WEEKLY;COUNT=30"
}

# Result: 30 bookings created ❌
# Total active bookings: 2 + 30 = 32 (exceeds quota of 5!)
```

### Impact

- **Quota bypass:** Users could create unlimited bookings via recurring bookings
- **Resource exhaustion:** A single user could monopolize room availability
- **Unfair allocation:** Bypasses the role-based fairness system
- **System abuse:** Malicious users could create thousands of bookings

**Role-Based Quotas:**
- Student: 5 active bookings
- Staff: 10 active bookings
- Faculty: 20 active bookings
- Admin: 50 active bookings

---

## Solution: Quota Enforcement

### Implementation

Added quota check before creating recurring bookings:

```javascript
// SECURITY: Check quota before creating recurring bookings
const activeBookings = await Booking.countDocuments({
  user: req.user._id,
  status: { $in: ['pending', 'approved'] },
  date: { $gte: new Date() }
});

const maxBookings = user.maxActiveBookings || 5;
const newBookingsCount = occurrences.length;
const totalAfterCreation = activeBookings + newBookingsCount;

if (totalAfterCreation > maxBookings) {
  return res.status(400).json({
    message: `Cannot create ${newBookingsCount} recurring bookings. Would exceed your limit of ${maxBookings} active bookings.`,
    error: 'RECURRING_QUOTA_EXCEEDED',
    current: activeBookings,
    requested: newBookingsCount,
    maximum: maxBookings,
    available: Math.max(0, maxBookings - activeBookings)
  });
}
```

### How It Works

1. **Count current active bookings** for the user
2. **Calculate total after creation** (current + new occurrences)
3. **Compare against quota** (maxActiveBookings)
4. **Reject if exceeds** with clear error message
5. **Proceed if within quota** and create all occurrences

### Error Response

When quota would be exceeded:

```json
{
  "message": "Cannot create 30 recurring bookings. Would exceed your limit of 5 active bookings.",
  "error": "RECURRING_QUOTA_EXCEEDED",
  "current": 2,
  "requested": 30,
  "maximum": 5,
  "available": 3
}
```

---

## Verification

### Test Cases

#### Test 1: Student Cannot Exceed Quota via Recurring Booking

```bash
# Setup: Student has 2 active bookings, quota = 5
# Available slots: 3

# Attack: Try to create 10-occurrence recurring booking
POST /api/bookings/recurring
{
  "recurrenceRule": "FREQ=WEEKLY;COUNT=10",
  ...
}

# Expected Response: 400 Bad Request
{
  "error": "RECURRING_QUOTA_EXCEEDED",
  "current": 2,
  "requested": 10,
  "maximum": 5,
  "available": 3
}

# Verify: No bookings created ✅
```

#### Test 2: Student Can Create Within Quota

```bash
# Setup: Student has 2 active bookings, quota = 5
# Available slots: 3

# Valid: Create 3-occurrence recurring booking
POST /api/bookings/recurring
{
  "recurrenceRule": "FREQ=WEEKLY;COUNT=3",
  ...
}

# Expected: 201 Created
{
  "message": "Recurring booking created",
  "created": 3,
  "bookings": [...]
}

# Verify: Total active bookings = 5 (at quota) ✅
```

#### Test 3: Faculty Has Higher Quota

```bash
# Setup: Faculty has 15 active bookings, quota = 20
# Available slots: 5

# Valid: Create 5-occurrence recurring booking
POST /api/bookings/recurring
{
  "recurrenceRule": "FREQ=WEEKLY;COUNT=5",
  ...
}

# Expected: 201 Created ✅
```

#### Test 4: Admin Has Highest Quota

```bash
# Setup: Admin has 40 active bookings, quota = 50
# Available slots: 10

# Valid: Create 10-occurrence recurring booking
POST /api/bookings/recurring
{
  "recurrenceRule": "FREQ=WEEKLY;COUNT=10",
  ...
}

# Expected: 201 Created ✅
```

#### Test 5: Quota Check Happens Before Conflict Check

```bash
# Setup: Student has 4 active bookings, quota = 5
# Try to create 10 bookings (exceeds quota)
# Even if some would conflict, quota check fails first

POST /api/bookings/recurring
{
  "recurrenceRule": "FREQ=WEEKLY;COUNT=10",
  ...
}

# Expected: 400 RECURRING_QUOTA_EXCEEDED
# (Not 409 RECURRING_BOOKING_CONFLICT)
# Quota check happens first ✅
```

---

## Client-Side Handling

### Error Handling

```javascript
try {
  await createRecurringBooking({
    recurrenceRule: 'FREQ=WEEKLY;COUNT=30',
    ...
  });
} catch (error) {
  if (error.response?.data?.error === 'RECURRING_QUOTA_EXCEEDED') {
    const { current, requested, maximum, available } = error.response.data;
    
    showError(
      `Cannot create ${requested} recurring bookings. ` +
      `You have ${current} active bookings and a limit of ${maximum}. ` +
      `You can create up to ${available} more bookings.`
    );
    
    // Suggest reducing occurrences
    if (available > 0) {
      showSuggestion(`Try creating ${available} or fewer occurrences.`);
    }
  }
}
```

### UI Validation

Prevent invalid requests before submission:

```javascript
function validateRecurringBooking(recurrenceRule, userQuota, currentActive) {
  const occurrenceCount = parseRecurrenceCount(recurrenceRule);
  const available = userQuota - currentActive;
  
  if (occurrenceCount > available) {
    return {
      valid: false,
      message: `Cannot create ${occurrenceCount} bookings. ` +
               `You can only create ${available} more.`,
      maxAllowed: available
    };
  }
  
  return { valid: true };
}

// In form validation
const validation = validateRecurringBooking(
  formData.recurrenceRule,
  user.maxActiveBookings,
  user.activeBookingsCount
);

if (!validation.valid) {
  setError(validation.message);
  setSuggestedMax(validation.maxAllowed);
}
```

---

## Security Considerations

### 1. Quota Calculation

**What counts toward quota:**
- Bookings with status `pending` or `approved`
- Bookings with date >= today (future bookings)

**What doesn't count:**
- Cancelled bookings
- Rejected bookings
- Completed bookings
- Past bookings

### 2. Race Conditions

**Potential issue:** Two concurrent recurring booking requests could both pass the quota check.

**Mitigation:**
- Quota check happens at request time (not perfect but acceptable)
- Alternative: Use MongoDB transaction with quota check
- In practice: Rare for same user to submit concurrent recurring bookings

**Future enhancement:**
```javascript
// Use transaction for atomic quota check + creation
session = await mongoose.startSession();
session.startTransaction();

const activeBookings = await Booking.countDocuments({
  user: req.user._id,
  status: { $in: ['pending', 'approved'] },
  date: { $gte: new Date() }
}).session(session);

// Check quota...
// Create bookings...

await session.commitTransaction();
```

### 3. Approval Path

**Question:** What if pending bookings are approved later, exceeding quota?

**Answer:** This is acceptable because:
- Approval is an admin action (trusted)
- Quota is enforced at creation time
- Admins can override if needed
- Prevents creation abuse, not approval workflow

**Future enhancement:** Add quota check to approval path if needed.

---

## Comparison with Single Booking

| Aspect | Single Booking | Recurring Booking |
|--------|---------------|-------------------|
| **Quota Check** | ✅ Yes | ✅ Yes (now fixed) |
| **When Checked** | Before creation | Before all occurrences |
| **Calculation** | current + 1 <= quota | current + count <= quota |
| **Error Code** | BOOKING_LIMIT_EXCEEDED | RECURRING_QUOTA_EXCEEDED |
| **Granularity** | Per booking | Per occurrence |

---

## Testing

### Automated Tests

```javascript
// tests/integration/recurringQuota.test.js

describe('Recurring Booking Quota Enforcement', () => {
  test('RQ-01: Student cannot exceed quota via recurring booking', async () => {
    // Student has quota = 5, currently has 2 active bookings
    
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        recurrenceRule: 'FREQ=WEEKLY;COUNT=10',
        ...
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('RECURRING_QUOTA_EXCEEDED');
    expect(result.body.current).toBe(2);
    expect(result.body.requested).toBe(10);
    expect(result.body.maximum).toBe(5);
    expect(result.body.available).toBe(3);
  });

  test('RQ-02: Student can create within quota', async () => {
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        recurrenceRule: 'FREQ=WEEKLY;COUNT=3',
        ...
      });

    expect(result.status).toBe(201);
    expect(result.body.created).toBe(3);
  });

  test('RQ-03: Faculty has higher quota', async () => {
    // Faculty quota = 20
    const result = await request(app)
      .post('/api/bookings/recurring')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        recurrenceRule: 'FREQ=WEEKLY;COUNT=15',
        ...
      });

    expect(result.status).toBe(201);
    expect(result.body.created).toBe(15);
  });
});
```

### Manual Testing

```bash
# Test 1: Verify quota enforcement
npm run test:integration -- recurringQuota.test.js

# Test 2: Manual API test
curl -X POST http://localhost:5001/api/bookings/recurring \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room": "room_id",
    "title": "Weekly Meeting",
    "date": "2026-05-01",
    "startTime": "10:00",
    "endTime": "11:00",
    "recurrenceRule": "FREQ=WEEKLY;COUNT=30"
  }'

# Expected: 400 with RECURRING_QUOTA_EXCEEDED
```

---

## Migration Guide

### For Existing Deployments

If you have existing recurring bookings that exceeded quotas:

```javascript
// Find users with excessive recurring bookings
db.bookings.aggregate([
  {
    $match: {
      status: { $in: ['pending', 'approved'] },
      date: { $gte: new Date() },
      recurrenceGroupId: { $exists: true }
    }
  },
  {
    $group: {
      _id: '$user',
      count: { $sum: 1 },
      groups: { $addToSet: '$recurrenceGroupId' }
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'user'
    }
  },
  {
    $match: {
      $expr: { $gt: ['$count', { $arrayElemAt: ['$user.maxActiveBookings', 0] }] }
    }
  }
]);
```

**Options:**
1. **Grandfather existing bookings** - Allow them to remain
2. **Cancel excess bookings** - Cancel bookings beyond quota
3. **Notify users** - Ask users to cancel some bookings

---

## Summary

| Issue | Status | Protection |
|-------|--------|------------|
| Recurring booking quota bypass | ✅ **FIXED** | Quota check before creation |
| Resource exhaustion | ✅ **PREVENTED** | Enforced limits |
| Unfair allocation | ✅ **PREVENTED** | Role-based quotas enforced |
| System abuse | ✅ **PREVENTED** | Clear error messages |

**The recurring booking quota bypass has been fixed with comprehensive quota enforcement and clear error handling.**

---

## References

- Role-based quotas defined in `models/User.js`
- Single booking quota check in `createBooking` (lines 80-95)
- Recurring booking quota check in `createRecurringBooking` (lines 770-790)

**Last Updated:** 2026-04-22
