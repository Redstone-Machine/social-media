import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  if (locals.user.type !== 'ADMIN') {
    throw redirect(303, '/');
  }

  const clubs = await prisma.club.findMany({
    orderBy: { name: 'asc' }
  });

  return { clubs };
};

export const actions: Actions = {
  delete: async ({ request }) => {
    const formData = await request.formData();
    const clubId = String(formData.get('clubId') ?? '').trim();

    if (!clubId) {
      return fail(400, { error: 'Missing club id.' });
    }

    try {
      await prisma.$transaction([
        prisma.like.deleteMany({ where: { post: { clubId } } }),
        prisma.view.deleteMany({ where: { post: { clubId } } }),
        prisma.picture.deleteMany({ where: { post: { clubId } } }),
        prisma.post.deleteMany({ where: { clubId } }),
        prisma.notification.deleteMany({ where: { clubId } }),
        prisma.club.delete({ where: { id: clubId } })
      ]);
    } catch (error) {
      return fail(400, { error: 'Kunde inte ta bort klubben.' });
    }

    return { success: true };
  }
};
