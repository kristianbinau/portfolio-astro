import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/static';
import tailwind from '@astrojs/tailwind';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';
import robotsTxt from 'astro-robots-txt';

let sentryConfig = {};
if (process.env.NODE_ENV === 'production') {
	sentryConfig = {
		dsn: 'https://80031079df570dbdf74ab669685c9922@o430463.ingest.sentry.io/4506384868442112',
		sourceMapsUploadOptions: {
			project: 'binau-me',
			authToken: process.env.SENTRY_AUTH_TOKEN,
		},
	};
}

// https://astro.build/config
export default defineConfig({
	output: 'static',
	site: 'https://www.binau.me',
	adapter: vercel({
		speedInsights: {
			enabled: true,
		},
	}),
	integrations: [tailwind(), vue(), sitemap(), sentry(sentryConfig), spotlightjs(), robotsTxt()],
});
