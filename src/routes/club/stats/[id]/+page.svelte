<script lang="ts">
  import { onMount } from 'svelte';

  type Granularity = 'day' | 'hour' | 'quarter';
  type TimeRange = '24h' | '7d' | '30d' | 'all' | 'custom';

  type DataPoint = {
    date: string;
    likes: number;
    views: number;
    intervalLikes: number;
    intervalViews: number;
  };

  type TooltipState = {
    visible: boolean;
    x: number;
    y: number;
    colorClass: 'views' | 'likes';
    title: string;
    totalLabel: string;
    intervalLabel: string;
  };

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
    post: {
      id: string;
      description: string;
      uploadedAt: string;
      firstPictureUrl: string | null;
      totalLikes: number;
      totalViews: number;
    };
    events: {
      likes: string[];
      views: string[];
    };
  };

  let { data } = $props<{ data: PageData }>();
  let granularity = $state<Granularity>('day');
  let timeRange = $state<TimeRange>('all');
  let customFrom = $state('');
  let customTo = $state('');
  let isMobile = $state(false);
  let tooltip = $state<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    colorClass: 'views',
    title: '',
    totalLabel: '',
    intervalLabel: ''
  });

  const chartWidth = 920;
  const chartHeight = 340;
  const padding = { top: 20, right: 24, bottom: 38, left: 44 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const likeEvents = $derived(data.events.likes.map((value) => new Date(value)).sort((a, b) => a.getTime() - b.getTime()));
  const viewEvents = $derived(data.events.views.map((value) => new Date(value)).sort((a, b) => a.getTime() - b.getTime()));

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

  function floorToBucket(date: Date, nextGranularity: Granularity) {
    const floored = new Date(date);
    floored.setSeconds(0, 0);

    if (nextGranularity === 'day') {
      floored.setHours(0, 0, 0, 0);
      return floored;
    }

    if (nextGranularity === 'hour') {
      floored.setMinutes(0, 0, 0);
      return floored;
    }

    const quarterMinute = Math.floor(floored.getMinutes() / 15) * 15;
    floored.setMinutes(quarterMinute, 0, 0);
    return floored;
  }

  function addBucket(date: Date, nextGranularity: Granularity) {
    const next = new Date(date);

    if (nextGranularity === 'day') {
      next.setDate(next.getDate() + 1);
      return next;
    }

    if (nextGranularity === 'hour') {
      next.setHours(next.getHours() + 1);
      return next;
    }

    next.setMinutes(next.getMinutes() + 15);
    return next;
  }

  function bucketKey(date: Date) {
    return date.toISOString();
  }

  function rangeStartFromPreset(range: TimeRange) {
    const now = new Date();

    if (range === '24h') {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    if (range === '7d') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    if (range === '30d') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return null;
  }

  function parseDateInput(value: string) {
    if (!value.trim()) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const series = $derived.by(() => {
    const firstLike = likeEvents[0] ?? null;
    const firstView = viewEvents[0] ?? null;
    const firstEvent =
      firstLike && firstView
        ? new Date(Math.min(firstLike.getTime(), firstView.getTime()))
        : firstLike ?? firstView;
    const minAvailable = firstEvent ?? new Date(data.post.uploadedAt);
    const maxAvailable = new Date();
    const customStart = parseDateInput(customFrom);
    const customEnd = parseDateInput(customTo);
    const selectedStart =
      timeRange === 'custom' ? customStart : rangeStartFromPreset(timeRange);
    const selectedEnd = timeRange === 'custom' ? customEnd : null;

    let rawStart = selectedStart ?? minAvailable;
    let rawEnd = selectedEnd ?? maxAvailable;

    if (rawStart.getTime() < minAvailable.getTime()) {
      rawStart = minAvailable;
    }

    if (rawEnd.getTime() > maxAvailable.getTime()) {
      rawEnd = maxAvailable;
    }

    let startAt = floorToBucket(rawStart, granularity);
    const endAt = floorToBucket(rawEnd, granularity);

    if (startAt.getTime() > endAt.getTime()) {
      startAt = new Date(endAt);
    }

    const likeByBucket = new Map<string, number>();
    const viewByBucket = new Map<string, number>();

    for (const event of likeEvents) {
      if (event.getTime() < startAt.getTime() || event.getTime() > endAt.getTime()) {
        continue;
      }

      const key = bucketKey(floorToBucket(event, granularity));
      likeByBucket.set(key, (likeByBucket.get(key) ?? 0) + 1);
    }

    for (const event of viewEvents) {
      if (event.getTime() < startAt.getTime() || event.getTime() > endAt.getTime()) {
        continue;
      }

      const key = bucketKey(floorToBucket(event, granularity));
      viewByBucket.set(key, (viewByBucket.get(key) ?? 0) + 1);
    }

    const nextSeries: DataPoint[] = [];
    let cumulativeLikes = 0;
    let cumulativeViews = 0;

    for (let cursor = new Date(startAt); cursor <= endAt; cursor = addBucket(cursor, granularity)) {
      const key = bucketKey(cursor);
      const intervalLikes = likeByBucket.get(key) ?? 0;
      const intervalViews = viewByBucket.get(key) ?? 0;
      cumulativeLikes += intervalLikes;
      cumulativeViews += intervalViews;

      nextSeries.push({
        date: new Date(cursor).toISOString(),
        likes: cumulativeLikes,
        views: cumulativeViews,
        intervalLikes,
        intervalViews
      });
    }

    return nextSeries;
  });

  const maxY = $derived(Math.max(1, ...series.map((point) => Math.max(point.likes, point.views))));

  function pointX(index: number) {
    if (series.length <= 1) {
      return padding.left + innerWidth / 2;
    }

    return padding.left + (index / (series.length - 1)) * innerWidth;
  }

  function pointY(value: number) {
    return padding.top + innerHeight - (value / maxY) * innerHeight;
  }

  const pointData = $derived(
    series.map((point, index) => ({
      x: pointX(index),
      yLikes: pointY(point.likes),
      yViews: pointY(point.views),
      likes: point.likes,
      views: point.views,
      date: point.date,
      intervalLikes: point.intervalLikes,
      intervalViews: point.intervalViews
    }))
  );

  const likePolyline = $derived(
    series.map((point, index) => `${pointX(index)},${pointY(point.likes)}`).join(' ')
  );
  const viewPolyline = $derived(
    series.map((point, index) => `${pointX(index)},${pointY(point.views)}`).join(' ')
  );

  function formatDate(value: string) {
    return new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'medium'
    }).format(new Date(value));
  }

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  function formatBucketLabel(value: string) {
    if (granularity === 'day') {
      return formatDate(value);
    }

    return formatDateTime(value);
  }

  const startLabel = $derived(series[0] ? formatBucketLabel(series[0].date) : '');
  const endLabel = $derived(series[series.length - 1] ? formatBucketLabel(series[series.length - 1].date) : '');
  const lastPoint = $derived(pointData[pointData.length - 1] ?? null);

  function intervalLabel() {
    if (granularity === 'day') {
      return 'Nya den dagen';
    }

    if (granularity === 'hour') {
      return 'Nya den timmen';
    }

    return 'Nya senaste 15 min';
  }

  function showTooltip(event: PointerEvent, metric: 'views' | 'likes', point: (typeof pointData)[number]) {
    const target = event.currentTarget as SVGCircleElement;
    const svg = target.ownerSVGElement;

    if (!svg) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    tooltip = {
      visible: true,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      colorClass: metric,
      title: formatBucketLabel(point.date),
      totalLabel: metric === 'views' ? `Totalt: ${point.views}` : `Totalt: ${point.likes}`,
      intervalLabel: metric === 'views' ? `${intervalLabel()}: ${point.intervalViews}` : `${intervalLabel()}: ${point.intervalLikes}`
    };
  }

  function hideTooltip() {
    tooltip.visible = false;
  }

  function descriptionPreview(text: string) {
    const maxLength = isMobile ? 70 : 180;
    const compact = text.replace(/\s+/g, ' ').trim();
    return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}...`;
  }
</script>

<svelte:head>
  <title>Inläggsstatistik</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <div class="hero">
      <a class="main-logo-link" href="/club/stats" aria-label="Till statistiklistan">
        <img src="/main-logo.png" alt="" />
      </a>
      <h1>Statistik över tid</h1>
    </div>

    <section class="chart-card" aria-label="Graf över visningar och gillningar över tid">
      <div class="legend-row">
        <div class="legend">
        <span><i class="dot views"></i>Visningar över tid</span>
        <span><i class="dot likes"></i>Gillningar över tid</span>
        </div>

        <div class="granularity" aria-label="Välj tidsspann">
          <button type="button" class:active={granularity === 'day'} onclick={() => (granularity = 'day')}>Dag</button>
          <button type="button" class:active={granularity === 'hour'} onclick={() => (granularity = 'hour')}>Timme</button>
          <button type="button" class:active={granularity === 'quarter'} onclick={() => (granularity = 'quarter')}>15 min</button>
        </div>
      </div>

      <div class="range-picker" aria-label="Välj tidsintervall">
        <button type="button" class:active={timeRange === '24h'} onclick={() => (timeRange = '24h')}>24h</button>
        <button type="button" class:active={timeRange === '7d'} onclick={() => (timeRange = '7d')}>7d</button>
        <button type="button" class:active={timeRange === '30d'} onclick={() => (timeRange = '30d')}>30d</button>
        <button type="button" class:active={timeRange === 'all'} onclick={() => (timeRange = 'all')}>Allt</button>
        <button type="button" class:active={timeRange === 'custom'} onclick={() => (timeRange = 'custom')}>Anpassat</button>
      </div>

      {#if timeRange === 'custom'}
        <div class="custom-range">
          <label>
            Från
            <input type="datetime-local" bind:value={customFrom} />
          </label>
          <label>
            Till
            <input type="datetime-local" bind:value={customTo} />
          </label>
        </div>
      {/if}

      <div class="chart-wrap">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Linjegraf över visningar och gillningar">
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={padding.left + innerWidth}
          y2={padding.top + innerHeight}
          class="axis"
        />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} class="axis" />

        {#if series.length > 1}
          <polyline points={viewPolyline} class="line views" />
          <polyline points={likePolyline} class="line likes" />
        {:else if pointData.length === 1}
          <line x1={pointData[0].x - 8} y1={pointData[0].yViews} x2={pointData[0].x + 8} y2={pointData[0].yViews} class="line views" />
          <line x1={pointData[0].x - 8} y1={pointData[0].yLikes} x2={pointData[0].x + 8} y2={pointData[0].yLikes} class="line likes" />
        {/if}

        {#each pointData as point}
          <circle
            cx={point.x}
            cy={point.yViews}
            r="6"
            class="point views"
            onpointerenter={(event) => showTooltip(event, 'views', point)}
            onpointermove={(event) => showTooltip(event, 'views', point)}
            onpointerleave={hideTooltip}
          />
          <circle
            cx={point.x}
            cy={point.yLikes}
            r="6"
            class="point likes"
            onpointerenter={(event) => showTooltip(event, 'likes', point)}
            onpointermove={(event) => showTooltip(event, 'likes', point)}
            onpointerleave={hideTooltip}
          />
        {/each}

        {#if lastPoint}
          <text x={Math.min(padding.left + innerWidth - 40, lastPoint.x + 10)} y={lastPoint.yViews - 10} class="value-label views">{lastPoint.views}</text>
          <text x={Math.min(padding.left + innerWidth - 40, lastPoint.x + 10)} y={lastPoint.yLikes + 20} class="value-label likes">{lastPoint.likes}</text>
        {/if}

        <text x={padding.left} y={chartHeight - 10} class="axis-label start">{startLabel}</text>
        <text x={padding.left + innerWidth} y={chartHeight - 10} class="axis-label end">{endLabel}</text>
        <text x="8" y={padding.top + 8} class="axis-label">{maxY}</text>
      </svg>
      {#if tooltip.visible}
        <aside class={`chart-tooltip ${tooltip.colorClass}`} style={`left: ${tooltip.x + 12}px; top: ${tooltip.y + 12}px;`}>
          <strong>{tooltip.title}</strong>
          <span>{tooltip.totalLabel}</span>
          <span>{tooltip.intervalLabel}</span>
        </aside>
      {/if}
      </div>
    </section>

    <section class="post-card">
      <a class="thumb-link" href={`/post/${data.post.id}`} aria-label="Öppna inlägget">
        <div class="thumb" aria-hidden="true">
          {#if data.post.firstPictureUrl}
            <img src={data.post.firstPictureUrl} alt="" loading="lazy" />
          {:else}
            <span>Ingen bild</span>
          {/if}
        </div>
      </a>

      <div class="post-copy">
        <p class="description">{descriptionPreview(data.post.description)}</p>
        <p class="meta">Publicerad {formatDate(data.post.uploadedAt)}</p>
      </div>

      <div class="totals" aria-label="Total statistik">
        <p class="stat-item"><span class="icon" aria-hidden="true">&#128065;</span><span>{data.post.totalViews}</span></p>
        <p class="stat-item"><span class="icon" aria-hidden="true">&#9829;</span><span>{data.post.totalLikes}</span></p>
      </div>
    </section>
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
    gap: 1rem;
  }

  .hero {
    display: grid;
    gap: 0.45rem;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(2rem, 3.8vw, 2.8rem);
    font-weight: 900;
    color: var(--color-text);
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

  .post-card,
  .chart-card {
    border: 2px solid #111;
    border-radius: 1rem;
    background: #efefef;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
  }

  .post-card {
    padding: 0.75rem;
    display: grid;
    gap: 0.85rem;
    grid-template-columns: 6.2rem minmax(0, 1fr) auto;
    align-items: center;
  }

  .thumb-link {
    text-decoration: none;
    color: inherit;
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

  .post-copy {
    min-width: 0;
    display: grid;
    gap: 0.45rem;
  }

  .description {
    margin: 0;
    font-weight: 700;
    color: #111;
    line-height: 1.35;
    max-width: 44ch;
    word-break: break-word;
  }

  .meta {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
    font-weight: 700;
  }

  .totals {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .stat-item {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 1.5rem;
    font-weight: 900;
    color: #222;
  }

  .icon {
    width: 1.5rem;
    font-size: 1.5rem;
    text-align: center;
  }

  .chart-card {
    padding: 0.9rem;
    display: grid;
    gap: 0.75rem;
  }

  .legend-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .legend {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.95rem;
    color: #444;
    font-weight: 700;
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 999px;
    display: inline-block;
  }

  .dot.views {
    background: #0f5bd4;
  }

  .dot.likes {
    background: #ef4444;
  }

  .granularity {
    display: inline-flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .granularity button {
    border: 2px solid #111;
    border-radius: 999px;
    background: #fff;
    color: #111;
    padding: 0.25rem 0.7rem;
    font-weight: 800;
    font-size: 0.85rem;
  }

  .granularity button.active {
    background: #111;
    color: #fff;
  }

  .range-picker {
    display: inline-flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .range-picker button {
    border: 2px solid #111;
    border-radius: 999px;
    background: #fff;
    color: #111;
    padding: 0.25rem 0.7rem;
    font-weight: 800;
    font-size: 0.85rem;
  }

  .range-picker button.active {
    background: #ef4444;
    color: #fff;
  }

  .custom-range {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: end;
  }

  .custom-range label {
    display: grid;
    gap: 0.25rem;
    font-weight: 700;
    color: #333;
    font-size: 0.88rem;
  }

  .custom-range input {
    border: 2px solid #111;
    border-radius: 0.55rem;
    background: #fff;
    color: #111;
    padding: 0.35rem 0.45rem;
    font-weight: 700;
  }

  .chart-wrap {
    position: relative;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
    background: #fff;
    border-radius: 0.8rem;
  }

  .axis {
    stroke: #9ca3af;
    stroke-width: 1.5;
  }

  .line {
    fill: none;
    stroke-width: 4;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .line.views {
    stroke: #0f5bd4;
  }

  .line.likes {
    stroke: #ef4444;
  }

  .point {
    stroke: #fff;
    stroke-width: 2;
    cursor: pointer;
  }

  .point.views {
    fill: #0f5bd4;
  }

  .point.likes {
    fill: #ef4444;
  }

  .value-label {
    font-size: 14px;
    font-weight: 800;
  }

  .value-label.views {
    fill: #0f5bd4;
  }

  .value-label.likes {
    fill: #ef4444;
  }

  .chart-tooltip {
    position: absolute;
    z-index: 4;
    border: 2px solid #111;
    border-radius: 0.65rem;
    background: #fff;
    padding: 0.5rem 0.65rem;
    display: grid;
    gap: 0.2rem;
    pointer-events: none;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
    min-width: 12rem;
  }

  .chart-tooltip strong {
    font-size: 0.86rem;
    color: #111;
  }

  .chart-tooltip span {
    font-size: 0.82rem;
    color: #333;
    font-weight: 700;
  }

  .chart-tooltip.views {
    border-color: #0f5bd4;
  }

  .chart-tooltip.likes {
    border-color: #ef4444;
  }

  .axis-label {
    fill: #6b7280;
    font-size: 16px;
    font-weight: 700;
  }

  .axis-label.end {
    text-anchor: end;
  }

  @media (max-width: 760px) {
    .post-card {
      grid-template-columns: 5.4rem minmax(0, 1fr) auto;
    }

    .thumb {
      width: 5.4rem;
    }

    .description {
      max-width: 14ch;
      line-height: 1.2;
    }

    .totals {
      flex-direction: column;
      align-items: flex-end;
      gap: 0.45rem;
    }

    .stat-item {
      font-size: 1.25rem;
    }

    .icon {
      width: 1.3rem;
      font-size: 1.3rem;
    }

    .chart-tooltip {
      min-width: 10rem;
      max-width: 70vw;
    }
  }
</style>