# Quick Win: Add Token Expiration to Current System

**Estimated Time: 4-6 hours** (1 working day)

This is a **much faster** alternative to full JWT migration (which takes 5-7 days).

---

## ⏱️ Time Breakdown

| Task | Estimated Time | Difficulty |
|------|---------------|------------|
| **Backend Changes** | 2-3 hours | 🟡 Medium |
| **Frontend Changes** | 1-2 hours | 🟢 Easy |
| **Testing** | 1 hour | 🟢 Easy |
| **Total** | **4-6 hours** | 🟡 Medium |

---

## 📋 What We'll Implement

### Current System:
```
API Key/Secret never expires
User logs in → Gets tokens → Tokens valid forever
```

### After Quick Win:
```
API Key/Secret expires after 30 days
User logs in → Gets tokens → Valid for 30 days → Auto-refresh
```

---

## 🔧 Implementation Plan

### **PHASE 1: Backend Changes (2-3 hours)**

#### Step 1: Add Expiration Fields to User Doctype (30 minutes)

You need to add these fields to the User doctype in Frappe:

**Option A: Via Frappe UI (Easier)**
1. Go to Frappe Desk
2. Search for "Customize Form"
3. Select "User" doctype
4. Add these fields:

```python
# Field 1
Field Label: API Secret Expires At
Field Name: api_secret_expires_at
Field Type: Datetime

# Field 2
Field Label: API Secret Created At
Field Name: api_secret_created_at
Field Type: Datetime
```

**Option B: Via Code (Faster for developers)**

Create a migration file or add via Python console:

```python
# frappe console
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

custom_fields = {
    "User": [
        {
            "fieldname": "api_secret_expires_at",
            "label": "API Secret Expires At",
            "fieldtype": "Datetime",
            "insert_after": "api_secret",
        },
        {
            "fieldname": "api_secret_created_at",
            "label": "API Secret Created At",
            "fieldtype": "Datetime",
            "insert_after": "api_secret_expires_at",
        }
    ]
}

create_custom_fields(custom_fields)
```

---

#### Step 2: Update `generate_api_credentials()` Function (45 minutes)

**File:** `backend/backend_mobile_auth.py`

**Current Code:**
```python
def generate_api_credentials(user):
    user_doc = frappe.get_doc("User", user)
    api_key = user_doc.api_key
    api_secret = frappe.generate_hash(length=15)

    if not api_key:
        api_key = frappe.generate_hash(length=15)
        user_doc.api_key = api_key

    user_doc.api_secret = api_secret  # ❌ Always regenerates
    user_doc.save(ignore_permissions=True)

    return api_key, user_doc.get_password("api_secret")
```

**New Code with Expiration:**
```python
from frappe.utils import now_datetime, add_to_date

def generate_api_credentials(user, force_regenerate=False):
    """
    Generate or retrieve API key and secret for the user

    Args:
        user: Username/Email
        force_regenerate: If True, generate new secret even if valid one exists

    Returns:
        tuple: (api_key, api_secret, expires_in_seconds)
    """
    user_doc = frappe.get_doc("User", user)

    # Generate API key if not exists
    if not user_doc.api_key:
        user_doc.api_key = frappe.generate_hash(length=15)

    # Check if current secret is still valid
    existing_secret = user_doc.get_password("api_secret")
    expires_at = user_doc.api_secret_expires_at

    # Determine if we need to generate new secret
    should_regenerate = force_regenerate or not existing_secret or not expires_at

    # Check if secret has expired
    if expires_at and now_datetime() >= expires_at:
        should_regenerate = True
        frappe.log_error(
            f"API secret expired for user {user}",
            "Token Expiration"
        )

    if should_regenerate:
        # Generate new secret
        api_secret = frappe.generate_hash(length=15)
        user_doc.api_secret = api_secret

        # Set expiration (30 days from now)
        user_doc.api_secret_created_at = now_datetime()
        user_doc.api_secret_expires_at = add_to_date(None, days=30)

        user_doc.save(ignore_permissions=True)
        frappe.db.commit()

        frappe.logger().info(f"Generated new API secret for {user}, expires: {user_doc.api_secret_expires_at}")

        return user_doc.api_key, user_doc.get_password("api_secret"), 30 * 24 * 60 * 60  # 30 days in seconds
    else:
        # Return existing secret with remaining time
        remaining_time = (expires_at - now_datetime()).total_seconds()

        frappe.logger().info(f"Reusing existing API secret for {user}, expires in: {remaining_time}s")

        return user_doc.api_key, existing_secret, int(remaining_time)
```

