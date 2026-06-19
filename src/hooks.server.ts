import type { Handle } from '@sveltejs/kit';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '$lib/db';

const adminUsername = process.env.DEFAULT_ADMIN_USERNAME ?? 'admin';
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'password';
const BCRYPT_ROUNDS = 10;
const SESSION_COOKIE = 'session_id';
const CSRF_COOKIE = 'csrf_token';

function createCsrfToken() {
  return randomBytes(32).toString('hex');
}

function safeTokenCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

async function validateCsrfToken(event: Parameters<Handle>[0]['event'], csrfToken: string) {
  const method = event.request.method.toUpperCase();

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  const contentType = event.request.headers.get('content-type') ?? '';
  let submittedToken = '';

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await event.request.clone().formData();
    submittedToken = String(formData.get('_csrf') ?? '');
  } else {
    submittedToken = event.request.headers.get('x-csrf-token') ?? '';
  }

  if (!submittedToken) {
    return false;
  }

  return safeTokenCompare(csrfToken, submittedToken);
}

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
  let csrfToken = event.cookies.get(CSRF_COOKIE);

  if (!csrfToken) {
    csrfToken = createCsrfToken();
    event.cookies.set(CSRF_COOKIE, csrfToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
  }

  event.locals.csrfToken = csrfToken;

  const csrfOk = await validateCsrfToken(event, csrfToken);

  if (!csrfOk) {
    return new Response('Invalid CSRF token.', { status: 403 });
  }

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

  if (!session || session.expiresAt < new Date()) {
    event.cookies.delete(SESSION_COOKIE, { path: '/' });
    event.locals.user = null;
    return resolve(event);
  }

  if (!session.user) {
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
