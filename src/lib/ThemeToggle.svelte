<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentTheme, setTheme, type Theme } from '$lib/colors';

  let currentTheme: Theme = $state('light');

  onMount(() => {
    currentTheme = getCurrentTheme();
  });

  function toggleTheme() {
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    currentTheme = newTheme;
  }
</script>

<button class="theme-toggle" onclick={toggleTheme} title="Toggle theme">
  {#if currentTheme === 'light'}
    🌙
  {:else}
    ☀️
  {/if}
</button>

<style>
  .theme-toggle {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background-color: var(--color-primary);
    color: var(--color-white);
    font-size: 1.5rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 2px solid var(--color-primary-dark);
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .theme-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }

  .theme-toggle:active {
    transform: scale(0.95);
  }
</style>
