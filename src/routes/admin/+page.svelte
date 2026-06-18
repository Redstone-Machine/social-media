<script lang="ts">
  type PageData = {
    user: {
      id: string;
      username: string;
      type: string;
    };
  };

  let { data } = $props<{ data: PageData }>();

  const actions = [
    {
      title: 'Lägg till konto',
      icon: '👤',
      href: '/admin/accounts/new'
    },
    {
      title: 'Ta bort konto',
      icon: '✖',
      href: '/admin/accounts/delete'
    },
    {
      title: 'Skapa ny klubb',
      icon: '🏟️',
      href: '/admin/clubs/new'
    },
    {
      title: 'Ta bort klubb',
      icon: '🗑️',
      href: '/admin/clubs/delete'
    }
  ];
</script>

<svelte:head>
  <title>Admin page</title>
</svelte:head>

<main class="admin-shell">
  <section class="admin-card">
    <div class="admin-logo" aria-hidden="true">SOCIAL<br />MEDIA</div>

    <h1>Admin page</h1>
    <p>Inloggad som <strong>{data.user.username}</strong></p>

    <div class="action-grid">
      {#each actions as action}
        <a class="action-card" href={action.href}>
          <div class="action-text">{action.title}</div>
          <div class="action-icon" aria-hidden="true">{action.icon}</div>
        </a>
      {/each}
    </div>
  </section>
</main>

<style>
  .admin-shell {
    min-height: calc(100vh - 4rem);
    display: grid;
    place-items: start center;
    padding: 2rem 1rem 4rem;
  }

  .admin-card {
    width: min(100%, 56rem);
    display: grid;
    justify-items: center;
    gap: 1.5rem;
  }

  .admin-logo {
    width: 6rem;
    height: 6rem;
    border-radius: 50%;
    background: #ff7a7a;
    color: white;
    display: grid;
    place-items: center;
    text-align: center;
    font-weight: 800;
    line-height: 0.95;
    box-shadow: 0 0 0 4px rgba(255, 122, 122, 0.25);
  }

  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    color: var(--color-text);
  }

  p {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
  }

  .action-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.75rem;
    margin-top: 0.75rem;
  }

  .action-card {
    min-height: 10rem;
    border: 2px solid var(--color-gray-700);
    border-radius: 1rem;
    background: var(--color-background-secondary);
    color: var(--color-text);
    display: grid;
    place-items: center;
    gap: 0.75rem;
    padding: 1.25rem;
    text-decoration: none;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .action-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 28px rgba(0, 0, 0, 0.14);
  }

  .action-text {
    font-size: clamp(1.4rem, 2.5vw, 2rem);
    font-weight: 800;
    text-align: center;
  }

  .action-icon {
    font-size: 3rem;
    line-height: 1;
    color: #000;
  }

  @media (max-width: 700px) {
    .action-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
