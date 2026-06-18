import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  if (locals.user.type !== 'ADMIN') {
    throw redirect(303, '/');
  }

  const users = await prisma.user.findMany({
    orderBy: { username: 'asc' },
    where: {
      type: {
        not: 'ADMIN'
      }
    },
    include: {
      club: true
    }
  });

  return {
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      type: user.type,
      clubName: user.club?.name ?? null,
      createdAt: user.createdAt.toISOString()
    }))
  };
};

export const actions: Actions = {
  delete: async ({ request, locals }) => {
    const formData = await request.formData();
    const userId = String(formData.get('userId') ?? '').trim();

    if (!userId) {
      return fail(400, { error: 'Missing user id.' });
    }

    if (locals.user?.id === userId) {
      return fail(400, { error: 'Du kan inte ta bort ditt eget konto härifrån.' });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { type: true }
    });

    if (!userToDelete) {
      return fail(400, { error: 'Kontot finns inte längre.' });
    }

    if (userToDelete.type === 'ADMIN') {
      return fail(400, { error: 'Admin-konton kan inte tas bort.' });
    }

    try {
      await prisma.session.deleteMany({
        where: { userId }
      });

      await prisma.user.delete({
        where: { id: userId }
      });
    } catch (error) {
      return fail(400, { error: 'Kunde inte ta bort kontot.' });
    }

    return { success: true };
  }
};
