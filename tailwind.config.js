/** @type {import('tailwindcss').Config} */
// CommonJS syntax — package.json has no "type":"module"
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f13',
        surface: '#1a1a24',
        surface2: '#222233',
        border: '#2a2a3a',
        primary: {
          DEFAULT: '#6c63ff',
          hover: '#7c73ff',
          active: '#5c53ef',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#ff6584',
          hover: '#ff7594',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#43e8d8',
          hover: '#53f8e8',
          foreground: '#0f0f13',
        },
        text: {
          DEFAULT: '#e8e8f0',
          muted: '#8888aa',
        },
        success: '#4ade80',
        warning: '#fbbf24',
        error: '#f87171',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        glow: '0 0 20px rgba(108, 99, 255, 0.3)',
        'glow-accent': '0 0 20px rgba(67, 232, 216, 0.3)',
        'glow-secondary': '0 0 20px rgba(255, 101, 132, 0.3)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(108, 99, 255, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(108, 99, 255, 0.5)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideIn: {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
