/**
 * VIZO ERP — Tailwind Config
 * --------------------------------------------------------------------------
 * Used in two places:
 *   1) Documentation reference for design tokens (this file).
 *   2) Loaded inline in each HTML via the Tailwind Play CDN (see app.js).
 *      When we move to Next.js, this file becomes the actual build config
 *      and the inline copy is removed.
 *
 * Color philosophy
 *   - Brand yellow (#EDC705) is RESERVED for accents only:
 *       * Active sidebar item
 *       * Primary CTA buttons
 *       * Hover highlights on key actions
 *       * Focus rings
 *       * Important data callouts
 *     Never use as a large fill — it should always feel "earned".
 *
 *   - Brand navy (#031833) is the primary dark color:
 *       * Headings & primary text in light mode
 *       * Background in dark mode
 *       * Sidebar background in dark mode
 *
 *   - Status colors (success/warning/danger/info) are intentionally muted
 *     so the UI feels like a finance product, not a consumer app.
 */

module.exports = {
  darkMode: 'class',
  content: ['./**/*.html', './**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],   // 11px
      },
      colors: {
        // ── Brand ───────────────────────────────────────────────
        brand: {
          yellow: {
            DEFAULT: '#EDC705',
            50:  '#FEFCE8',
            100: '#FDF6C2',
            200: '#FBED85',
            300: '#F8DF47',
            400: '#F2D11A',
            500: '#EDC705',
            600: '#C9A904',
            700: '#A08603',
            800: '#776302',
            900: '#4E4101',
          },
        },
        // ── Navy (primary dark) ─────────────────────────────────
        navy: {
          DEFAULT: '#031833',
          50:  '#F0F4FA',
          100: '#D9E2F0',
          200: '#B3C5E1',
          300: '#8DA8D2',
          400: '#5577A8',
          500: '#1E3F6F',
          600: '#142E54',
          700: '#0A2042',
          800: '#061B3A',
          900: '#031833',  // ← primary brand navy
          950: '#010D1F',
        },

        // ── Surface helpers ─────────────────────────────────────
        surface: {
          light: '#FFFFFF',
          'light-2': '#F8FAFC',     // page bg, light mode
          'light-3': '#F1F5F9',     // subtle card bg
          dark: '#031833',          // page bg, dark mode
          'dark-2': '#061E3F',      // card / surface, dark mode
          'dark-3': '#0A2750',      // hover / elevated, dark mode
        },

        // ── Status (muted, finance-grade) ───────────────────────
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark:  '#047857',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark:  '#B45309',
        },
        danger: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
          dark:  '#B91C1C',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
          dark:  '#1D4ED8',
        },
      },

      boxShadow: {
        'card':        '0 1px 3px 0 rgba(3, 24, 51, 0.04), 0 1px 2px 0 rgba(3, 24, 51, 0.03)',
        'card-hover':  '0 4px 6px -1px rgba(3, 24, 51, 0.06), 0 2px 4px -1px rgba(3, 24, 51, 0.04)',
        'elevated':    '0 10px 15px -3px rgba(3, 24, 51, 0.08), 0 4px 6px -2px rgba(3, 24, 51, 0.05)',
        'glow-yellow': '0 0 0 4px rgba(237, 199, 5, 0.15)',
        'inner-line':  'inset 0 -1px 0 0 rgba(3, 24, 51, 0.06)',
      },

      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.125rem',
      },

      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left':  'slideInLeft  0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up':       'slideUp      0.20s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft':     'pulseSoft    2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:        { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideInRight:  { '0%': { transform: 'translateX(20px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
        slideInLeft:   { '0%': { transform: 'translateX(-20px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
        slideUp:       { '0%': { transform: 'translateY(8px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        pulseSoft:     { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
};
