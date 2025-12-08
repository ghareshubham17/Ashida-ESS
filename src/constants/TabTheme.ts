import { Platform, I18nManager } from 'react-native';

export interface TabTheme {
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    activeTab: string;
    inactiveTab: string;
  };
  spacing: {
    tabBarHeight: number;
    tabBarPaddingBottom: number;
    tabBarPaddingTop: number;
    tabBarMarginBottom: number;
    tabBarMarginHorizontal: number;
    tabBarBorderRadius: number;
    iconSize: number;
    labelSize: number;
    touchTargetSize: number;
  };
  typography: {
    labelFontWeight: '400' | '500' | '600' | '700';
    screenTitleSize: number;
    screenTitleWeight: '400' | '500' | '600' | '700' | '800';
  };
}

const baseTheme = {
  spacing: {
    tabBarHeight: Platform.select({ ios: 85, android: 65, default: 65 }),
    tabBarPaddingBottom: Platform.select({ ios: 5, android: 8, default: 5 }),
    tabBarPaddingTop: Platform.select({ ios: 8, android: 8, default: 8 }),
    tabBarMarginBottom: Platform.select({ ios: 16, android: 12, default: 12 }), // Float above bottom
    tabBarMarginHorizontal: 16, // Horizontal margins for floating effect
    tabBarBorderRadius: Platform.select({ ios: 20, android: 16, default: 16 }), // Rounded corners
    iconSize: 24,
    labelSize: Platform.select({ ios: 11, android: 12, default: 12 }),
    touchTargetSize: 48, // WCAG minimum touch target
  },
  typography: {
    labelFontWeight: Platform.select({
      ios: '500' as const,
      android: '600' as const,
      default: '600' as const
    }),
    screenTitleSize: 28,
    screenTitleWeight: '700' as const,
  },
};

export const lightTheme: TabTheme = {
  colors: {
    primary: '#667eea',
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    activeTab: '#667eea',
    inactiveTab: '#9CA3AF',
  },
  ...baseTheme,
};

export const darkTheme: TabTheme = {
  colors: {
    primary: '#818cf8',
    background: '#111827',
    card: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    activeTab: '#818cf8',
    inactiveTab: '#6B7280',
  },
  ...baseTheme,
};

export const getTabBarStyle = (theme: TabTheme, isLandscape: boolean = false, isTablet: boolean = false) => ({
  position: 'absolute' as const,
  backgroundColor: theme.colors.card,
  borderTopWidth: 0, // Remove top border for floating design
  borderRadius: theme.spacing.tabBarBorderRadius,
  paddingBottom: theme.spacing.tabBarPaddingBottom,
  paddingTop: theme.spacing.tabBarPaddingTop,
  height: isLandscape
    ? Math.min(theme.spacing.tabBarHeight, 60)
    : theme.spacing.tabBarHeight,
  left: theme.spacing.tabBarMarginHorizontal,
  right: theme.spacing.tabBarMarginHorizontal,
  bottom: theme.spacing.tabBarMarginBottom,
  // Enhanced elevation/shadow for floating effect
  elevation: Platform.select({ android: 12, default: 0 }),
  shadowColor: Platform.select({ ios: '#000', default: 'transparent' }),
  shadowOffset: Platform.select({ ios: { width: 0, height: -4 }, default: { width: 0, height: 0 } }),
  shadowOpacity: Platform.select({ ios: 0.15, default: 0 }),
  shadowRadius: Platform.select({ ios: 12, default: 0 }),
  // Border for better definition
  borderWidth: Platform.select({ ios: 0.5, android: 0, default: 0 }),
  borderColor: Platform.select({ ios: theme.colors.border, default: 'transparent' }),
  // RTL support
  ...(I18nManager.isRTL && {
    left: theme.spacing.tabBarMarginHorizontal,
    right: theme.spacing.tabBarMarginHorizontal,
  }),
});

export const getTabBarItemStyle = (theme: TabTheme) => ({
  paddingVertical: 4,
  minHeight: theme.spacing.touchTargetSize,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
});

export const getTabBarLabelStyle = (theme: TabTheme) => ({
  fontSize: theme.spacing.labelSize,
  fontWeight: theme.typography.labelFontWeight,
  marginTop: Platform.select({ ios: 2, android: 4, default: 4 }),
  marginBottom: Platform.select({ ios: 0, android: 2, default: 0 }),
});

export const getHeaderStyle = (theme: TabTheme) => ({
  backgroundColor: theme.colors.primary,
  elevation: Platform.select({ android: 4, default: 0 }),
  shadowColor: Platform.select({ ios: '#000', default: 'transparent' }),
  shadowOffset: Platform.select({ ios: { width: 0, height: 2 }, default: { width: 0, height: 0 } }),
  shadowOpacity: Platform.select({ ios: 0.1, default: 0 }),
  shadowRadius: Platform.select({ ios: 4, default: 0 }),
});
