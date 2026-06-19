<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { onDestroy } from 'svelte';

  type AspectPreset = {
    key: 'square' | 'portrait' | 'tall';
    label: string;
  };

  type DraftPicture = {
    id: string;
    pictureUrl: string;
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
    csrfToken: string;
    defaultUploadedAt: string;
    aspectPresets: AspectPreset[];
    draft: {
      id: string;
      preview: boolean;
      description: string;
      uploadedAt: string;
      formLink: string | null;
      formLinkTitle: string | null;
      otherLink: string | null;
      otherLinkTitle: string | null;
      sendNotification: boolean;
      aspectKey: AspectPreset['key'];
      pictures: DraftPicture[];
    } | null;
  };

  type FormState = {
    error?: string;
    errorStep?: 'images' | 'details';
  } | null;

  type LocalImage = {
    id: string;
    file: File;
    uploadFile: File;
    previewUrl: string;
    cleanupUrls: string[];
    name: string;
    zoom: number;
    offsetX: number;
    offsetY: number;
  };

  type StoredImage = {
    id: string;
    pictureUrl: string;
  };

  type DragState = {
    id: string;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    width: number;
    height: number;
  };

  type PinchState = {
    id: string;
    startDistance: number;
    startZoom: number;
    startOffsetX: number;
    startOffsetY: number;
    startCenterX: number;
    startCenterY: number;
  };

  let { data, form } = $props<{ data: PageData; form: FormState }>();

  let step = $state<'images' | 'details'>('images');
  let imageError = $state('');
  let detailError = $state('');
  let dragActive = $state(false);
  let fileInput: HTMLInputElement | null = null;
  let localImages = $state<LocalImage[]>([]);
  let storedPictures = $state<StoredImage[]>([]);
  let removedPictureIds = $state<string[]>([]);
  let localIdCounter = 0;
  let didInitialize = false;
  let globalAspectKey = $state<AspectPreset['key']>('portrait');
  let dragState = $state<DragState | null>(null);
  let pinchState = $state<PinchState | null>(null);

  let description = $state('');
  let uploadedAt = $state('');
  let includeFormLink = $state(false);
  let formLink = $state('');
  let formLinkTitle = $state('');
  let includeOtherLink = $state(false);
  let otherLink = $state('');
  let otherLinkTitle = $state('');
  let sendNotification = $state(true);
  let isUploading = $state(false);

  const keptStoredPictures = $derived(storedPictures.filter((picture) => !removedPictureIds.includes(picture.id)));
  const totalSelectedImages = $derived(keptStoredPictures.length + localImages.length);
  const canAdvanceFromImages = $derived(totalSelectedImages > 0);
  const editingPublished = $derived(Boolean(data.draft && !data.draft.preview));
  const showNotificationToggle = $derived(Boolean(!editingPublished && (!data.draft || data.draft.preview)));
  const pageTitle = $derived(data.draft ? (editingPublished ? 'Ändra inlägget' : 'Ändra utkastet') : 'Skapa ett inlägg');
  const saveButtonLabel = $derived(data.draft ? 'Spara ändringar' : 'Spara och öppna utkast');
  const cropConfig = $derived(
    JSON.stringify({
      aspectKey: globalAspectKey,
      items: localImages.map((image) => ({
        zoom: image.zoom,
        offsetX: image.offsetX,
        offsetY: image.offsetY
      }))
    })
  );
  const descriptionCharactersLeft = $derived(2500 - description.length);

  $effect(() => {
    if (didInitialize) {
      return;
    }

    description = data.draft?.description ?? '';
    uploadedAt = data.draft?.uploadedAt ?? data.defaultUploadedAt;
    includeFormLink = Boolean(data.draft?.formLink || data.draft?.formLinkTitle);
    formLink = data.draft?.formLink ?? '';
    formLinkTitle = data.draft?.formLinkTitle ?? '';
    includeOtherLink = Boolean(data.draft?.otherLink || data.draft?.otherLinkTitle);
    otherLink = data.draft?.otherLink ?? '';
    otherLinkTitle = data.draft?.otherLinkTitle ?? '';
    sendNotification = data.draft?.sendNotification ?? true;
    globalAspectKey = data.draft?.aspectKey ?? 'portrait';
    storedPictures = data.draft?.pictures ?? [];
    didInitialize = true;
  });

  function cleanupObjectUrls(images: LocalImage[]) {
    for (const image of images) {
      for (const cleanupUrl of image.cleanupUrls) {
        URL.revokeObjectURL(cleanupUrl);
      }
    }
  }

  function openFilePicker() {
    fileInput?.click();
  }

  onDestroy(() => {
    cleanupObjectUrls(localImages);
  });

  function frameRatioStyle(aspectKey: AspectPreset['key']) {
    if (aspectKey === 'portrait') {
      return '4 / 5';
    }

    if (aspectKey === 'tall') {
      return '9 / 16';
    }

    return '1 / 1';
  }

  function getMaxOffset(zoom: number) {
    return Math.max(0, (zoom - 1) * 50);
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function isHeicFile(file: File) {
    const lowerName = file.name.toLowerCase();
    return file.type.includes('heic') || file.type.includes('heif') || lowerName.endsWith('.heic') || lowerName.endsWith('.heif');
  }

  async function createPreviewImage(file: File) {
    const sourceUrl = URL.createObjectURL(file);

    if (!isHeicFile(file) || typeof createImageBitmap !== 'function') {
      return { previewUrl: sourceUrl, uploadFile: file, cleanupUrls: [sourceUrl] };
    }

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const context = canvas.getContext('2d');

      if (!context) {
        bitmap.close();
        return { previewUrl: sourceUrl, uploadFile: file, cleanupUrls: [sourceUrl] };
      }

      context.drawImage(bitmap, 0, 0);
      bitmap.close();

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/jpeg', 0.92);
      });

      if (!blob) {
        return { previewUrl: sourceUrl, uploadFile: file, cleanupUrls: [sourceUrl] };
      }

      const uploadFile = new File([blob], `${file.name.replace(/\.(heic|heif)$/i, '') || file.name}.jpg`, {
        type: 'image/jpeg'
      });
      const previewUrl = URL.createObjectURL(blob);
      URL.revokeObjectURL(sourceUrl);

      return { previewUrl, uploadFile, cleanupUrls: [previewUrl] };
    } catch {
      return { previewUrl: sourceUrl, uploadFile: file, cleanupUrls: [sourceUrl] };
    }
  }

  function totalCountAfterAdding(additionalCount: number) {
    return keptStoredPictures.length + localImages.length + additionalCount;
  }

  function validateFile(file: File) {
    if (file.size > 20 * 1024 * 1024) {
      return `Bilden "${file.name}" är för stor. Maxstorleken är 20 MB.`;
    }

    const allowed = ['image/heic', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    const extensionAllowed = ['.heic', '.jpg', '.jpeg', '.png', '.webp', '.avif'].some((extension) =>
      file.name.toLowerCase().endsWith(extension)
    );

    if (!allowed.includes(file.type) && !extensionAllowed) {
      return `Bilden "${file.name}" har en filtyp som inte stöds. Tillåtna typer är HEIC, JPG, PNG, WEBP och AVIF.`;
    }

    return null;
  }

  async function appendFiles(files: File[]) {
    detailError = '';

    if (totalCountAfterAdding(files.length) > 20) {
      imageError = 'Du kan ha högst 20 bilder totalt.';
      return;
    }

    for (const file of files) {
      const validationError = validateFile(file);

      if (validationError) {
        imageError = validationError;
        return;
      }
    }

    const nextImages = await Promise.all(
      files.map(async (file) => {
        const preview = await createPreviewImage(file);

        return {
          id: `local-${localIdCounter++}`,
          file,
          uploadFile: preview.uploadFile,
          previewUrl: preview.previewUrl,
          cleanupUrls: preview.cleanupUrls,
          name: file.name,
          zoom: 1,
          offsetX: 0,
          offsetY: 0
        };
      })
    );

    localImages = [...localImages, ...nextImages];
  }

  function updateImage(id: string, updater: (image: LocalImage) => LocalImage) {
    localImages = localImages.map((image) => (image.id === id ? updater(image) : image));
  }

  function setZoom(id: string, zoomValue: number) {
    updateImage(id, (image) => {
      const zoom = clamp(zoomValue, 1, 4);
      const maxOffset = getMaxOffset(zoom);

      return {
        ...image,
        zoom,
        offsetX: clamp(image.offsetX, -maxOffset, maxOffset),
        offsetY: clamp(image.offsetY, -maxOffset, maxOffset)
      };
    });
  }

  function setOffset(id: string, offsetX: number, offsetY: number) {
    updateImage(id, (image) => {
      const maxOffset = getMaxOffset(image.zoom);

      return {
        ...image,
        offsetX: clamp(offsetX, -maxOffset, maxOffset),
        offsetY: clamp(offsetY, -maxOffset, maxOffset)
      };
    });
  }

  async function handleFilesChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    imageError = '';
    await appendFiles(files);
    input.value = '';
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;

    const files = Array.from(event.dataTransfer?.files ?? []);

    if (files.length === 0) {
      return;
    }

    await appendFiles(files);
  }

  function removeLocalImage(imageId: string) {
    const image = localImages.find((entry) => entry.id === imageId);

    if (!image) {
      return;
    }

    for (const cleanupUrl of image.cleanupUrls) {
      URL.revokeObjectURL(cleanupUrl);
    }
    localImages = localImages.filter((entry) => entry.id !== imageId);
  }

  function removeStoredPicture(imageId: string) {
    removedPictureIds = [...removedPictureIds, imageId];
  }

  function goToDetails() {
    imageError = '';
    step = 'details';

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const handleEnhance: SubmitFunction = ({ formData, cancel }) => {
    imageError = '';
    detailError = '';

    if (!description.trim()) {
      step = 'details';
      detailError = 'Beskrivning måste fyllas i innan du kan spara.';
      cancel();
      return;
    }

    if (localImages.length === 0 && keptStoredPictures.length === 0) {
      step = 'images';
      imageError = 'Du måste välja minst en bild innan du kan spara.';
      cancel();
      return;
    }

    formData.delete('pictures');

    for (const image of localImages) {
      formData.append('pictures', image.uploadFile, image.uploadFile.name);
    }

    isUploading = true;

    return async ({ update }) => {
      isUploading = false;
      await update({ reset: false });
    };
  };

  $effect(() => {
    if (!form?.error) {
      return;
    }

    if (form.errorStep === 'details') {
      step = 'details';
      detailError = form.error;
      imageError = '';
    } else {
      step = 'images';
      imageError = form.error;
      detailError = '';
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  function startDrag(event: PointerEvent, imageId: string) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
      return;
    }

    if (pinchState) {
      return;
    }

    const currentImage = localImages.find((image) => image.id === imageId);

    if (!currentImage) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    target.setPointerCapture(event.pointerId);

    dragState = {
      id: imageId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: currentImage.offsetX,
      startOffsetY: currentImage.offsetY,
      width: rect.width,
      height: rect.height
    };
  }

  function moveDrag(event: PointerEvent, imageId: string) {
    if (!dragState || dragState.id !== imageId || pinchState) {
      return;
    }

    event.preventDefault();
    const deltaX = ((event.clientX - dragState.startX) / dragState.width) * 100;
    const deltaY = ((event.clientY - dragState.startY) / dragState.height) * 100;
    setOffset(imageId, dragState.startOffsetX + deltaX, dragState.startOffsetY + deltaY);
  }

  function endDrag(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;

    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    dragState = null;
  }

  function touchDistance(touchOne: Touch, touchTwo: Touch) {
    return Math.hypot(touchOne.clientX - touchTwo.clientX, touchOne.clientY - touchTwo.clientY);
  }

  function startPinch(event: TouchEvent, imageId: string) {
    if (event.touches.length !== 2) {
      return;
    }

    const currentImage = localImages.find((image) => image.id === imageId);

    if (!currentImage) {
      return;
    }

    dragState = null;
    const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

    pinchState = {
      id: imageId,
      startDistance: touchDistance(event.touches[0], event.touches[1]),
      startZoom: currentImage.zoom,
      startOffsetX: currentImage.offsetX,
      startOffsetY: currentImage.offsetY,
      startCenterX: centerX,
      startCenterY: centerY
    };
  }

  function movePinch(event: TouchEvent, imageId: string) {
    if (!pinchState || pinchState.id !== imageId || event.touches.length !== 2) {
      return;
    }

    event.preventDefault();
    const nextDistance = touchDistance(event.touches[0], event.touches[1]);
    const zoomFactor = nextDistance / pinchState.startDistance;
    const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
    const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
    const image = localImages.find((entry) => entry.id === imageId);

    if (!image) {
      return;
    }

    const nextZoom = clamp(pinchState.startZoom * zoomFactor, 1, 4);
    const maxOffset = getMaxOffset(nextZoom);

    const nextOffsetX = clamp(pinchState.startOffsetX + ((centerX - pinchState.startCenterX) / 2), -maxOffset, maxOffset);
    const nextOffsetY = clamp(pinchState.startOffsetY + ((centerY - pinchState.startCenterY) / 2), -maxOffset, maxOffset);

    updateImage(imageId, () => ({
      ...image,
      zoom: nextZoom,
      offsetX: nextOffsetX,
      offsetY: nextOffsetY
    }));
  }

  function endPinch(event: TouchEvent, imageId: string) {
    if (pinchState && pinchState.id === imageId && event.touches.length < 2) {
      pinchState = null;
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<main class="page-shell">
  <section class="panel">
    <div class="hero">
      <a class="main-logo-link" href="/club" aria-label="Till klubbmenyn">
        <img src="/main-logo.png" alt="" />
      </a>

      <div class="hero-copy">
        <h1>{pageTitle} för {data.user.club.name}</h1>
      </div>

      <div class="step-tabs" aria-label="Steg i uppladdningen">
        <button type="button" class:active={step === 'images'} onclick={() => (step = 'images')}>Bilder</button>
        <button type="button" class:active={step === 'details'} onclick={goToDetails}>Innehåll</button>
      </div>
    </div>

    <form method="POST" action="?/saveDraft" enctype="multipart/form-data" class="composer-form" use:enhance={handleEnhance}>
      <input type="hidden" name="_csrf" value={data.csrfToken} />
      <input type="hidden" name="postId" value={data.draft?.id ?? ''} />
      <input type="hidden" name="cropConfig" value={cropConfig} />
      <input type="hidden" name="aspectKey" value={globalAspectKey} />
      <input type="hidden" name="keptPictureIds" value={JSON.stringify(keptStoredPictures.map((picture) => picture.id))} />

      {#if isUploading}
        <div class="uploading-bar" role="status" aria-live="polite">
          <span>Laddar upp bilder...</span>
          <div class="uploading-track"><div class="uploading-fill"></div></div>
        </div>
      {/if}

      <div
        role="group"
        aria-label="Bilduppladdning"
        class:hidden={step !== 'images'}
        class="card"
        ondragenter={() => (dragActive = true)}
        ondragover={(event) => {
          event.preventDefault();
          dragActive = true;
        }}
        ondragleave={(event) => {
          const current = event.currentTarget as HTMLElement;
          const related = event.relatedTarget as Node | null;

          if (!related || !current.contains(related)) {
            dragActive = false;
          }
        }}
        ondrop={handleDrop}
      >
        <div class="card-head">
          <div>
            <h2>Välj bilder</h2>
          </div>

          <div class="settings">
            <label>
              Aspect ratio för alla bilder
              <select bind:value={globalAspectKey}>
                {#each data.aspectPresets as preset}
                  <option value={preset.key}>{preset.label}</option>
                {/each}
              </select>
            </label>

            <div class="upload-actions">
              <button type="button" class="secondary" onclick={openFilePicker}>Lägg till nya bilder</button>
              <p>{keptStoredPictures.length + localImages.length} av 20 bilder valda</p>
            </div>

            <details class="image-help">
              <summary>Bildinformation</summary>
              <p>Välj 1 till 20 bilder. Bildtyper: HEIC, JPG, PNG, WEBP och AVIF. Max 20 MB per bild före uppladdning. Alla bilder beskärs med samma ratio. Dra direkt i bilden för att flytta utsnittet och nyp för att zooma på mobil.</p>
            </details>

            <input
              bind:this={fileInput}
              class="sr-only"
              name="pictures"
              type="file"
              accept=".heic,.jpg,.jpeg,.png,.webp,.avif,image/heic,image/jpeg,image/png,image/webp,image/avif"
              multiple
              onchange={handleFilesChange}
            />
          </div>
        </div>

        <div class:dragActive={dragActive} class="dropzone" aria-hidden={!dragActive}></div>

        {#if imageError}
          <p class="error">{imageError}</p>
        {/if}

        {#if keptStoredPictures.length > 0}
          <div class="stored-images">
            <div class="stored-head">
              <h3>Uppladdade bilder</h3>
            </div>

            <div class="stored-grid">
              {#each keptStoredPictures as picture, index}
                <figure class="stored-card" style={`aspect-ratio: ${frameRatioStyle(globalAspectKey)};`}>
                  <img src={picture.pictureUrl} alt={`Uppladdad bild ${index + 1}`} />
                  <button type="button" class="remove-button" onclick={() => removeStoredPicture(picture.id)}>Ta bort</button>
                </figure>
              {/each}
            </div>
          </div>
        {/if}

        {#if localImages.length > 0}
          <div class="image-grid">
            <div class="stored-head">
              <h3>Nya bilder</h3>
            </div>

            {#each localImages as image, index}
              <article class="image-card">
                <div class="image-header">
                  <h3>Bild {index + 1}</h3>
                  <button type="button" class="remove-button" onclick={() => removeLocalImage(image.id)}>Ta bort</button>
                </div>

                <div
                  class="preview-frame"
                  role="group"
                  aria-label={`Beskärningsyta för bild ${index + 1}`}
                  style={`aspect-ratio: ${frameRatioStyle(globalAspectKey)};`}
                  onpointerdown={(event) => startDrag(event, image.id)}
                  onpointermove={(event) => moveDrag(event, image.id)}
                  onpointerup={endDrag}
                  onpointercancel={endDrag}
                  ontouchstart={(event) => startPinch(event, image.id)}
                  ontouchmove={(event) => movePinch(event, image.id)}
                  ontouchend={(event) => endPinch(event, image.id)}
                >
                  <img
                    src={image.previewUrl}
                    alt={image.name}
                    draggable="false"
                    style={`transform: translate(${image.offsetX}%, ${image.offsetY}%) scale(${image.zoom});`}
                  />
                </div>

                <div class="crop-controls">
                  <label>
                    Zoom
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.01"
                      value={image.zoom}
                      oninput={(event) => setZoom(image.id, Number((event.currentTarget as HTMLInputElement).value))}
                    />
                  </label>

                  {#if getMaxOffset(image.zoom) > 0.1}
                    <label>
                      X
                      <input
                        type="range"
                        min={-getMaxOffset(image.zoom)}
                        max={getMaxOffset(image.zoom)}
                        step="0.1"
                        value={image.offsetX}
                        oninput={(event) => setOffset(image.id, Number((event.currentTarget as HTMLInputElement).value), image.offsetY)}
                      />
                    </label>

                    <label>
                      Y
                      <input
                        type="range"
                        min={-getMaxOffset(image.zoom)}
                        max={getMaxOffset(image.zoom)}
                        step="0.1"
                        value={image.offsetY}
                        oninput={(event) => setOffset(image.id, image.offsetX, Number((event.currentTarget as HTMLInputElement).value))}
                      />
                    </label>
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        {:else if !keptStoredPictures.length}
          <div class="stored-images">
            <div class="stored-head">
              <h3>Inga bilder ännu</h3>
              <p>Välj eller släpp bilder för att börja.</p>
            </div>
          </div>
        {/if}
      </div>

      <section class:hidden={step !== 'details'} class="card">
        <div class="card-head content-head">
          <div>
            <h2>Innehåll</h2>
            <p>Spara innehållet och gå till utkast-vyn för att publicera.</p>
          </div>
        </div>

        <label>
          Beskrivning
          <textarea bind:value={description} name="description" rows="7" maxlength="2500" placeholder="Skriv beskrivningen till inlägget här..."></textarea>
          <span class="hint">{descriptionCharactersLeft} tecken kvar</span>
        </label>

        {#if detailError}
          <p class="error">{detailError}</p>
        {/if}

        <label class="date-field">
          Publiceras
          <input bind:value={uploadedAt} name="uploadedAt" type="datetime-local" />
        </label>

        <div class="option-stack">
          <div class="option-item">
            <label class="toggle-card">
              <span>
                <strong>Formlänk</strong>
                <small>Lägg till en länk till ett formulär.</small>
              </span>
              <input bind:checked={includeFormLink} name="includeFormLink" type="checkbox" />
            </label>

            {#if includeFormLink}
              <div class="link-grid">
                <label>
                  Formlänk
                  <input bind:value={formLink} name="formLink" type="url" placeholder="https://example.com/form" />
                </label>

                <label>
                  Titel till formlänken
                  <input bind:value={formLinkTitle} name="formLinkTitle" type="text" placeholder="Anmäl dig här" />
                </label>
              </div>
            {/if}
          </div>

          <div class="option-item">
            <label class="toggle-card">
              <span>
                <strong>Annan länk</strong>
                <small>Lägg till en valfri extern länk.</small>
              </span>
              <input bind:checked={includeOtherLink} name="includeOtherLink" type="checkbox" />
            </label>

            {#if includeOtherLink}
              <div class="link-grid">
                <label>
                  Annan länk
                  <input bind:value={otherLink} name="otherLink" type="url" placeholder="https://example.com" />
                </label>

                <label>
                  Titel till den andra länken
                  <input bind:value={otherLinkTitle} name="otherLinkTitle" type="text" placeholder="Läs mer" />
                </label>
              </div>
            {/if}
          </div>

          {#if showNotificationToggle}
            <div class="option-item">
              <label class="toggle-card">
                <span>
                  <strong>Skicka notifikation</strong>
                </span>
                <input bind:checked={sendNotification} name="sendNotification" type="checkbox" />
              </label>
            </div>
          {:else}
            <p class="hint">Notifikationer kan inte aktiveras när du ändrar ett publicerat inlägg.</p>
          {/if}
        </div>
      </section>

      <div class="footer-actions">
        <div class="action-buttons">
          {#if step === 'details'}
            <button type="button" class="secondary" onclick={() => (step = 'images')}>Ändra bilder</button>
          {/if}

          {#if step === 'images'}
            <button type="button" class="primary" onclick={goToDetails}>Gå vidare</button>
          {:else}
            <button type="submit" class="primary">{saveButtonLabel}</button>
          {/if}
        </div>
      </div>
    </form>
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
    gap: 1.5rem;
  }

  .hero {
    display: grid;
    gap: 1rem;
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

  .hero-copy {
    display: grid;
    gap: 0.55rem;
  }

  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    color: var(--color-text);
    font-weight: 900;
  }

  .step-tabs {
    display: inline-flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .step-tabs button,
  .primary,
  .secondary {
    border: 3px solid #111;
    border-radius: 0.9rem;
    padding: 0.85rem 1rem;
    font-weight: 800;
    background: #bdbdbd;
    color: #111;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 2.9rem;
  }

  .step-tabs button.active,
  .primary {
    background: #ef4444;
    color: white;
  }

  .composer-form {
    display: grid;
    gap: 1.25rem;
  }

  .uploading-bar {
    border: 2px solid #111;
    border-radius: 0.9rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.62);
    display: grid;
    gap: 0.45rem;
    font-weight: 700;
  }

  .uploading-track {
    height: 0.55rem;
    background: #d3d3d3;
    border-radius: 999px;
    overflow: hidden;
  }

  .uploading-fill {
    width: 45%;
    height: 100%;
    background: #ef4444;
    border-radius: 999px;
    animation: uploadPulse 1.05s ease-in-out infinite;
  }

  @keyframes uploadPulse {
    0% {
      transform: translateX(-85%);
    }

    100% {
      transform: translateX(260%);
    }
  }

  .card {
    position: relative;
    border: 2px solid #222;
    border-radius: 1rem;
    background: #e9e9e9;
    padding: 1.25rem;
    display: grid;
    gap: 1.2rem;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
    min-width: 0;
  }

  .card * {
    min-width: 0;
  }

  .hidden {
    display: none;
  }

  .card-head {
    display: grid;
    gap: 1rem;
    justify-items: start;
  }

  .card-head h2,
  .stored-head h3 {
    font-size: 1.4rem;
    color: #111;
    font-weight: 900;
  }

  .card-head p,
  .stored-head p,
  .hint {
    color: #555;
  }

  .image-help {
    border: 1px solid rgba(17, 17, 17, 0.16);
    border-radius: 0.75rem;
    padding: 0.75rem 0.9rem;
    background: rgba(255, 255, 255, 0.52);
  }

  .image-help summary {
    cursor: pointer;
    font-weight: 800;
    color: #111;
  }

  .image-help p {
    margin-top: 0.5rem;
    color: #555;
  }

  .settings {
    display: grid;
    gap: 0.75rem;
    width: 100%;
    max-width: 26rem;
  }

  .upload-actions {
    display: grid;
    gap: 0.35rem;
    justify-items: start;
  }

  .upload-actions p {
    color: #666;
    font-size: 0.9rem;
  }

  .dropzone {
    display: none;
    position: absolute;
    inset: 0;
    border: 2px dashed #777;
    border-radius: 1rem;
    background: rgba(239, 68, 68, 0.16);
    transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
    pointer-events: none;
    z-index: 3;
  }

  .dragActive {
    display: block;
    border-color: #111;
    background: rgba(239, 68, 68, 0.1);
    transform: scale(1.01);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .image-grid {
    display: grid;
    gap: 1rem;
  }

  .image-card {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.56);
  }

  .image-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .image-header h3 {
    font-size: 1.05rem;
    font-weight: 800;
    color: #111;
  }

  .remove-button {
    border: 2px solid #111;
    border-radius: 999px;
    background: #fff;
    color: #111;
    font-weight: 800;
    padding: 0.45rem 0.8rem;
    justify-self: start;
  }

  .preview-frame {
    width: min(100%, 28rem);
    overflow: hidden;
    border-radius: 1rem;
    background: #d1d1d1;
    border: 2px solid #111;
    touch-action: none;
    cursor: grab;
  }

  .preview-frame:active {
    cursor: grabbing;
  }

  .preview-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform-origin: center center;
    user-select: none;
    pointer-events: none;
  }

  .crop-controls {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stored-images {
    display: grid;
    gap: 1rem;
  }

  .stored-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 10rem));
    justify-content: start;
  }

  .stored-card {
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
    border: 2px solid #111;
    background: #d0d0d0;
    max-width: 10rem;
  }

  .stored-card .remove-button {
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
    z-index: 1;
  }

  .stored-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  label {
    display: grid;
    gap: 0.45rem;
    font-weight: 700;
    color: #111;
  }

  textarea,
  input,
  select {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  input[type='datetime-local'] {
    font-size: 16px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    display: block;
    inline-size: 100%;
    max-inline-size: 100%;
    min-inline-size: 0;
    overflow: hidden;
    -webkit-appearance: none;
    appearance: none;
  }

  input[type='datetime-local']::-webkit-datetime-edit {
    padding: 0;
  }

  .option-stack {
    display: grid;
    gap: 0.95rem;
  }

  .option-item {
    display: grid;
    gap: 0.75rem;
  }

  .toggle-card {
    border-radius: 0.9rem;
    border: 2px solid #111;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.56);
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
  }

  .toggle-card span {
    display: grid;
    gap: 0.25rem;
  }

  .toggle-card small {
    color: #666;
    font-weight: 500;
  }

  .toggle-card input {
    width: 1.15rem;
    height: 1.15rem;
    margin-top: 0.15rem;
  }

  .link-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .footer-actions {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .action-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .error {
    color: var(--color-error);
    font-weight: 700;
  }

  @media (max-width: 860px) {
    .crop-controls,
    .link-grid {
      grid-template-columns: 1fr;
    }

    .crop-controls {
      gap: 1rem;
    }

    .preview-frame {
      width: 100%;
    }

    .toggle-card {
      align-items: center;
    }

    .card-head {
      justify-items: start;
    }

    .settings {
      width: 100%;
      max-width: 100%;
    }

    .date-field {
      width: 100%;
      overflow: hidden;
    }

    .date-field input[type='datetime-local'] {
      width: 100%;
      font-size: 16px;
    }

    .main-logo-link {
      width: 2.75rem;
      height: 2.75rem;
    }
  }
</style>