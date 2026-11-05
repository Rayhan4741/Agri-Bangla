/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#123D2B', 900: '#0B271B', 800: '#123D2B', 700: '#185038' },
        primary: { DEFAULT: '#21864A', 600: '#21864A', 700: '#1A6C3B', 50: '#EAF5EE', 100: '#D3EBDB' },
        leaf: { DEFAULT: '#77C66E', 100: '#E4F4E1' },
        harvest: { DEFAULT: '#E9B44C', 100: '#FBF0D8', 700: '#9A6C14' },
        cream: { DEFAULT: '#F8F7EF', 200: '#EFEDE0' },
        ink: { DEFAULT: '#19352A', soft: '#4A6357' },
      },
      fontFamily: {
        sans: ['"Hind Siliguri"', '"Noto Sans Bengali"', 'Inter', 'system-ui', 'sans-serif'],
        en: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(18,61,43,.06), 0 8px 24px -8px rgba(18,61,43,.12)',
        lift: '0 2px 4px rgba(18,61,43,.06), 0 24px 48px -16px rgba(18,61,43,.22)',
        glass: '0 8px 32px -8px rgba(11,39,27,.35), inset 0 1px 0 rgba(255,255,255,.35)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        sway: { '0%,100%': { transform: 'skewX(0deg)' }, '50%': { transform: 'skewX(-3deg)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        blink: { '0%,80%,100%': { opacity: '.25' }, '40%': { opacity: '1' } },
      },
      animation: {
        sway: 'sway 5s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        blink: 'blink 1.2s infinite',
      },
    },
  },
  plugins: [],
};
