import { json } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import { prisma } from '$lib/db';
import type { RequestHandler } from './$types';
import { Prisma } from '@prisma/client';

const BCRYPT_ROUNDS = 10;

export const GET: RequestHandler = async () => {
  // Simple debug endpoint to list users
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return json({ users });
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const username = String(body?.username ?? '').trim();
  const password = String(body?.password ?? '').trim();

  if (!username || !password) {
    return json({ error: 'Username and password are required.' }, { status: 400 });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword,
        type: 'CLUB'
      }
    });

    return json({ user: { id: user.id, username: user.username, type: user.type, createdAt: user.createdAt } }, { status: 201 });
  } catch (err) {
    // Handle Prisma unique constraint violation (P2002)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return json({ error: 'Username already taken.' }, { status: 409 });
    }

    // For development, return error message; in production you'd hide details
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: 'Could not create user.', details: message }, { status: 500 });
  }
};
