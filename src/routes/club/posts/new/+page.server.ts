import { fail, redirect } from '@sveltejs/kit';
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/db';
import { requireClubUser } from '$lib/server/club';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGES = 20;
const PRIVATE_POST_UPLOADS_DIRECTORY = path.join(process.cwd(), 'uploads', 'posts');

const ASPECT_PRESETS = {
  square: { width: 1, height: 1, label: '1:1' },
  portrait: { width: 4, height: 5, label: '4:5' },
  tall: { width: 9, height: 16, label: '9:16' }
} as const;

type AspectKey = keyof typeof ASPECT_PRESETS;

type CropConfig = {
  aspectKey: AspectKey;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

type ErrorStep = 'images' | 'details';

function failWithStep(status: number, error: string, errorStep: ErrorStep) {
  return fail(status, { error, errorStep });
}

function normalizeAspectKey(value: unknown): AspectKey {
  return value === 'portrait' || value === 'square' || value === 'tall' ? value : 'portrait';
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeText(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function isAllowedImage(file: File) {
  const fileName = file.name.toLowerCase();
  const extensionAllowed = ['.heic', '.jpg', '.jpeg', '.png', '.webp', '.avif'].some((extension) =>
    fileName.endsWith(extension)
  );

  const mimeAllowed = new Set([
    'image/heic',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif'
  ]);

  return mimeAllowed.has(file.type) || extensionAllowed;
}

function parseCropConfig(value: FormDataEntryValue | null, expectedLength: number) {
  const raw = String(value ?? '[]');

  try {
    const parsed = JSON.parse(raw);

    let config: CropConfig[] = [];

    if (Array.isArray(parsed)) {
      config = parsed.map((entry) => ({
        aspectKey: normalizeAspectKey(entry?.aspectKey),
        zoom: Number.isFinite(Number(entry?.zoom)) ? Number(entry?.zoom) : 1,
        offsetX: Number.isFinite(Number(entry?.offsetX)) ? Number(entry?.offsetX) : 0,
        offsetY: Number.isFinite(Number(entry?.offsetY)) ? Number(entry?.offsetY) : 0
      }));
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
      const parsedObject = parsed as {
        aspectKey?: unknown;
        items: Array<Record<string, unknown>>;
      };
      const aspectKey = normalizeAspectKey(parsedObject.aspectKey);
      config = parsedObject.items.map((entry) => ({
        aspectKey,
        zoom: Number.isFinite(Number(entry?.zoom)) ? Number(entry?.zoom) : 1,
        offsetX: Number.isFinite(Number(entry?.offsetX)) ? Number(entry?.offsetX) : 0,
        offsetY: Number.isFinite(Number(entry?.offsetY)) ? Number(entry?.offsetY) : 0
      }));
    } else {
      return null;
    }

    if (config.length !== expectedLength) {
      return null;
    }

    return config;
  } catch {
    return null;
  }
}

function parseUploadedAt(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return new Date();
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function filePathFromPictureUrl(pictureUrl: string) {
  const cleanUrl = pictureUrl.split('?')[0];
  const pathPrefix = cleanUrl.startsWith('/media/posts/') ? '/media/posts/' : '/uploads/posts/';

  if (!cleanUrl.startsWith('/media/posts/') && !cleanUrl.startsWith('/uploads/posts/')) {
    return null;
  }

  const relativePath = cleanUrl.slice(pathPrefix.length);

  return path.join(PRIVATE_POST_UPLOADS_DIRECTORY, relativePath);
}

async function savePostPictures(postId: string, files: File[], cropConfig: CropConfig[]) {
  const outputDirectory = path.join(PRIVATE_POST_UPLOADS_DIRECTORY, postId);
  await mkdir(outputDirectory, { recursive: true });

  for (const [index, file] of files.entries()) {
    const crop = cropConfig[index];
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const orientedBuffer = await sharp(buffer).rotate().toBuffer();
      const image = sharp(orientedBuffer);
      const metadata = await image.metadata();
      const sourceWidth = metadata.width ?? 0;
      const sourceHeight = metadata.height ?? 0;

      if (!sourceWidth || !sourceHeight) {
        throw new Error(`Bilden "${file.name}" kunde inte läsas.`);
      }

      const preset = ASPECT_PRESETS[crop.aspectKey];
      const targetRatio = preset.width / preset.height;
      const sourceRatio = sourceWidth / sourceHeight;

      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;

      if (sourceRatio > targetRatio) {
        cropWidth = sourceHeight * targetRatio;
      } else {
        cropHeight = sourceWidth / targetRatio;
      }

      const zoom = Math.min(Math.max(crop.zoom, 1), 4);
      cropWidth /= zoom;
      cropHeight /= zoom;

      const extractWidth = Math.max(1, Math.min(sourceWidth, Math.floor(cropWidth)));
      const extractHeight = Math.max(1, Math.min(sourceHeight, Math.floor(cropHeight)));
      const availableX = Math.max(0, sourceWidth - extractWidth);
      const availableY = Math.max(0, sourceHeight - extractHeight);
      const normalizedX = Math.min(Math.max(crop.offsetX, -100), 100) / 100;
      const normalizedY = Math.min(Math.max(crop.offsetY, -100), 100) / 100;

      const centeredLeft = availableX / 2;
      const centeredTop = availableY / 2;
      const extractLeft = Math.round(Math.min(availableX, Math.max(0, centeredLeft + normalizedX * centeredLeft)));
      const extractTop = Math.round(Math.min(availableY, Math.max(0, centeredTop + normalizedY * centeredTop)));

      const targetWidth = 1080;
      const targetHeight = Math.round(targetWidth / targetRatio);
      const pictureId = crypto.randomUUID();
      const fileName = `${String(index + 1).padStart(2, '0')}-${pictureId}.jpg`;
      const outputPath = path.join(outputDirectory, fileName);

      let outputBuffer: Buffer;

      try {
        outputBuffer = await sharp(orientedBuffer)
          .extract({
            left: extractLeft,
            top: extractTop,
            width: extractWidth,
            height: extractHeight
          })
          .resize(targetWidth, targetHeight, {
            fit: 'cover',
            position: 'centre'
          })
          .jpeg({ quality: 84, mozjpeg: true })
          .toBuffer();
      } catch {
        // Fallback for images whose metadata/tiling makes explicit extract unstable.
        outputBuffer = await sharp(orientedBuffer)
          .resize(targetWidth, targetHeight, {
            fit: 'cover',
            position: 'centre'
          })
          .jpeg({ quality: 84, mozjpeg: true })
          .toBuffer();
      }

      await writeFile(outputPath, outputBuffer);

      await prisma.picture.create({
        data: {
          id: pictureId,
          postId,
          pictureUrl: `/media/posts/${postId}/${fileName}`
        }
      });
    } catch {
      throw new Error(`Bilden "${file.name}" kunde inte läsas eller beskäras. Om den är en HEIC-fil kan du prova att öppna den i Bilder och exportera den som JPG innan du laddar upp igen.`);
    }
  }
}

async function deletePostPictures(pictureUrls: string[]) {
  await Promise.all(
    pictureUrls.map(async (pictureUrl) => {
      const filePath = filePathFromPictureUrl(pictureUrl);

      if (!filePath) {
        return;
      }

      try {
        await unlink(filePath);
      } catch {
        // Ignore missing files; the DB record will still be removed.
      }
    })
  );
}

export const load: PageServerLoad = async ({ locals, url }) => {
  const user = await requireClubUser(locals);
  const postId = url.searchParams.get('postId');
  let draft = null;

  if (postId && user.club) {
    const existingDraft = await prisma.post.findFirst({
      where: {
        id: postId,
        clubId: user.club.id
      },
      include: {
        picture: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (existingDraft) {
      draft = {
        id: existingDraft.id,
        preview: existingDraft.preview,
        description: existingDraft.description,
        uploadedAt: toDateTimeLocalValue(existingDraft.uploadedAt),
        formLink: existingDraft.formLink,
        formLinkTitle: existingDraft.formLinkTitle,
        otherLink: existingDraft.otherLink,
        otherLinkTitle: existingDraft.otherLinkTitle,
        sendNotification: existingDraft.sendNotification,
        aspectKey: normalizeAspectKey(existingDraft.aspectKey),
        pictures: existingDraft.picture.map((picture) => ({
          id: picture.id,
          pictureUrl: picture.pictureUrl.replace('/uploads/posts/', '/media/posts/')
        }))
      };
    }
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      club: {
        id: user.club?.id ?? '',
        name: user.club?.name ?? '',
        pictureUrl: user.club?.pictureUrl ?? null
      }
    },
    defaultUploadedAt: toDateTimeLocalValue(new Date()),
    editingPublished: Boolean(draft && !draft.preview),
    draft,
    aspectPresets: Object.entries(ASPECT_PRESETS).map(([key, preset]) => ({
      key,
      label: preset.label
    }))
  };
};

export const actions: Actions = {
  saveDraft: async ({ request, locals }) => {
    const user = await requireClubUser(locals);
    const club = user.club;

    if (!club) {
      throw redirect(303, '/club');
    }

    const formData = await request.formData();
    const postId = String(formData.get('postId') ?? '').trim() || null;
    const description = String(formData.get('description') ?? '').trim();
    const uploadedAt = parseUploadedAt(formData.get('uploadedAt'));
    const includeFormLink = formData.get('includeFormLink') === 'on';
    const includeOtherLink = formData.get('includeOtherLink') === 'on';
    let keptPictureIds: string[] = [];

    try {
      const parsedPictureIds = JSON.parse(String(formData.get('keptPictureIds') ?? '[]'));

      if (Array.isArray(parsedPictureIds)) {
        keptPictureIds = parsedPictureIds.map((value) => String(value));
      }
    } catch {
      return failWithStep(400, 'Kunde inte läsa vilka bilder som skulle sparas.', 'images');
    }
    const files = formData
      .getAll('pictures')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (!description) {
      return failWithStep(400, 'Beskrivning måste fyllas i.', 'details');
    }

    if (description.length > 2500) {
      return failWithStep(400, 'Beskrivningen får vara max 2500 tecken.', 'details');
    }

    if (!uploadedAt) {
      return failWithStep(400, 'Du måste ange ett giltigt publiceringsdatum.', 'details');
    }

    const formLink = includeFormLink ? normalizeText(formData.get('formLink')) : null;
    const formLinkTitle = includeFormLink ? normalizeText(formData.get('formLinkTitle')) : null;
    const otherLink = includeOtherLink ? normalizeText(formData.get('otherLink')) : null;
    const otherLinkTitle = includeOtherLink ? normalizeText(formData.get('otherLinkTitle')) : null;

    if (includeFormLink && (!formLink || !formLinkTitle)) {
      return failWithStep(400, 'Formlänk och titel måste fyllas i om du väljer den sektionen.', 'details');
    }

    if (includeOtherLink && (!otherLink || !otherLinkTitle)) {
      return failWithStep(400, 'Den andra länken och dess titel måste fyllas i om du väljer den sektionen.', 'details');
    }

    let existingPost = null;

    if (postId) {
      existingPost = await prisma.post.findFirst({
        where: {
          id: postId,
          clubId: club.id,
        },
        include: {
          picture: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!existingPost) {
        return failWithStep(404, 'Utkastet hittades inte.', 'details');
      }
    }

    const keptPictures = existingPost?.picture.filter((picture) => keptPictureIds.includes(picture.id)) ?? [];
    const removedPictures = existingPost?.picture.filter((picture) => !keptPictureIds.includes(picture.id)) ?? [];
    const totalPicturesAfterSave = keptPictures.length + files.length;

    if (!existingPost && (files.length < 1 || files.length > MAX_IMAGES)) {
      return failWithStep(400, 'Du måste välja mellan 1 och 20 bilder.', 'images');
    }

    if (totalPicturesAfterSave > MAX_IMAGES) {
      return failWithStep(400, 'Du kan ladda upp högst 20 bilder.', 'images');
    }

    if (!existingPost && keptPictureIds.length > 0) {
      return failWithStep(400, 'Kunde inte läsa sparade bild-ID:n.', 'images');
    }

    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
        return failWithStep(400, `Bilden "${file.name}" är ${sizeInMb} MB. Maxstorleken är 20 MB.`, 'images');
      }

      if (!isAllowedImage(file)) {
        return failWithStep(400, `Bilden "${file.name}" har en filtyp som inte stöds. Tillåtna typer är HEIC, JPG, PNG, WEBP och AVIF.`, 'images');
      }
    }

    const cropConfig = files.length > 0 ? parseCropConfig(formData.get('cropConfig'), files.length) : [];

    if (files.length > 0 && !cropConfig) {
      return failWithStep(400, 'Beskärningsinställningarna kunde inte läsas.', 'images');
    }

    if (!files.length && !keptPictures.length) {
      return failWithStep(400, 'Du måste välja minst en bild.', 'images');
    }

    const editingPublished = Boolean(existingPost && !existingPost.preview);
    const sendNotification = editingPublished ? false : formData.get('sendNotification') === 'on';
    const aspectKey = normalizeAspectKey(formData.get('aspectKey'));

    const data = {
      description,
      uploadedAt,
      formLink,
      formLinkTitle,
      otherLink,
      otherLinkTitle,
      sendNotification,
      aspectKey,
      preview: editingPublished ? false : true
    };

    const post = existingPost
      ? await prisma.post.update({
          where: { id: existingPost.id },
          data
        })
      : await prisma.post.create({
          data: {
            ...data,
            clubId: club.id,
            createdByUsername: user.username
          }
        });

    if (removedPictures.length > 0) {
      await deletePostPictures(removedPictures.map((picture) => picture.pictureUrl));
      await prisma.picture.deleteMany({
        where: {
          id: {
            in: removedPictures.map((picture) => picture.id)
          }
        }
      });
    }

    if (files.length > 0 && cropConfig) {
      try {
        await savePostPictures(post.id, files, cropConfig);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Kunde inte bearbeta eller spara bilderna.';
        return failWithStep(400, message, 'images');
      }
    }

    throw redirect(303, `/post/${post.id}`);
  }
};