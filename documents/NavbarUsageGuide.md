# Navbar Component Usage Guide

## Overview
The `Navbar` component is a reusable header with gradient background, brand name, user greeting, and profile avatar.

## Features
- ✅ Gradient background using project colors (primary → secondary)
- ✅ Brand name display ("Ashida")
- ✅ Time-based greeting (Good Morning/Afternoon/Evening)
- ✅ User's full name display
- ✅ Profile avatar with user initials
- ✅ Online status indicator (green dot)
- ✅ Responsive design (tablet & landscape support)
- ✅ Platform-specific styling (iOS & Android)
- ✅ TypeScript support with proper types
- ✅ Custom profile press handler

## Installation

The component is already available in `src/components/Navbar.tsx`.

## Basic Usage

```tsx
import { Navbar } from '@/components';

function MyScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Navbar />
      {/* Rest of your screen content */}
    </View>
  );
}
```

## Custom Profile Handler

```tsx
import { Navbar } from '@/components';
import { useRouter } from 'expo-router';

function MyScreen() {
  const router = useRouter();

  const handleProfilePress = () => {
    // Navigate to profile screen
    router.push('/(tabs)/profile');
  };

  return (
    <View style={{ flex: 1 }}>
      <Navbar onProfilePress={handleProfilePress} />
      {/* Rest of your screen content */}
    </View>
  );
}
```

## Integration Example (Home Screen)

Here's how to add the Navbar to your home screen:

```tsx
// app/(tabs)/index.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Navbar } from '@/components';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      <Navbar onProfilePress={handleProfilePress} />

      <ScrollView style={styles.content}>
        {/* Your existing home screen content */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
});
```

## Component Props

```typescript
interface NavbarProps {
  onProfilePress?: () => void;
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| onProfilePress | `() => void` | No | Shows alert | Custom handler for profile avatar press |

## Styling

The component uses:
- **Gradient Colors**: `COLORS.primary` → `COLORS.secondary`
- **Success Color**: `COLORS.success` for status indicator
- **Responsive Sizing**: Based on screen width
- **Platform-Specific**: Shadow (iOS) and elevation (Android)

## User Data

The component automatically fetches user data from `AuthContext`:
- `user.full_name` - Used for greeting and initials
- `user.name` - Fallback if full_name not available

## Utility Functions

The component uses utility functions from `@/utils`:
- `getUserInitials(name)` - Extracts user initials (max 2 characters)
- `getGreeting()` - Returns time-based greeting

## Layout Considerations

### With Tab Navigation
If you're using this with tab navigation, make sure to:
1. Adjust tab bar margin to avoid overlap
2. Consider using `flex: 1` on parent container
3. Use `ScrollView` for content below navbar

### Safe Area
The component uses `SafeAreaView` with `edges={['top']}` to handle:
- iPhone notches
- Status bar height
- Different device safe areas

## Customization

### Changing Brand Name
Edit the brand name in the component:

```tsx
<Text style={styles.brandName}>Your Brand</Text>
```

### Changing Status Indicator Color
Modify the status indicator in styles:

```tsx
statusIndicator: {
  backgroundColor: COLORS.warning, // Change to any color
  // ... rest of styles
}
```

### Adjusting Gradient
Update the gradient colors:

```tsx
<LinearGradient
  colors={['#YOUR_COLOR_1', '#YOUR_COLOR_2']}
  // ... rest of props
/>
```

## Testing

To test the component:

1. **With User Data**:
   - Login to see actual user name and initials
   - Verify greeting changes based on time of day

2. **Without User Data**:
   - Should show "User" as fallback name
   - Should show "AS" as fallback initials

3. **Profile Press**:
   - Default: Shows alert with user name
   - Custom: Executes provided handler

## File Structure

```
src/
├── components/
│   ├── Navbar.tsx          # Main component
│   ├── AttendanceCalendar.tsx
│   └── index.ts            # Barrel export
├── utils/
│   └── index.ts            # getUserInitials, getGreeting
└── constants/
    └── index.ts            # COLORS
```

## Dependencies

- `expo-linear-gradient` - For gradient backgrounds
- `react-native-safe-area-context` - For safe area handling
- `@/contexts/AuthContext` - For user data
- `@/constants` - For colors
- `@/utils` - For utility functions

## Troubleshooting

### Issue: Navbar overlaps content
**Solution**: Wrap content in `ScrollView` or use `flex: 1` layout

### Issue: User initials show "AS"
**Solution**: Ensure user is logged in and `user.full_name` or `user.name` exists

### Issue: Status indicator not showing
**Solution**: Check if `COLORS.success` is defined in constants

### Issue: Gradient not visible
**Solution**: Verify `expo-linear-gradient` is installed

## Best Practices

1. ✅ Always wrap screen content in proper layout container
2. ✅ Provide custom `onProfilePress` for navigation
3. ✅ Test on both iOS and Android devices
4. ✅ Test with different screen sizes (tablet/phone)
5. ✅ Verify safe area handling on devices with notches
6. ✅ Consider dark mode support (future enhancement)

## Future Enhancements

Potential improvements:
- Dark mode support using theme context
- Notification badge on avatar
- Custom avatar image support
- Animated transitions
- RTL language support