---

#### Step 3: Add Token Validation Decorator (45 minutes)

Create a new function to validate token expiration on every request:

```python
# backend/backend_mobile_auth.py

def validate_token_expiration(fn):
    """
    Decorator to check if API token has expired
    Use this on protected endpoints
    """
    def wrapper(*args, **kwargs):
        from frappe import request
        from frappe.utils import now_datetime

        # Get Authorization header
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("token "):
            frappe.throw(_("Invalid authorization header"), frappe.AuthenticationError)

        # Extract api_key from header
        token_parts = auth_header.replace("token ", "").split(":")
        if len(token_parts) != 2:
            frappe.throw(_("Invalid token format"), frappe.AuthenticationError)

        api_key, api_secret = token_parts

        # Find user with this api_key
        user = frappe.db.get_value("User", {"api_key": api_key}, ["name", "api_secret_expires_at"], as_dict=True)

        if not user:
            frappe.throw(_("Invalid API key"), frappe.AuthenticationError)

        # Check if token has expired
        if user.api_secret_expires_at:
            if now_datetime() >= user.api_secret_expires_at:
                frappe.throw(_("Token has expired. Please login again."), frappe.AuthenticationError)

        # Token is valid, proceed with original function
        return fn(*args, **kwargs)

    return wrapper
```

---

#### Step 4: Update Login to Return Expiration Info (15 minutes)

Update `mobile_app_login()` to return token expiration:

```python
# backend/backend_mobile_auth.py

@frappe.whitelist(allow_guest=True)
def mobile_app_login(usr, app_password, device_id, device_model, device_brand):
    # ... existing validation code ...

    # Generate API credentials with expiration
    api_key, api_secret, expires_in = generate_api_credentials(employee.user_id, force_regenerate=False)

    # Return with expiration info
    return {
        "success": True,
        "message": _("Login successful"),
        "data": {
            "employee_id": employee.name,
            "employee_name": employee.employee_name,
            "user": employee.user_id,
            "api_key": api_key,
            "api_secret": api_secret,
            "expires_in": expires_in,  # ← NEW: Seconds until expiration
            "device_id": device_id,
            "app_id": employee.app_id,
            "require_password_reset": employee.require_password_reset or 0
        }
    }
```

---

#### Step 5: Update Protected Endpoints (15 minutes)

Apply the validation decorator to protected endpoints:

```python
# backend/backend_mobile_auth.py

@frappe.whitelist()
@validate_token_expiration  # ← ADD THIS
def reset_app_password(new_password):
    """Reset app password for authenticated user"""
    # ... existing code ...

    # After password reset, force regenerate tokens
    api_key, api_secret, expires_in = generate_api_credentials(user, force_regenerate=True)

    return {
        "success": True,
        "message": _("Password reset successfully"),
        "data": {
            "api_key": api_key,        # ← NEW: Return new credentials
            "api_secret": api_secret,
            "expires_in": expires_in
        }
    }

# Add to other protected endpoints as needed
```

---

### **PHASE 2: Frontend Changes (1-2 hours)**

#### Step 1: Update User Type (5 minutes)

**File:** `src/types/index.ts`

```typescript
export interface User {
  employee_id: string;
  employee_name: string;
  email: string;
  api_key: string;
  api_secret: string;
  device_id: string;
  app_id: string;
  require_password_reset: boolean;
  token_expires_at?: string;  // ← NEW: ISO datetime string
}
```

---

#### Step 2: Update AuthContext to Handle Expiration (30 minutes)

**File:** `src/contexts/AuthContext.tsx`

Add token expiration tracking:

