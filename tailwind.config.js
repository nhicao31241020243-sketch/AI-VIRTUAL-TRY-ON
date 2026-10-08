/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}', './services/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1d2420',
        cream: '#f8f7f3',
        sand: '#e8dfd2',
        moss: '#50624d',
        clay: '#c86f4e',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        soft: '0 18px 45px rgba(29, 36, 32, 0.08)',
      },
    },
  },
  plugins: [],
};
