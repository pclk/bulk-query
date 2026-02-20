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
        surface: {
          DEFAULT: '#1a1a1a',
          dark: '#0d0d0d',
          light: '#2a2a2a',
          lighter: '#3a3a3a',
        },
        accent: {
          DEFAULT: '#667eea',
          purple: '#764ba2',
        },
      },
      fontFamily: {
        mono: ['Monaco', 'Courier New', 'monospace'],
      },
      maxWidth: {
        app: '1600px',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(400px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease',
        spin: 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
