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
      border: 'hsl(var(--border) / <alpha-value>)',
      input: 'hsl(var(--input) / <alpha-value>)',
      ring: 'hsl(var(--ring) / <alpha-value>)',
    },
    borderRadius: {
      none: '0',
      sm: 'calc(var(--radius) - 4px)',
      DEFAULT: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      lg: 'var(--radius)',
      full: '9999px',
    },
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'Consolas', 'monospace'],
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
  ],
});
