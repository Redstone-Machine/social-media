<script lang="ts">
  type User = {
    id: string;
    username: string;
    type: string;
    clubName: string | null;
    createdAt: string;
  };

  type PageData = {
    users: User[];
  };

  type FormState = {
    error?: string;
    success?: boolean;
  } | null;

  let { data, form } = $props<{ data: PageData; form: FormState }>();
</script>

<svelte:head>
  <title>Ta bort konto</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <p class="eyebrow">Admin page</p>
    <h1>Ta bort konto</h1>
    <p class="lead">Alla konton listas här. Klicka på ta bort till höger om kontot du vill radera.</p>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    {#if data.users.length > 0}
      <div class="user-list">
        {#each data.users as user}
          <div class="user-row">
            <div class="user-meta">
              <div class="user-name">{user.username}</div>
              <div class="user-subtitle">
                {user.type}{#if user.clubName} · {user.clubName}{/if}
              </div>
            </div>
            <form
              method="POST"
              action="?/delete"
              onsubmit={(event) => {
                if (!confirm(`Är du säker på att du vill ta bort kontot \"${user.username}\"?`)) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="userId" value={user.id} />
              <button type="submit" class="delete-button">Ta bort</button>
            </form>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty">Inga konton finns ännu.</p>
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
    width: min(100%, 56rem);
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

  .user-list {
    display: grid;
    gap: 0.75rem;
  }

  .user-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border: 1px solid var(--color-gray-300);
    border-radius: 0.9rem;
    padding: 1rem 1.1rem;
    background: var(--color-background);
  }

  .user-meta {
    display: grid;
    gap: 0.15rem;
  }

  .user-name {
    font-weight: 700;
    color: var(--color-text);
  }

  .user-subtitle {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
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
