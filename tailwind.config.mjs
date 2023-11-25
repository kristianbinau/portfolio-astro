/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				'neu-pink': '#fb60f4',
				'neu-red': '#fb6060',
				'neu-cyan': '#60fbe1',
				'neu-green': '#60fb7a',
				'neu-yellow': '#fbee60',
			},
		},
	},
	plugins: [],
};
