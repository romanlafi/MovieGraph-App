import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                outfit: ['Outfit', 'sans-serif'],
                inter: ['Inter', 'sans-serif'],
                playfair: ['"Playfair Display"', 'serif'],
                poppins: ['Poppins', 'sans-serif'],
                bebas: ['"Bebas Neue"', 'cursive'],
            }
        },
    },
    plugins: [],
}

export default config