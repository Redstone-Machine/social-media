import { fail, redirect } from '@sveltejs/kit';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/db';

const SESSION_COOKIE = 'session_id';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif'
]);

function normalizeText(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function isAllowedImage(file: File) {
  const fileName = file.name.toLowerCase();
  const extensionAllowed = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.avif'].some((extension) =>
    fileName.endsWith(extension)
  );

  return ALLOWED_IMAGE_TYPES.has(file.type) || extensionAllowed;
}

async function requireClubUser(locals: App.Locals) {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  if (locals.user.type !== 'CLUB') {
    throw redirect(303, locals.user.type === 'ADMIN' ? '/admin' : '/');
  }

  const user = await prisma.user.findUnique({
    where: { id: locals.user.id },
    include: {
      club: true
    }
  });

  if (!user || !user.club) {
    throw redirect(303, '/login');
  }

  return user;
}

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireClubUser(locals);
  const club = user.club;

  if (!club) {
    throw redirect(303, '/login');
  }

  const hasAdvancedDetails = Boolean(
    club.instagramLink ||
      club.facebookLink ||
      club.calenderLink ||
      club.rssFeedLink ||
      club.contactMail ||
      club.contactPerson
  );

  return {
    club: {
      id: club.id,
      name: club.name,
      description: club.description,
      pictureUrl: club.pictureUrl,
      instagramLink: club.instagramLink,
      facebookLink: club.facebookLink,
      calenderLink: club.calenderLink,
      rssFeedLink: club.rssFeedLink,
      contactMail: club.contactMail,
      contactPerson: club.contactPerson,
      hasAdvancedDetails,
      createdAt: club.createdAt.toISOString(),
      updatedAt: club.updatedAt.toISOString()
    },
    user: {
      id: user.id,
      username: user.username
    }
  };
};

export const actions: Actions = {
  saveDetails: async ({ request, locals }) => {
    const user = await requireClubUser(locals);
    const club = user.club;

    if (!club) {
      return fail(400, { error: 'Kunde inte hitta klubben.' });
    }

    const formData = await request.formData();
    const name = String(formData.get('name') ?? '').trim();
    const description = normalizeText(formData.get('description'));
    const advancedDetailsEnabled = formData.get('advancedDetailsEnabled') === 'on';

    if (!name) {
      return fail(400, { error: 'Namn för klubben måste fyllas i.' });
    }

    const optionalFields = advancedDetailsEnabled
      ? {
          instagramLink: normalizeText(formData.get('instagramLink')),
          facebookLink: normalizeText(formData.get('facebookLink')),
          calenderLink: normalizeText(formData.get('calenderLink')),
          rssFeedLink: normalizeText(formData.get('rssFeedLink')),
          contactMail: normalizeText(formData.get('contactMail')),
          contactPerson: normalizeText(formData.get('contactPerson'))
        }
      : {
          instagramLink: null,
          facebookLink: null,
          calenderLink: null,
          rssFeedLink: null,
          contactMail: null,
          contactPerson: null
        };

    try {
      await prisma.club.update({
        where: { id: club.id },
        data: {
          name,
          description,
          ...optionalFields
        }
      });
    } catch (error) {
      return fail(400, { error: 'Kunde inte spara klubbinformationen. Namnet kan redan finnas.' });
    }

    throw redirect(303, '/club/info');
  },

  uploadPicture: async ({ request, locals }) => {
    const user = await requireClubUser(locals);
    const club = user.club;

    if (!club) {
      return fail(400, { error: 'Kunde inte hitta klubben.' });
    }

    const formData = await request.formData();
    const file = formData.get('picture');

    if (!(file instanceof File)) {
      return fail(400, { error: 'Du måste välja en bild.' });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return fail(400, { error: 'Bilden får vara max 10 MB.' });
    }

    if (!isAllowedImage(file)) {
      return fail(400, { error: 'Endast HEIC, JPG, PNG, WEBP och AVIF är tillåtna.' });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const outputBuffer = await sharp(buffer)
        .rotate()
        .resize(1200, 1200, {
          fit: 'cover',
          position: 'centre'
        })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();

      const outputDirectory = path.join(process.cwd(), 'static', 'uploads', 'clubs');
      await mkdir(outputDirectory, { recursive: true });

      const fileName = `${club.id}.jpg`;
      const outputPath = path.join(outputDirectory, fileName);
      await writeFile(outputPath, outputBuffer);

      await prisma.club.update({
        where: { id: club.id },
        data: {
          pictureUrl: `/uploads/clubs/${fileName}?v=${Date.now()}`
        }
      });
    } catch (error) {
      return fail(400, { error: 'Kunde inte bearbeta eller spara bilden.' });
    }

    throw redirect(303, '/club/info');
  }
};
