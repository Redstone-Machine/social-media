<script lang="ts">
  import { onMount } from 'svelte';

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
    csrfToken: string;
    posts: Array<{
      id: string;
      description: string;
      preview: boolean;
      uploadedAt: string;
      createdAt: string;
      firstPictureUrl: string | null;
    }>;
  };

  type FormState = {
    error?: string;
  } | null;

  let { data, form } = $props<{ data: PageData; form: FormState }>();
  let isMobile = $state(false);

  onMount(() => {
    const media = window.matchMedia('(max-width: 760px)');

    const update = () => {
      isMobile = media.matches;
    };

    update();
    media.addEventListener('change', update);

    return () => {
      media.removeEventListener('change', update);
    };
  });

  function descriptionPreview(text: string) {
    const maxLength = isMobile ? 90 : 140;
    const compact = text.replace(/\s+/g, ' ').trim();

    if (compact.length <= maxLength) {
      return compact;
    }

    return `${compact.slice(0, maxLength)}...`;
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }
</script>

<svelte:head>
  <title>Hantera inlägg</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <div class="hero">
      <a class="main-logo-link" href="/club" aria-label="Till klubbmenyn">
        <img src="/main-logo.png" alt="" />
      </a>

      <div class="hero-copy">
        <h1>Hantera inlägg för {data.user.club.name}</h1>
      </div>

      <a class="new-post-link" href="/club/posts/new">Skapa nytt inlägg</a>
    </div>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    {#if data.posts.length === 0}
      <section class="empty-card">
        <h2>Inga inlägg än</h2>
        <p>Skapa ditt första inlägg för att komma igång.</p>
      </section>
    {:else}
      <section class="post-list" aria-label="Klubbens inlägg">
        {#each data.posts as post}
          <article class="post-row">
            <a class="post-link" href={`/post/${post.id}`} aria-label={`Öppna inlägget ${post.id}`}>
              <div class="thumb" aria-hidden="true">
                {#if post.firstPictureUrl}
                  <img src={post.firstPictureUrl} alt="" loading="lazy" />
                {:else}
                  <span>Ingen bild</span>
                {/if}
              </div>

              <div class="post-content">
                <p class="description">{descriptionPreview(post.description)}</p>
                <p class="meta">
                  {#if post.preview}
                    <span class="preview-pill">UTKAST</span>
                  {:else}
                    <span class="published-pill">Publicerad</span>
                  {/if}
                  <span>{formatDate(post.uploadedAt)}</span>
                </p>
              </div>
            </a>

            <div class="row-actions">
              {#if post.preview}
                <form method="POST" action="?/publish">
                  <input type="hidden" name="_csrf" value={data.csrfToken} />
                  <input type="hidden" name="postId" value={post.id} />
                  <button class="publish-button" type="submit">Publicera</button>
                </form>
              {/if}

              <a class="edit-link" href={`/club/posts/new?postId=${post.id}`}>Ändra</a>

              <form
                method="POST"
                action="?/delete"
                onsubmit={(event) => {
                  if (!confirm('Vill du ta bort inlägget? Detta kan inte ångras.')) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="_csrf" value={data.csrfToken} />
                <input type="hidden" name="postId" value={post.id} />
                <button class="delete-button" type="submit">Ta bort</button>
              </form>
            </div>
          </article>
        {/each}
      </section>
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
    width: min(100%, 72rem);
    display: grid;
    gap: 1.25rem;
  }

  .hero {
    display: grid;
    gap: 0.9rem;
  }

  .hero-copy h1 {
    font-size: clamp(1.9rem, 3.4vw, 2.8rem);
    color: var(--color-text);
    font-weight: 900;
    margin: 0;
  }

  .main-logo-link {
    width: 3.25rem;
    height: 3.25rem;
    display: inline-grid;
    place-items: center;
  }

  .main-logo-link img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .new-post-link {
    justify-self: start;
    border: 3px solid #111;
    border-radius: 0.9rem;
    padding: 0.75rem 1rem;
    background: #ef4444;
    color: white;
    font-weight: 800;
    text-decoration: none;
  }

  .empty-card,
  .post-row {
    border: 2px solid #111;
    border-radius: 1rem;
    background: #efefef;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
  }

  .empty-card {
    padding: 1.25rem;
    display: grid;
    gap: 0.5rem;
  }

  .empty-card h2,
  .empty-card p {
    margin: 0;
  }

  .post-list {
    display: grid;
    gap: 0.85rem;
  }

  .post-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    padding: 0.75rem;
    align-items: center;
  }

  .post-link {
    min-width: 0;
    text-decoration: none;
    color: inherit;
    display: grid;
    grid-template-columns: 6.2rem minmax(0, 1fr);
    gap: 0.85rem;
    align-items: center;
  }

  .thumb {
    width: 6.2rem;
    aspect-ratio: 4 / 5;
    border-radius: 0.75rem;
    overflow: hidden;
    border: 2px solid #111;
    background: #d6d6d6;
    display: grid;
    place-items: center;
  }

  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb span {
    font-size: 0.8rem;
    font-weight: 700;
    color: #666;
    text-align: center;
    padding: 0.5rem;
  }

  .post-content {
    min-width: 0;
    display: grid;
    gap: 0.45rem;
  }

  .description {
    margin: 0;
    font-weight: 700;
    color: #111;
    line-height: 1.35;
    word-break: break-word;
  }

  .meta {
    margin: 0;
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
    color: #666;
    font-size: 0.9rem;
    font-weight: 700;
  }

  .preview-pill,
  .published-pill {
    border-radius: 999px;
    padding: 0.2rem 0.55rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 900;
  }

  .preview-pill {
    background: #111;
    color: #fff;
  }

  .published-pill {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
    align-items: center;
  }

  .row-actions form {
    margin: 0;
  }

  .edit-link,
  .publish-button,
  .delete-button {
    border: 2px solid #111;
    border-radius: 999px;
    padding: 0 0.95rem;
    height: 2.3rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    text-decoration: none;
    color: #111;
    background: #fff;
  }

  .publish-button {
    background: #ef4444;
    color: #fff;
  }

  .delete-button {
    background: #fee2e2;
    color: #991b1b;
  }

  .error {
    margin: 0;
    border: 1px solid #fca5a5;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 0.7rem;
    padding: 0.65rem 0.8rem;
    font-weight: 700;
  }

  @media (max-width: 760px) {
    .post-row {
      grid-template-columns: 1fr;
    }

    .row-actions {
      justify-self: end;
      justify-content: flex-end;
    }

    .post-link {
      grid-template-columns: 5.4rem minmax(0, 1fr);
    }

    .thumb {
      width: 5.4rem;
    }
  }
</style>