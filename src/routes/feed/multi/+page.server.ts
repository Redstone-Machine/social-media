import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/db';

const LAST_PUBLIC_CLUBS_COOKIE = 'last_public_clubs';

function parseClubs(raw: string | null) {
  if (!raw) {
    return [];
  }

  return raw
    .split('|')
    .map((club) => club.trim())
    .filter(Boolean);
}

export const load: PageServerLoad = async ({ url, cookies }) => {
  const now = new Date();
  const requestedClubNames = [...new Set(parseClubs(url.searchParams.get('clubs')))];
  const includesAll = requestedClubNames.some((club) => club.toLowerCase() === 'all');

  if (requestedClubNames.length === 0 && !includesAll) {
    throw redirect(303, '/feed');
  }

  const clubs = await prisma.club.findMany(
    includesAll
      ? {
          orderBy: {
            name: 'asc'
          },
          select: {
            id: true,
            name: true,
            pictureUrl: true
          }
        }
      : {
          where: {
            name: {
              in: requestedClubNames
            }
          },
          select: {
            id: true,
            name: true,
            pictureUrl: true
          }
        }
  );

  const clubByName = new Map(clubs.map((club) => [club.name, club]));
  const selectedClubs = includesAll
    ? clubs
    : requestedClubNames
        .map((name) => clubByName.get(name))
        .filter((club): club is { id: string; name: string; pictureUrl: string | null } => Boolean(club));

  if (selectedClubs.length === 0) {
    cookies.delete(LAST_PUBLIC_CLUBS_COOKIE, { path: '/' });
    throw redirect(303, '/feed');
  }

  if (selectedClubs.length === 1) {
    throw redirect(303, `/feed/${encodeURIComponent(selectedClubs[0].name)}`);
  }

  cookies.set(
    LAST_PUBLIC_CLUBS_COOKIE,
    selectedClubs.map((club) => club.name).join('|'),
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365
    }
  );

  const posts = await prisma.post.findMany({
    where: {
      clubId: {
        in: selectedClubs.map((club) => club.id)
      },
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
      club: {
        select: {
          id: true,
          name: true,
          pictureUrl: true
        }
      },
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
    selectedClubs,
    posts: posts.map((post) => ({
      id: post.id,
      description: post.description,
      uploadedAt: post.uploadedAt.toISOString(),
      firstPictureUrl: post.picture[0]?.pictureUrl.replace('/uploads/posts/', '/media/posts/') ?? null,
      likeCount: post._count.like,
      viewCount: post._count.view,
      club: {
        id: post.club.id,
        name: post.club.name,
        pictureUrl: post.club.pictureUrl
      }
    }))
  };
};
