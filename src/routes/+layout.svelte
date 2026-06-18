<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { onMount } from 'svelte';
	import { initializeTheme } from '$lib/colors';
	import ThemeToggle from '$lib/ThemeToggle.svelte';
	import CookieConsent from '$lib/CookieConsent.svelte';
 	import { cookieConsentState } from '$lib/consent';

	type LayoutData = {
		user: {
			id: string;
			username: string;
			type: string;
		} | null;
	};

	let { children, data } = $props<{ children: unknown; data: LayoutData }>();

	onMount(() => {
		if (localStorage.getItem('cookie-consent') === 'accepted') {
			cookieConsentState.set('accepted');
			// Initialize theme on mount - sets colors and CSS variables
			initializeTheme();
		} else {
			cookieConsentState.set('pending');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if $cookieConsentState === 'accepted'}
	<ThemeToggle />
{/if}

<div class:blurred={$cookieConsentState === 'pending'}>
  {#if data.user}
	  <div class="top-left-actions">
		  <a class="logout-link" href="/logout">Log out</a>
		  {#if data.user.type === 'ADMIN'}
			  <a class="admin-link" href="/admin">Admin page</a>
		  {/if}
	  </div>
  {/if}

  {@render children()}
</div>

<CookieConsent />

<style>
	.blurred {
		filter: blur(8px);
		pointer-events: none;
		user-select: none;
	}

	.top-left-actions {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 1000;
		display: grid;
		gap: 0.6rem;
	}

	.logout-link,
	.admin-link {
		padding: 0.65rem 1rem;
		border-radius: 999px;
		background: var(--color-primary);
		color: var(--color-white);
		font-weight: 700;
		text-decoration: none;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
		transition: transform 0.15s ease, background-color 0.15s ease;
	}

	.logout-link:hover,
	.admin-link:hover {
		transform: translateY(-1px);
		background: var(--color-primary-dark);
	}
</style>
