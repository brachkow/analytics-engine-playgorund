/**
 * Service for interacting with the Cloudflare Analytics Engine API
 */

export interface AnalyticsCredentials {
	accountId: string;
	apiKey: string;
}

export interface QueryResult {
	success: boolean;
	result?: any;
	error?: string;
}

/**
 * Execute a SQL query against the Cloudflare Analytics Engine
 */
export async function executeQuery(
	credentials: AnalyticsCredentials,
	sql: string
): Promise<QueryResult> {
	if (!credentials.accountId || !credentials.apiKey || !sql) {
		return {
			success: false,
			error: 'Missing required parameters: accountId, apiKey, and sql are required'
		};
	}

	try {
		const response = await fetch('/api/analytics', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				accountId: credentials.accountId,
				apiKey: credentials.apiKey,
				sql
			})
		});

		const data = await response.json();

		if (!response.ok || !data.success) {
			return {
				success: false,
				error: data.errors?.[0]?.message || 'An error occurred while executing the query'
			};
		}

		return {
			success: true,
			result: data.result
		};
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'An unknown error occurred'
		};
	}
}

/**
 * Format the result for display
 */
export function formatResult(result: any): string {
	try {
		// If the result is already a string, try to parse it as JSON for pretty formatting
		if (typeof result === 'string') {
			try {
				const parsedResult = JSON.parse(result);
				return JSON.stringify(parsedResult, null, 2);
			} catch {
				// If it's not valid JSON, just use the string as is
				return result;
			}
		} else {
			// Otherwise, stringify the object with pretty formatting
			return JSON.stringify(result, null, 2);
		}
	} catch (err) {
		console.error('Error formatting result:', err);
		return String(result);
	}
}

/**
 * Save credentials to localStorage
 */
export function saveCredentials(credentials: AnalyticsCredentials): void {
	localStorage.setItem('cf_account_id', credentials.accountId);
	localStorage.setItem('cf_api_key', credentials.apiKey);
}

/**
 * Load credentials from localStorage
 */
export function loadCredentials(): AnalyticsCredentials {
	return {
		accountId: localStorage.getItem('cf_account_id') || '',
		apiKey: localStorage.getItem('cf_api_key') || ''
	};
}

/**
 * Save queries to localStorage
 */
export function saveQueries(queries: { name: string; query: string }[]): void {
	localStorage.setItem('cf_saved_queries', JSON.stringify(queries));
}

/**
 * Load saved queries from localStorage
 */
export function loadSavedQueries(): { name: string; query: string }[] {
	const savedQueriesJson = localStorage.getItem('cf_saved_queries');
	if (savedQueriesJson) {
		try {
			return JSON.parse(savedQueriesJson);
		} catch (e) {
			console.error('Failed to parse saved queries:', e);
		}
	}
	return [];
}
