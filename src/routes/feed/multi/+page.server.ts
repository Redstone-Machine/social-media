import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/db';

const LAST_PUBLIC_CLUBS_COOKIE = 'last_public_clubs';
const SESSION_COOKIE = 'session_id';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 365;

async function ensureSessionId(cookies: Parameters<Actions['toggleLike']>[0]['cookies']) {
  const now = new Date();
  let sessionId = cookies.get(SESSION_COOKIE) ?? null;

  if (sessionId) {
    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, expiresAt: true }
    });

    if (!existingSession || existingSession.expiresAt <= now) {
      sessionId = null;
    }
  }

  if (!sessionId) {
    const session = await prisma.session.create({
      data: {
        expiresAt: new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000)
      }
    });

    sessionId = session.id;

    cookies.set(SESSION_COOKIE, session.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_DURATION_SECONDS
    });
  }

  return sessionId;
}

async function getValidSessionId(cookies: Parameters<PageServerLoad>[0]['cookies']) {
  const sessionId = cookies.get(SESSION_COOKIE);

  if (!sessionId) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, expiresAt: true }
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.id;
}

function parseClubs(raw: string | null) {
  if (!raw) {
    return [];
  }

  return raw
    .split('|')
    .map((club) => club.trim())
    .filter(Boolean);
}

export const load: PageServerLoad = async ({ url, cookies }) => {
  const now = new Date();
  const requestedClubNames = [...new Set(parseClubs(url.searchParams.get('clubs')))];
  const includesAll = requestedClubNames.some((club) => club.toLowerCase() === 'all');

  if (requestedClubNames.length === 0 && !includesAll) {
    throw redirect(303, '/feed');
  }

  const clubs = await prisma.club.findMany(
    includesAll
      ? {
          orderBy: {
            name: 'asc'
          },
          select: {
            id: true,
            name: true,
            pictureUrl: true
          }
        }
      : {
          where: {
            name: {
              in: requestedClubNames
            }
          },
          select: {
            id: true,
            name: true,
            pictureUrl: true
          }
        }
  );

  const clubByName = new Map(clubs.map((club) => [club.name, club]));
  const selectedClubs = includesAll
    ? clubs
    : requestedClubNames
        .map((name) => clubByName.get(name))
        .filter((club): club is { id: string; name: string; pictureUrl: string | null } => Boolean(club));

  if (selectedClubs.length === 0) {
    cookies.delete(LAST_PUBLIC_CLUBS_COOKIE, { path: '/' });
    throw redirect(303, '/feed');
  }

  if (selectedClubs.length === 1) {
    throw redirect(303, `/feed/${encodeURIComponent(selectedClubs[0].name)}`);
  }

  cookies.set(
    LAST_PUBLIC_CLUBS_COOKIE,
    selectedClubs.map((club) => club.name).join('|'),
    {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365
    }
  );

  const posts = await prisma.post.findMany({
    where: {
      clubId: {
        in: selectedClubs.map((club) => club.id)
      },
      preview: false,
      uploadedAt: {
        lte: now
      }
    },
    orderBy: {
      uploadedAt: 'desc'
    },
    select: {
      id: true,
      description: true,
      aspectKey: true,
      uploadedAt: true,
      club: {
        select: {
          id: true,
          name: true,
          pictureUrl: true
        }
      },
      picture: {
        orderBy: {
          createdAt: 'asc'
        },
        select: {
          id: true,
          pictureUrl: true
        }
      },
      _count: {
        select: {
          like: true,
          view: true
        }
      }
    }
  });

  const sessionId = await getValidSessionId(cookies);
  const postIds = posts.map((post) => post.id);
  const likedPostIds =
    sessionId && postIds.length > 0
      ? new Set(
          (
            await prisma.like.findMany({
              where: {
                sessionId,
                postId: {
                  in: postIds
                }
              },
              select: {
                postId: true
              }
            })
          ).map((like) => like.postId)
        )
      : new Set<string>();

  return {
    selectedClubs,
    posts: posts.map((post) => ({
      id: post.id,
      description: post.description,
      aspectKey: post.aspectKey,
      uploadedAt: post.uploadedAt.toISOString(),
      pictures: post.picture.map((picture) => ({
        id: picture.id,
        pictureUrl: picture.pictureUrl.replace('/uploads/posts/', '/media/posts/')
      })),
      likeCount: post._count.like,
      viewCount: post._count.view,
      likedBySession: likedPostIds.has(post.id),
      club: {
        id: post.club.id,
        name: post.club.name,
        pictureUrl: post.club.pictureUrl
      }
    }))
  };
};

export const actions: Actions = {
  toggleLike: async ({ cookies, request }) => {
    const formData = await request.formData();
    const postId = String(formData.get('postId') ?? '').trim();

    if (!postId) {
      throw redirect(303, '/feed');
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        preview: true,
        uploadedAt: true
      }
    });

    if (!post || post.preview || post.uploadedAt > new Date()) {
      throw redirect(303, '/feed');
    }

    const sessionId = await ensureSessionId(cookies);

    const existingLike = await prisma.like.findUnique({
      where: {
        postId_sessionId: {
          postId: post.id,
          sessionId
        }
      }
    });

    let likedBySession = true;

    if (existingLike) {
      await prisma.like.delete({
        where: {
          postId_sessionId: {
            postId: post.id,
            sessionId
          }
        }
      });
      likedBySession = false;
    } else {
      await prisma.like.create({
        data: {
          postId: post.id,
          sessionId
        }
      });
    }

    const likeCount = await prisma.like.count({
      where: {
        postId: post.id
      }
    });

    return {
      success: true,
      postId: post.id,
      likedBySession,
      likeCount
    };
  }
};
