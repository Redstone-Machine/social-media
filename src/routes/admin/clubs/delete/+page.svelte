<script lang="ts">
  type Club = {
    id: string;
    name: string;
    createdAt: string;
  };

  type PageData = {
    clubs: Club[];
    csrfToken: string;
  };

  type FormState = {
    error?: string;
    success?: boolean;
  } | null;

  let { data, form } = $props<{ data: PageData; form: FormState }>();
</script>

<svelte:head>
  <title>Ta bort klubb</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <p class="eyebrow">Admin page</p>
    <h1>Ta bort klubb</h1>
    <p class="lead">Alla klubbar listas här. Klicka på ta bort till höger om den klubb du vill radera.</p>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    {#if data.clubs.length > 0}
      <div class="club-list">
        {#each data.clubs as club}
          <div class="club-row">
            <div class="club-name">{club.name}</div>
            <form
              method="POST"
              action="?/delete"
              onsubmit={(event) => {
                if (!confirm(`Är du säker på att du vill ta bort klubben "${club.name}"?`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="_csrf" value={data.csrfToken} />
              <input type="hidden" name="clubId" value={club.id} />
              <button type="submit" class="delete-button">Ta bort</button>
            </form>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty">Inga klubbar finns ännu.</p>
    {/if}

    <div class="footer-actions">
      <a href="/admin" class="secondary">Tillbaka</a>
    </div>
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
    width: min(100%, 48rem);
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

  .lead,
  .empty {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
  }

  .error {
    color: var(--color-error);
  }

  .club-list {
    display: grid;
    gap: 0.75rem;
  }

  .club-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border: 1px solid var(--color-gray-300);
    border-radius: 0.9rem;
    padding: 1rem 1.1rem;
    background: var(--color-background);
  }

  .club-name {
    font-weight: 700;
    color: var(--color-text);
  }

  .delete-button {
    background: var(--color-error);
    color: var(--color-white);
    padding: 0.7rem 1rem;
    border-radius: 0.8rem;
    font-weight: 700;
  }

  .footer-actions {
    margin-top: 0.5rem;
  }

  .secondary {
    display: inline-flex;
    align-items: center;
    padding: 0.85rem 1.1rem;
    border-radius: 0.85rem;
    background: var(--color-background-secondary);
    color: var(--color-text);
    text-decoration: none;
    font-weight: 700;
  }
</style>
