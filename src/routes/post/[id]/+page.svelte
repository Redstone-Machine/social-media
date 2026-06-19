<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';

  type AspectKey = 'square' | 'portrait' | 'tall';

  type PageData = {
    canEdit: boolean;
    likedBySession: boolean;
    likeCount: number;
    viewer: {
      id: string;
      username: string;
      club: {
        id: string;
        name: string;
        pictureUrl: string | null;
      };
    };
    post: {
      id: string;
      description: string;
      uploadedAt: string;
      formLink: string | null;
      formLinkTitle: string | null;
      otherLink: string | null;
      otherLinkTitle: string | null;
      sendNotification: boolean;
      preview: boolean;
      aspectKey: AspectKey;
      pictures: Array<{
        id: string;
        pictureUrl: string;
      }>;
    };
    csrfToken: string;
  };

  let { data } = $props<{ data: PageData }>();
  let activeIndex = $state(0);
  let shareStatus = $state('');
  let likedBySession = $state(false);
  let likeCount = $state(0);
  let touchStartX = 0;
  let touchStartY = 0;
  let likeForm = $state<HTMLFormElement | null>(null);
  let swipeOffsetPct = $state(0);
  let swipeTransition = $state(true);
  let swipeHostWidth = 1;
  const editHref = $derived(`/club/posts/new?postId=${data.post.id}`);
  const isDraft = $derived(data.post.preview);
  const postAspectRatio = $derived(
    data.post.aspectKey === 'square' ? '1 / 1' : data.post.aspectKey === 'tall' ? '9 / 16' : '4 / 5'
  );

  const activePicture = $derived(data.post.pictures[activeIndex] ?? data.post.pictures[0]);

  $effect(() => {
    likedBySession = data.likedBySession;
    likeCount = data.likeCount;
  });

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

  function goPrevious() {
    if (!data.post.pictures.length) {
      return;
    }

    activeIndex = activeIndex === 0 ? data.post.pictures.length - 1 : activeIndex - 1;
  }

  function goNext() {
    if (!data.post.pictures.length) {
      return;
    }

    activeIndex = activeIndex === data.post.pictures.length - 1 ? 0 : activeIndex + 1;
  }

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    swipeHostWidth = Math.max(1, target.clientWidth);
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    swipeTransition = false;
    swipeOffsetPct = 0;
  }

  function handleTouchMove(event: TouchEvent) {
    if (event.touches.length !== 1) {
      return;
    }

    const deltaX = event.touches[0].clientX - touchStartX;
    const deltaY = event.touches[0].clientY - touchStartY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    event.preventDefault();
    swipeOffsetPct = (deltaX / swipeHostWidth) * 100;
  }

  function handleTouchEnd(event: TouchEvent) {
    swipeTransition = true;

    if (event.changedTouches.length !== 1) {
      swipeOffsetPct = 0;
      return;
    }

    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const deltaY = event.changedTouches[0].clientY - touchStartY;

    if (Math.abs(deltaX) < 45 || Math.abs(deltaY) > 60) {
      swipeOffsetPct = 0;
      return;
    }

    if (deltaX < 0) {
      goNext();
    } else {
      goPrevious();
    }

    swipeOffsetPct = 0;
  }

  function handleImageDoubleClick() {
    if (isDraft || !likeForm) {
      return;
    }

    likeForm.requestSubmit();
  }

  async function sharePost() {
    const shareUrl = window.location.href;
    shareStatus = '';
    const shareData = {
      title: `${data.viewer.club.name} - inlägg`,
      text: data.post.description.slice(0, 140),
      url: shareUrl
    };

    try {
      if (typeof navigator.share === 'function') {
        const canShare = typeof navigator.canShare === 'function' ? navigator.canShare({ url: shareUrl }) : true;

        if (canShare) {
          await navigator.share(shareData);
          return;
        }
      }

      if (navigator.clipboard) {
        const shouldCopy = window.confirm('Kunde inte öppna delningsmenyn. Vill du kopiera länken i stället?');

        if (shouldCopy) {
          await navigator.clipboard.writeText(shareUrl);
          shareStatus = 'Länken kopierades till urklipp.';
        } else {
          shareStatus = 'Delningen avbröts.';
        }
      } else {
        shareStatus = 'Kunde inte öppna delningsmenyn eller kopiera länken på den här enheten.';
      }
    } catch {
      if (navigator.clipboard) {
        const shouldCopy = window.confirm('Delning misslyckades. Vill du kopiera länken i stället?');

        if (shouldCopy) {
          await navigator.clipboard.writeText(shareUrl);
          shareStatus = 'Länken kopierades till urklipp.';
          return;
        }
      }

      shareStatus = 'Delningen avbröts eller kunde inte slutföras.';
    }
  }

  const handleLikeSubmit: SubmitFunction = () => {
    const wasLiked = likedBySession;
    likedBySession = !likedBySession;
    likeCount = Math.max(0, likeCount + (wasLiked ? -1 : 1));

    return async ({ update, result }) => {
      if (result.type === 'failure' || result.type === 'error') {
        likedBySession = wasLiked;
        likeCount = Math.max(0, likeCount + (wasLiked ? 1 : -1));
        return;
      }

      await update({ reset: false });

      if (result.type === 'success') {
        const responseData = result.data as { likedBySession?: boolean; likeCount?: number };

        if (typeof responseData.likedBySession === 'boolean') {
          likedBySession = responseData.likedBySession;
        }

        if (typeof responseData.likeCount === 'number') {
          likeCount = responseData.likeCount;
        }
      }
    };
  };
