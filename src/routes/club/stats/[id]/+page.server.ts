import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/db';
import { requireClubUser } from '$lib/server/club';

export const load: PageServerLoad = async ({ locals, params }) => {
  const user = await requireClubUser(locals);
  const club = user.club;

  if (!club) {
    throw redirect(303, '/login');
  }

  const post = await prisma.post.findFirst({
    where: {
      id: params.id,
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
      like: {
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      },
      view: {
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });

  if (!post) {
    throw error(404, 'Inlägget hittades inte.');
  }

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
    post: {
      id: post.id,
      description: post.description,
      uploadedAt: post.uploadedAt.toISOString(),
      firstPictureUrl: post.picture[0]?.pictureUrl.replace('/uploads/posts/', '/media/posts/') ?? null,
      totalLikes: post.like.length,
      totalViews: post.view.length
    },
    events: {
      likes: post.like.map((entry) => entry.createdAt.toISOString()),
      views: post.view.map((entry) => entry.createdAt.toISOString())
    }
  };
};