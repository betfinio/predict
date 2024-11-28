/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	important: '.predict',
	presets: [require('@betfinio/components/tailwind-config')],
	content: ['./src/**/*.{ts,tsx}'],
	theme: {},
	plugins: [require('tailwindcss-animate')],
};