</script>

<svelte:head>
  <title>{data.viewer.club.name} - inlägg</title>
</svelte:head>

<main class="post-shell">
  <section class="post-panel">
    <div class="top-bar">
      <a class="main-logo-link" href="/club" aria-label="Till klubbmenyn">
        <img src="/main-logo.png" alt="" />
      </a>

      <div class="top-actions">
        {#if data.canEdit}
          <a class="edit-link" href={editHref}>Ändra</a>
        {/if}

        {#if isDraft && data.canEdit}
          <form method="POST" action="?/publish">
            <input type="hidden" name="_csrf" value={data.csrfToken} />
            <button type="submit" class="publish-button">Publicera</button>
          </form>
        {/if}
      </div>
    </div>

    <div class="post-card">
      <div class="image-stage" style={`aspect-ratio: ${postAspectRatio};`} role="group" aria-label="Bildvisning" ontouchstart={handleTouchStart} ontouchmove={handleTouchMove} ontouchend={handleTouchEnd} ondblclick={handleImageDoubleClick}>
        <div class="image-overlay-top">
          <div class="club-meta">
            <div class="club-badge" aria-label={data.viewer.club.name}>
              {#if data.viewer.club.pictureUrl}
                <img src={data.viewer.club.pictureUrl} alt={data.viewer.club.name} />
              {:else}
                <span>{data.viewer.club.name.slice(0, 2).toUpperCase()}</span>
              {/if}
            </div>

            <strong>{data.viewer.club.name}</strong>
          </div>

          {#if data.post.preview}
            <span class="preview-pill">Utkast</span>
          {/if}
        </div>

        <div class:dragging={!swipeTransition} class="carousel-track" style={`transform: translateX(calc(-${activeIndex * 100}% + ${swipeOffsetPct}%));`}>
          {#each data.post.pictures as picture, index}
            <div class="carousel-slide" aria-hidden={index !== activeIndex}>
              <img class="main-image" src={picture.pictureUrl} alt={`Förhandsvisning av bild ${index + 1}`} />
            </div>
          {/each}
        </div>

        {#if data.post.pictures.length > 1}
          <button type="button" class="nav-arrow left" onclick={goPrevious} aria-label="Föregående bild">
            &#8249;
          </button>

          <button type="button" class="nav-arrow right" onclick={goNext} aria-label="Nästa bild">
            &#8250;
          </button>

          <div class="dot-row" aria-label="Bildposition">
            {#each data.post.pictures as _, index}
              <button
                type="button"
                class="dot"
                class:active={index === activeIndex}
                onclick={() => (activeIndex = index)}
                aria-label={`Gå till bild ${index + 1}`}
              ></button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="meta-row">
        {#if !isDraft}
          <p class="published-label">{formatPublishedLabel(data.post.uploadedAt)}</p>
        {:else}
          <span></span>
        {/if}

        <div class="icons">
          {#if !isDraft}
            <form method="POST" action="?/toggleLike" use:enhance={handleLikeSubmit} bind:this={likeForm}>
              <input type="hidden" name="_csrf" value={data.csrfToken} />
              <button type="submit" class="like-button" aria-label={likedBySession ? 'Ta bort gilla-markering' : 'Gilla inlägg'}>
                <span class:liked={likedBySession} class="heart" aria-hidden="true">&#9829;</span>
              </button>
            </form>
            {#if likeCount > 0}
              <span class="like-count">{likeCount}</span>
            {/if}
          {/if}
          <a class="download-button" href={activePicture?.pictureUrl ?? '#'} download aria-label="Ladda ner bild">&#8681;</a>
          <button type="button" class="share-button" onclick={sharePost} aria-label="Dela inlägg">&#8682;</button>
        </div>
      </div>

      {#if shareStatus}
        <p class="share-status">{shareStatus}</p>
      {/if}

      <div class="content">
        <p class="description">{data.post.description}</p>

        {#if data.post.formLink && data.post.formLinkTitle}
          <a class="content-link" href={data.post.formLink} target="_blank" rel="noreferrer">{data.post.formLinkTitle}</a>
        {/if}

        {#if data.post.otherLink && data.post.otherLinkTitle}
          <a class="content-link" href={data.post.otherLink} target="_blank" rel="noreferrer">{data.post.otherLinkTitle}</a>
        {/if}

      </div>
    </div>
  </section>
</main>

<style>
  .post-shell {
    min-height: calc(100vh - 4rem);
    padding: 2rem 1.5rem 4rem;
    display: grid;
    place-items: start center;
  }

  .post-panel {
    width: min(100%, 32rem);
    display: grid;
    gap: 1rem;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }

  .top-actions {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .top-actions form {
    margin: 0;
    display: inline-flex;
  }

  .main-logo-link {
    width: 3.1rem;
    height: 3.1rem;
    display: inline-grid;
    place-items: center;
  }

  .main-logo-link img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .edit-link,
  .publish-button {
    border: 3px solid #111;
    border-radius: 999px;
    padding: 0 1.1rem;
    font-weight: 800;
    text-decoration: none;
    background: #bdbdbd;
    color: #111;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 2.9rem;
    line-height: 1;
    box-sizing: border-box;
    white-space: nowrap;
  }

  .publish-button {
    background: #ef4444;
    color: white;
  }

  .edit-link {
    background: #bdbdbd;
    color: #111;
    text-decoration: none;
  }

  .post-card {
    display: grid;
    gap: 0;
  }

  .club-meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 1rem;
    color: white;
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

  .preview-pill {
    border-radius: 999px;
    background: rgba(17, 17, 17, 0.86);
    color: white;
    padding: 0.45rem 0.8rem;
    font-size: 0.82rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .image-stage {
    background: #d1d1d1;
    overflow: hidden;
    position: relative;
    touch-action: pan-y;
  }

  .image-overlay-top {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    right: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 2;
  }

  .carousel-track {
    height: 100%;
    display: flex;
    transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .carousel-track.dragging {
    transition: none;
  }

  .carousel-slide {
    flex: 0 0 100%;
    height: 100%;
    position: relative;
  }

  .main-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    user-select: none;
    pointer-events: none;
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

  .meta-row {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    align-items: flex-start;
    min-height: 2.2rem;
    margin-top: 0.35rem;
    padding-top: 0.15rem;
  }

  .published-label {
    color: #888;
    font-size: 0.95rem;
    font-weight: 800;
    margin: 0;
    margin-right: auto;
    line-height: 1.15;
    align-self: flex-start;
  }

  .icons {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    color: #666;
    font-size: 2rem;
    line-height: 1;
    justify-content: flex-end;
    padding-top: 0.1rem;
  }

  .heart {
    color: #a0a0a0;
  }

  .heart.liked {
    color: #ff5e3a;
  }

  .like-button,
  .download-button,
  .share-button {
    border: 0;
    background: transparent;
    color: inherit;
    padding: 0;
    font-size: inherit;
    line-height: 1;
    text-decoration: none;
    display: inline-grid;
    place-items: center;
  }

  .like-count {
    font-size: 1rem;
    font-weight: 800;
    color: #444;
    min-width: 1ch;
  }

  .download-button {
    color: #111;
  }

  .share-status {
    font-size: 0.92rem;
    color: #666;
  }

  .content {
    display: grid;
    gap: 0.8rem;
  }

  .description {
    font-size: 1rem;
    line-height: 1.45;
    color: #111;
    font-weight: 600;
  }

  .content-link {
    color: #0f5bd4;
    text-decoration: underline;
    font-weight: 700;
  }

  @media (max-width: 640px) {
    .post-shell {
      padding-inline: 0;
      padding-top: 1rem;
    }

    .post-panel {
      width: 100%;
    }

    .top-bar,
    .content,
    .share-status {
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

    .club-meta {
      font-size: 0.95rem;
    }

    .main-logo-link {
      width: 2.8rem;
      height: 2.8rem;
    }
  }
</style>