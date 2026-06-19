import { error, type RequestHandler } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '$lib/db';

const PRIVATE_POST_UPLOADS_DIRECTORY = path.join(process.cwd(), 'uploads', 'posts');

function isSafePathSegment(value: string) {
  return /^[A-Za-z0-9._-]+$/.test(value) && !value.includes('..') && !value.includes('/');
}

function contentTypeFromFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }

  if (extension === '.png') {
    return 'image/png';
  }

  if (extension === '.webp') {
    return 'image/webp';
  }

  if (extension === '.avif') {
    return 'image/avif';
  }

  return 'application/octet-stream';
}

export const GET: RequestHandler = async ({ params, locals }) => {
  const postId = params.postId;
  const fileName = params.file;

  if (!postId || !fileName || !isSafePathSegment(postId) || !isSafePathSegment(fileName)) {
    throw error(404, 'Bilden hittades inte.');
  }

  const picture = await prisma.picture.findFirst({
    where: {
      postId,
      OR: [{ pictureUrl: `/media/posts/${postId}/${fileName}` }, { pictureUrl: `/uploads/posts/${postId}/${fileName}` }]
    },
    select: {
      post: {
        select: {
          clubId: true,
          preview: true,
          uploadedAt: true
        }
      }
    }
  });

  if (!picture) {
    throw error(404, 'Bilden hittades inte.');
  }

  let isOwner = false;

  if (locals.user?.type === 'CLUB') {
    const user = await prisma.user.findUnique({
      where: { id: locals.user.id },
      select: { clubId: true }
    });

    isOwner = user?.clubId === picture.post.clubId;
  }

  const isPublic = !picture.post.preview && picture.post.uploadedAt <= new Date();

  if (!isOwner && !isPublic) {
    throw error(404, 'Bilden hittades inte.');
  }

  const imagePath = path.join(PRIVATE_POST_UPLOADS_DIRECTORY, postId, fileName);

  let imageBuffer: Buffer;

  try {
    imageBuffer = await readFile(imagePath);
  } catch {
    throw error(404, 'Bilden hittades inte.');
  }

  return new Response(imageBuffer, {
    headers: {
      'content-type': contentTypeFromFileName(fileName),
      'cache-control': isPublic ? 'public, max-age=3600' : 'private, no-store'
    }
  });
};