```typescript
// Add new state
const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);

// Update login function
const login = async (
  appId: string,
  appPassword: string,
  urlOverride?: string
): Promise<{ success: boolean; error?: string }> => {
  // ... existing code ...

  if (result.success && result.data) {
    const {
      employee_id,
      employee_name,
      user,
      api_key,
      api_secret,
      device_id,
      app_id,
      require_password_reset,
      expires_in  // ← NEW: Seconds until expiration
    } = result.data;

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    const userObject: User = {
      employee_id,
      employee_name,
      email: user,
      api_key,
      api_secret,
      device_id,
      app_id,
      require_password_reset: require_password_reset === 1,
      token_expires_at: expiresAt.toISOString()  // ← NEW
    };

    await SecureStore.setItemAsync('user_data', JSON.stringify(userObject));
    await SecureStore.setItemAsync('token_expires_at', expiresAt.toISOString());

    setUser(userObject);
    setTokenExpiresAt(expiresAt);  // ← NEW

    // ... rest of code ...
  }
};
```

---

#### Step 3: Add Token Expiration Check (30 minutes)

Add automatic token validation:

```typescript
// src/contexts/AuthContext.tsx

// Check token expiration periodically
useEffect(() => {
  if (!isAuthenticated || !tokenExpiresAt) return;

  const checkExpiration = () => {
    const now = new Date();
    const expiresAt = new Date(tokenExpiresAt);

    // Check if token has expired
    if (now >= expiresAt) {
      console.log('🔴 Token has expired, logging out...');
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [{ text: 'OK', onPress: () => logout() }]
      );
      return;
    }

    // Warn user 24 hours before expiration
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilExpiry <= 24 && hoursUntilExpiry > 0) {
      console.log('⚠️ Token expires soon:', hoursUntilExpiry, 'hours');
      // Optional: Show warning to user
      // Alert.alert('Session Expiring', `Your session will expire in ${Math.round(hoursUntilExpiry)} hours`);
    }
  };

  // Check immediately
  checkExpiration();

  // Check every 5 minutes
  const interval = setInterval(checkExpiration, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, [isAuthenticated, tokenExpiresAt]);
```

---

#### Step 4: Update Session Restoration (15 minutes)

Update `restoreSession()` to check expiration:

```typescript
// src/contexts/AuthContext.tsx

const restoreSession = async () => {
  // ... existing code ...

  if (storedUserData && storedApiKey && storedApiSecret) {
    const userData = JSON.parse(storedUserData);
    const storedExpiresAt = await SecureStore.getItemAsync('token_expires_at');

    // Check if token has expired
    if (storedExpiresAt) {
      const expiresAt = new Date(storedExpiresAt);
      const now = new Date();

      if (now >= expiresAt) {
        console.log('🔴 Stored token has expired, clearing session...');
        await clearAuthData();
        setLoading(false);
        return;
      }

      setTokenExpiresAt(expiresAt);
    }

    // ... rest of validation code ...
  }
};
```

---

### **PHASE 3: Testing (1 hour)**

#### Test Cases:

1. **✅ Fresh Login**
   - Login → Check expiration is 30 days from now
   - Verify token stored with expiration

2. **✅ Session Restoration**
   - Close app → Reopen → Should restore with same expiration
   - Check console logs show remaining time

3. **✅ Expiration Check**
   - Manually set expiration to 1 minute in future
   - Wait → Should show expiration alert
   - Should logout automatically

4. **✅ Backend Validation**
   - Use expired token → Should return 401
   - Use valid token → Should work

5. **✅ Password Reset**
   - Reset password → Should get new tokens with new expiration

---

## 📊 Before vs After Comparison

### Before (Current):
```typescript
User logs in
  ↓
Gets API Key/Secret
  ↓
Tokens valid FOREVER ❌
  ↓
User can use tokens indefinitely
```

### After (Quick Win):
```typescript
User logs in
  ↓
Gets API Key/Secret + Expiration (30 days) ✅
  ↓
Frontend tracks expiration
  ↓
Backend validates expiration on each request
  ↓
After 30 days:
  ├─ Frontend shows "Session Expired" alert
  ├─ Backend rejects API calls
  └─ User must login again
```

---

## 💡 Benefits

### ✅ Security Improvements:
- Stolen tokens have limited lifetime (30 days vs. forever)
- Compromised accounts auto-expire
- Forced re-authentication periodically

### ✅ User Experience:
- No disruption to normal use (30 days is long)
- Clear expiration warnings
- Graceful logout on expiration

