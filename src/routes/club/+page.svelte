<script lang="ts">
  type PageData = {
    user: {
      id: string;
      username: string;
      club: {
        id: string;
        name: string;
        pictureUrl: string | null;
      };
    };
  };

  let { data } = $props<{ data: PageData }>();

  const actions = [
    { title: 'Skapa ett inlägg', icon: '▣', href: '/club/posts/new' },
    { title: 'Ladda upp inlägg', icon: '▣' },
    { title: 'Ta bort inlägg', icon: '✖' },
    { title: 'Notifikationer', icon: '🔔' },
    { title: 'Klubbinfo', icon: '🗂️', href: '/club/info' },
    { title: 'Kontoinformation', icon: '🗂️', href: '/club/account' }
  ];
</script>

<svelte:head>
  <title>{data.user.club.name}</title>
</svelte:head>

<main class="club-shell">
  <section class="club-header">
    <div class="logo-row">
      <div class="brand-logo">SOCIAL<br />MEDIA</div>
      <div class="club-logo" aria-label={data.user.club.name}>
        {#if data.user.club.pictureUrl}
          <img src={data.user.club.pictureUrl} alt={data.user.club.name} />
        {:else}
          <span>{data.user.club.name.slice(0, 2).toUpperCase()}</span>
        {/if}
      </div>
    </div>

    <div class="club-title">
      <h1>{data.user.club.name}</h1>
      <p>Inloggad som <strong>{data.user.username}</strong></p>
    </div>
  </section>

  <section class="action-grid">
    {#each actions as action}
      {#if action.href}
        <a class="action-card" href={action.href}>
          <div class="action-text">{action.title}</div>
          <div class="action-icon" aria-hidden="true">{action.icon}</div>
        </a>
      {:else}
        <button class="action-card" type="button">
          <div class="action-text">{action.title}</div>
          <div class="action-icon" aria-hidden="true">{action.icon}</div>
        </button>
      {/if}
    {/each}
  </section>
</main>

<style>
  .club-shell {
    min-height: calc(100vh - 4rem);
    padding: 2rem 1.5rem 4rem;
    display: grid;
    gap: 2rem;
    justify-items: center;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.96));
  }

  .club-header {
    display: grid;
    gap: 1.25rem;
    justify-items: center;
  }

  .logo-row {
    display: flex;
    gap: 2rem;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }

  .brand-logo,
  .club-logo {
    width: 6rem;
    height: 6rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    text-align: center;
    overflow: hidden;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.14);
  }

  .brand-logo {
    background: #ff7a7a;
    color: white;
    font-weight: 800;
    line-height: 0.92;
    font-size: 1.2rem;
  }

  .club-logo {
    background: #ef4444;
    border: 4px solid rgba(255, 255, 255, 0.8);
    color: white;
    font-weight: 900;
    font-size: 1rem;
  }

  .club-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .club-title {
    text-align: center;
    display: grid;
    gap: 0.5rem;
  }

  h1 {
    font-size: clamp(2.1rem, 4vw, 3.25rem);
    color: var(--color-text);
    font-weight: 900;
  }

  p {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
  }

  .action-grid {
    width: min(100%, 54rem);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
  }

  .action-card {
    min-height: 9.5rem;
    border: 2px solid #222;
    border-radius: 1rem;
    background: #e9e9e9;
    color: #111;
    display: grid;
    place-items: center;
    gap: 0.7rem;
    padding: 1.2rem;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
  }

  .action-text {
    font-size: clamp(1.2rem, 2.2vw, 1.75rem);
    font-weight: 800;
    text-align: center;
  }

  .action-icon {
    width: 4rem;
    height: 4rem;
    border-radius: 0.55rem;
    background: #000;
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 2rem;
    line-height: 1;
  }

  .action-card:nth-child(3) .action-icon {
    color: #ff1a1a;
  }

  @media (max-width: 900px) {
    .action-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 620px) {
    .action-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
