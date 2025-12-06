# Ashida ESS - Employee Self Service Mobile App

A React Native mobile application built with Expo for employee self-service, integrated with Frappe/ERPNext backend.

## 📱 Features

- **Secure Authentication**
  - App ID and password-based login
  - Device binding for enhanced security
  - Automatic session restoration
  - Forced password reset on first login
  - Password strength validation (8+ characters, complexity requirements)

- **Employee Portal**
  - View employee information
  - Profile management
  - Secure logout

- **Security**
  - Token-based authentication (API Key/Secret pairs)
  - Encrypted credential storage using expo-secure-store
  - Device fingerprinting and binding
  - HTTPS-only connections

## 🛠️ Technology Stack

- **Framework:** React Native with Expo SDK 54
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing)
- **State Management:** React Context API
- **Backend:** Frappe/ERPNext
- **Storage:** expo-secure-store
- **UI:** React Native components with custom styling

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js:** `20.19.4` or higher (LTS recommended)
  - Check version: `node --version`
  - Download from: [nodejs.org](https://nodejs.org/)

- **npm:** `10.x` or higher (comes with Node.js)
  - Check version: `npm --version`

- **Expo CLI:** (installed automatically with dependencies)

- **Mobile Development Environment:**
  - For Android: [Android Studio](https://developer.android.com/studio) or physical device
  - For iOS: [Xcode](https://developer.apple.com/xcode/) (macOS only) or physical device
  - For testing: [Expo Go](https://expo.dev/go) app on your mobile device

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ghareshubham17/Ashida-ESS.git
cd AshidaESS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Backend URL

The app will prompt you to enter your Frappe/ERPNext site URL on first launch. Ensure you have:

- A running Frappe/ERPNext instance
- The custom Ashida ESS module installed on the backend
- HTTPS enabled on your Frappe site

### 4. Start the Development Server

```bash
npm start
```

Or use specific platform commands:

```bash
# For Android
npm run android

# For iOS (macOS only)
npm run ios

# For Web
npm run web
```

## 📂 Project Structure

```
AshidaESS/
├── app/                          # Expo Router - File-based navigation
│   ├── (auth)/                   # Authentication screens
│   │   ├── LoginScreen.tsx       # Login with App ID/Password
│   │   ├── ResetPasswordScreen.tsx # Password reset on first login
│   │   └── _layout.tsx           # Auth group layout
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Home screen
│   │   ├── profile.tsx           # Profile screen
│   │   └── _layout.tsx           # Tabs layout
│   ├── _layout.tsx               # Root layout with auth logic
│   └── index.tsx                 # Entry point/redirect
│
├── src/                          # Source code
│   ├── components/               # Reusable UI components
│   ├── contexts/                 # React Context providers
│   │   └── AuthContext.tsx       # Authentication state & logic
│   ├── services/                 # API services
│   │   └── frappeService.ts      # Frappe API integration
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   │   └── index.ts              # Password validation, etc.
│   ├── constants/                # App constants
│   │   └── index.ts              # Colors, sizes, app config
│   └── types/                    # TypeScript definitions
│       └── index.ts              # Shared interfaces
│
├── backend/                      # Backend Python code
│   └── backend_mobile_auth.py    # Frappe authentication API
│
├── assets/                       # Static assets (images, fonts)
├── PROJECT_STRUCTURE.md          # Detailed project structure docs
├── SECURITY_FIXES_TODO.md        # Security improvements roadmap
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 🔐 Authentication Flow

1. **First Launch:** User enters workspace URL (Frappe site)
2. **Login:** User enters App ID and App Password
3. **Device Binding:** App generates unique device fingerprint
4. **Token Generation:** Backend returns API Key/Secret pair
5. **Secure Storage:** Credentials stored in expo-secure-store
6. **Password Reset:** If required, user sets new password
7. **Auto-Login:** On subsequent launches, user is auto-authenticated

## 🔑 Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
// Instead of: import { useAuth } from '../../../contexts/AuthContext';
// Use:
import { useAuth } from '@/contexts/AuthContext';
```

Available aliases:
- `@/*` - Root directory
- `@/components/*` - Components directory
- `@/contexts/*` - Context providers
- `@/services/*` - API services
- `@/utils/*` - Utility functions
- `@/constants/*` - Constants
- `@/types/*` - TypeScript types

## 🧪 Development Scripts

```bash
# Start development server
npm start

# Start with cache cleared
npm start --reset-cache

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web

# Lint code
npm run lint

# Reset project (remove starter code)
npm run reset-project
```

## 🔒 Security Considerations

This app implements several security measures:

✅ **Implemented:**
- Device binding (one device per account)
- Secure token storage (hardware-backed on iOS/Android)
- Password complexity requirements
- HTTPS enforcement
- Token-based authentication

⚠️ **To Be Implemented:** (See `SECURITY_FIXES_TODO.md`)
- Password hashing on backend (currently plain text - **CRITICAL**)
- Rate limiting on login endpoint
- Token expiration and refresh
- Certificate pinning
- Multi-factor authentication

## 📱 Supported Platforms

- ✅ **Android:** 5.0 (API 21) and above
- ✅ **iOS:** 13.4 and above
- ✅ **Web:** Modern browsers (limited functionality)

## 🔧 Backend Requirements

The backend requires:
- Frappe Framework (v14 or higher)
- ERPNext (optional)
- Custom Ashida ESS module with:
  - Employee doctype with fields: `app_id`, `app_password`, `device_id`, etc.
  - Mobile authentication API endpoints
  - Proper permissions configured

Backend API file is included: `backend/backend_mobile_auth.py`

## 📖 Documentation

- **Project Structure:** See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Security Fixes:** See [SECURITY_FIXES_TODO.md](SECURITY_FIXES_TODO.md)
- **Expo Router:** [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- **Frappe API:** [Frappe REST API](https://frappeframework.com/docs/user/en/api/rest)

## 🐛 Troubleshooting

### Metro Bundler Issues

If you encounter bundling errors:

```bash
npm start --reset-cache
```

### Path Alias Not Working

Restart the Metro bundler after changing `tsconfig.json`:

```bash
# Stop the server (Ctrl+C)
npm start
```

### Login Connection Failed

- Ensure your Frappe site is running
- Verify HTTPS is enabled
- Check if the site URL is correct (e.g., `https://your-site.frappe.cloud`)
- Verify the backend API endpoints are accessible

### Password Validation Errors

Password must meet these requirements:
- At least 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## 🤝 Contributing

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature-name
   ```

2. Make your changes

3. Commit with descriptive message:
   ```bash
   git commit -m "Add feature description"
   ```

4. Push to your branch:
   ```bash
   git push origin feature-name
   ```

5. Create a Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Authors

- Development Team - Ashida ESS Project

## 🔗 Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Frappe Framework](https://frappeframework.com/)

---

**Version:** 1.0.0
**Last Updated:** 2025-12-06
**Expo SDK:** 54.0.27
**React Native:** 0.81.5
**React:** 19.1.0
