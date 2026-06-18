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

  return {};
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const name = String(formData.get('name') ?? '').trim();

    if (!name) {
      return fail(400, { error: 'Du måste ange ett namn för klubben.' });
    }

    try {
      await prisma.club.create({
        data: {
          name
        }
      });
    } catch (error) {
      return fail(400, { error: 'Kunde inte skapa klubben. Namnet kan redan finnas.' });
    }

    throw redirect(303, '/admin/clubs/delete');
  }
};