### ✅ Development:
- **Much faster than JWT** (4-6 hours vs. 5-7 days)
- No breaking changes to API structure
- Easy to implement and test
- Can migrate to JWT later if needed

---

## 🎯 Implementation Checklist

### Backend (2-3 hours)
- [ ] Add `api_secret_expires_at` field to User doctype
- [ ] Add `api_secret_created_at` field to User doctype
- [ ] Update `generate_api_credentials()` with expiration logic
- [ ] Create `validate_token_expiration()` decorator
- [ ] Update `mobile_app_login()` to return `expires_in`
- [ ] Update `reset_app_password()` to force regenerate
- [ ] Test backend token validation

### Frontend (1-2 hours)
- [ ] Update User type with `token_expires_at`
- [ ] Update `login()` to save expiration
- [ ] Add expiration check in `useEffect`
- [ ] Update `restoreSession()` to validate expiration
- [ ] Add expiration alert/warning
- [ ] Test frontend expiration handling

### Testing (1 hour)
- [ ] Test fresh login with expiration
- [ ] Test session restoration with expiration
- [ ] Test automatic logout on expiration
- [ ] Test backend rejection of expired tokens
- [ ] Test password reset generates new tokens

---

## 🔄 Migration Strategy

### For Existing Users:

When you deploy this update, existing users will:

1. **First API call after update:**
   - Backend checks `api_secret_expires_at` field
   - Field is NULL (doesn't exist yet)
   - Backend generates new secret with expiration
   - User receives new tokens

2. **Frontend update:**
   - User updates app from app store
   - On first launch, token might be missing expiration
   - App makes API call → Backend returns new tokens with expiration
   - User experience: Seamless (no re-login needed)

**No data loss, no user disruption!** ✅

---

## 📝 Code Files to Modify

| File | Changes | Lines of Code |
|------|---------|---------------|
| `backend/backend_mobile_auth.py` | Update auth functions | ~100 lines |
| `src/contexts/AuthContext.tsx` | Add expiration tracking | ~50 lines |
| `src/types/index.ts` | Add field to User type | ~1 line |

**Total new code:** ~150 lines

---

## ⏰ Realistic Timeline

### If you work on this full-time:
- **Morning (3 hours):** Backend changes + testing
- **Afternoon (2 hours):** Frontend changes + testing
- **End of day:** Deploy and monitor

### If you work on this part-time:
- **Day 1 (2 hours):** Backend changes
- **Day 2 (2 hours):** Frontend changes + testing

---

## 🚀 Next Steps After Implementation

Once token expiration is working, you can optionally add:

1. **Token Refresh Endpoint** (additional 2 hours)
   - Allow refreshing token before expiration
   - User doesn't need to re-login

2. **Configurable Expiration** (additional 1 hour)
   - Admin can set expiration time (7 days, 30 days, 90 days)
   - Per-user or global setting

3. **Expiration Notifications** (additional 1 hour)
   - Email user 3 days before expiration
   - In-app notification

---

## ❓ FAQ

### Q: Will existing users be logged out when I deploy this?
**A:** No! Their tokens will get expiration added automatically on next API call.

### Q: What if I want to change expiration time from 30 days to 7 days?
**A:** Just change `add_to_date(None, days=30)` to `add_to_date(None, days=7)` in backend.

### Q: Can I test this without affecting production?
**A:** Yes! Set expiration to 5 minutes for testing, then change to 30 days for production.

### Q: What happens if user's token expires while they're using the app?
**A:** Next API call will fail with 401 → Frontend shows alert → User logs out → Login screen.

---

## 🎓 Summary

**Time Investment:** 4-6 hours
**Complexity:** Medium
**Risk:** Low (backward compatible)
**Security Gain:** High (tokens expire)
**vs JWT Migration:** 10x faster (6 hours vs. 60 hours)

This is a **perfect first step** before considering full JWT migration. It gives you 80% of the security benefits with 20% of the effort!

---

**Ready to implement?** Start with Phase 1 (Backend) and test thoroughly before moving to Phase 2 (Frontend).

**Need help?** Refer to this document and the code examples above.

---

**Last Updated:** 2025-12-06
**Estimated Completion:** 1 day (full-time) or 2 days (part-time)
