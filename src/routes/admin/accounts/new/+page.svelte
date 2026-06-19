<script lang="ts">
  type Club = {
    id: string;
    name: string;
  };

  type PageData = {
    clubs: Club[];
    csrfToken: string;
  };

  type FormState = {
    error?: string;
  } | null;

  let { data, form } = $props<{ data: PageData; form: FormState }>();
</script>

<svelte:head>
  <title>Lägg till konto</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <p class="eyebrow">Admin page</p>
    <h1>Lägg till konto</h1>
    <p class="lead">Skapa ett nytt konto med username, password och välj vilken klubb kontot ska tillhöra.</p>

    {#if data.clubs.length > 0}
      <form method="POST" class="form-card">
        <input type="hidden" name="_csrf" value={data.csrfToken} />
        <label>
          Username
          <input name="username" autocomplete="off" placeholder="exempel-användare" />
        </label>

        <label>
          Password
          <input name="password" type="password" autocomplete="new-password" placeholder="••••••••" />
        </label>

        <label>
          Klubb
          <select name="clubId">
            {#each data.clubs as club}
              <option value={club.id}>{club.name}</option>
            {/each}
          </select>
        </label>

        {#if form?.error}
          <p class="error">{form.error}</p>
        {/if}

        <div class="actions">
          <a class="secondary" href="/admin">Tillbaka</a>
          <button type="submit">Skapa konto</button>
        </div>
      </form>
    {:else}
      <div class="form-card">
        <p class="empty">Det finns inga klubbar ännu. Skapa en klubb först.</p>
        <div class="actions">
          <a class="secondary" href="/admin">Tillbaka</a>
          <a class="secondary" href="/admin/clubs/new">Skapa klubb</a>
        </div>
      </div>
    {/if}
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

  .lead,
  .empty {
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
    flex-wrap: wrap;
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
