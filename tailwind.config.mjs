/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
        fontFamily: {
            montserrat: ['var(--font-montserrat)'],
            poppins: ['var(--font-poppins)'],
            roboto: ['var(--font-roboto)'],
            pacifico: ['var(--font-pacifico)'],
        },
        },
    },
    plugins: [],
};
