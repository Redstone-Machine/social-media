<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { SubmitFunction } from '@sveltejs/kit';

  type AspectKey = 'square' | 'portrait' | 'tall';

  type PostCard = {
    id: string;
    description: string;
    aspectKey: AspectKey;
    uploadedAt: string;
    pictures: Array<{
      id: string;
      pictureUrl: string;
    }>;
    likeCount: number;
    viewCount: number;
    likedBySession: boolean;
  };

  type PageData = {
    csrfToken: string;
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
  let likeState = $state<Record<string, { liked: boolean; count: number }>>({});
  let shareStatusByPost = $state<Record<string, string>>({});
  let activeIndexByPost = $state<Record<string, number>>({});

  $effect(() => {
    likeState = Object.fromEntries(
      data.posts.map((post) => [post.id, { liked: post.likedBySession, count: post.likeCount }])
    );
  });

  function getPostAspectRatio(aspectKey: AspectKey) {
    if (aspectKey === 'square') {
      return '1 / 1';
    }

    if (aspectKey === 'tall') {
      return '9 / 16';
    }

    return '4 / 5';
  }

  function currentLikeState(postId: string, fallbackLiked: boolean, fallbackCount: number) {
    return likeState[postId] ?? { liked: fallbackLiked, count: fallbackCount };
  }

  function currentIndex(postId: string, totalPictures: number) {
    if (totalPictures <= 1) {
      return 0;
    }

    const stored = activeIndexByPost[postId] ?? 0;
    return Math.min(Math.max(stored, 0), totalPictures - 1);
  }

  function currentPicture(
    postId: string,
    pictures: Array<{ id: string; pictureUrl: string }>
  ): { id: string; pictureUrl: string } | null {
    if (!pictures.length) {
      return null;
    }

    return pictures[currentIndex(postId, pictures.length)] ?? pictures[0];
  }

  function goToSlide(postId: string, totalPictures: number, nextIndex: number) {
    if (totalPictures <= 1) {
      return;
    }

    activeIndexByPost = {
      ...activeIndexByPost,
      [postId]: Math.min(Math.max(nextIndex, 0), totalPictures - 1)
    };
  }

  function goPrevious(postId: string, totalPictures: number) {
    if (totalPictures <= 1) {
      return;
    }

    const current = currentIndex(postId, totalPictures);
    goToSlide(postId, totalPictures, current === 0 ? totalPictures - 1 : current - 1);
  }

  function goNext(postId: string, totalPictures: number) {
    if (totalPictures <= 1) {
      return;
    }

    const current = currentIndex(postId, totalPictures);
    goToSlide(postId, totalPictures, current === totalPictures - 1 ? 0 : current + 1);
  }

  function formatPublishedLabel(value: string) {
    const date = new Date(value);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const rtf = new Intl.RelativeTimeFormat('sv-SE', { numeric: 'auto' });

    if (Math.abs(diffHours) < 24) {
      return `publicerades ${rtf.format(diffHours, 'hour')}`;
    }

    return `publicerades ${rtf.format(diffDays, 'day')}`;
  }

  function setShareStatus(postId: string, message: string) {
    shareStatusByPost = {
      ...shareStatusByPost,
      [postId]: message
    };
  }

  const handleLikeSubmit = (postId: string, fallbackLiked: boolean, fallbackCount: number): SubmitFunction => {
    const previous = currentLikeState(postId, fallbackLiked, fallbackCount);

    const optimistic = {
      liked: !previous.liked,
      count: Math.max(0, previous.count + (previous.liked ? -1 : 1))
    };

    likeState = {
      ...likeState,
      [postId]: optimistic
    };

    return async ({ result }) => {
      if (result.type === 'failure' || result.type === 'error') {
        likeState = {
          ...likeState,
          [postId]: previous
        };
        return;
      }

      if (result.type === 'success') {
        const responseData = result.data as {
          postId?: string;
          likedBySession?: boolean;
          likeCount?: number;
        };

        if (responseData.postId === postId) {
          likeState = {
            ...likeState,
            [postId]: {
              liked: responseData.likedBySession ?? optimistic.liked,
              count: responseData.likeCount ?? optimistic.count
            }
          };
        }
      }
    };
  };

  async function sharePost(postId: string) {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    setShareStatus(postId, '');

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${data.club.name} - inlägg`,
          url: shareUrl
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
      }
    }

    if (navigator.clipboard) {
      const shouldCopy = window.confirm('Kunde inte öppna delningsmenyn. Vill du kopiera länken i stället?');
      if (shouldCopy) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus(postId, 'Länken kopierades till urklipp.');
      }
      return;
    }

    setShareStatus(postId, 'Kunde inte öppna delningsmenyn på den här enheten.');
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
          <article class="post-item">
            <a class="image-link" href={`/post/${post.id}`} aria-label={`Öppna inlägg ${post.id}`}>
              <div class="image-stage" style={`aspect-ratio: ${getPostAspectRatio(post.aspectKey)};`} aria-hidden="true">
                <div class="image-overlay-top">
                  <div class="club-meta">
                    <div class="club-badge" aria-label={data.club.name}>
                      {#if data.club.pictureUrl}
                        <img src={data.club.pictureUrl} alt={data.club.name} />
                      {:else}
                        <span>{data.club.name.slice(0, 2).toUpperCase()}</span>
                      {/if}
                    </div>
                    <strong>{data.club.name}</strong>
                  </div>
                </div>

                {#if currentPicture(post.id, post.pictures)}
                  <img
                    class="main-image"
                    src={currentPicture(post.id, post.pictures)?.pictureUrl}
                    alt=""
                    loading="lazy"
                  />
                {:else}
                  <span class="no-image">Ingen bild</span>
                {/if}

                {#if post.pictures.length > 1}
                  <button
                    type="button"
                    class="nav-arrow left"
                    onclick={(e) => {
                        e.preventDefault();
                        goPrevious(post.id, post.pictures.length);
                    }}
                    aria-label="Föregående bild"
                  >
                    &#8249;
                  </button>

                  <button
                    type="button"
                    class="nav-arrow right"
                    onclick={(e) => {
                        e.preventDefault();
                        goNext(post.id, post.pictures.length);
                    }}
                    aria-label="Nästa bild"
                  >
                    &#8250;
                  </button>

                  <div class="dot-row" aria-label="Bildposition">
                    {#each post.pictures as _, index}
                      <button
                        type="button"
                        class="dot"
                        class:active={index === currentIndex(post.id, post.pictures.length)}
                        onclick={(e) => {
                            e.preventDefault();
                            goToSlide(post.id, post.pictures.length, index);
                        }}
                        aria-label={`Gå till bild ${index + 1}`}
                      ></button>
                    {/each}
                  </div>
                {/if}
              </div>
            </a>

            <div class="content">
              <div class="meta-row">
                <p class="published-label">{formatPublishedLabel(post.uploadedAt)}</p>

                <div class="icons">
                  <div class="like-group">
                    <form
                      method="POST"
                      action="?/toggleLike"
                      use:enhance={handleLikeSubmit(post.id, post.likedBySession, post.likeCount)}
                    >
                      <input type="hidden" name="_csrf" value={data.csrfToken} />
                      <input type="hidden" name="postId" value={post.id} />
                      <button
                        type="submit"
                        class="like-button"
                        aria-label={currentLikeState(post.id, post.likedBySession, post.likeCount).liked
                          ? 'Ta bort gilla-markering'
                          : 'Gilla inlägg'}
                      >
                        <span
                          class="glyph heart-glyph"
                          class:liked={currentLikeState(post.id, post.likedBySession, post.likeCount).liked}
                          aria-hidden="true"
                        ></span>
                        {#if currentLikeState(post.id, post.likedBySession, post.likeCount).count > 0}
                          <span class="like-count">
                            {currentLikeState(post.id, post.likedBySession, post.likeCount).count}
                          </span>
                        {/if}
                      </button>
                    </form>
                  </div>

                  <a
                    class="download-button"
                    href={currentPicture(post.id, post.pictures)?.pictureUrl ?? '#'}
                    download
                    aria-label="Ladda ner bild"
                    aria-disabled={!currentPicture(post.id, post.pictures)}
                  >
                    <span class="glyph download-glyph" aria-hidden="true"></span>
                  </a>

                  <button type="button" class="share-button" onclick={() => sharePost(post.id)} aria-label="Dela inlägg">
                    <span class="glyph share-glyph" aria-hidden="true"></span>
                  </button>
                </div>
              </div>

              {#if shareStatusByPost[post.id]}
                <p class="share-status">{shareStatusByPost[post.id]}</p>
              {/if}

              <a class="description-link" href={`/post/${post.id}`} aria-label={`Öppna inlägg ${post.id}`}>
                <p class="description">{post.description}</p>
              </a>
            </div>
          </article>
        {/each}
      </section>
    {/if}
  </section>
</main>

<style>
  .feed-shell {
    min-height: calc(100vh - 4rem);
    padding: 2rem 1.5rem 4rem;
    display: grid;
    place-items: start center;
    background-color: var(--color-background-color);
  }

  .feed-panel {
    width: min(100%, 32rem);
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
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    color: white;
    font-weight: 900;
    background: #ef4444;
    border: 3px solid #111;
  }

  .club-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .club-header-copy h1 {
    font-size: clamp(1.7rem, 4vw, 2.3rem);
    color: var(--color-general-text);
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
    border: 3px solid #111;
    background: #efefef;
    text-align: center;
    color: var(--color-general-text);
  }

  .empty-card h2 {
    color: var(--color-text);
    font-size: 1.25rem;
    margin-bottom: 0.3rem;
  }

  .post-list {
    display: grid;
    gap: 0;
  }

  .post-item {
    display: grid;
    gap: 0;
    min-width: 0;
    padding-bottom: 1.2rem;
    margin-bottom: 1.2rem;
    border-bottom: 1px solid var(--color-gray-300);
  }

  .post-item:last-child {
    margin-bottom: 0;
    border-bottom: 0;
    padding-bottom: 0;
  }

  .image-link,
  .description-link {
    color: inherit;
    text-decoration: none;
  }

  .image-stage {
    width: 100%;
    aspect-ratio: 4 / 5;
    background: #d1d1d1;
    display: grid;
    place-items: center;
    overflow: hidden;
    position: relative;
  }

  .image-overlay-top {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    right: 0.75rem;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    z-index: 2;
  }

  .club-meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 1rem;
    color: var(--color-account-name-color);
    font-weight: 900;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  }

  .club-badge {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    background: #ef4444;
    color: white;
    font-size: 0.7rem;
    font-weight: 900;
  }

  .club-badge img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .main-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .no-image {
    color: var(--color-general-text);
    font-weight: 700;
  }

  .content {
    display: grid;
    gap: 0.8rem;
    min-width: 0;
    margin-top: 0.35rem;
    padding: 0 0.1rem 0;
  }

  .description {
    font-size: 1rem;
    line-height: 1.45;
    color: var(--color-general-text);
    font-weight: 600;
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
    hyphens: auto;
  }

  .meta-row {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    align-items: flex-start;
    min-height: 2.2rem;
    margin-top: 0.2rem;
    padding-top: 0.1rem;
  }

  .published-label {
    color: var(--color-faded-text);
    font-size: 0.95rem;
    font-weight: 800;
    margin: 0;
    margin-right: auto;
    line-height: 1.15;
    align-self: flex-start;
  }

  .nav-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 999px;
    border: 0;
    background: rgba(0, 0, 0, 0.45);
    color: white;
    font-size: 1.55rem;
    display: grid;
    place-items: center;
    z-index: 2;
  }

  .nav-arrow.left {
    left: 0.6rem;
  }

  .nav-arrow.right {
    right: 0.6rem;
  }

  .dot-row {
    position: absolute;
    bottom: 0.6rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.35rem;
    z-index: 2;
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    border: 0;
    background: rgba(255, 255, 255, 0.52);
    padding: 0;
  }

  .dot.active {
    background: white;
  }

  .icons {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    justify-content: flex-end;
  }

  .like-group {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .glyph {
    display: block;
    width: 1.7rem;
    height: 1.7rem;
    background-color: var(--color-glyph-color);
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
  }

  .heart-glyph {
    mask-image: url('/glyphs/heart-icon.svg');
    -webkit-mask-image: url('/glyphs/heart-icon.svg');
    transform: translateY(0.05em);
  }

  .heart-glyph.liked {
    background-color: var(--color-heart-with-color);
  }

  .download-glyph {
    mask-image: url('/glyphs/download-icon.svg');
    -webkit-mask-image: url('/glyphs/download-icon.svg');
  }

  .share-glyph {
    mask-image: url('/glyphs/share-icon.svg');
    -webkit-mask-image: url('/glyphs/share-icon.svg');
  }

  .like-button,
  .download-button,
  .share-button {
    border: 0;
    background: transparent;
    padding: 0;
    text-decoration: none;
    display: inline-grid;
    place-items: center;
    line-height: 0;
  }

  .like-button {
    grid-auto-flow: column;
    gap: 0.35rem;
    align-items: center;
  }

  .like-count {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-faded-text);
    min-width: 1ch;
  }

  .share-status {
    font-size: 0.92rem;
    color: #666;
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

    .club-header-copy,
    .club-header-copy p {
      display: none;
    }

    .club-header-copy h1 {
      display: none;
    }
  }

  @media (max-width: 640px) {
    .feed-shell {
      padding-inline: 0;
      padding-top: 1rem;
    }

    .feed-panel {
      width: 100%;
    }

    .feed-header,
    .content {
      padding-inline: 0.75rem;
    }

    .image-stage {
      width: 100vw;
      margin-left: calc(50% - 50vw);
      margin-right: calc(50% - 50vw);
      border-radius: 0;
    }

    .meta-row {
      width: 100vw;
      margin-left: calc(50% - 50vw);
      margin-right: calc(50% - 50vw);
      box-sizing: border-box;
      padding: 0.1rem 0.75rem 0;
    }

    .post-item {
      padding-bottom: 1rem;
      margin-bottom: 1rem;
    }
  }
</style>
