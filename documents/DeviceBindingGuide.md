# Device Binding & Troubleshooting Guide

## Overview

The Ashida ESS app uses **device binding** for security. Each employee account can only be used on **one device** at a time. This prevents unauthorized access if credentials are shared or stolen.

---

## How Device Binding Works

### 1. **Device ID Generation**

When you log in, the app generates a unique **Device ID** based on your phone's hardware:

- Model name (e.g., "iPhone 14", "Samsung Galaxy S21")
- Brand (e.g., "Apple", "Samsung")
- OS name (e.g., "iOS", "Android")
- OS version (e.g., "17.0", "13.0")
- Manufacturer

### 2. **Device Registration**

- On **first login**, your device ID is registered with your account on the backend
- The backend stores: `Account → Device ID` mapping
- This device becomes the **only authorized device** for your account

### 3. **Login Verification**

- On subsequent logins, the app sends your device ID to the backend
- Backend checks: `Does device ID match registered device?`
- ✅ **Match** → Login successful
- ❌ **No match** → Login blocked with error

---

## Common Issues & Solutions

### ❌ **Issue 1: "Access denied. This account is registered to a different device"**

**Cause:**
- You cleared app data/cache in Expo Go
- You reinstalled the app
- You switched to a different physical device
- **Previous bug**: Device ID was unstable (changed on cache clear) - **FIXED in latest version**

**Solution:**

**For New Installs (After Fix):**
1. The device ID is now **stable** - it won't change even after clearing cache
2. If you see this error on the **same device**, it means an old unstable device ID was registered
3. **Contact HR** to reset your device registration
4. After HR resets, log in again - the new stable device ID will be registered

**For HR/Admins:**
To reset device registration in Frappe:
```python
# In Frappe backend
frappe.db.set_value('Employee', employee_id, 'device_id', '')
frappe.db.commit()
```

---

### ❌ **Issue 2: Device ID keeps changing**

**Cause (OLD BUG - Now Fixed):**
- Old version used `Constants.sessionId` which changed every app restart
- Old version used `Date.now()` which generated different IDs each time

**Fix Applied:**
- ✅ Device ID now based **only on stable hardware characteristics**
- ✅ Same device **always** generates the **same** device ID
- ✅ Survives app reinstalls and cache clears

**Verification:**
Check console logs when logging in:
```
📱 Device fingerprint (stable): appID-iPhone14-Apple-17.0-...
📱 Generated new device ID for user123: Ab1Cd2Ef3G...
```

If you see the **same device ID** after clearing cache → Fix is working! ✅

---

### ❌ **Issue 3: Switching to a new device**

**Scenario:**
You got a new phone and want to use the app on it.

**Solution:**
1. You cannot use the app on multiple devices simultaneously (security feature)
2. **Contact HR** to reset your device registration
3. Log in on your new device
4. The new device ID will be registered

---

### ❌ **Issue 4: Need to use app on multiple devices**

**Current Limitation:**
The app currently supports **one device per account** for security reasons.

**Workaround Options:**
1. **HR can reset** device registration to switch devices
2. **Contact Development Team** to discuss multi-device support requirements

---

## Technical Details

### Device ID Algorithm

```typescript
// Only 4 CORE stable characteristics (maximum stability)
const deviceFingerprint = [
  appId,                    // User's app ID (e.g., "EMP001")
  Device.modelName,         // Phone model (e.g., "iPhone 14")
  Device.brand,             // Phone brand (e.g., "Apple")
  Device.osName,            // OS type (e.g., "iOS" or "Android")
].join('-');

// Convert to base64 and extract alphanumeric (40 chars)
const deviceId = btoa(deviceFingerprint)
  .replace(/[^a-zA-Z0-9]/g, '')
  .substring(0, 40);
```

### Why Only 4 Characteristics?

1. **Maximum Stability** - These NEVER change during normal use
2. **No OS version** - Won't break when user updates iOS/Android
3. **No device name** - Won't break if user renames their phone
4. **No manufacturer** - Redundant with brand, adds no value
5. **Deterministic** - Given same inputs, always produces same output
6. **Secure** - Hard to fake without physical device

---

