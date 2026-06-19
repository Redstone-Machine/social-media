import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/db';

const LAST_PUBLIC_CLUBS_COOKIE = 'last_public_clubs';

function parseClubs(raw: string | null | undefined) {
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
  const fromClub = url.searchParams.get('from') ?? '';
  const fromClubsRaw = url.searchParams.get('fromClubs');
  const preselectedFromCookie = parseClubs(cookies.get(LAST_PUBLIC_CLUBS_COOKIE));
  const requestedPreselected = parseClubs(fromClubsRaw).length > 0 ? parseClubs(fromClubsRaw) : preselectedFromCookie;

  const clubs = await prisma.club.findMany({
    orderBy: {
      name: 'asc'
    },
    select: {
      id: true,
      name: true,
      pictureUrl: true,
      _count: {
        select: {
          posts: {
            where: {
              preview: false,
              uploadedAt: {
                lte: now
              }
            }
          }
        }
      }
    }
  });

  if (clubs.length === 1) {
    throw redirect(303, `/feed/${encodeURIComponent(clubs[0].name)}`);
  }

  const clubNameSet = new Set(clubs.map((club) => club.name.toLowerCase()));
  const preselectedClubs = [...new Set(requestedPreselected)]
    .filter((name) => clubNameSet.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'sv'));

  return {
    fromClub,
    preselectedClubs,
    clubs: clubs.map((club) => ({
      id: club.id,
      name: club.name,
      pictureUrl: club.pictureUrl,
      postCount: club._count.posts
    }))
  };
};
