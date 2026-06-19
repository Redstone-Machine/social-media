import { fail, redirect } from '@sveltejs/kit';
import { rm, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/db';
import { requireClubUser } from '$lib/server/club';

const PRIVATE_POST_UPLOADS_DIRECTORY = path.join(process.cwd(), 'uploads', 'posts');

function buildNotificationMessage(clubName: string, description: string) {
  const snippet = description.replace(/\s+/g, ' ').trim().slice(0, 120);
  return snippet.length > 0 ? `${clubName} har publicerat: ${snippet}` : `${clubName} har publicerat ett nytt inlägg.`;
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
        // Ignore missing files; DB cleanup still runs.
      }
    })
  );
}

async function requireOwnedPostForClub(postId: string, clubId: string) {
  return prisma.post.findFirst({
    where: {
      id: postId,
      clubId
    },
    include: {
      club: true,
      picture: {
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });
}

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireClubUser(locals);
  const club = user.club;

  if (!club) {
    throw redirect(303, '/login');
  }

  const posts = await prisma.post.findMany({
    where: {
      clubId: club.id
    },
    include: {
      picture: {
        orderBy: {
          createdAt: 'asc'
        },
        take: 1
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      club: {
        id: club.id,
        name: club.name,
        pictureUrl: club.pictureUrl
      }
    },
    posts: posts.map((post) => ({
      id: post.id,
      description: post.description,
      preview: post.preview,
      uploadedAt: post.uploadedAt.toISOString(),
      createdAt: post.createdAt.toISOString(),
      firstPictureUrl: post.picture[0]?.pictureUrl.replace('/uploads/posts/', '/media/posts/') ?? null
    }))
  };
};

export const actions: Actions = {
  publish: async ({ request, locals }) => {
    const user = await requireClubUser(locals);
    const club = user.club;

    if (!club) {
      return fail(400, { error: 'Kunde inte hitta klubben.' });
    }

    const formData = await request.formData();
    const postId = String(formData.get('postId') ?? '').trim();

    if (!postId) {
      return fail(400, { error: 'Inlägget kunde inte publiceras.' });
    }

    const post = await requireOwnedPostForClub(postId, club.id);

    if (!post) {
      return fail(404, { error: 'Inlägget hittades inte.' });
    }

    if (!post.preview) {
      throw redirect(303, '/club/posts');
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: {
        preview: false
      },
      include: {
        club: true
      }
    });

    if (updatedPost.sendNotification) {
      await prisma.notification.create({
        data: {
          clubId: updatedPost.clubId,
          message: buildNotificationMessage(updatedPost.club.name, updatedPost.description),
          sendNotification: true,
          expiresAt: new Date(updatedPost.uploadedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

    throw redirect(303, '/club/posts');
  },
  delete: async ({ request, locals }) => {
    const user = await requireClubUser(locals);
    const club = user.club;

    if (!club) {
      return fail(400, { error: 'Kunde inte hitta klubben.' });
    }

    const formData = await request.formData();
    const postId = String(formData.get('postId') ?? '').trim();

    if (!postId) {
      return fail(400, { error: 'Inlägget kunde inte tas bort.' });
    }

    const post = await requireOwnedPostForClub(postId, club.id);

    if (!post) {
      return fail(404, { error: 'Inlägget hittades inte.' });
    }

    await deletePostPictures(post.picture.map((picture) => picture.pictureUrl));

    await rm(path.join(PRIVATE_POST_UPLOADS_DIRECTORY, post.id), {
      recursive: true,
      force: true
    });

    await prisma.$transaction([
      prisma.like.deleteMany({
        where: {
          postId: post.id
        }
      }),
      prisma.view.deleteMany({
        where: {
          postId: post.id
        }
      }),
      prisma.picture.deleteMany({
        where: {
          postId: post.id
        }
      }),
      prisma.post.delete({
        where: {
          id: post.id
        }
      })
    ]);

    throw redirect(303, '/club/posts');
  }
};