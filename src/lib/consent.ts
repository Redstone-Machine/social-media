import { writable } from 'svelte/store';

export type CookieConsentState = 'pending' | 'accepted' | 'declined';

export const cookieConsentState = writable<CookieConsentState>('pending');
