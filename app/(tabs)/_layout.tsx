import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, useColorScheme, useWindowDimensions } from "react-native";
import {
  lightTheme,
  darkTheme,
  getTabBarStyle,
  getTabBarItemStyle,
  getTabBarLabelStyle,
  getHeaderStyle,
} from "@/constants/TabTheme";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const { width, height } = useWindowDimensions();

  // Detect landscape orientation
  const isLandscape = width > height;

  // Detect tablet (width >= 768)
  const isTablet = width >= 768;

  // Note: RTL support is handled automatically by I18nManager in TabTheme

  return (
    <Tabs
      screenOptions={{
        // Color theming
        tabBarActiveTintColor: theme.colors.activeTab,
        tabBarInactiveTintColor: theme.colors.inactiveTab,

        // Hide default header (using custom Navbar component instead)
        headerShown: false,

        // Tab bar styling with platform-specific conventions (floating design)
        tabBarStyle: getTabBarStyle(theme, isLandscape, isTablet),
        tabBarItemStyle: getTabBarItemStyle(theme),
        tabBarLabelStyle: getTabBarLabelStyle(theme),

        // Accessibility and RTL
        tabBarAccessibilityLabel: "Main navigation tabs",
        tabBarAllowFontScaling: true,

        // Platform-specific behaviors
        tabBarHideOnKeyboard: Platform.OS === 'android',
        tabBarIconStyle: {
          marginTop: Platform.select({ ios: 4, android: 0, default: 0 }),
        },

        // Animation
        animation: Platform.select({
          ios: 'shift',
          android: 'fade',
          default: 'fade',
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={Platform.select({
                ios: focused ? 'home' : 'home-outline',
                android: 'home',
                default: 'home',
              })}
              size={theme.spacing.iconSize}
              color={color}
              accessibilityLabel="Home tab icon"
            />
          ),
          tabBarLabel: "Home",
          tabBarAccessibilityLabel: "Home tab, navigate to home screen",
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: "Updates",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={Platform.select({
                ios: focused ? 'notifications' : 'notifications-outline',
                android: 'notifications',
                default: 'notifications',
              })}
              size={theme.spacing.iconSize}
              color={color}
              accessibilityLabel="Updates tab icon"
            />
          ),
          tabBarLabel: "Updates",
          tabBarAccessibilityLabel: "Updates tab, navigate to updates screen",
          tabBarBadge: undefined, // Can be set dynamically for notifications
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={Platform.select({
                ios: focused ? 'person' : 'person-outline',
                android: 'person',
                default: 'person',
              })}
              size={theme.spacing.iconSize}
              color={color}
              accessibilityLabel="Profile tab icon"
            />
          ),
          tabBarLabel: "Profile",
          tabBarAccessibilityLabel: "Profile tab, navigate to profile screen",
        }}
      />
    </Tabs>
  );
}
