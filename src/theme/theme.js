import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4F46E5', // Indigo
    primaryContainer: '#E0E7FF',
    secondary: '#0D9488', // Teal
    secondaryContainer: '#CCFBF1',
    background: '#F8FAFC', // Slate 50
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9', // Slate 100
    onSurfaceVariant: '#475569', // Slate 600
    outline: '#CBD5E1', // Slate 300
    error: '#EF4444',
    text: '#0F172A', // Slate 900
    milk: '#3B82F6', // Sky Blue for Milk
    water: '#06B6D4', // Cyan for Water Cans
    cardShadow: 'rgba(79, 70, 229, 0.08)',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8', // Indigo 400
    primaryContainer: '#312E81',
    secondary: '#2DD4BF', // Teal 400
    secondaryContainer: '#115E59',
    background: '#0F172A', // Slate 900
    surface: '#1E293B', // Slate 800
    surfaceVariant: '#334155', // Slate 700
    onSurfaceVariant: '#94A3B8', // Slate 400
    outline: '#475569',
    error: '#F87171',
    text: '#F8FAFC',
    milk: '#60A5FA',
    water: '#22D3EE',
    cardShadow: 'rgba(0, 0, 0, 0.25)',
  },
};
