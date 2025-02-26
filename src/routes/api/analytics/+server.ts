import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { accountId, apiKey, sql } = await request.json();

		if (!accountId || !apiKey || !sql) {
			return json(
				{
					success: false,
					errors: [
						{ message: 'Missing required parameters: accountId, apiKey, and sql are required' }
					]
				},
				{ status: 400 }
			);
		}

		console.log('Sending request to Cloudflare with SQL:', sql);

		const response = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'text/plain',
					Authorization: `Bearer ${apiKey}`
				},
				body: sql
			}
		);

		const contentType = response.headers.get('content-type');
		let data;

		if (contentType && contentType.includes('application/json')) {
			data = await response.json();
		} else {
			const textData = await response.text();
			data = { result: textData };
		}

		if (!response.ok) {
			return json(
				{
					success: false,
					errors: data.errors || [{ message: 'An error occurred while executing the query' }]
				},
				{ status: response.status }
			);
		}

		return json({ success: true, result: data.result || data });
	} catch (error) {
		console.error('Error in analytics API:', error);
		return json(
			{
				success: false,
				errors: [{ message: error instanceof Error ? error.message : 'An unknown error occurred' }]
			},
			{ status: 500 }
		);
	}
};
