/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

// Helper function to check if user is authenticated
function isAuthenticated(): boolean {
	const cookies = document.cookie || '';
	return cookies.includes('SESSION_ID');
}

// Helper function to get the correct manifest path based on auth state
function getManifestPath(): string {
	// Check SESSION_ID cookie - if present, user is authenticated
	const hasCookie = self.registration.scope.includes('SESSION_ID') || 
		typeof self.clients !== 'undefined';
	
	// For now, use a fetch to check auth status or default to public
	// The client will tell us which manifest to use via message
	return '/manifest-public.json';
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => {
			cache.addAll(ASSETS);
		})
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE) await caches.delete(key);
			}
		})
	);
});

self.addEventListener('fetch', (event) => {
	// Skip non-GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	// Don't cache manifest requests - always fetch fresh
	if (event.request.url.includes('manifest')) {
		event.respondWith(
			fetch(event.request).catch(() => {
				// Fallback to public manifest if network fails
				return caches.match('/manifest-public.json') || 
					new Response('{}', { status: 404 });
			})
		);
		return;
	}

	// For API calls, try network first, then cache
	if (event.request.url.includes('/api/')) {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					if (response.ok) {
						const cache = caches.open(CACHE);
						cache.then((c) => c.put(event.request, response.clone()));
					}
					return response;
				})
				.catch(() => caches.match(event.request))
		);
		return;
	}

	// For everything else, use cache first, then network
	event.respondWith(
		caches.match(event.request).then((response) => {
			return response || fetch(event.request);
		})
	);
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
	
	// Handle manifest update notification from client
	if (event.data && event.data.type === 'AUTH_STATE_CHANGED') {
		const isAuth = event.data.isAuthenticated;
		const manifestPath = isAuth ? '/manifest-authenticated.json' : '/manifest-public.json';
		
		// Update service worker clients about manifest change
		self.clients.matchAll().then((clients) => {
			clients.forEach((client) => {
				client.postMessage({
					type: 'MANIFEST_UPDATE',
					manifestPath: manifestPath
				});
			});
		});
	}
});
