/**
 * Color palette for the application
 * Supports light and dark mode themes
 */

export const lightTheme = {
  // Primary colors
  primary: '#3b82f6',      // Blue
  primaryLight: '#60a5fa',
  primaryDark: '#1e40af',

  // Secondary colors
  secondary: '#8b5cf6',    // Purple
  secondaryLight: '#a78bfa',
  secondaryDark: '#6d28d9',

  // Background & Text
  background: '#ffffff',
  backgroundSecondary: '#f3f4f6',
  text: '#111827',
  textSecondary: '#6b7280',

  // Neutral colors
  white: '#ffffff',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  black: '#000000',

  // Status colors
  success: '#10b981',      // Green
  successLight: '#6ee7b7',
  error: '#ef4444',        // Red
  errorLight: '#fca5a5',
  warning: '#f59e0b',      // Amber
  warningLight: '#fcd34d',
  info: '#3b82f6',         // Blue
  infoLight: '#93c5fd',

  // Social media specific
  like: '#ef4444',         // Red for likes
  comment: '#3b82f6',      // Blue for comments
  share: '#10b981',        // Green for shares
  follow: '#8b5cf6',       // Purple for follow




  backgroundColor: '#FFFFFF',
  lightBackgroundColor: '#E9E9E9',
  generalText: '#000000',
  fadedText: '#A3A3A3',
  linkText: '#2425FF',
  mainColorClub: '#E72535',
  mainColorPlatform: '#FF6161',

  accountNameColor: '#646464',

  notificationStroke: '#FFDE78',
  notificationBackground: '#FFEBAD',

  cookiesButtonBackground: '#BDBDBD',

  glyphColor: '#646464',
  glyphBackgroundColor: '#D5D5D5',
  heartWithColor: '#FF5D46'

} as const;

export const darkTheme = {
  // Primary colors
  primary: '#60a5fa',      // Lighter blue for dark mode
  primaryLight: '#93c5fd',
  primaryDark: '#3b82f6',

  // Secondary colors
  secondary: '#a78bfa',    // Lighter purple for dark mode
  secondaryLight: '#c4b5fd',
  secondaryDark: '#8b5cf6',

  // Background & Text
  background: '#111827',
  backgroundSecondary: '#1f2937',
  text: '#f3f4f6',
  textSecondary: '#d1d5db',

  // Neutral colors
  white: '#ffffff',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  black: '#000000',

  // Status colors
  success: '#10b981',      // Green (same for both themes)
  successLight: '#6ee7b7',
  error: '#f87171',        // Lighter red for dark mode
  errorLight: '#fca5a5',
  warning: '#fbbf24',      // Lighter amber for dark mode
  warningLight: '#fcd34d',
  info: '#60a5fa',         // Lighter blue for dark mode
  infoLight: '#93c5fd',

  // Social media specific
  like: '#f87171',         // Lighter red for dark mode
  comment: '#60a5fa',      // Lighter blue for dark mode
  share: '#10b981',        // Green (same for both themes)
  follow: '#a78bfa',       // Lighter purple for dark mode





  backgroundColor: '#000000',
  lightBackgroundColor: '#E9E9E9',
  generalText: '#ffffff',
  fadedText: '#707070',
  linkText: '#2425FF',
  mainColorClub: '#E72535',
  mainColorPlatform: '#FF6161',

  accountNameColor: '#646464',

  notificationStroke: '#CF9D00',
  notificationBackground: '#FFCF3D',

  cookiesButtonBackground: '#BDBDBD',

  glyphColor: '#C4C4C4',
  glyphBackgroundColor: '#515151',
  heartWithColor: '#FF5D46'
} as const;

// Export type for TypeScript usage
export type ColorKey = keyof typeof lightTheme;
export type Theme = 'light' | 'dark';

/**
 * Get the current theme (light or dark)
 * Checks localStorage first, then system preference
 */
export function getCurrentTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Set the theme and update DOM
 */
export function setTheme(theme: Theme) {
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  injectThemeColors(theme);
}

/**
 * Get color by key for current theme
 */
export function getColor(key: ColorKey): string {
  const theme = getCurrentTheme();
  return theme === 'dark' ? darkTheme[key] : lightTheme[key];
}

/**
 * Get all colors for a specific theme
 */
export function getThemeColors(theme: Theme) {
  return theme === 'dark' ? darkTheme : lightTheme;
}

/**
 * Inject CSS custom properties into the document
 * This should be called on app initialization
 */
export function injectThemeColors(theme: Theme) {
  const colors = getThemeColors(theme);
  const root = document.documentElement;

  Object.entries(colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case (e.g., primaryLight -> primary-light)
    const cssVarName = `--color-${key
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')}`;
    root.style.setProperty(cssVarName, value);
  });
}

/**
 * Initialize theme on app startup
 * Sets the data-theme attribute and injects CSS variables
 */
export function initializeTheme() {
  if (typeof window === 'undefined') return;

  const theme = getCurrentTheme();
  document.documentElement.setAttribute('data-theme', theme);
  injectThemeColors(theme);
}

