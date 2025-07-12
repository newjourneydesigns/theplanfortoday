module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        heading: 'var(--color-heading)',
        cta: 'var(--color-cta)',
        warning: 'var(--color-warning)',
        background: 'var(--color-background)',
      },
    },
  },
  plugins: [],
}
