import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FDF8F4',
        creamEnd: '#F5EDE6',
        surface: '#FFFFFF',
        voteResting: '#FDFAF7',
        primary: '#1A1A1A',
        secondary: '#8A7E74',
        tertiary: '#B5A99A',
        disabled: '#D4C8BA',
        border: '#F0E8E0',
        borderHover: '#C4A882',
        activeBg: '#F5EDE5',
        gold: '#A08860',
        goldBorder: '#C4A882',
        btnPrimary: '#1A1A1A',
        btnHover: '#333333',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
