import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
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

  return {
    user: {
      id: user.id,
      username: user.username,
      club: {
        id: user.club.id,
        name: user.club.name,
        pictureUrl: user.club.pictureUrl
      }
    }
  };
};
