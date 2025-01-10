import preset from '@betfinio/components/tailwind-config';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	important: '.predict',
	presets: [preset],
	content: ['./src/**/*.{ts,tsx}'],
	theme: {},
	plugins: [animate],
};
