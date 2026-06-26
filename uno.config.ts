import { defineConfig, presetUno, presetIcons, presetAttributify, transformerDirectives, transformerVariantGroup } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      cdn: 'https://esm.sh/',
    }),
    presetAttributify(),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      // Map shadcn-style color tokens to HSL CSS vars (defined in _shadcn.scss)
      background: 'hsl(var(--background) / <alpha-value>)',
      foreground: 'hsl(var(--foreground) / <alpha-value>)',
      card: {
        DEFAULT: 'hsl(var(--card) / <alpha-value>)',
        foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
      },
      popover: {
        DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
        foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
      },
      primary: {
        DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
        foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        hover: 'hsl(var(--primary-hover) / <alpha-value>)',
        press: 'hsl(var(--primary-press) / <alpha-value>)',
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
        foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
      },
      muted: {
        DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
        foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
      },
      accent: {
        DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
        foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
        foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
      },
      // Spec v1 additions — surface tiers, semantic colors, primary states.
      canvas: 'hsl(var(--background) / <alpha-value>)',
      'surface-overlay': 'hsl(var(--surface-overlay) / <alpha-value>)',
      'ink-disabled': 'hsl(var(--ink-disabled) / <alpha-value>)',
      success: {
        DEFAULT: 'hsl(var(--success) / <alpha-value>)',
        fg: 'hsl(var(--success-fg) / <alpha-value>)',
      },
      warning: {
        DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
        fg: 'hsl(var(--warning-fg) / <alpha-value>)',
      },
      info: {
        DEFAULT: 'hsl(var(--info) / <alpha-value>)',
        fg: 'hsl(var(--info-fg) / <alpha-value>)',
      },
      border: {
        DEFAULT: 'hsl(var(--border) / <alpha-value>)',
        strong: 'hsl(var(--border-strong) / <alpha-value>)',
        soft: 'hsl(var(--border-soft) / <alpha-value>)',
      },
      input: 'hsl(var(--input) / <alpha-value>)',
      ring: 'hsl(var(--ring) / <alpha-value>)',
    },
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '4px',
      DEFAULT: 'var(--radius)',
      md: 'var(--radius)',
      lg: '10px',
      xl: '14px',
      '2xl': '20px',
      pill: '9999px',
      full: '9999px',
    },
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'Consolas', 'monospace'],
    },
    // Spec v1 — type scale (size / lineHeight / fontWeight / letterSpacing).
    // NOTE: keys MUST be kebab-case CSS properties; UnoCSS does NOT auto-convert
    // camelCase keys for fontSize tuples (browser would ignore `lineHeight` etc.).
    fontSize: {
      'display-lg': ['40px', { 'line-height': '1.10', 'font-weight': '600', 'letter-spacing': '-0.025em' }],
      'display-md': ['32px', { 'line-height': '1.15', 'font-weight': '600', 'letter-spacing': '-0.02em' }],
      'h1': ['24px', { 'line-height': '1.25', 'font-weight': '600', 'letter-spacing': '-0.01em' }],
      'h2': ['20px', { 'line-height': '1.30', 'font-weight': '600', 'letter-spacing': '-0.01em' }],
      'h3': ['16px', { 'line-height': '1.40', 'font-weight': '600', 'letter-spacing': '-0.005em' }],
      'body-lg': ['16px', { 'line-height': '1.55', 'font-weight': '400' }],
      'body': ['14px', { 'line-height': '1.55', 'font-weight': '400' }],
      'body-sm': ['13px', { 'line-height': '1.55', 'font-weight': '400' }],
      'caption': ['12px', { 'line-height': '1.40', 'font-weight': '500', 'letter-spacing': '0.005em' }],
      'micro': ['11px', { 'line-height': '1.30', 'font-weight': '500', 'letter-spacing': '0.01em' }],
      'button': ['14px', { 'line-height': '1.00', 'font-weight': '500' }],
      'link': ['14px', { 'line-height': '1.40', 'font-weight': '500' }],
    },
    // Spec v1 — motion duration scale.
    transitionDuration: {
      instant: '60ms',
      fast: '120ms',
      base: '200ms',
      slow: '280ms',
      slower: '400ms',
    },
    // Spec v1 — motion easing curves.
    transitionTimingFunction: {
      standard: 'cubic-bezier(0.2, 0, 0, 1)',
      emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
      decelerate: 'cubic-bezier(0, 0, 0, 1)',
      accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    },
    // Spec v1 — elevation tiers and accent glows.
    boxShadow: {
      'elevation-0': 'none',
      'elevation-1': '0 1px 2px hsl(220 47% 2% / 0.4)',
      'elevation-2': '0 1px 2px hsl(220 47% 2% / 0.4), 0 4px 12px hsl(220 47% 2% / 0.5)',
      'elevation-3': '0 1px 2px hsl(220 47% 2% / 0.4), 0 8px 24px hsl(220 47% 2% / 0.6)',
      'elevation-focus': '0 0 0 2px hsl(217 91% 60% / 0.6)',
      'glow-primary': '0 0 12px hsl(217 91% 60% / 0.25)',
      'glow-success': '0 0 12px hsl(142 71% 45% / 0.22)',
      'glow-destructive': '0 0 12px hsl(0 84% 60% / 0.22)',
    },
  },
  shortcuts: {
    // Layout utility shortcuts
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    'panel-base': 'border border-border bg-card text-card-foreground',
    'panel-glow': 'shadow-[0_0_0_1px_hsl(var(--border)),0_0_12px_hsl(var(--primary)/0.25)]',
  },
  safelist: [
    'bg-background', 'text-foreground', 'bg-card', 'text-card-foreground',
    'bg-primary', 'text-primary-foreground', 'bg-secondary', 'text-secondary-foreground',
    'bg-muted', 'text-muted-foreground', 'bg-accent', 'text-accent-foreground',
    'bg-destructive', 'text-destructive-foreground', 'border-border', 'border-input',
    'ring-ring', 'bg-popover', 'text-popover-foreground',
    // Spec v1 — utilities referenced from JSX string-concat classes.
    'bg-canvas', 'bg-surface-overlay', 'text-ink-disabled',
    'bg-success', 'text-success', 'text-success/80', 'bg-success/80',
    'bg-warning', 'text-warning', 'bg-info', 'text-info',
    'border-border-strong', 'border-border-soft',
    'bg-primary-hover', 'hover:bg-primary-hover',
    'bg-primary-press', 'active:bg-primary-press',
    'text-display-lg', 'text-display-md', 'lg:text-display-lg',
    'text-h1', 'text-h2', 'text-h3',
    'text-body-lg', 'text-body', 'text-body-sm', 'lg:text-body-lg',
    'text-caption', 'text-micro', 'text-button', 'text-link',
    'rounded-xs', 'rounded-xl', 'rounded-2xl', 'rounded-pill',
    'duration-instant', 'duration-fast', 'duration-base', 'duration-slow', 'duration-slower',
    'ease-standard', 'ease-emphasized', 'ease-decelerate', 'ease-accelerate',
    'shadow-glow-primary', 'shadow-glow-success', 'shadow-glow-destructive',
    'shadow-elevation-0', 'shadow-elevation-1', 'shadow-elevation-2', 'shadow-elevation-3',
    'shadow-elevation-focus',
  ],
});
