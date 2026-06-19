import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/db';

const LAST_PUBLIC_CLUBS_COOKIE = 'last_public_clubs';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const now = new Date();
  const clubName = params.clubName;

  const club = await prisma.club.findUnique({
    where: { name: clubName },
    select: {
      id: true,
      name: true,
      pictureUrl: true,
      description: true
    }
  });

  if (!club) {
    throw error(404, 'Klubben hittades inte.');
  }

  cookies.set(LAST_PUBLIC_CLUBS_COOKIE, club.name, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365
  });

  const posts = await prisma.post.findMany({
    where: {
      clubId: club.id,
      preview: false,
      uploadedAt: {
        lte: now
      }
    },
    orderBy: {
      uploadedAt: 'desc'
    },
    select: {
      id: true,
      description: true,
      uploadedAt: true,
      picture: {
        orderBy: {
          createdAt: 'asc'
        },
        take: 1,
        select: {
          pictureUrl: true
        }
      },
      _count: {
        select: {
          like: true,
          view: true
        }
      }
    }
  });

  return {
    club: {
      id: club.id,
      name: club.name,
      pictureUrl: club.pictureUrl,
      description: club.description
    },
    posts: posts.map((post) => ({
      id: post.id,
      description: post.description,
      uploadedAt: post.uploadedAt.toISOString(),
      firstPictureUrl: post.picture[0]?.pictureUrl.replace('/uploads/posts/', '/media/posts/') ?? null,
      likeCount: post._count.like,
      viewCount: post._count.view
    }))
  };
};
