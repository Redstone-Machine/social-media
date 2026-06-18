<script lang="ts">
  type PageData = {
    user: {
      id: string;
      username: string;
      createdAt: string;
      updatedAt: string;
      sessionsCount: number;
      club: {
        id: string;
        name: string;
        pictureUrl: string | null;
      };
    };
  };

  type FormState = {
    error?: string;
    exportData?: unknown;
  } | null;

  let { data, form } = $props<{ data: PageData; form: FormState }>();

  const exportJson = $derived(form?.exportData ? JSON.stringify(form.exportData, null, 2) : '');
</script>

<svelte:head>
  <title>Kontoinformation</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <div class="hero">
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

      <div class="hero-copy">
        <p class="eyebrow">Kontoinformation</p>
        <h1>{data.user.username}</h1>
        <p>Klubb: <strong>{data.user.club.name}</strong></p>
      </div>
    </div>

    <div class="grid">
      <section class="card">
        <h2>Byt lösenord</h2>
        <form method="POST" action="?/changePassword" class="form-stack">
          <label>
            Gammalt lösenord
            <input name="currentPassword" type="password" autocomplete="current-password" />
          </label>
          <label>
            Nytt lösenord
            <input name="newPassword" type="password" autocomplete="new-password" />
          </label>
          <button type="submit">Byt lösenord</button>
        </form>
      </section>

      <section class="card">
        <h2>Byt användarnamn</h2>
        <form method="POST" action="?/changeUsername" class="form-stack">
          <label>
            Nytt användarnamn
            <input name="newUsername" type="text" autocomplete="username" value={data.user.username} />
          </label>
          <button type="submit">Byt användarnamn</button>
        </form>
      </section>

      <section class="card">
        <h2>Radera konto</h2>
        <p class="subtext">Det här tar bort kontot och alla aktiva sessioner.</p>
        <form
          method="POST"
          action="?/deleteAccount"
          onsubmit={(event) => {
            if (!confirm('Är du säker på att du vill radera ditt konto?')) {
              event.preventDefault();
            }
          }}
        >
          <button type="submit" class="danger">Radera konto</button>
        </form>
      </section>

      <section class="card wide">
        <h2>Begär ut all information om mig</h2>
        <p class="subtext">
          Här kan du hämta all information som är sparad om ditt konto och det som är kopplat till din klubb.
        </p>
        <form method="POST" action="?/exportData">
          <button type="submit">Begär ut all information om mig</button>
        </form>

        {#if exportJson}
          <pre class="export">{exportJson}</pre>
        {/if}
      </section>
    </div>

    <div class="footer-actions">
      <a href="/club" class="secondary">Tillbaka</a>
    </div>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}
  </section>
</main>

<style>
  .page-shell {
    min-height: calc(100vh - 4rem);
    padding: 2rem 1.5rem 4rem;
    display: grid;
    place-items: start center;
  }

  .panel {
    width: min(100%, 66rem);
    display: grid;
    gap: 1.5rem;
  }

  .hero {
    display: grid;
    gap: 1.2rem;
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

  .hero-copy {
    text-align: center;
    display: grid;
    gap: 0.35rem;
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
    font-weight: 900;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
  }

  .card {
    border: 2px solid #222;
    border-radius: 1rem;
    background: #e9e9e9;
    padding: 1.2rem;
    display: grid;
    gap: 1rem;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
  }

  .wide {
    grid-column: 1 / -1;
  }

  h2 {
    font-size: 1.35rem;
    color: #111;
    font-weight: 800;
  }

  .subtext {
    color: #444;
    margin-top: -0.4rem;
  }

  .form-stack {
    display: grid;
    gap: 0.9rem;
  }

  label {
    display: grid;
    gap: 0.45rem;
    font-weight: 700;
    color: #111;
  }

  button,
  .secondary {
    border: 3px solid #111;
    border-radius: 0.9rem;
    padding: 0.85rem 1rem;
    font-weight: 800;
    background: #bdbdbd;
    color: #111;
    text-decoration: none;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  .danger {
    background: #ef4444;
    color: white;
  }

  .export {
    background: #111;
    color: #d8ffd8;
    padding: 1rem;
    border-radius: 0.9rem;
    overflow: auto;
    max-height: 24rem;
    font-size: 0.88rem;
  }

  .footer-actions {
    display: flex;
    justify-content: flex-start;
  }

  .error {
    color: var(--color-error);
    font-weight: 700;
  }

  @media (max-width: 860px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .wide {
      grid-column: auto;
    }
  }
</style>
