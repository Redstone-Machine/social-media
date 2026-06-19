<svelte:head>
  <title>Information</title>
</svelte:head>

<main class="page-shell">
  <section class="card">
    <p class="eyebrow">Social media</p>
    <h1>Information</h1>
  </section>
</main>

<style>
  .page-shell {
    min-height: calc(100vh - 4rem);
    display: grid;
    place-items: center;
    padding: 2rem 1rem 4rem;
  }

  .card {
    width: min(100%, 32rem);
    display: grid;
    gap: 0.75rem;
    padding: 2rem;
    border: 1px solid var(--color-gray-300);
    border-radius: 1.25rem;
    background: var(--color-background);
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.78rem;
    color: var(--color-text-secondary);
  }

  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    color: var(--color-text);
  }
</style>