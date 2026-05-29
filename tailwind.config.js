/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#1e40af',
        background: '#ffffff',
        surface: '#f3f4f6',
        text: {
          primary: '#1f2937',
          secondary: '#4b5563',
          disabled: '#9ca3af',
        },
      },
      fontFamily: {
        poppins: ['Poppins'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(180deg, #3b82f6 0%, #1e40af 100%)',
      },
    },
  },
  plugins: [],
};
