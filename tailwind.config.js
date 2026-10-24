/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#10140f',
        'ink-soft': '#1a2118',
        paper: '#efe7d6',
        muted: '#b7b09f',
        brass: '#c9a227',
        'brass-hot': '#e4c15a',
        line: '#2c3528',
      },
    },
  },
}