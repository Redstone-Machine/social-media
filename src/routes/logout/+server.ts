import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import type { RequestHandler } from './$types';

const SESSION_COOKIE = 'session_id';

export const GET: RequestHandler = async ({ cookies }) => {
  const sessionId = cookies.get(SESSION_COOKIE);

  if (sessionId) {
    await prisma.session.deleteMany({
      where: { id: sessionId }
    });
  }

  cookies.delete(SESSION_COOKIE, { path: '/' });
  throw redirect(303, '/login');
};
