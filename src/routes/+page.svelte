<svelte:head>
  <title>Inlägg</title>
</svelte:head>

<main class="home-shell">
  <section class="home-card">
    <p class="eyebrow">Social media</p>
    <h1>Inlägg</h1>

    <nav class="link-row" aria-label="Snabblänkar">
      <a href="/information">information</a>
      <a href="/notifications">Notifications</a>
    </nav>
  </section>
</main>

<style>
  .home-shell {
    min-height: calc(100vh - 4rem);
    display: grid;
    place-items: center;
    padding: 2rem 1rem 4rem;
    background:
      radial-gradient(circle at top left, rgba(255, 122, 122, 0.14), transparent 34%),
      radial-gradient(circle at bottom right, rgba(255, 190, 92, 0.12), transparent 30%),
      var(--color-background);
  }

  .home-card {
    width: min(100%, 36rem);
    display: grid;
    gap: 1rem;
    padding: 2rem;
    border: 1px solid var(--color-gray-300);
    border-radius: 1.4rem;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.78rem;
    color: var(--color-text-secondary);
  }

  h1 {
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    color: var(--color-text);
  }

  .link-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
  }

  .link-row a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.9rem 1.15rem;
    border-radius: 999px;
    background: var(--color-background-secondary);
    color: var(--color-text);
    text-decoration: none;
    font-weight: 700;
  }
</style>
