import { error, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/db';

export async function requireClubUser(locals: App.Locals) {
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

export async function requireOwnedPost(postId: string, locals: App.Locals) {
  const user = await requireClubUser(locals);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      club: true,
      picture: {
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });

  if (!post || post.clubId !== user.clubId) {
    throw error(404, 'Inlägget hittades inte.');
  }

  return { user, post };
}