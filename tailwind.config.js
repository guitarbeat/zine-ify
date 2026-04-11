/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "neutral-bg": "#0a0a0f",
                "glass-surface": "rgba(255, 255, 255, 0.05)",
                "glass-border": "rgba(255, 255, 255, 0.1)",
                "primary-vibrant": "#ff00ff",
                "secondary-cyan": "#00ffff",
                "accent-dark": "#13131c",
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
                marker: ['Permanent Marker', 'cursive'],
                typewriter: ['Courier Prime', 'monospace'],
            },
            animation: {
                'gradient-x': 'gradient-x 10s ease infinite',
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'mesh': 'mesh 15s ease-in-out infinite',
            },
            keyframes: {
                'gradient-x': {
                    '0%, 100%': {
                        'background-size': '200% 200%',
                        'background-position': 'left center'
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center'
                    },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
                    '50%': { opacity: '.8', filter: 'brightness(1.2)' },
                },
                'mesh': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                }
            }
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/container-queries'),
    ],
}
