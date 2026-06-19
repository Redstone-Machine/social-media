<script lang="ts">
  type Club = {
    id: string;
    name: string;
    pictureUrl: string | null;
  };

  type PostCard = {
    id: string;
    description: string;
    uploadedAt: string;
    firstPictureUrl: string | null;
    likeCount: number;
    viewCount: number;
    club: Club;
  };

  type PageData = {
    selectedClubs: Club[];
    posts: PostCard[];
  };

  let { data } = $props<{ data: PageData }>();

  const selectedNames = $derived(data.selectedClubs.map((club) => club.name));
  const chooseClubHref = $derived(`/feed?fromClubs=${encodeURIComponent(selectedNames.join('|'))}`);

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
</script>

<svelte:head>
  <title>Flera flöden</title>
</svelte:head>

<main class="feed-shell">
  <section class="feed-panel">
    <header class="feed-header">
      <a class="cluster-link" href={chooseClubHref} aria-label="Välj klubbar">
        <div class="club-cluster" aria-hidden="true">
          {#each data.selectedClubs.slice(0, 4) as club, index}
            <div class="club-badge" style={`--offset:${index};`}>
              {#if club.pictureUrl}
                <img src={club.pictureUrl} alt={club.name} />
              {:else}
                <span>{club.name.slice(0, 2).toUpperCase()}</span>
              {/if}
            </div>
          {/each}
        </div>
      </a>

      <div class="club-header-copy">
        <h1>Flöde från flera klubbar</h1>
        <p>{selectedNames.join(', ')}</p>
      </div>
    </header>

    {#if data.posts.length === 0}
      <section class="empty-card">
        <h2>Inga publicerade inlägg ännu</h2>
        <p>Prova att lägga till fler klubbar i urvalet.</p>
      </section>
    {:else}
      <section class="post-list" aria-label="Kombinerat flöde">
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
                <div class="club-row">
                  <div class="mini-badge" aria-hidden="true">
                    {#if post.club.pictureUrl}
                      <img src={post.club.pictureUrl} alt={post.club.name} />
                    {:else}
                      <span>{post.club.name.slice(0, 2).toUpperCase()}</span>
                    {/if}
                  </div>
                  <strong>{post.club.name}</strong>
                </div>
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
  }

  .cluster-link {
    text-decoration: none;
  }

  .club-cluster {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    width: 7.2rem;
    height: 4.8rem;
    position: relative;
  }

  .club-badge {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    position: absolute;
    left: calc(var(--offset) * 1.4rem);
    top: calc((var(--offset) % 2) * 1rem);
    color: white;
    font-size: 0.78rem;
    font-weight: 800;
    border: 2px solid rgba(255, 255, 255, 0.84);
    background: linear-gradient(140deg, #ef4444, #fb7185);
    box-shadow: 0 10px 20px rgba(239, 68, 68, 0.25);
  }

  .club-badge img,
  .mini-badge img {
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

  .club-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .mini-badge {
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    color: white;
    font-size: 0.55rem;
    font-weight: 800;
    background: linear-gradient(140deg, #ef4444, #fb7185);
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
</style>
