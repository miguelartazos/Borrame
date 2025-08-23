const { colors, spacing, radii, typography } = require('./src/ui/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Core design system colors
        bg: colors.bg,
        card: colors.card,
        surface: colors.surface,
        'text-primary': colors.textPrimary,
        'text-secondary': colors.textSecondary,
        line: colors.line,
        primary: colors.primary,
        'primary-muted': colors.primaryMuted,
        success: colors.success,
        danger: colors.danger,

        // Legacy color support (for gradual migration)
        warning: '#FF9500',
        orange: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: colors.primary,
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        dark: {
          50: colors.bg,
          100: colors.card,
          200: colors.surface,
          300: '#222222',
          400: '#2A2A2A',
          500: '#333333',
          600: '#404040',
          700: '#4D4D4D',
          800: '#5A5A5A',
          900: '#6A6A6A',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: colors.textSecondary,
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      spacing: {
        // Map design system spacing scale
        xs: `${spacing.xs}px`,
        sm: `${spacing.sm}px`,
        md: `${spacing.md}px`,
        lg: `${spacing.lg}px`,
        xl: `${spacing.xl}px`,
        '2xl': `${spacing['2xl']}px`,
        '3xl': `${spacing['3xl']}px`,
      },
      borderRadius: {
        // Map design system radius scale
        sm: `${radii.sm}px`,
        md: `${radii.md}px`,
        lg: `${radii.lg}px`,
        xl: `${radii.xl}px`,
      },
      fontSize: {
        // Typography with line heights
        display: [`${typography.display.fontSize}px`, `${typography.display.lineHeight}px`],
        title: [`${typography.title.fontSize}px`, `${typography.title.lineHeight}px`],
        body: [`${typography.body.fontSize}px`, `${typography.body.lineHeight}px`],
        caption: [`${typography.caption.fontSize}px`, `${typography.caption.lineHeight}px`],
      },
      fontWeight: {
        regular: typography.body.fontWeight,
        semibold: typography.display.fontWeight,
      },
    },
  },
  plugins: [],
};