## For Developers

### Testing Device Binding

**Test Scenario 1: Cache Clear**
```bash
# Clear Expo Go cache
# In Expo Go app: Settings → Clear Cache

# Expected: Same device ID generated after cache clear
# Verify in console logs
```

**Test Scenario 2: New Device**
```bash
# Test on different phone or emulator
# Expected: Different device ID generated
# Expected: Backend blocks login with "different device" error
```

**Test Scenario 3: Device ID Stability**
```bash
# Log in → Note device ID in console
# Clear cache → Log in again → Compare device IDs
# Expected: Device IDs match exactly
```

### Debugging Device Binding Issues

**Enable Verbose Logging:**
```typescript
// In AuthContext.tsx, login function
console.log('📱 Full Device ID:', deviceId);
console.log('📱 Device Info:', {
  model: Device.modelName,
  brand: Device.brand,
  osName: Device.osName,
  osVersion: Device.osVersion,
  manufacturer: Device.manufacturer,
});
```

**Backend Verification:**
```python
# In Frappe console
employee = frappe.get_doc('Employee', 'EMP-00123')
print(f"Registered Device ID: {employee.device_id}")

# Compare with device ID from app logs
```

### Backend Integration

**API Endpoint:**
```
POST /api/method/ashida.ashida_gaxis.api.mobile_auth.mobile_app_login

Body:
{
  "usr": "app_id",
  "app_password": "password",
  "device_id": "stable_device_id_here",
  "device_model": "iPhone 14",
  "device_brand": "Apple"
}

Response (Success):
{
  "message": {
    "success": true,
    "data": {
      "device_id": "stable_device_id_here",
      ...
    }
  }
}

Response (Device Mismatch):
{
  "message": {
    "success": false,
    "message": "Access denied. This account is registered to a different device"
  }
}
```

---

## Version History

### v1.2.0 (Current) - Simplified to 4 Core Characteristics
- ✅ **Simplified to only 4 core stable characteristics**
- ✅ Removed `Device.osVersion` (prevents breaking on OS updates)
- ✅ Removed `Device.deviceName` (prevents breaking on device rename)
- ✅ Removed `Device.manufacturer` (redundant with brand)
- ✅ **Maximum stability** - survives OS updates and device renames
- ✅ Binding: App ID + Phone Model + Phone Brand + OS Type only

### v1.1.0 - Device ID Stability Fix
- ✅ Removed volatile `Constants.sessionId` from device fingerprint
- ✅ Removed timestamps from device fingerprint
- ✅ Added more hardware characteristics for uniqueness
- ✅ Improved error messages with troubleshooting guidance
- ✅ Enhanced console logging for debugging

### v1.0.0 (Initial)
- ❌ Used `Constants.sessionId` (changed on restart)
- ❌ Device ID changed after cache clear
- ❌ Users couldn't re-login on same device after cache clear

---

## FAQ

**Q: Why can't I use the app on multiple devices?**
A: Security feature to prevent credential sharing and unauthorized access.

**Q: What happens if I lose my phone?**
A: Contact HR to reset device registration. You can then log in on a new device.

**Q: Does device ID contain personal information?**
A: No. It's a hash of hardware characteristics. It cannot be reversed to identify you personally.

**Q: Will device ID change if I update my phone's OS?**
A: **No**. We only use App ID, phone model, brand, and OS type (iOS/Android). OS version updates won't affect your device ID.

**Q: Can I check my device ID?**
A: Yes, check the console logs when logging in. Look for "📱 Full Device ID:".

**Q: How do I reset device registration?**
A: Only HR/Admins can reset it from the Frappe backend.

---

## Support

If you encounter device binding issues:

1. **Check this guide** for common solutions
2. **Check console logs** for device ID details
3. **Contact HR** if you need device registration reset
4. **Contact IT Support** for technical issues

---

## Security Notes

- Device binding is a **security feature**, not a bug
- One account = One device ensures accountability
- Prevents unauthorized access if credentials are compromised
- Device ID is stored securely using `expo-secure-store`
- Device ID is sent over HTTPS only

---

**Last Updated:** December 2024
**Version:** 1.2.0
