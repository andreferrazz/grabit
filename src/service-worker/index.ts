/// <reference lib="webworker" />
import { assets, immutable } from '$app/manifest';

/**
 * Makes the app installable and quick to start: the built scripts, styles and
 * static files are cached. Pages and API responses are never cached, because
 * they hold one user's data; without a connection the visitor gets a small
 * offline page instead.
 */
const worker = self as unknown as ServiceWorkerGlobalScope;

const files = [...immutable, ...assets].map((file) => `/${String(file.path).replace(/^\//, '')}`);
const fileSet = new Set(files);
const offlinePage = '/offline.html';

// Changes whenever a build produces different files, which retires the old cache.
const version = files.reduce(
	(hash, path) => [...path].reduce((h, char) => (h * 31 + char.charCodeAt(0)) >>> 0, hash),
	7
);
const cacheName = `grabit-${version}`;

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(cacheName)
			.then((cache) => cache.addAll(files))
			.then(() => worker.skipWaiting())
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
			)
			.then(() => worker.clients.claim())
	);
});

worker.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== worker.location.origin) return;

	if (fileSet.has(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((cached) => cached ?? fetch(request)));
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(async () => {
				const fallback = await caches.match(offlinePage);
				return fallback ?? Response.error();
			})
		);
	}
	// Everything else (data requests, the API, /mcp) goes straight to the network.
});
