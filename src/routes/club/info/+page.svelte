<script lang="ts">
  import { onMount } from 'svelte';

  type PageData = {
    user: {
      id: string;
      username: string;
    };
    club: {
      id: string;
      name: string;
      description: string | null;
      pictureUrl: string | null;
      instagramLink: string | null;
      facebookLink: string | null;
      calenderLink: string | null;
      rssFeedLink: string | null;
      contactMail: string | null;
      contactPerson: string | null;
      hasAdvancedDetails: boolean;
      createdAt: string;
      updatedAt: string;
    };
    csrfToken: string;
  };

  type FormState = {
    error?: string;
  } | null;

  let { data, form } = $props<{ data: PageData; form: FormState }>();
  let advancedDetailsEnabled = $state(false);

  onMount(() => {
    advancedDetailsEnabled = data.club.hasAdvancedDetails;
  });
</script>

<svelte:head>
  <title>Klubbinfo</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <div class="hero">
      <div class="logo-row">
        <div class="brand-logo">SOCIAL<br />MEDIA</div>
        <div class="club-logo" aria-label={data.club.name}>
          {#if data.club.pictureUrl}
            <img src={data.club.pictureUrl} alt={data.club.name} />
          {:else}
            <span>{data.club.name.slice(0, 2).toUpperCase()}</span>
          {/if}
        </div>
      </div>

      <div class="hero-copy">
        <p class="eyebrow">Klubbinfo</p>
        <h1>{data.club.name}</h1>
        <p>Inloggad som <strong>{data.user.username}</strong></p>
      </div>
    </div>

    <div class="grid">
      <section class="card wide">
        <h2>Byt namn och beskrivning</h2>
        <form method="POST" action="?/saveDetails" class="form-stack">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <label>
            Namn för klubben
            <input name="name" type="text" value={data.club.name} />
          </label>

          <label>
            Beskrivning
            <textarea name="description" rows="5">{data.club.description ?? ''}</textarea>
          </label>

          <label class="checkbox-row">
            <input name="advancedDetailsEnabled" type="checkbox" bind:checked={advancedDetailsEnabled} />
            <span>Visa och använd kontakt- och länkfält</span>
          </label>

          {#if advancedDetailsEnabled}
            <div class="advanced-grid">
              <label>
                Instagram länk
                <input name="instagramLink" type="url" value={data.club.instagramLink ?? ''} placeholder="https://instagram.com/..." />
              </label>

              <label>
                Facebook länk
                <input name="facebookLink" type="url" value={data.club.facebookLink ?? ''} placeholder="https://facebook.com/..." />
              </label>

              <label>
                Kalender länk
                <input name="calenderLink" type="url" value={data.club.calenderLink ?? ''} placeholder="https://calendar..." />
              </label>

              <label>
                Kontakt mail
                <input name="contactMail" type="email" value={data.club.contactMail ?? ''} placeholder="kontakt@klubb.se" />
              </label>

              <label>
                Kontakt person
                <input name="contactPerson" type="text" value={data.club.contactPerson ?? ''} placeholder="Förnamn Efternamn" />
              </label>
            </div>
          {/if}

          {#if form?.error}
            <p class="error">{form.error}</p>
          {/if}

          <button type="submit">Spara klubbinfo</button>
        </form>
      </section>

      <section class="card">
        <h2>Byt profilbild</h2>
        <p class="subtext">Max 10 MB. Filtyper: HEIC, JPG, PNG, WEBP eller AVIF. Bilden görs om till en kvadrat och sparas som JPG.</p>

        <form method="POST" action="?/uploadPicture" enctype="multipart/form-data" class="form-stack">
          <input type="hidden" name="_csrf" value={data.csrfToken} />
          <label>
            Välj ny bild
            <input
              name="picture"
              type="file"
              accept=".heic,.heif,.jpg,.jpeg,.png,.webp,.avif,image/heic,image/heif,image/jpeg,image/png,image/webp,image/avif"
            />
          </label>

          <button type="submit">Ladda upp bild</button>
        </form>
      </section>

      <section class="card">
        <h2>Nuvarande profilbild</h2>
        {#if data.club.pictureUrl}
          <img class="preview" src={data.club.pictureUrl} alt={data.club.name} />
        {:else}
          <p class="empty">Ingen profilbild är vald ännu.</p>
        {/if}
      </section>
    </div>

    <div class="footer-actions">
      <a href="/club" class="secondary">Tillbaka</a>
    </div>
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

  .checkbox-row {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.75rem;
    font-weight: 700;
  }

  .checkbox-row input {
    width: 1.1rem;
    height: 1.1rem;
  }

  .advanced-grid {
    display: grid;
    gap: 0.9rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  textarea,
  input {
    width: 100%;
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

  .preview {
    width: 100%;
    max-width: 22rem;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: 1rem;
    border: 3px solid #111;
    justify-self: start;
  }

  .empty {
    color: #555;
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

    .advanced-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
