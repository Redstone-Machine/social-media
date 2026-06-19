import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import type { RequestHandler } from './$types';

const SESSION_COOKIE = 'session_id';

export const POST: RequestHandler = async ({ cookies }) => {
  const sessionId = cookies.get(SESSION_COOKIE);

  if (sessionId) {
    await prisma.session.updateMany({
      where: { id: sessionId },
      data: {
        userId: null,
        expiresAt: new Date(0)
      }
    });
  }

  cookies.delete(SESSION_COOKIE, { path: '/' });
  throw redirect(303, '/login');
};
