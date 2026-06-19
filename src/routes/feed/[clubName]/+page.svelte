<script lang="ts">
  import { goto } from '$app/navigation';

  type PostCard = {
    id: string;
    description: string;
    uploadedAt: string;
    firstPictureUrl: string | null;
    likeCount: number;
    viewCount: number;
  };

  type PageData = {
    club: {
      id: string;
      name: string;
      pictureUrl: string | null;
      description: string | null;
    };
    posts: PostCard[];
  };

  let { data } = $props<{ data: PageData }>();

  const chooseClubHref = $derived(`/feed?from=${encodeURIComponent(data.club.name)}`);

  type ViewTransitionDocument = Document & {
    startViewTransition?: (callback: () => Promise<void> | void) => { finished: Promise<void> };
  };

  const logoTransitionName = $derived(
    `club-logo-${data.club.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unknown'}`
  );

  function formatDate(value: string) {
    return new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  function descriptionPreview(text: string) {
    const compact = text.replace(/\s+/g, ' ').trim();

    if (compact.length <= 170) {
      return compact;
    }

    return `${compact.slice(0, 170)}...`;
  }

  async function navigateWithTransition(event: MouseEvent) {
    event.preventDefault();
    const enhancedDocument = document as ViewTransitionDocument;

    if (typeof enhancedDocument.startViewTransition === 'function') {
      enhancedDocument.startViewTransition(() => goto(chooseClubHref));
      return;
    }

    await goto(chooseClubHref);
  }
</script>

<svelte:head>
  <title>{data.club.name} - flöde</title>
</svelte:head>

<main class="feed-shell">
  <section class="feed-panel">
    <header class="feed-header">
      <a class="club-logo-link" href={chooseClubHref} aria-label="Välj klubb" onclick={navigateWithTransition}>
        <div class="club-logo" aria-hidden="true" style={`view-transition-name: ${logoTransitionName};`}>
          {#if data.club.pictureUrl}
            <img src={data.club.pictureUrl} alt={data.club.name} />
          {:else}
            <span>{data.club.name.slice(0, 2).toUpperCase()}</span>
          {/if}
        </div>
      </a>

      <div class="club-header-copy">
        <h1>{data.club.name}</h1>
        {#if data.club.description}
          <p>{data.club.description}</p>
        {/if}
      </div>
    </header>

    {#if data.posts.length === 0}
      <section class="empty-card">
        <h2>Inga publicerade inlägg ännu</h2>
        <p>Välj en annan klubb via loggan högst upp för att se fler flöden.</p>
      </section>
    {:else}
      <section class="post-list" aria-label={`Flöde för ${data.club.name}`}>
        {#each data.posts as post}
          <article class="post-card">
            <a class="post-link" href={`/post/${post.id}`} aria-label={`Öppna inlägg ${post.id}`}>
              <div class="post-image" aria-hidden="true">
                {#if post.firstPictureUrl}
                  <img src={post.firstPictureUrl} alt="" loading="lazy" />
                {:else}
                  <span>Ingen bild</span>
                {/if}
              </div>

              <div class="post-body">
                <p class="description">{descriptionPreview(post.description)}</p>
                <p class="meta">{formatDate(post.uploadedAt)}</p>
                <div class="stats" aria-label="Statistik">
                  <span aria-label={`Visningar ${post.viewCount}`}>&#128065; {post.viewCount}</span>
                  <span aria-label={`Gillningar ${post.likeCount}`}>&#9829; {post.likeCount}</span>
                </div>
              </div>
            </a>
          </article>
        {/each}
      </section>
    {/if}
  </section>
</main>

<style>
  .feed-shell {
    min-height: 100vh;
    padding: 1.5rem 1rem 4rem;
    display: grid;
    place-items: start center;
    background:
      radial-gradient(circle at 85% 8%, rgba(249, 115, 22, 0.15), transparent 24%),
      radial-gradient(circle at 12% 88%, rgba(6, 182, 212, 0.16), transparent 34%),
      linear-gradient(180deg, #fffaf5 0%, #ffffff 45%, #f7fdff 100%);
  }

  .feed-panel {
    width: min(100%, 34rem);
    display: grid;
    gap: 1rem;
  }

  .feed-header {
    display: grid;
    gap: 0.6rem;
    justify-items: center;
    text-align: center;
    margin-bottom: 0.15rem;
  }

  .club-logo-link {
    display: inline-flex;
    border-radius: 999px;
    transition: transform 0.16s ease;
  }

  .club-logo-link:hover {
    transform: translateY(-1px) scale(1.02);
  }

  .club-logo {
    width: 4.75rem;
    height: 4.75rem;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    color: white;
    font-weight: 900;
    background: linear-gradient(140deg, #ef4444, #fb7185);
    box-shadow: 0 14px 28px rgba(239, 68, 68, 0.3);
    animation: logo-in 420ms ease;
  }

  .club-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .club-header-copy h1 {
    font-size: clamp(1.7rem, 4vw, 2.3rem);
    color: #1f2937;
    line-height: 1.04;
  }

  .club-header-copy p {
    margin-top: 0.3rem;
    color: var(--color-text-secondary);
    font-size: 0.95rem;
  }

  .club-header-copy {
    display: none;
  }

  .empty-card {
    padding: 1.2rem;
    border-radius: 1rem;
    border: 1px dashed var(--color-gray-300);
    background: rgba(255, 255, 255, 0.78);
    text-align: center;
    color: var(--color-text-secondary);
  }

  .empty-card h2 {
    color: var(--color-text);
    font-size: 1.25rem;
    margin-bottom: 0.3rem;
  }

  .post-list {
    display: grid;
    gap: 1rem;
  }

  .post-card {
    border-radius: 1.05rem;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 14px 24px rgba(15, 23, 42, 0.08);
  }

  .post-link {
    color: inherit;
    text-decoration: none;
    display: grid;
  }

  .post-image {
    width: 100%;
    aspect-ratio: 4 / 5;
    background: linear-gradient(160deg, #f3f4f6, #e5e7eb);
    display: grid;
    place-items: center;
    color: var(--color-text-secondary);
    font-weight: 700;
  }

  .post-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .post-body {
    display: grid;
    gap: 0.55rem;
    padding: 0.85rem 0.9rem 0.95rem;
  }

  .description {
    color: #1f2937;
  }

  .meta {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  .stats {
    display: flex;
    gap: 0.8rem;
    color: var(--color-text-secondary);
    font-size: 0.88rem;
  }

  @keyframes logo-in {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }

    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (min-width: 760px) {
    .feed-header {
      width: 100%;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 0.8rem;
      justify-items: start;
      text-align: left;
    }

    .club-header-copy {
      display: block;
    }
  }
</style>
