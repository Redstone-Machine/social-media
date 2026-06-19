<script lang="ts">
  type PageData = {
    user: {
      id: string;
      username: string;
      type: string;
    };
    csrfToken: string;
  };

  type FormState = {
    error?: string;
  } | null;

  let { form, data } = $props<{ form: FormState; data: PageData }>();
</script>

<svelte:head>
  <title>Skapa ny klubb</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <p class="eyebrow">Admin page</p>
    <h1>Skapa ny klubb</h1>
    <p class="lead">Skapa en klubb genom att bara ange klubbnamnet.</p>

    <form method="POST" class="form-card">
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <label>
        Namn för klubben
        <input name="name" placeholder="Exempel IF" autocomplete="off" />
      </label>

      {#if form?.error}
        <p class="error">{form.error}</p>
      {/if}

      <div class="actions">
        <a class="secondary" href="/admin">Tillbaka</a>
        <button type="submit">Skapa klubb</button>
      </div>
    </form>
  </section>
</main>

<style>
  .page-shell {
    min-height: calc(100vh - 4rem);
    display: grid;
    place-items: center;
    padding: 2rem 1rem 4rem;
  }

  .panel {
    width: min(100%, 40rem);
    display: grid;
    gap: 1rem;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    color: var(--color-text);
  }

  .lead {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
  }

  .form-card {
    display: grid;
    gap: 1rem;
    border: 1px solid var(--color-gray-300);
    border-radius: 1rem;
    padding: 1.5rem;
    background: var(--color-background);
  }

  label {
    display: grid;
    gap: 0.5rem;
    color: var(--color-text);
    font-weight: 600;
  }

  .error {
    color: var(--color-error);
  }

  .actions {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .secondary,
  button {
    padding: 0.85rem 1.1rem;
    border-radius: 0.85rem;
    font-weight: 700;
    text-decoration: none;
  }

  .secondary {
    background: var(--color-background-secondary);
    color: var(--color-text);
    display: inline-flex;
    align-items: center;
  }

  button {
    background: var(--color-primary);
    color: var(--color-white);
  }
</style>
