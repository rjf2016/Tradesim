export const colors = {
  // Backgrounds
  background: '#0A0A0A',
  backgroundSecondary: '#1A1A1A',
  backgroundMuted: '#141414',

  // Text
  text: '#FFFFFF',
  textSecondary: '#888888',
  textTertiary: '#666666',

  // Brand
  primary: '#00D632',
  primaryDark: '#00B82B',

  // Semantic
  success: '#00D632',
  error: '#FF4444',
  warning: '#FFD700',

  // Border
  border: '#333333',
  borderLight: '#1A1A1A',

  // Misc
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
