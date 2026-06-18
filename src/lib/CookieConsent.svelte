<script lang="ts">
  import { onMount } from 'svelte';
  import { cookieConsentState } from '$lib/consent';

  let visible = $state(true);

  onMount(() => {
    const storedConsent = localStorage.getItem('cookie-consent');

    if (storedConsent === 'accepted') {
      cookieConsentState.set('accepted');
      visible = false;
      return;
    }

    cookieConsentState.set('pending');
    visible = true;
  });

  function acceptCookies() {
    localStorage.setItem('cookie-consent', 'accepted');
    cookieConsentState.set('accepted');
    visible = false;
  }

  function declineCookies() {
    cookieConsentState.set('declined');
    visible = false;
  }
</script>

{#if visible}
  <div class="overlay" aria-hidden="false">
    <div class="backdrop"></div>
    <div class="consent-card" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
      <h1 id="cookie-title">Kakor 🍪</h1>
      <p>
        Den här plattformen behöver spara en begränsad mängd data på din enhet för att till exempel komma ihåg att du gillat
        ett inlägg, att du accepterat denna popup och föra att ge dig valet att acceptera notifikationer.
        Inga uppgifter om dig som person kommer att sparas.
      </p>
      <button type="button" class="learn-more">Läs mer om exakt vad som sparas.</button>

      <div class="actions">
        <button class="primary" type="button" onclick={acceptCookies}>Ja, till begränsad användning.</button>
        <button class="secondary" type="button" onclick={declineCookies}>Nej, inga alls.</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: grid;
    place-items: center;
    padding: 1.5rem;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.36);
    backdrop-filter: blur(10px);
  }

  .consent-card {
    position: relative;
    z-index: 1;
    width: min(100%, 24rem);
    border: 4px solid #111;
    border-radius: 1.5rem;
    background: #fff;
    padding: 1.5rem 1.5rem 1.25rem;
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.2);
    color: #111;
    display: grid;
    gap: 1rem;
  }

  h1 {
    font-size: 2rem;
    line-height: 1;
    font-weight: 900;
  }

  p {
    font-size: 1.05rem;
    line-height: 1.35;
  }

  .learn-more {
    background: transparent;
    border: none;
    color: #2f39ff;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: underline;
    justify-self: start;
    padding: 0;
    text-align: left;
  }

  .actions {
    display: grid;
    gap: 0.9rem;
  }

  button {
    width: 100%;
    border: 4px solid #111;
    border-radius: 1.1rem;
    padding: 0.95rem 1rem;
    font-size: 1rem;
    font-weight: 900;
    color: #111;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.08);
  }

  .primary {
    background: #bdbdbd;
  }

  .secondary {
    background: #c7c7c7;
  }
</style>
