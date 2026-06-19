import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/db';
import { requireClubUser } from '$lib/server/club';

export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireClubUser(locals);
  const club = user.club;

  if (!club) {
    throw redirect(303, '/login');
  }

  const posts = await prisma.post.findMany({
    where: {
      clubId: club.id,
      preview: false,
      uploadedAt: {
        lte: new Date()
      }
    },
    include: {
      picture: {
        orderBy: {
          createdAt: 'asc'
        },
        take: 1
      },
      _count: {
        select: {
          view: true,
          like: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      club: {
        id: club.id,
        name: club.name,
        pictureUrl: club.pictureUrl
      }
    },
    posts: posts.map((post) => ({
      id: post.id,
      description: post.description,
      uploadedAt: post.uploadedAt.toISOString(),
      firstPictureUrl: post.picture[0]?.pictureUrl.replace('/uploads/posts/', '/media/posts/') ?? null,
      viewCount: post._count.view,
      likeCount: post._count.like
    }))
  };
};