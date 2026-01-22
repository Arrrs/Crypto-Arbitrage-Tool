# Security Fix: Email Enumeration Vulnerability

## Issue Discovered
**Date**: 2025-11-21
**Severity**: Medium
**Type**: Email Enumeration (Information Disclosure)

## Vulnerability Description

The login form had a vulnerability that allowed attackers to discover which email addresses are registered in the system.

### Attack Flow (Before Fix)
1. Attacker enters any email + wrong password
2. Login fails with 401 error
3. Frontend makes additional request to `/api/auth/check-email-verification`
4. Endpoint returns `{ exists: true, verified: false }` if user exists
5. Frontend displays "Please verify your email" → **Reveals email is registered!**

### Example Attack
```bash
# Attacker tests if victim@example.com is registered
POST /api/auth/login
{ "email": "victim@example.com", "password": "wrong" }

# Gets 401, then frontend calls:
POST /api/auth/check-email-verification
{ "email": "victim@example.com" }

# Returns: { "exists": true, "verified": false }
# Attacker now knows this email is registered!
```

## Security Impact

**What attackers could do:**
- **Email Enumeration**: Discover which emails are registered (privacy violation)
- **Targeted Attacks**: Build list of valid users for phishing campaigns
- **Account Discovery**: Find corporate emails, VIPs, or specific targets

**Example Scenarios:**
- Competitor discovers employee list
- Bad actor finds personal emails for harassment
- Phishing campaigns target confirmed users

## Fix Applied

### Changes Made

#### 1. Removed Frontend Email Check
**File**: `app/login/page.tsx` (lines 63-70)

**Before (Vulnerable)**:
```typescript
if (loginResponse.status === 401) {
  try {
    // VULNERABLE: Makes separate request to check email
    const checkResponse = await fetch("/api/auth/check-email-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email }),
    })

    if (checkResponse.ok) {
      const data = await checkResponse.json()
      if (data.exists && !data.verified) {
        // Shows "verify email" even with wrong password!
        setError("Please verify your email...")
      }
    }
  } catch (e) {}
}
```

**After (Secure)**:
```typescript
// Check if backend returned specific email verification error
// This only happens when password is CORRECT (no email enumeration)
if (loginData.error === "email_not_verified") {
  setError(loginData.message || "Please verify your email...")
  setShowResendLink(true)
  setResendEmail(values.email)
  return
}

// For all other errors, show generic message
setError(loginData.error || "Invalid email or password")
```

#### 2. Deleted Vulnerable Endpoint
**File**: `app/api/auth/check-email-verification/route.ts` - **DELETED**

This endpoint was allowing unauthenticated users to check if any email exists in the system.

### Backend Already Secure
**File**: `app/api/auth/login/route.ts` (lines 120-126)

The backend was already implementing the correct flow:
```typescript
// Step 1: Check password FIRST
const isPasswordValid = await bcrypt.compare(password, dbUser.password)

if (!isPasswordValid) {
  // Wrong password → Generic error (no enumeration)
  return NextResponse.json(
    { error: "Invalid email or password" },
    { status: 401 }
  )
}

// Step 2: ONLY check email verification if password is CORRECT
if (!dbUser.emailVerified && !dbUser.adminVerified) {
  return NextResponse.json(
    { error: "email_not_verified", message: "Please verify your email..." },
    { status: 403 }
  )
}
```

## Industry Standards Compliance

### Auth0 Approach
✅ Password checked first
✅ Generic error for wrong password
✅ Specific error only when password correct

### AWS Cognito Approach
✅ Password validated before any user checks
✅ No information disclosure on wrong password
✅ User status revealed only after authentication

### Okta Approach (Alternative)
❌ Checks verification before password (worse UX)
✅ But still prevents enumeration with generic errors

**Our implementation matches Auth0/AWS Cognito** - the industry standard for best security + UX balance.

## New Behavior (After Fix)

### Scenario 1: Unverified Email + Wrong Password
```
User Input: unverified@test.com + wrongpassword
Response: "Invalid email or password" (generic)
Result: ✅ No information leaked
```

### Scenario 2: Unverified Email + Correct Password
```
User Input: unverified@test.com + correctpassword
Response: "Please verify your email before signing in"
Result: ✅ Reveals verification status, but user knows correct password (owns account)
```

### Scenario 3: Verified Email + Wrong Password
```
User Input: verified@test.com + wrongpassword
Response: "Invalid email or password" (generic)
Result: ✅ No information leaked
```

### Scenario 4: Non-existent Email
```
User Input: nonexistent@test.com + anypassword
Response: "Invalid email or password" (generic)
Result: ✅ No information leaked
```

## Testing

### Test 1: Email Enumeration Protection
```bash
# Try to enumerate emails
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"registered@test.com","password":"wrong"}'

# Expected: Generic "Invalid email or password"
# No clue if email exists
```

### Test 2: Legitimate Unverified User
```bash
# User with correct password but unverified
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"unverified@test.com","password":"correctpassword"}'

# Expected: "Please verify your email..."
# This is OK because they proved they know the password
```

### Test 3: Deleted Endpoint
```bash
# Try to use old vulnerable endpoint
curl -X POST http://localhost:3000/api/auth/check-email-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"anyone@test.com"}'

# Expected: 404 Not Found (endpoint removed)
```

## Security Checklist

- [x] Generic error for wrong password
- [x] Specific error only when password correct
- [x] No email check endpoint exposed
- [x] Timing attacks mitigated (constant-time comparison)
- [x] Rate limiting prevents brute-force
- [x] Follows Auth0/AWS Cognito standards

## Lessons Learned

1. **Never trust the frontend**: Security checks must be in backend
2. **No separate verification endpoints**: Don't expose user status to unauthenticated requests
3. **Password first, then everything else**: Check authentication before revealing any account info
4. **Generic errors are your friend**: "Invalid email or password" protects privacy
5. **Test for enumeration**: Always verify attackers can't discover user lists

## Related Documentation

- [Auth0 Security Best Practices](https://auth0.com/docs/secure/attack-protection/preventing-credential-stuffing-attacks)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [AWS Cognito User Pool Security](https://docs.aws.amazon.com/cognito/latest/developerguide/security-best-practices.html)

## Impact Assessment

**Before Fix:**
- 🔴 Email enumeration possible
- 🔴 Privacy violation risk
- 🟡 Could enable targeted attacks

**After Fix:**
- 🟢 Email enumeration prevented
- 🟢 Industry standard compliance
- 🟢 Auth0/AWS Cognito level security

**Status**: ✅ **FIXED** - Production Ready
