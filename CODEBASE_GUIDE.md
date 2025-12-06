# Ashida ESS - Complete Codebase Guide

**A comprehensive guide to understanding how the entire codebase works**

This document explains the app architecture, execution flow, and how all components interact with each other.

---

## 📚 Table of Contents

1. [App Startup Flow](#app-startup-flow)
2. [File Execution Order](#file-execution-order)
3. [Authentication System](#authentication-system)
4. [Navigation Structure](#navigation-structure)
5. [State Management](#state-management)
6. [API Communication](#api-communication)
7. [Component Lifecycle](#component-lifecycle)
8. [Data Flow Diagrams](#data-flow-diagrams)
9. [Key Concepts](#key-concepts)

---

## 🚀 App Startup Flow

### What Happens When You Launch the App?

```
┌─────────────────────────────────────────────────────────────────┐
│                    APP STARTUP SEQUENCE                          │
└─────────────────────────────────────────────────────────────────┘

1. React Native Initializes
   ↓
2. package.json → "main": "expo-router/entry"
   ↓
3. Expo Router looks for app/_layout.tsx (ROOT LAYOUT)
   ↓
4. app/_layout.tsx executes
   - Wraps app with SafeAreaProvider
   - Wraps app with AuthProvider (our auth context)
   - Renders RootLayoutNav component
   ↓
5. RootLayoutNav component mounts
   - useAuth() hook accesses AuthContext
   - AuthContext.tsx → restoreSession() runs automatically
   ↓
6. restoreSession() checks SecureStore
   - If tokens found → Validate with backend → Auto-login
   - If no tokens → Stay logged out
   ↓
7. useEffect in RootLayoutNav monitors auth state
   - If authenticated → Navigate to (tabs)
   - If not authenticated → Navigate to (auth)/LoginScreen
   - If password reset needed → Navigate to ResetPasswordScreen
   ↓
8. User sees appropriate screen
```

---

## 📁 File Execution Order

### Detailed Startup Sequence

#### **Step 1: Entry Point**

**File:** `node_modules/expo-router/entry.js` (configured in package.json)

```json
{
  "main": "expo-router/entry"
}
```

This is the Expo Router entry point. It automatically looks for `app/_layout.tsx`.

---

#### **Step 2: Root Layout**

**File:** `app/_layout.tsx` (Lines 1-52)

This is the **FIRST FILE YOUR CODE EXECUTES**.

```typescript
// app/_layout.tsx

export default function RootLayout() {
  return (
    <SafeAreaProvider>           // 1. Provides safe area context
      <AuthProvider>              // 2. Provides authentication context
        <RootLayoutNav />         // 3. Handles navigation based on auth
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

**Execution Flow:**
1. `RootLayout()` renders
2. `SafeAreaProvider` wraps everything (handles device notches/safe areas)
3. `AuthProvider` initializes (from `src/contexts/AuthContext.tsx`)
4. `RootLayoutNav` component renders

---

#### **Step 3: Auth Provider Initialization**

**File:** `src/contexts/AuthContext.tsx` (Lines 1-456)

When `<AuthProvider>` mounts, this happens:

```typescript
// src/contexts/AuthContext.tsx (Line 435-437)

useEffect(() => {
  restoreSession();  // ← RUNS AUTOMATICALLY ON APP START
}, []);
```

**What `restoreSession()` does:**

```typescript
// src/contexts/AuthContext.tsx (Lines 352-420)

const restoreSession = async () => {
  setLoading(true);  // Show loading state

  // 1. Check for saved site URL
  const storedUrl = await SecureStore.getItemAsync('site_url');

  if (!storedUrl) {
    // No URL saved → User needs to enter workspace URL
    setLoading(false);
    return;
  }

  setSiteUrl(storedUrl);

  // 2. Check for saved credentials
  const storedUserData = await SecureStore.getItemAsync('user_data');
  const storedApiKey = await SecureStore.getItemAsync('api_key');
  const storedApiSecret = await SecureStore.getItemAsync('api_secret');

  if (storedUserData && storedApiKey && storedApiSecret) {
    // 3. Validate credentials with backend
    const response = await fetch(
      `${storedUrl}/api/method/frappe.auth.get_logged_user`,
      {
        headers: {
          'Authorization': `token ${storedApiKey}:${storedApiSecret}`
        }
      }
    );

    if (response.ok) {
      // Credentials valid → Auto-login
      const userData = JSON.parse(storedUserData);
      setUser(userData);

      if (!userData.require_password_reset) {
        setIsAuthenticated(true);  // ← USER IS NOW LOGGED IN
      }
    } else {
      // Credentials invalid → Clear and logout
      await clearAuthData();
    }
  }

  setLoading(false);  // Hide loading state
};
```

**Timeline:**
- **0ms:** App starts
- **~50ms:** `restoreSession()` is called
- **~200ms:** SecureStore reads completed
- **~500-1000ms:** Backend validation complete (if tokens exist)
- **~1000ms:** `loading` becomes `false`

---

#### **Step 4: Navigation Logic**

**File:** `app/_layout.tsx` (Lines 6-42)

After auth state is determined, this logic decides where to navigate:

```typescript
// app/_layout.tsx (Lines 11-34)

function RootLayoutNav() {
  const { isAuthenticated, user, loading } = useAuth();
  const segments = useSegments();  // Current route segments
  const router = useRouter();       // Navigation object

  useEffect(() => {
    if (loading) return;  // Don't navigate while loading

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    // PRIORITY 1: Check password reset requirement
    if (user?.require_password_reset) {
      if (segments[1] !== "ResetPasswordScreen") {
        router.replace("/(auth)/ResetPasswordScreen");  // ← NAVIGATE HERE
      }
    }
    // PRIORITY 2: Check authentication
    else if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace("/(auth)/LoginScreen");  // ← NAVIGATE HERE
      }
    }
    // PRIORITY 3: User is authenticated
    else {
      if (!inTabsGroup) {
        router.replace("/(tabs)");  // ← NAVIGATE HERE
      }
    }
  }, [isAuthenticated, user, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
```

**Navigation Decision Tree:**

```
Is app still loading?
├─ YES → Show nothing (blank screen)
└─ NO → Check auth state
    │
    ├─ User exists AND require_password_reset = true?
    │  └─ YES → Navigate to ResetPasswordScreen
    │
    ├─ User is NOT authenticated?
    │  └─ YES → Navigate to LoginScreen
    │
    └─ User IS authenticated?
       └─ YES → Navigate to (tabs) home
```

---

#### **Step 5: First Screen Renders**

Depending on the navigation decision, one of these screens loads:

**Scenario A: No Saved Credentials**
- **File:** `app/(auth)/LoginScreen.tsx`
- User sees login form

**Scenario B: Valid Saved Credentials**
- **File:** `app/(tabs)/index.tsx`
- User sees home screen (auto-logged in)

**Scenario C: Password Reset Required**
- **File:** `app/(auth)/ResetPasswordScreen.tsx`
- User must reset password

---

## 🔐 Authentication System

### Complete Authentication Flow

#### **1. Login Process**

**Entry Point:** User clicks "Sign In" button in `LoginScreen.tsx`

```typescript
// app/(auth)/LoginScreen.tsx (Lines 33-73)

const handleLogin = async () => {
  // STEP 1: Validate inputs
  if (!siteUrl && !workspaceUrl.trim()) {
    Alert.alert("Error", "Please enter your Workspace URL.");
    return;
  }

  if (!appId.trim() || !password.trim()) {
    Alert.alert("Error", "Please enter both App ID and App Password.");
    return;
  }

  setIsLoading(true);

  // STEP 2: Setup site URL (if not already set)
  let urlToUse = siteUrl;

  if (!siteUrl) {
    const setupResult = await setupSiteUrl(workspaceUrl);
    if (!setupResult.success) {
      Alert.alert("Connection Failed", setupResult.error);
      setIsLoading(false);
      return;
    }
    urlToUse = setupResult.url;
  }

  // STEP 3: Call login function from AuthContext
  const result = await login(appId, password, urlToUse || undefined);

  if (!result.success) {
    Alert.alert("Login Failed", result.error);
  }
  // If success, navigation happens automatically via useEffect in _layout.tsx

  setIsLoading(false);
};
```

---

#### **2. AuthContext Login Function**

**File:** `src/contexts/AuthContext.tsx` (Lines 174-300)

```typescript
const login = async (
  appId: string,
  appPassword: string,
  urlOverride?: string
): Promise<{ success: boolean; error?: string }> => {

  const targetUrl = urlOverride || siteUrl;

  // STEP 1: Generate device fingerprint
  const deviceId = await generateDeviceId(appId);
  const deviceModel = Device.modelName || 'unknown';
  const deviceBrand = Device.brand || 'unknown';

  // STEP 2: Call backend API
  const response = await fetch(
    `${targetUrl}/api/method/ashida.ashida_gaxis.api.mobile_auth.mobile_app_login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usr: appId,
        app_password: appPassword,
        device_id: deviceId,
        device_model: deviceModel,
        device_brand: deviceBrand,
      }),
    }
  );

  const loginData = await response.json();

  // STEP 3: Process response
  if (response.ok && loginData.message) {
    const result = loginData.message;

    if (result.success && result.data) {
      const {
        employee_id,
        employee_name,
        user,
        api_key,
        api_secret,
        device_id,
        app_id,
        require_password_reset
      } = result.data;

      // STEP 4: Create user object
      const userObject: User = {
        employee_id,
        employee_name,
        email: user,
        api_key,
        api_secret,
        device_id,
        app_id,
        require_password_reset: require_password_reset === 1,
      };

      // STEP 5: Save to SecureStore
      await SecureStore.setItemAsync('user_data', JSON.stringify(userObject));
      await SecureStore.setItemAsync('api_key', api_key);
      await SecureStore.setItemAsync('api_secret', api_secret);

      // STEP 6: Update state
      setUser(userObject);

      // STEP 7: Set authenticated (if no password reset needed)
      if (require_password_reset !== 1) {
        setIsAuthenticated(true);
        // ↑ This triggers useEffect in _layout.tsx → Navigation to (tabs)
      }
      // If password reset needed, navigation to ResetPasswordScreen happens
    }
  }

  return { success: true };
};
```

---

#### **3. Backend Processing**

**File:** `backend/backend_mobile_auth.py` (Lines 5-122)

```python
@frappe.whitelist(allow_guest=True)
def mobile_app_login(usr, app_password, device_id, device_model, device_brand):
    """
    Backend authentication logic
    """

    # STEP 1: Find employee by app_id
    employee = frappe.db.get_value(
        "Employee",
        {"app_id": usr},
        ["name", "employee_name", "user_id", "allow_ess", "device_id",
         "device_model", "device_brand", "require_password_reset"],
        as_dict=True
    )

    if not employee:
        return {"success": False, "message": "Invalid App ID"}

    # STEP 2: Check if ESS is allowed
    if not employee.allow_ess:
        return {"success": False, "message": "ESS not enabled"}

    # STEP 3: Verify password (⚠️ PLAIN TEXT - SECURITY ISSUE)
    employee_doc = frappe.get_doc("Employee", employee.name)
    stored_password = employee_doc.get_password("app_password")

    if stored_password != app_password:
        return {"success": False, "message": "Invalid password"}

    # STEP 4: Device binding check/registration
    if not employee.device_id:
        # First login - register device
        frappe.db.set_value("Employee", employee.name, {
            "device_id": device_id,
            "device_model": device_model,
            "device_brand": device_brand,
        })
    else:
        # Verify device matches
        if employee.device_id != device_id:
            return {"success": False, "message": "Wrong device"}

    # STEP 5: Login user session
    frappe.local.login_manager.login_as(employee.user_id)

    # STEP 6: Generate API credentials
    api_key, api_secret = generate_api_credentials(employee.user_id)

    # STEP 7: Return success
    return {
        "success": True,
        "data": {
            "employee_id": employee.name,
            "employee_name": employee.employee_name,
            "user": employee.user_id,
            "api_key": api_key,
            "api_secret": api_secret,
            "device_id": device_id,
            "app_id": employee.app_id,
            "require_password_reset": employee.require_password_reset or 0
        }
    }
```

---

#### **4. State Update & Navigation**

After successful login:

```
AuthContext state changes:
├─ user: null → User object
├─ isAuthenticated: false → true
└─ loading: false (stays false)

This triggers useEffect in app/_layout.tsx:
↓
Navigation logic evaluates:
├─ loading = false ✓
├─ isAuthenticated = true ✓
└─ Navigate to "/(tabs)" → Home Screen
```

---

## 🧭 Navigation Structure

### Expo Router File-Based Routing

```
app/
├── _layout.tsx                    # Root layout (wraps entire app)
│
├── index.tsx                      # Entry redirect (navigates to auth/tabs)
│
├── (auth)/                        # Auth group (login screens)
│   ├── _layout.tsx                # Auth group layout (Stack navigator)
│   ├── LoginScreen.tsx            # Route: /(auth)/LoginScreen
│   └── ResetPasswordScreen.tsx    # Route: /(auth)/ResetPasswordScreen
│
└── (tabs)/                        # Main app group (after login)
    ├── _layout.tsx                # Tabs layout (Bottom tabs navigator)
    ├── index.tsx                  # Route: /(tabs)/ (Home)
    └── profile.tsx                # Route: /(tabs)/profile
```

### How Routes Map to URLs

```typescript
// Physical file path → App route

app/index.tsx                     → /
app/(auth)/LoginScreen.tsx        → /(auth)/LoginScreen
app/(auth)/ResetPasswordScreen.tsx → /(auth)/ResetPasswordScreen
app/(tabs)/index.tsx              → /(tabs)/
app/(tabs)/profile.tsx            → /(tabs)/profile
```

### Navigation Methods

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate to a route
router.push('/(tabs)/profile');        // Add to stack
router.replace('/(auth)/LoginScreen'); // Replace current route
router.back();                         // Go back

// Navigate with params
router.push({
  pathname: '/(tabs)/profile',
  params: { userId: '123' }
});
```

---

## 🔄 State Management

### React Context Architecture

We use React Context API for global state management.

#### **AuthContext - The Central Hub**

**File:** `src/contexts/AuthContext.tsx`

```typescript
// Context provides these values to entire app:
interface AuthContextType {
  isAuthenticated: boolean;           // Is user logged in?
  user: User | null;                  // User data
  loading: boolean;                   // Is auth check in progress?
  siteUrl: string | null;             // Frappe site URL
  login: (appId, password) => Promise<>; // Login function
  logout: () => Promise<void>;        // Logout function
  resetPassword: (newPass) => Promise<>; // Password reset
  setupSiteUrl: (url) => Promise<>;   // Set workspace URL
  resetSiteUrl: () => Promise<void>;  // Clear URL
}
```

#### **How Components Access Auth State**

```typescript
// Any component can access auth state:
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Text>Please log in</Text>;
  }

  return (
    <View>
      <Text>Welcome {user?.employee_name}</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```

#### **State Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE FLOW                                │
└─────────────────────────────────────────────────────────────┘

User Action (e.g., clicks Login)
    ↓
Component calls AuthContext function (e.g., login())
    ↓
AuthContext function executes
    ↓
Makes API call to backend
    ↓
Backend responds with data
    ↓
AuthContext updates state (setUser, setIsAuthenticated)
    ↓
React re-renders all components using that state
    ↓
UI updates (e.g., navigates to home screen)
```

---

## 🌐 API Communication

### How API Calls Work

#### **1. Frappe Service Hook**

**File:** `src/services/frappeService.ts`

This provides reusable API functions:

```typescript
import { useFrappeService } from '@/services/frappeService';

function MyComponent() {
  const { getList, loading, error } = useFrappeService();

  const fetchEmployees = async () => {
    try {
      const employees = await getList('Employee', {
        fields: ['name', 'employee_name'],
        filters: { status: 'Active' }
      });
      console.log(employees);
    } catch (err) {
      console.error(err);
    }
  };

  return <Button title="Fetch" onPress={fetchEmployees} />;
}
```

#### **2. Authentication Headers**

Every API call (except login) includes auth headers:

```typescript
// src/services/frappeService.ts (Lines 23-40)

const getAuthHeaders = async () => {
  // Get stored credentials
  const apiKey = await SecureStore.getItemAsync('api_key');
  const apiSecret = await SecureStore.getItemAsync('api_secret');

  return {
    'Content-Type': 'application/json',
    'Authorization': `token ${apiKey}:${apiSecret}`  // ← Sent with every request
  };
};
```

#### **3. API Call Flow**

```
Component
    ↓ calls
useFrappeService hook
    ↓ calls
getAuthHeaders()
    ↓ reads from
SecureStore (api_key, api_secret)
    ↓ creates
HTTP Request with Authorization header
    ↓ sends to
Frappe Backend
    ↓ validates
Token in Frappe
    ↓ returns
Response data
    ↓ processes
handleResponse()
    ↓ returns to
Component
```

#### **4. Available API Methods**

```typescript
const {
  getList,      // GET list of documents
  getDoc,       // GET single document
  createDoc,    // POST new document
  updateDoc,    // PUT update document
  deleteDoc,    // DELETE document
  call,         // POST custom method
  callGet,      // GET custom method
  loading,      // Boolean - is request in progress?
  error         // String - error message if failed
} = useFrappeService();
```

**Example Usage:**

```typescript
// Get list of employees
const employees = await getList('Employee', {
  fields: ['name', 'employee_name', 'status'],
  filters: { department: 'IT' },
  orderBy: 'employee_name asc',
  limitPageLength: 20
});

// Get single employee
const employee = await getDoc('Employee', 'EMP-001');

// Update employee
await updateDoc('Employee', 'EMP-001', {
  mobile_no: '1234567890'
});

// Call custom API method
const result = await call('custom_module.api.custom_method', {
  param1: 'value1',
  param2: 'value2'
});
```

---

## 🔄 Component Lifecycle

### Example: LoginScreen Lifecycle

```typescript
// app/(auth)/LoginScreen.tsx

const LoginScreen = () => {
  // PHASE 1: Component Creation
  const { login, siteUrl, setupSiteUrl } = useAuth();
  const [appId, setAppId] = useState("");
  const [password, setPassword] = useState("");

  // PHASE 2: Component Renders (JSX returns)
  return (
    <View>
      <TextInput
        value={appId}
        onChangeText={setAppId}  // ← Updates state
      />
      <Button onPress={handleLogin} />  // ← Triggers function
    </View>
  );

  // PHASE 3: User Interaction
  // User types → setAppId() → Component re-renders

  // PHASE 4: Form Submit
  const handleLogin = async () => {
    setIsLoading(true);           // ← State update → Re-render (show spinner)

    const result = await login(); // ← Async operation

    setIsLoading(false);          // ← State update → Re-render (hide spinner)
  };

  // PHASE 5: Navigation (triggered by AuthContext state change)
  // When login() succeeds → isAuthenticated becomes true
  // → useEffect in _layout.tsx runs → Navigates away
  // → LoginScreen unmounts
};
```

### Complete Component Lifecycle

```
1. MOUNT (Component Created)
   ├─ State initialized (useState)
   ├─ Context accessed (useAuth)
   └─ JSX rendered

2. RENDER
   ├─ React creates virtual DOM
   └─ UI appears on screen

3. USER INTERACTION
   ├─ User types → setState()
   ├─ Component re-renders with new state
   └─ UI updates

4. EFFECTS (if using useEffect)
   ├─ Run after render
   └─ Can trigger more renders

5. UNMOUNT (Component Destroyed)
   ├─ Navigation away
   ├─ Cleanup functions run
   └─ Component removed from memory
```

---

## 📊 Data Flow Diagrams

### Complete App Data Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                         APP DATA FLOW                              │
└───────────────────────────────────────────────────────────────────┘

┌─────────────┐
│ App Starts  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  app/_layout.tsx    │
│  Mounts AuthProvider│
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────┐
│  AuthContext.tsx         │
│  restoreSession() runs   │
└──────┬───────────────────┘
       │
       ├─── Has tokens? ───┐
       │                   │
       NO                 YES
       │                   │
       ▼                   ▼
  ┌─────────┐      ┌────────────────┐
  │ Login   │      │ Validate with  │
  │ Screen  │      │ Backend        │
  └────┬────┘      └────┬───────────┘
       │                │
       │                ├─── Valid? ───┐
       │                │               │
       │               YES             NO
       │                │               │
       ▼                ▼               ▼
  ┌─────────────┐  ┌─────────┐   ┌─────────┐
  │ User enters │  │  Auto   │   │ Clear & │
  │ credentials │  │ Login   │   │ Logout  │
  └──────┬──────┘  └────┬────┘   └────┬────┘
         │              │              │
         │              ▼              │
         │         ┌─────────┐         │
         └────────▶│  Home   │◀────────┘
                   │ Screen  │
                   └─────────┘
```

### Login Flow Detailed

```
User in LoginScreen
    │
    ├─ Enters: workspace URL
    ├─ Enters: App ID
    ├─ Enters: Password
    │
    ▼
Clicks "Sign In" button
    │
    ▼
handleLogin() function
    │
    ├─ Validates inputs
    ├─ setupSiteUrl() if needed
    │   ├─ Tests connection
    │   └─ Saves URL to SecureStore
    │
    ├─ Calls login() from AuthContext
    │   │
    │   ├─ generateDeviceId()
    │   │   ├─ Checks SecureStore
    │   │   └─ Creates fingerprint
    │   │
    │   ├─ Sends POST to backend
    │   │   │
    │   │   ▼
    │   │ BACKEND: mobile_app_login()
    │   │   ├─ Find employee by app_id
    │   │   ├─ Verify password
    │   │   ├─ Check/bind device
    │   │   ├─ Generate API key/secret
    │   │   └─ Return credentials
    │   │
    │   ├─ Receives response
    │   ├─ Saves to SecureStore
    │   │   ├─ user_data
    │   │   ├─ api_key
    │   │   └─ api_secret
    │   │
    │   └─ Updates state
    │       ├─ setUser(userObject)
    │       └─ setIsAuthenticated(true)
    │
    ▼
State change triggers useEffect in _layout.tsx
    │
    ▼
router.replace("/(tabs)")
    │
    ▼
User sees Home Screen
```

---

## 🎓 Key Concepts

### 1. React Context API

**What is it?**
A way to pass data through the component tree without passing props manually at every level.

**Our Usage:**
- `AuthContext` provides authentication state to all components
- Any component can access `user`, `isAuthenticated`, `login()`, etc.

**Example:**
```typescript
// Without Context (props drilling):
<App>
  <Parent user={user}>
    <Child user={user}>
      <GrandChild user={user} />  // ← Must pass through all levels
    </Child>
  </Parent>
</App>

// With Context:
<AuthProvider>
  <App>
    <Parent>
      <Child>
        <GrandChild />  // ← Can access user directly via useAuth()
      </Child>
    </Parent>
  </App>
</AuthProvider>
```

---

### 2. Expo Router (File-Based Routing)

**What is it?**
Navigation is determined by file structure, not code configuration.

**Example:**
```
File: app/(tabs)/profile.tsx
Route: /(tabs)/profile
URL: myapp:///(tabs)/profile
```

**Benefits:**
- No routing configuration needed
- Clear structure
- Type-safe navigation

---

### 3. React Hooks

**useState** - Component state
```typescript
const [count, setCount] = useState(0);
// count: current value
// setCount: function to update value
```

**useEffect** - Side effects
```typescript
useEffect(() => {
  // Runs after render
  fetchData();
}, [dependency]);  // Re-runs when dependency changes
```

**useContext** - Access context
```typescript
const { user } = useAuth();  // Get values from AuthContext
```

**useCallback** - Memoized function
```typescript
const fetchData = useCallback(async () => {
  // Function doesn't recreate on every render
}, [dependency]);
```

---

### 4. Async/Await

**What is it?**
Modern JavaScript syntax for handling asynchronous operations.

**Example:**
```typescript
// Old way (callbacks):
fetch(url).then(response => {
  return response.json();
}).then(data => {
  console.log(data);
});

// Modern way (async/await):
const response = await fetch(url);
const data = await response.json();
console.log(data);
```

---

### 5. TypeScript Interfaces

**What is it?**
Type definitions that ensure type safety.

**Example:**
```typescript
interface User {
  employee_id: string;
  employee_name: string;
  email: string;
}

// TypeScript will error if you try to use wrong types:
const user: User = {
  employee_id: 123,  // ❌ Error: should be string
  employee_name: "John",
  email: "john@example.com"
};
```

---

### 6. SecureStore

**What is it?**
Encrypted storage for sensitive data (iOS Keychain / Android Keystore).

**Usage:**
```typescript
import * as SecureStore from 'expo-secure-store';

// Save
await SecureStore.setItemAsync('api_key', 'abc123');

// Read
const apiKey = await SecureStore.getItemAsync('api_key');

// Delete
await SecureStore.deleteItemAsync('api_key');
```

**Why not AsyncStorage?**
- AsyncStorage is NOT encrypted
- SecureStore uses hardware-backed encryption
- Best for API keys, tokens, passwords

---

## 🔍 Common Patterns in the Codebase

### Pattern 1: Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);      // Show spinner
  try {
    await apiCall();
  } catch (error) {
    // Handle error
  } finally {
    setIsLoading(false);   // Hide spinner (always runs)
  }
};
```

### Pattern 2: Error Handling

```typescript
try {
  const result = await riskyOperation();
} catch (error) {
  if (error instanceof Error) {
    Alert.alert('Error', error.message);
  } else {
    Alert.alert('Error', 'Something went wrong');
  }
}
```

### Pattern 3: Conditional Rendering

```typescript
// Show different UI based on state
return (
  <View>
    {loading ? (
      <ActivityIndicator />
    ) : user ? (
      <Text>Welcome {user.name}</Text>
    ) : (
      <Text>Please log in</Text>
    )}
  </View>
);
```

### Pattern 4: Path Aliases

```typescript
// Instead of:
import { useAuth } from '../../../contexts/AuthContext';

// Use:
import { useAuth } from '@/contexts/AuthContext';
```

---

## 🎯 Quick Reference: Where to Find Things

| I want to... | File to check |
|--------------|---------------|
| Change login logic | `src/contexts/AuthContext.tsx` (login function) |
| Modify login UI | `app/(auth)/LoginScreen.tsx` |
| Add new API call | `src/services/frappeService.ts` |
| Change navigation | `app/_layout.tsx` |
| Add new screen | Create file in `app/` directory |
| Change app colors | `src/constants/index.ts` |
| Add new type | `src/types/index.ts` |
| Add utility function | `src/utils/index.ts` |
| Modify backend auth | `backend/backend_mobile_auth.py` |

---

## 📝 Summary

### App Flow in One Sentence:
**App starts → Checks for saved tokens → Validates with backend → Navigates to appropriate screen (login or home).**

### Key Files:
1. `app/_layout.tsx` - Root layout & navigation logic
2. `src/contexts/AuthContext.tsx` - Authentication state & logic
3. `app/(auth)/LoginScreen.tsx` - Login UI
4. `src/services/frappeService.ts` - API communication
5. `backend/backend_mobile_auth.py` - Backend authentication

### Data Storage:
- **SecureStore:** API tokens, user data (encrypted)
- **React State:** Temporary UI state (not persisted)
- **Context:** Global app state (not persisted)

### Authentication Method:
- **Type:** Token-based (API Key/Secret pairs)
- **Storage:** expo-secure-store (hardware-backed encryption)
- **Validation:** Every request includes `Authorization: token key:secret`

---

**Last Updated:** 2025-12-06
**Version:** 1.0.0

For more details, see:
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - File organization
- [SECURITY_FIXES_TODO.md](SECURITY_FIXES_TODO.md) - Security improvements
- [README.md](README.md) - Installation & setup
