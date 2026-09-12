export default {
  content: ['./index.html', './App.tsx', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { spartan: { black: '#101012', gray: '#1b1b1f', red: '#cf263a', neon: '#f8717e', text: '#f5f5f5' } },
    fontFamily: { sans: ['Inter', 'Arial', '"Noto Sans JP"', 'sans-serif'] },
  } },
  plugins: [],
};
