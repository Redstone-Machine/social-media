import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { prisma } from '$lib/db';
import type { Actions, PageServerLoad } from './$types';

const SESSION_COOKIE = 'session_id';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, locals.user.type === 'ADMIN' ? '/admin' : '/club');
  }

  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();

    if (!username || !password) {
      return fail(400, { error: 'Username and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return fail(400, { error: 'Invalid username or password.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return fail(400, { error: 'Invalid username or password.' });
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
      }
    });

    cookies.set(SESSION_COOKIE, session.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7
    });

    throw redirect(303, user.type === 'ADMIN' ? '/admin' : '/club');
  }
};
