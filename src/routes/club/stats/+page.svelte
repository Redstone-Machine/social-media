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
    posts: Array<{
      id: string;
      description: string;
      uploadedAt: string;
      firstPictureUrl: string | null;
      viewCount: number;
      likeCount: number;
    }>;
  };

  let { data } = $props<{ data: PageData }>();
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
  <title>Statistik</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <div class="hero">
      <a class="main-logo-link" href="/club" aria-label="Till klubbmenyn">
        <img src="/main-logo.png" alt="" />
      </a>

      <div class="hero-copy">
        <h1>Statistik för {data.user.club.name}</h1>
      </div>
    </div>

    {#if data.posts.length === 0}
      <section class="empty-card">
        <h2>Inga publicerade inlägg än</h2>
        <p>Publicera ett inlägg för att se statistik här.</p>
      </section>
    {:else}
      <section class="post-list" aria-label="Statistik per inlägg">
        {#each data.posts as post}
          <article class="post-row">
            <div class="post-main">
              <a class="thumb-link" href={`/post/${post.id}`} aria-label={`Öppna inlägget ${post.id}`}>
                <div class="thumb" aria-hidden="true">
                  {#if post.firstPictureUrl}
                    <img src={post.firstPictureUrl} alt="" loading="lazy" />
                  {:else}
                    <span>Ingen bild</span>
                  {/if}
                </div>
              </a>

              <a class="info-link" href={`/club/stats/${post.id}`} aria-label={`Öppna statistik för inlägget ${post.id}`}>
                <div class="post-content">
                  <p class="description">{descriptionPreview(post.description)}</p>
                  <p class="meta">
                    <span>{formatDate(post.uploadedAt)}</span>
                  </p>
                </div>
              </a>
            </div>

            <div class="row-stats" aria-label="Inläggsstatistik">
              <p class="stat-item" aria-label={`Antal visningar ${post.viewCount}`}>
                <span class="stat-icon" aria-hidden="true">&#128065;</span>
                <span>{post.viewCount}</span>
              </p>
              <p class="stat-item" aria-label={`Antal gillningar ${post.likeCount}`}>
                <span class="stat-icon" aria-hidden="true">&#9829;</span>
                <span>{post.likeCount}</span>
              </p>
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
    gap: 1rem;
    padding: 0.75rem;
    align-items: center;
  }

  .post-main {
    min-width: 0;
    display: grid;
    grid-template-columns: 6.2rem minmax(0, 1fr);
    gap: 0.85rem;
    align-items: center;
  }

  .thumb-link {
    text-decoration: none;
    color: inherit;
  }

  .info-link {
    min-width: 0;
    text-decoration: none;
    color: inherit;
    display: block;
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
    max-width: 34ch;
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

  .row-stats {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .row-stats p {
    margin: 0;
    color: #222;
    font-weight: 900;
    white-space: nowrap;
  }

  .stat-item {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 1.9rem;
    line-height: 1;
  }

  .stat-icon {
    font-size: 2.15rem;
    width: 2.15rem;
    text-align: center;
  }

  @media (max-width: 760px) {
    .post-main {
      grid-template-columns: 5.4rem minmax(0, 1fr);
    }

    .thumb {
      width: 5.4rem;
    }

    .description {
      max-width: 24ch;
    }

    .row-stats {
      flex-direction: column;
      align-items: flex-end;
      justify-self: end;
      gap: 0.65rem;
      padding-right: 0.15rem;
    }

    .stat-item {
      font-size: 1.35rem;
    }

    .stat-icon {
      font-size: 1.55rem;
      width: 1.55rem;
    }
  }
</style>
