import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/db';

const SESSION_COOKIE = 'session_id';
const BCRYPT_ROUNDS = 10;

async function requireClubUser(locals: App.Locals) {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  if (locals.user.type !== 'CLUB') {
    throw redirect(303, locals.user.type === 'ADMIN' ? '/admin' : '/');
  }

  const user = await prisma.user.findUnique({
    where: { id: locals.user.id },
    include: {
      club: true,
      sessions: true
    }
  });

  if (!user || !user.club) {
    throw redirect(303, '/login');
  }

  return user;
}

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireClubUser(locals);
  const club = user.club;

  if (!club) {
    throw redirect(303, '/login');
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      club: {
        id: club.id,
        name: club.name,
        pictureUrl: club.pictureUrl
      },
      sessionsCount: user.sessions.length
    }
  };
};

export const actions: Actions = {
  changePassword: async ({ request, locals }) => {
    const user = await requireClubUser(locals);
    const formData = await request.formData();
    const currentPassword = String(formData.get('currentPassword') ?? '').trim();
    const newPassword = String(formData.get('newPassword') ?? '').trim();

    if (!currentPassword || !newPassword) {
      return fail(400, { error: 'Du måste ange både gammalt och nytt lösenord.' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValid) {
      return fail(400, { error: 'Det gamla lösenordet är fel.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
      }
    });

    throw redirect(303, '/club/account');
  },

  changeUsername: async ({ request, locals }) => {
    const user = await requireClubUser(locals);
    const formData = await request.formData();
    const newUsername = String(formData.get('newUsername') ?? '').trim();

    if (!newUsername) {
      return fail(400, { error: 'Du måste ange ett nytt användarnamn.' });
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { username: newUsername }
      });
    } catch (error) {
      return fail(400, { error: 'Kunde inte byta användarnamn. Det kanske redan finns.' });
    }

    throw redirect(303, '/club/account');
  },

  deleteAccount: async ({ locals, cookies }) => {
    const user = await requireClubUser(locals);

    await prisma.session.updateMany({
      where: { userId: user.id },
      data: {
        userId: null,
        expiresAt: new Date(0)
      }
    });

    await prisma.user.delete({
      where: { id: user.id }
    });

    cookies.delete(SESSION_COOKIE, { path: '/' });
    throw redirect(303, '/login');
  },

  exportData: async ({ locals }) => {
    const user = await requireClubUser(locals);

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        club: {
          include: {
            notifications: true,
            posts: {
              include: {
                picture: true
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        },
        sessions: true
      }
    });

    if (!fullUser || !fullUser.club) {
      return fail(400, { error: 'Kunde inte hämta din information.' });
    }

    return {
      exportData: {
        user: {
          id: fullUser.id,
          username: fullUser.username,
          type: fullUser.type,
          clubId: fullUser.clubId,
          createdAt: fullUser.createdAt.toISOString(),
          updatedAt: fullUser.updatedAt.toISOString()
        },
        club: {
          id: fullUser.club.id,
          name: fullUser.club.name,
          pictureUrl: fullUser.club.pictureUrl,
          description: fullUser.club.description,
          instagramLink: fullUser.club.instagramLink,
          facebookLink: fullUser.club.facebookLink,
          calenderLink: fullUser.club.calenderLink,
          rssFeedLink: fullUser.club.rssFeedLink,
          contactMail: fullUser.club.contactMail,
          contactPerson: fullUser.club.contactPerson,
          createdAt: fullUser.club.createdAt.toISOString(),
          updatedAt: fullUser.club.updatedAt.toISOString(),
          notifications: fullUser.club.notifications.map((notification) => ({
            id: notification.id,
            message: notification.message,
            sendNotification: notification.sendNotification,
            expiresAt: notification.expiresAt.toISOString(),
            createdAt: notification.createdAt.toISOString(),
            updatedAt: notification.updatedAt.toISOString()
          })),
          posts: fullUser.club.posts.map((post) => ({
            id: post.id,
            description: post.description,
            formLink: post.formLink,
            formLinkTitle: post.formLinkTitle,
            otherLinkTitle: post.otherLinkTitle,
            otherLink: post.otherLink,
            sendNotification: post.sendNotification,
            preview: post.preview,
            uploadedAt: post.uploadedAt.toISOString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            pictures: post.picture.map((picture) => ({
              id: picture.id,
              pictureUrl: picture.pictureUrl,
              createdAt: picture.createdAt.toISOString(),
              updatedAt: picture.updatedAt.toISOString()
            }))
          }))
        },
        sessions: fullUser.sessions.map((session) => ({
          id: session.id,
          expiresAt: session.expiresAt.toISOString(),
          createdAt: session.createdAt.toISOString()
        }))
      }
    };
  }
};
