// Heimursaga Mobile App Theme Colors

export const Colors = {
  // Brand Colors
  primary: '#AC6D46',      // Copper - Main brand color
  secondary: '#4676AC',    // Blue - Secondary brand color
  
  // Neutral Colors
  text: {
    primary: '#1C1C1E',    // Main text color
    secondary: '#8E8E93',  // Secondary text color
    tertiary: '#3C3C43',   // Tertiary text color
    onPrimary: '#FFFFFF',  // Text on primary/brand colored backgrounds
  },
  
  // Background Colors
  background: {
    primary: '#ffffff',    // Main background
    secondary: '#F2F2F7',  // Secondary background
    tertiary: '#F9FAFB',   // Card container background (gray-50)
  },
  
  // Border Colors
  border: {
    primary: '#D1D1D6',    // Default borders
    secondary: '#F2F2F7',  // Light borders
  },
  
  // Semantic Colors
  success: '#34C759',      // Success states
  warning: '#FF9500',      // Warning states
  error: '#FF3B30',        // Error states
  
  // Interactive States
  disabled: '#8E8E93',     // Disabled elements
  placeholder: '#8E8E93',  // Placeholder text
  active: '#AC6D46',       // Active/focused elements (primary copper)
  highlight: '#4676AC',    // Highlight color (secondary blue)
  selection: '#AC6D4620',  // Selection background (copper with 20% opacity)
  
  // Shadow
  shadow: '#000000',       // Shadow color
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.8)', // Modal overlays
} as const;

// Export individual color groups for convenience
export const BrandColors = {
  copper: Colors.primary,
  blue: Colors.secondary,
} as const;

export const TextColors = Colors.text;
export const BackgroundColors = Colors.background;
export const BorderColors = Colors.border;