<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let deferredPrompt: BeforeInstallPromptEvent | null = null;
	let showInstallPrompt = false;
	let isAuthenticated = false;
	let isPublicHome = false;
	let isLoginPage = false;

	// Type definition for BeforeInstallPromptEvent
	interface BeforeInstallPromptEvent extends Event {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	onMount(async () => {
		// Determine if user is authenticated by checking if they can access protected routes
		const checkAuth = async () => {
			try {
				const response = await fetch('/api/auth/check', { credentials: 'include' });
				if (!response.ok) {
					isAuthenticated = false;
					return;
				}

				const data = await response.json();
				isAuthenticated = !!data.authenticated;
			} catch {
				isAuthenticated = false;
			}
		};

		await checkAuth();

		// Subscribe to page route changes
		const unsubscribe = page.subscribe(($page) => {
			isPublicHome = $page.url.pathname === '/';
			isLoginPage = $page.url.pathname === '/login';
		});

		// Listen for beforeinstallprompt event
		window.addEventListener('beforeinstallprompt', (e: Event) => {
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;

			// Show install prompt for public home and login always.
			// For other routes, only show if authenticated.
			if (isPublicHome || isLoginPage || isAuthenticated) {
				showInstallPrompt = true;
			}
		});

		// Listen for app installed event
		window.addEventListener('appinstalled', () => {
			console.log('PWA was installed');
			deferredPrompt = null;
			showInstallPrompt = false;
		});

		return unsubscribe;
	});

	async function handleInstall() {
		if (!deferredPrompt) {
			console.log('Install prompt not available');
			return;
		}

		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		console.log(`User response to the install prompt: ${outcome}`);

		if (outcome === 'accepted') {
			// Notify service worker about successful installation
			if ('serviceWorker' in navigator) {
				const registration = await navigator.serviceWorker.ready;
				registration.active?.postMessage({
					type: 'APP_INSTALLED',
					isAuthenticated: isAuthenticated
				});
			}
		}

		deferredPrompt = null;
		showInstallPrompt = false;
	}

	function handleDismiss() {
		deferredPrompt = null;
		showInstallPrompt = false;
	}
</script>

{#if showInstallPrompt}
	<div class="install-prompt" role="alert">
		<div class="install-content">
			<div class="install-text">
				<h3>
					{isPublicHome ? 'Install Social Feed App' : 'Install Social Media App'}
				</h3>
				<p>
					{isPublicHome
						? 'Browse posts offline with a faster experience'
						: 'Create and manage posts with a native app experience'}
				</p>
			</div>
			<div class="install-actions">
				<button class="install-btn-primary" on:click={handleInstall}>
					Install
				</button>
				<button class="install-btn-secondary" on:click={handleDismiss}>
					Maybe later
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.install-prompt {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.6));
		color: white;
		z-index: 9999;
		animation: slideUp 0.3s ease-out;
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.install-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		max-width: 100%;
		gap: 1rem;
	}

	.install-text {
		flex: 1;
	}

	.install-text h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.install-text p {
		margin: 0;
		font-size: 0.875rem;
		opacity: 0.9;
	}

	.install-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.install-btn-primary,
	.install-btn-secondary {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s;
	}

	.install-btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.install-btn-primary:hover {
		background-color: #2563eb;
	}

	.install-btn-secondary {
		background-color: transparent;
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.install-btn-secondary:hover {
		background-color: rgba(255, 255, 255, 0.1);
	}

	@media (max-width: 640px) {
		.install-content {
			flex-direction: column;
			align-items: flex-start;
		}

		.install-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>
