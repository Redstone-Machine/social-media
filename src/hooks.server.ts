import type { Handle } from '@sveltejs/kit';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '$lib/db';

const adminUsername = process.env.DEFAULT_ADMIN_USERNAME ?? 'admin';
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'password';
const BCRYPT_ROUNDS = 10;
const SESSION_COOKIE = 'session_id';

async function ensureDefaultAdmin() {
  const hashedPassword = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash: hashedPassword,
      type: 'ADMIN'
    },
    create: {
      username: adminUsername,
      passwordHash: hashedPassword,
      type: 'ADMIN'
    }
  });
}

export const handle: Handle = async ({ event, resolve }) => {
  await ensureDefaultAdmin();

  const sessionId = event.cookies.get(SESSION_COOKIE);

  if (!sessionId) {
    event.locals.user = null;
    return resolve(event);
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date() || !session.user) {
    event.cookies.delete(SESSION_COOKIE, { path: '/' });
    event.locals.user = null;
    return resolve(event);
  }

  event.locals.user = {
    id: session.user.id,
    username: session.user.username,
    type: session.user.type
  };

  return resolve(event);
};
