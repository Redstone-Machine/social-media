import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/db';

const LAST_PUBLIC_CLUBS_COOKIE = 'last_public_clubs';

function parseCookieClubs(raw: string | undefined) {
  if (!raw) {
    return [];
  }

  return raw
    .split('|')
    .map((club) => club.trim())
    .filter(Boolean);
}

export const load: PageServerLoad = async ({ cookies }) => {
  const lastClubs = parseCookieClubs(cookies.get(LAST_PUBLIC_CLUBS_COOKIE));

  if (lastClubs.length > 0) {
    const validClubs = await prisma.club.findMany({
      where: {
        name: {
          in: lastClubs
        }
      },
      select: {
        name: true
      }
    });

    const validClubNames = validClubs.map((club) => club.name).sort((a, b) => a.localeCompare(b, 'sv'));

    if (validClubNames.length === 1) {
      throw redirect(303, `/feed/${encodeURIComponent(validClubNames[0])}`);
    }

    if (validClubNames.length > 1) {
      throw redirect(303, `/feed/multi?clubs=${encodeURIComponent(validClubNames.join('|'))}`);
    }

    cookies.delete(LAST_PUBLIC_CLUBS_COOKIE, { path: '/' });
  }

  throw redirect(303, '/feed');
};
