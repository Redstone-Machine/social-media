import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;

	if (user) {
		return new Response(
			JSON.stringify({
				authenticated: true,
				user: {
					id: user.id,
					username: user.username,
					type: user.type
				}
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	return new Response(
		JSON.stringify({
			authenticated: false
		}),
		{
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		}
	);
};
