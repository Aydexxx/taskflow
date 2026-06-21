import type { Config } from 'tailwindcss';

/**
 * TaskFlow design system.
 *
 * The palette, type scale, shadows, and motion below define a single, restrained
 * "Linear/Vercel"-style language. Two deliberate choices keep the system cohesive
 * without churning every component:
 *  - `slate` and `indigo` are re-tuned in place (cooler neutrals, a slightly richer
 *    accent), so the app's existing `slate-*`/`indigo-*` usage upgrades wholesale.
 *  - the default `boxShadow` scale (`shadow-sm` … `shadow-xl`) is replaced with
 *    softer, layered shadows so existing elevation reads as depth, not a hard drop.
 * Both keep light/dark contrast and never touch behavior or markup.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Toggle dark mode by adding/removing the `dark` class on <html> (see ThemeContext).
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Body: Inter (self-hosted via @fontsource-variable, no runtime fetch).
        sans: [
          'Inter Variable',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Display: Space Grotesk for headings and brand moments.
        display: ['Space Grotesk Variable', 'Space Grotesk', 'Inter Variable', 'ui-sans-serif', 'sans-serif'],
        // Mono: ids, counts, code.
        mono: ['JetBrains Mono Variable', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // A tightened type scale. Headings pair with `font-display` + tracking-tight.
        display: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.018em', fontWeight: '700' }],
        h2: ['1.375rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
        h3: ['1.125rem', { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '600' }],
        h4: ['1rem', { lineHeight: '1.4', letterSpacing: '-0.006em', fontWeight: '600' }],
      },
      colors: {
        // Cool, Linear-like neutral ramp. Re-tunes `slate` in place: ordering and
        // light/dark contrast are preserved so existing `slate-*` usage just refines.
        slate: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#e2e5ec',
          300: '#cbd0db',
          400: '#9aa1b1',
          500: '#6b7384',
          600: '#4d5564',
          700: '#3a4150',
          800: '#23282f',
          900: '#161a20',
          950: '#0c0e13',
        },
        // Accent: a slightly richer, more violet indigo than stock. 600 stays at
        // the brand value (#4f46e5, matches the theme-color meta) for continuity.
        indigo: {
          50: '#eef0ff',
          100: '#e0e3ff',
          200: '#c7ccff',
          300: '#a6abfb',
          400: '#8186f5',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4035c9',
          800: '#342ca1',
          900: '#2e2980',
          950: '#1d1a4d',
        },
        // Semantic accent alias for tokens that want to read as "the accent".
        accent: {
          DEFAULT: '#6366f1',
          fg: '#ffffff',
        },
      },
      borderRadius: {
        // Gentle, consistent rhythm — a touch softer than stock.
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        // Soft, layered shadows tinted with the cool neutral (slate-900) so
        // elevation reads as depth rather than a hard grey drop. Replaces the
        // stock scale, so existing `shadow-sm`…`shadow-xl` upgrade in place.
        sm: '0 1px 2px 0 rgb(22 26 32 / 0.05)',
        DEFAULT: '0 1px 2px -1px rgb(22 26 32 / 0.08), 0 2px 5px -2px rgb(22 26 32 / 0.06)',
        md: '0 2px 4px -2px rgb(22 26 32 / 0.07), 0 5px 14px -3px rgb(22 26 32 / 0.09)',
        lg: '0 4px 12px -3px rgb(22 26 32 / 0.09), 0 10px 28px -6px rgb(22 26 32 / 0.12)',
        xl: '0 8px 22px -6px rgb(22 26 32 / 0.12), 0 18px 50px -10px rgb(22 26 32 / 0.16)',
        // Named tokens for intentful use.
        soft: '0 1px 2px 0 rgb(22 26 32 / 0.04), 0 1px 1px 0 rgb(22 26 32 / 0.03)',
        overlay: '0 12px 32px -8px rgb(22 26 32 / 0.18), 0 24px 64px -16px rgb(22 26 32 / 0.22)',
        // Focus ring used by interactive controls (paired with ring utilities too).
        'focus-accent': '0 0 0 3px rgb(99 102 241 / 0.35)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-down': {
          from: { opacity: '0', transform: 'translateY(-6px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Ambient motion for the landing hero — gentle, looping, transform-only.
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'cursor-drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '30%': { transform: 'translate(38px, 16px)' },
          '60%': { transform: 'translate(10px, 44px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-in': 'scale-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-down': 'slide-in-down 160ms cubic-bezier(0.16, 1, 0.3, 1)',
        float: 'float 5s ease-in-out infinite',
        'cursor-drift': 'cursor-drift 7s ease-in-out infinite',
      },
      transitionTimingFunction: {
        // A confident, slightly overshoot-free ease used for micro-interactions.
        'out-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
