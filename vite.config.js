import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// FONT_DELAY_MS=10 delays the font responses (dev and preview), as if the server weren't on localhost
const delay = Number(process.env.FONT_DELAY_MS ?? 0);

/** @param {import('vite').ViteDevServer | import('vite').PreviewServer} server */
function delay_fonts(server) {
	server.middlewares.use((req, _res, next) => {
		if (delay && req.url?.endsWith('.woff2')) setTimeout(next, delay);
		else next();
	});
}

export default defineConfig({
	plugins: [
		sveltekit(),
		{ name: 'font-delay', configureServer: delay_fonts, configurePreviewServer: delay_fonts }
	]
});
