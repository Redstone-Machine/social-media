import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/db';

const BCRYPT_ROUNDS = 10;

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
  default: async ({ request }) => {
    const formData = await request.formData();
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();
    const clubId = String(formData.get('clubId') ?? '').trim();

    if (!username || !password || !clubId) {
      return fail(400, { error: 'Du måste fylla i username, password och välja en klubb.' });
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId }
    });

    if (!club) {
      return fail(400, { error: 'Den valda klubben finns inte längre.' });
    }

    try {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      await prisma.user.create({
        data: {
          username,
          passwordHash,
          type: 'CLUB',
          clubId
        }
      });
    } catch (error) {
      return fail(400, { error: 'Kunde inte skapa kontot. Användarnamnet kan redan finnas.' });
    }

    throw redirect(303, '/admin');
  }
};
