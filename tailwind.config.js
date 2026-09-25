/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf6',
          100: '#dcfceb',
          200: '#bbf7da',
          300: '#86efc0',
          400: '#4ade9f',
          500: '#22c584',
          600: '#16a06a',
          700: '#137f56',
          800: '#146547',
          900: '#12533c',
        },
        owe: {
          light: '#fee2e2',
          DEFAULT: '#dc2626',
          dark: '#991b1b',
        },
        owed: {
          light: '#dcfce7',
          DEFAULT: '#16a34a',
          dark: '#166534',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)',
      },
    },
  },
  plugins: [],
};
