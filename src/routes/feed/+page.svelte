<script lang="ts">
  import { goto } from '$app/navigation';

  type ClubCard = {
    id: string;
    name: string;
    pictureUrl: string | null;
    postCount: number;
  };

  type PageData = {
    fromClub: string;
    preselectedClubs: string[];
    clubs: ClubCard[];
  };

  let { data } = $props<{ data: PageData }>();

  type ViewTransitionDocument = Document & {
    startViewTransition?: (callback: () => Promise<void> | void) => { finished: Promise<void> };
  };

  function clubHref(clubName: string) {
    return `/feed/${encodeURIComponent(clubName)}`;
  }

  function transitionName(clubName: string) {
    const normalized = clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `club-logo-${normalized || 'unknown'}`;
  }

  let multiSelectEnabled = $state(false);
  let selectedClubs = $state<string[]>([...data.preselectedClubs]);

  const selectedSet = $derived(new Set(selectedClubs.map((club) => club.toLowerCase())));
  const multiHref = $derived(`/feed/multi?clubs=${encodeURIComponent(selectedClubs.join('|'))}`);
  const allHref = '/feed/multi?clubs=all';

  function toggleMultiSelect() {
    multiSelectEnabled = !multiSelectEnabled;
  }

  function toggleClubSelection(clubName: string) {
    const key = clubName.toLowerCase();

    if (selectedSet.has(key)) {
      selectedClubs = selectedClubs.filter((name) => name.toLowerCase() !== key);
      return;
    }

    selectedClubs = [...selectedClubs, clubName];
  }

  function selectAllClubs() {
    selectedClubs = data.clubs.map((club) => club.name);
  }

  async function navigateWithTransition(event: MouseEvent, href: string) {
    event.preventDefault();
    const enhancedDocument = document as ViewTransitionDocument;

    if (typeof enhancedDocument.startViewTransition === 'function') {
      enhancedDocument.startViewTransition(() => goto(href));
      return;
    }

    await goto(href);
  }

  async function openMultiFeed(event: MouseEvent) {
    if (selectedClubs.length < 2) {
      return;
    }

    await navigateWithTransition(event, multiHref);
  }
</script>

<svelte:head>
  <title>Välj klubb</title>
</svelte:head>

