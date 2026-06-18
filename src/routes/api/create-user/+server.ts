import { json } from '@sveltejs/kit';
import { prisma } from '$lib/db';
import type { RequestHandler } from './$types';
import { Prisma } from '@prisma/client';

export const GET: RequestHandler = async () => {
  // Simple debug endpoint to list users
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return json({ users });
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const username = String(body?.username ?? '').trim();
  const email = String(body?.email ?? '').trim();

  if (!username || !email) {
    return json({ error: 'Username and email are required.' }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email
      }
    });

    return json({ user }, { status: 201 });
  } catch (err) {
    // Handle Prisma unique constraint violation (P2002)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return json({ error: 'Username or email already taken.' }, { status: 409 });
    }

    // For development, return error message; in production you'd hide details
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: 'Could not create user.', details: message }, { status: 500 });
  }
};
