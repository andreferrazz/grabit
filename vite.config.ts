import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			// SvelteKit's built-in check also rejects API calls that carry no Origin header
			// (curl, agents, OAuth token requests). It is turned off here and re-applied in
			// hooks.server.ts to every route except the token-authenticated API.
			csrf: { trustedOrigins: ['*'] },
			// Content Security Policy. SvelteKit adds the nonces its own scripts need.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					// Inline styles: Svelte transitions and style: directives set them.
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'worker-src': ['self'],
					'manifest-src': ['self'],
					'base-uri': ['self'],
					'object-src': ['none'],
					'frame-ancestors': ['none'],
					// The OAuth consent form ends in a redirect to the approved app's own site.
					'form-action': ['self', 'https:']
				}
			}
		})
	]
});