<main class="chooser-shell">
  <section class="chooser-panel">
    <header class="hero">
      <img class="main-logo" src="/main-logo.png" alt="Social media" />
      <h1>Välj klubb</h1>
      <p class="intro">Byt mellan klubbarnas flöden genom att välja en klubb nedan.</p>
      <div class="hero-actions">
        <button type="button" class="mode-toggle" onclick={toggleMultiSelect}>
          {multiSelectEnabled ? 'Avsluta flervalsläge' : 'Välj flera flöden'}
        </button>

        <a
          href={allHref}
          class="all-open"
          onclick={(event) => {
            if (multiSelectEnabled) {
              event.preventDefault();
              selectAllClubs();
              return;
            }

            navigateWithTransition(event, allHref);
          }}
        >
          Alla
        </a>

        {#if multiSelectEnabled}
          <a
            href={multiHref}
            class="multi-open"
            class:disabled={selectedClubs.length < 2}
            onclick={openMultiFeed}
            aria-disabled={selectedClubs.length < 2}
          >
            Öppna {selectedClubs.length} valda
          </a>
        {/if}
      </div>
    </header>

    {#if data.clubs.length === 0}
      <p class="empty">Inga klubbar finns tillgängliga än.</p>
    {:else}
      <div class="club-grid" aria-label="Alla klubbar">
        {#each data.clubs as club}
          <a
            href={clubHref(club.name)}
            class="club-card"
            class:from-current={data.fromClub.toLowerCase() === club.name.toLowerCase()}
            class:selected={selectedSet.has(club.name.toLowerCase())}
            aria-label={`Öppna ${club.name}`}
            onclick={(event) => {
              if (multiSelectEnabled) {
                event.preventDefault();
                toggleClubSelection(club.name);
                return;
              }

              navigateWithTransition(event, clubHref(club.name));
            }}
          >
            <div class="club-icon" aria-hidden="true" style={`view-transition-name: ${transitionName(club.name)};`}>
              {#if club.pictureUrl}
                <img src={club.pictureUrl} alt={club.name} />
              {:else}
                <span>{club.name.slice(0, 2).toUpperCase()}</span>
              {/if}
            </div>

            <div class="club-copy">
              <strong>{club.name}</strong>
              <span>{club.postCount} publicerade inlägg</span>
            </div>

            {#if multiSelectEnabled}
              <div class="pick-indicator" aria-hidden="true">
                {#if selectedSet.has(club.name.toLowerCase())}
                  ✓
                {/if}
              </div>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </section>
</main>

<style>
  .chooser-shell {
    min-height: 100vh;
    padding: 2.5rem 1rem 4rem;
    display: grid;
    place-items: start center;
    background:
      radial-gradient(circle at 8% 12%, rgba(244, 63, 94, 0.16), transparent 30%),
      radial-gradient(circle at 92% 20%, rgba(14, 165, 233, 0.2), transparent 28%),
      radial-gradient(circle at 55% 100%, rgba(245, 158, 11, 0.18), transparent 36%),
      linear-gradient(165deg, #fffaf4 0%, #fff 55%, #f7fbff 100%);
  }

  .chooser-panel {
    width: min(100%, 66rem);
    display: grid;
    gap: 1.5rem;
  }

  .hero {
    text-align: center;
    display: grid;
    gap: 0.55rem;
    animation: hero-in 460ms ease;
  }

  .main-logo {
    width: 5.4rem;
    height: 5.4rem;
    margin-inline: auto;
    object-fit: contain;
    filter: drop-shadow(0 10px 20px rgba(15, 23, 42, 0.14));
  }

  h1 {
    font-size: clamp(2.1rem, 6vw, 3.6rem);
    line-height: 1.02;
    color: #1f2937;
  }

  .intro {
    color: var(--color-text-secondary);
  }

  .hero-actions {
    margin-top: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .mode-toggle,
  .all-open,
  .multi-open {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 0.58rem 0.95rem;
    font-weight: 700;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(255, 255, 255, 0.86);
    color: #1f2937;
    text-decoration: none;
  }

  .all-open {
    border-color: rgba(2, 132, 199, 0.35);
    background: rgba(2, 132, 199, 0.12);
    color: #0c4a6e;
  }

  .multi-open {
    border-color: rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.12);
    color: #b91c1c;
  }

  .multi-open.disabled {
    opacity: 0.42;
    pointer-events: none;
  }

  .empty {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 2rem;
    border: 1px dashed var(--color-gray-300);
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .club-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 1rem;
  }

  .club-card {
    display: flex;
    gap: 0.85rem;
    align-items: center;
    padding: 0.9rem;
    border-radius: 1rem;
    border: 1px solid rgba(148, 163, 184, 0.28);
    color: #1f2937;
    text-decoration: none;
    background: rgba(255, 255, 255, 0.84);
    box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
    transition: transform 0.16s ease, box-shadow 0.16s ease;
  }

  .club-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
  }

  .club-card.from-current {
    animation: logo-drop 540ms cubic-bezier(0.2, 0.84, 0.26, 1.2);
    border-color: rgba(239, 68, 68, 0.45);
    box-shadow: 0 20px 34px rgba(239, 68, 68, 0.2);
  }

  .club-card.selected {
    border-color: rgba(239, 68, 68, 0.55);
    box-shadow: 0 18px 32px rgba(239, 68, 68, 0.2);
  }

  .club-icon {
    width: 3.3rem;
    height: 3.3rem;
    border-radius: 50%;
    overflow: hidden;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-weight: 800;
    color: white;
    background: linear-gradient(145deg, #ef4444, #fb7185);
    box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
  }

  .club-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .club-copy {
    display: grid;
    gap: 0.05rem;
  }

  .club-copy strong {
    font-size: 1.02rem;
  }

  .club-copy span {
    color: var(--color-text-secondary);
    font-size: 0.86rem;
  }

  .pick-indicator {
    margin-left: auto;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 50%;
    border: 1px solid rgba(148, 163, 184, 0.45);
    display: grid;
    place-items: center;
    color: #b91c1c;
    font-weight: 900;
    background: rgba(255, 255, 255, 0.88);
  }

  @keyframes hero-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes logo-drop {
    0% {
      transform: translateY(-4.5rem) scale(0.55);
      opacity: 0;
    }

    65% {
      transform: translateY(0.45rem) scale(1.02);
      opacity: 1;
    }

    100% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 640px) {
    .chooser-shell {
      padding-top: 2rem;
    }

    .club-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
