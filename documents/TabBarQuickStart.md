# Tab Bar Quick Start Guide

Get the cross-platform bottom tab bar running in 2 minutes!

## Quick Test

```bash
# Start the development server
npm start

# Press 'i' for iOS simulator
# Press 'a' for Android emulator
```

## What You'll See

### Three Tabs
1. **Home** - Shows "Home" centered
2. **Updates** - Shows "Updates" centered (with bell icon)
3. **Profile** - Shows "Profile" centered

### Platform Differences

#### iOS
- Taller tab bar (85px)
- Filled icons when active, outlined when inactive
- Subtle shadow under tab bar
- Shift animation when switching tabs

#### Android
- Standard height tab bar (65px)
- Filled icons always
- Material Design elevation
- Fade animation when switching tabs

## Quick Visual Tests

### 1. Theme Switching (30 seconds)
```
iOS: Settings > Developer > Dark Appearance (toggle)
Android: Settings > Display > Dark theme (toggle)
```
Watch the tab bar and screens switch between light/dark themes.

### 2. Landscape Mode (10 seconds)
```
Rotate device/simulator to landscape
```
Tab bar height reduces automatically.

### 3. Accessibility (1 minute)
```
iOS: Settings > Accessibility > VoiceOver (enable)
Android: Settings > Accessibility > TalkBack (enable)
```
Tap each tab - hear "Home tab, navigate to home screen" etc.

### 4. Font Scaling (30 seconds)
```
iOS: Settings > Accessibility > Display & Text Size > Larger Text
Android: Settings > Display > Font size > Large
```
Tab labels grow with system font size.

## Key Features Demonstrated

✅ Platform-specific design (Material/Cupertino)
✅ Safe area support (works with notches)
✅ Portrait/landscape responsive
✅ Tablet optimized (try on iPad)
✅ Active/inactive states (clear visual difference)
✅ Touch target sizes (48dp minimum)
✅ Accessibility labels (screen reader support)
✅ Themeable (auto dark/light mode)

## Common Issues

**Tab bar too tall?**
- Edit `constants/TabTheme.ts`, change `tabBarHeight`

**Colors don't match brand?**
- Edit `constants/TabTheme.ts`, modify `lightTheme.colors`

**Icons wrong?**
- Edit `app/(tabs)/_layout.tsx`, change icon names in `tabBarIcon`

## Next Steps

1. **Customize Colors**: See `constants/TabTheme.ts:25-37`
2. **Add Content**: Replace centered titles in screen files
3. **Add More Tabs**: Follow pattern in documentation
4. **Add Badges**: Set `tabBarBadge` in tab options (e.g., for notifications)

## File Structure

```
app/
  (tabs)/
    _layout.tsx     ← Tab configuration
    index.tsx       ← Home screen
    updates.tsx     ← Updates screen
    profile.tsx     ← Profile screen
constants/
  TabTheme.ts       ← Theme & styling
documents/
  TabBarImplementation.md  ← Full documentation
  TabBarQuickStart.md      ← This file
```

## Example: Adding a Badge

Edit `app/(tabs)/_layout.tsx` line 101:

```typescript
tabBarBadge: 3, // Shows "3" badge on Updates tab
```

## Example: Changing Tab Order

Reorder `<Tabs.Screen>` blocks in `app/(tabs)/_layout.tsx`:

```typescript
// Profile first, then Home, then Updates
<Tabs.Screen name="profile" ... />
<Tabs.Screen name="index" ... />
<Tabs.Screen name="updates" ... />
```

## Performance Check

Open React DevTools and check:
- Re-renders only on tab switch ✓
- Theme changes efficiently ✓
- No unnecessary re-renders ✓

## Accessibility Checklist

- [ ] Each tab announces correctly with screen reader
- [ ] Touch targets at least 48x48dp
- [ ] Active tab clearly distinguishable from inactive
- [ ] Works with system font scaling
- [ ] Color contrast meets WCAG AA (4.5:1)

All should be checked ✓ in this implementation!

## Quick Customization Examples

### Make Tab Bar Transparent
```typescript
// In constants/TabTheme.ts
card: 'transparent',
```

### Change Active Color to Red
```typescript
// In constants/TabTheme.ts
activeTab: '#EF4444',
```

### Hide Tab Labels
```typescript
// In app/(tabs)/_layout.tsx
tabBarLabelStyle: {
  fontSize: 0, // Hides labels
},
```

### Different Icons Per Platform
```typescript
// In app/(tabs)/_layout.tsx, tabBarIcon:
name={Platform.select({
  ios: 'ios-home',
  android: 'md-home',
})}
```

## Testing Checklist

- [ ] All three tabs visible and clickable
- [ ] Active tab highlighted correctly
- [ ] Screen titles centered
- [ ] Works in portrait
- [ ] Works in landscape
- [ ] Works on phone (375-430px width)
- [ ] Works on tablet (768+px width)
- [ ] Dark mode works
- [ ] Light mode works
- [ ] Safe areas respected (no content under notch)
- [ ] Accessibility labels present
- [ ] Platform-specific styling applied

Run through this checklist to verify everything works!

## Need Help?

See full documentation: `documents/TabBarImplementation.md`
