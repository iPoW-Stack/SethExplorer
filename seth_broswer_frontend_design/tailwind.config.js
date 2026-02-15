/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx,html}",
    ],
    theme: {
        extend: {
            colors: {
                'seth-bg': '#040608', // Ultra-deep void black/green
                'seth-card': '#0a1014', // Subtle dark green tint
                'seth-border': '#15222b',
                'seth-primary': '#00FFA3', // Neon Green
                'seth-accent': '#00CC83', // Darker Neon
                'seth-dim': 'rgba(0, 255, 163, 0.1)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #00FFA3 0deg, #10b981 120deg, #059669 240deg, #00FFA3 360deg)',
                'glass-gradient': 'linear-gradient(145deg, rgba(16, 24, 32, 0.9) 0%, rgba(10, 16, 20, 0.8) 100%)',
            }
        },
    },
    plugins: [],
}
