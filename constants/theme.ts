export const colors = {
  // Home screen dark background
  homeBg: '#3a3f32',

  // Content backgrounds
  bg: '#f1ede4',
  bg2: '#e8e2d5',
  surface: '#f8f5ee',
  surface2: '#eee9dd',

  // Borders
  border: '#ddd6c6',
  border2: '#cfc6b0',

  // Sage accent
  accent: '#5c6650',
  accentDark: '#454d3c',

  // Text
  ink: '#33362c',
  inkLight: '#54583f',
  muted: '#928c78',

  // Status
  red: '#a8533f',
  gold: '#9c7d3f',
  green: '#5c6650',

  // Dark sidebar
  sidebar: '#2c2f26',

  // Light text for dark surfaces
  light: '#f1ede4',
  lightMuted: 'rgba(241,237,228,0.45)',
  lightFaint: 'rgba(241,237,228,0.28)',
} as const;

export const tilePalette = {
  tasks:    { from: '#3f4654', to: '#262a33' } as const,
  habits:   { from: '#5c6650', to: '#3a4233' } as const,
  calendar: { from: '#454d3c', to: '#2c2f26' } as const,
  journal:  { from: '#5a4530', to: '#352a1e' } as const,
};

export const r = {
  sm: 8,
  md: 10,
  lg: 14,
} as const;

export const sp = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 36,
  xxl: 48,
} as const;

export const fonts = {
  serif:       'Fraunces_500Medium_Italic',
  serifReg:    'Fraunces_400Regular',
  sans:        'DMSans_400Regular',
  sansMed:     'DMSans_500Medium',
  sansBold:    'DMSans_700Bold',
  mono:        'DMMono_400Regular',
  monoLight:   'DMMono_300Light',
} as const;
