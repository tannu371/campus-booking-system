# Security Configuration Guide

## Critical Security Requirements

### 1. JWT Secret Configuration

**Status:** ✅ REQUIRED - Server will not start without this

The application requires a `JWT_SECRET` environment variable. The server will fail at boot if this is not configured.

```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add to your `.env` file:
```
JWT_SECRET=your_generated_secret_here
```

**Why this matters:** JWT tokens are used for authentication. Without a secure secret, attackers can forge admin tokens and gain unauthorized access.

---

### 2. Seed Data Passwords

**Status:** ⚠️ IMPORTANT - Configure before production deployment

When `AUTO_SEED_ON_EMPTY=true`, the application automatically creates default user accounts on first boot. These accounts use passwords from environment variables.

#### Required Environment Variables

```bash
SEED_ADMIN_PASSWORD=your_secure_admin_password
SEED_FACULTY_PASSWORD=your_secure_faculty_password
SEED_USER_PASSWORD=your_secure_user_password
SEED_STAFF_PASSWORD=your_secure_staff_password
```

#### Default Accounts Created

| Email | Role | Password Variable |
|-------|------|-------------------|
| admin@campus.edu | admin | SEED_ADMIN_PASSWORD |
| sarah@campus.edu | faculty | SEED_FACULTY_PASSWORD |
| john@campus.edu | user | SEED_USER_PASSWORD |
| alice@campus.edu | user | SEED_USER_PASSWORD |
| bob@campus.edu | user | SEED_USER_PASSWORD |
| carol@campus.edu | staff | SEED_STAFF_PASSWORD |

#### Security Recommendations

1. **Development:** Use simple passwords for convenience (already configured in your .env)
2. **Production:** 
   - Set `AUTO_SEED_ON_EMPTY=false` to disable auto-seeding
   - If you need seed data, use strong unique passwords for each role
   - Change all default passwords immediately after first login
   - Consider deleting seed accounts and creating real accounts through the UI

#### Fallback Behavior

If seed password environment variables are not set, the system uses these **INSECURE** defaults:
- Admin: `CHANGE_ME_admin123`
- Faculty: `CHANGE_ME_faculty123`
- User: `CHANGE_ME_user123`
- Staff: `CHANGE_ME_staff123`

A warning will be displayed in the console when defaults are used.

**CRITICAL: Production Protection**

The server will **refuse to start** if:
- `NODE_ENV=production` AND
- `AUTO_SEED_ON_EMPTY=true` AND
- Any seed password is missing or contains `CHANGE_ME`

This prevents accidentally deploying to production with known default passwords.

---

## Environment File Security

### .env File Protection

✅ The `.env` file is excluded from git via `.gitignore`
✅ A `.env.example` template is provided for reference

**Never commit `.env` files to version control!**

### Setting Up a New Environment

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Generate a secure JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. Update all placeholder values in `.env`

4. For production, set `AUTO_SEED_ON_EMPTY=false`

---

## Production Deployment Checklist

- [ ] Set a cryptographically random `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Set `AUTO_SEED_ON_EMPTY=false` (or configure secure seed passwords)
- [ ] If using auto-seed in production, set all `SEED_*_PASSWORD` variables to strong unique values
- [ ] Change all default account passwords after first login
- [ ] Verify `.env` is not committed to git
- [ ] Use environment-specific secrets (don't reuse dev secrets)
- [ ] Enable HTTPS/TLS for all connections
- [ ] Configure proper CORS origins
- [ ] Review and rotate secrets regularly

---

## Security Incident Response

If you suspect seed passwords or JWT secrets have been compromised:

1. **Immediately** rotate the JWT_SECRET
2. Force all users to re-authenticate (existing tokens will be invalidated)
3. Reset passwords for all affected accounts
4. Review audit logs for suspicious activity
5. Check for unauthorized admin account creation

---

## Questions?

For security concerns or to report vulnerabilities, contact your security team or project maintainer.
