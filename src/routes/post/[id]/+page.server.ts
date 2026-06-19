import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/db';
import { requireOwnedPost } from '$lib/server/club';

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

function buildNotificationMessage(clubName: string, description: string) {
  const snippet = description.replace(/\s+/g, ' ').trim().slice(0, 120);
  return snippet.length > 0 ? `${clubName} har publicerat: ${snippet}` : `${clubName} har publicerat ett nytt inlägg.`;
}

export const load: PageServerLoad = async ({ locals, params, cookies }) => {
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      club: true,
      picture: {
        orderBy: {
          createdAt: 'asc'
        }
      },
      _count: {
        select: {
          like: true
        }
      }
    }
  });

  if (!post) {
    throw error(404, 'Inlägget hittades inte.');
  }

  let ownerClub: { id: string; name: string; pictureUrl: string | null } | null = null;

  if (locals.user?.type === 'CLUB') {
    const currentUser = await prisma.user.findUnique({
      where: { id: locals.user.id },
      include: {
        club: true
      }
    });

    if (currentUser?.clubId === post.clubId && currentUser.club) {
      ownerClub = {
        id: currentUser.club.id,
        name: currentUser.club.name,
        pictureUrl: currentUser.club.pictureUrl
      };
    }
  }

  const isOwner = Boolean(ownerClub);
  const isPublishedNow = !post.preview && post.uploadedAt <= new Date();

  if (!isOwner && !isPublishedNow) {
    throw error(404, 'Inlägget hittades inte.');
  }

  const viewerClub = ownerClub ?? {
    id: post.club.id,
    name: post.club.name,
    pictureUrl: post.club.pictureUrl
  };

  const sessionId = !isOwner ? await ensureSessionId(cookies) : cookies.get(SESSION_COOKIE);

  if (!isOwner && sessionId) {
    await prisma.view.upsert({
      where: {
        postId_sessionId: {
          postId: post.id,
          sessionId
        }
      },
      update: {},
      create: {
        postId: post.id,
        sessionId
      }
    });
  }

  const likedBySession = sessionId
    ? Boolean(
        await prisma.like.findUnique({
          where: {
            postId_sessionId: {
              postId: post.id,
              sessionId
            }
          },
          select: {
            id: true
          }
        })
      )
    : false;

  return {
    canEdit: isOwner,
    likedBySession,
    likeCount: post._count.like,
    viewer: {
      id: locals.user?.id ?? '',
      username: locals.user?.username ?? '',
      club: viewerClub
    },
    post: {
      id: post.id,
      description: post.description,
      uploadedAt: post.uploadedAt.toISOString(),
      formLink: post.formLink,
      formLinkTitle: post.formLinkTitle,
      otherLink: post.otherLink,
      otherLinkTitle: post.otherLinkTitle,
      sendNotification: post.sendNotification,
      preview: post.preview,
      aspectKey: post.aspectKey,
      pictures: post.picture.map((picture) => ({
        id: picture.id,
        pictureUrl: picture.pictureUrl.replace('/uploads/posts/', '/media/posts/')
      }))
    }
  };
};

export const actions: Actions = {
  publish: async ({ locals, params }) => {
    const { post } = await requireOwnedPost(params.id, locals);

    if (!post.preview) {
      throw redirect(303, `/post/${post.id}`);
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: {
        preview: false
      },
      include: {
        club: true
      }
    });

    if (updatedPost.sendNotification) {
      await prisma.notification.create({
        data: {
          clubId: updatedPost.clubId,
          message: buildNotificationMessage(updatedPost.club.name, updatedPost.description),
          sendNotification: true,
          expiresAt: new Date(updatedPost.uploadedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

    throw redirect(303, `/post/${post.id}`);
  },
  toggleLike: async ({ cookies, params }) => {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        preview: true,
        uploadedAt: true
      }
    });

    if (!post) {
      throw error(404, 'Inlägget hittades inte.');
    }

    if (post.preview || post.uploadedAt > new Date()) {
      throw error(403, 'Du kan bara gilla publicerade inlägg.');
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
      likedBySession,
      likeCount
    };
  }
};