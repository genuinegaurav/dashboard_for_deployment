import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f5f7fb',
        foreground: '#0f172a',
        card: '#ffffff',
        border: '#d7dfef',
        muted: '#5b6885',
        brand: '#0f766e',
        accent: '#f59e0b',
        danger: '#dc2626',
      },
      boxShadow: {
        panel: '0 18px 50px -32px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
