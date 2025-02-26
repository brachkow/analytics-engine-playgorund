<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { sql } from '@codemirror/lang-sql';
	import { oneDark } from '@codemirror/theme-one-dark';

	let accountId = '';
	let apiKey = '';
	let sqlQuery = 'SELECT * FROM http_requests LIMIT 10';
	let result = '';
	let error = '';
	let loading = false;
	let editorElement: HTMLElement;
	let editorView: EditorView;
	let savedQueries: { name: string; query: string }[] = [];
	let newQueryName = '';
	let showSaveDialog = false;
	let savedQueriesDropdown: HTMLElement | null = null;

	const exampleQueries = [
		{
			name: 'HTTP Requests (Last 24h)',
			query: "SELECT * FROM http_requests WHERE datetime > NOW() - INTERVAL '1' DAY LIMIT 10"
		},
		{
			name: 'Status Code Distribution',
			query:
				'SELECT status, COUNT(*) as count FROM http_requests GROUP BY status ORDER BY count DESC'
		},
		{
			name: 'Top Client Countries',
			query:
				'SELECT clientCountryName, COUNT(*) as count FROM http_requests GROUP BY clientCountryName ORDER BY count DESC LIMIT 10'
		},
		{
			name: 'Average Response Time',
			query: 'SELECT AVG(edgeResponseTime) as avg_response_time FROM http_requests'
		}
	];

	onMount(() => {
		// Load saved credentials from localStorage
		const savedAccountId = localStorage.getItem('cf_account_id');
		const savedApiKey = localStorage.getItem('cf_api_key');

		if (savedAccountId) accountId = savedAccountId;
		if (savedApiKey) apiKey = savedApiKey;

		// Load saved queries from localStorage
		const savedQueriesJson = localStorage.getItem('cf_saved_queries');
		if (savedQueriesJson) {
			try {
				savedQueries = JSON.parse(savedQueriesJson);
			} catch (e) {
				console.error('Failed to parse saved queries:', e);
			}
		}

		// Initialize CodeMirror
		try {
			editorView = new EditorView({
				doc: sqlQuery,
				extensions: [
					basicSetup,
					sql(),
					oneDark,
					EditorView.updateListener.of((update) => {
						if (update.docChanged) {
							sqlQuery = update.state.doc.toString();
						}
					})
				],
				parent: editorElement
			});
		} catch (e) {
			console.error('Error initializing CodeMirror:', e);
			error = `Error initializing editor: ${e instanceof Error ? e.message : String(e)}`;
		}

		return () => {
			if (editorView) {
				editorView.destroy();
			}
		};
	});

	function saveCredentials() {
		localStorage.setItem('cf_account_id', accountId);
		localStorage.setItem('cf_api_key', apiKey);
	}

	function saveQuery() {
		if (!newQueryName || !sqlQuery) return;

		const existingIndex = savedQueries.findIndex((q) => q.name === newQueryName);

		if (existingIndex >= 0) {
			savedQueries[existingIndex].query = sqlQuery;
		} else {
			savedQueries = [...savedQueries, { name: newQueryName, query: sqlQuery }];
		}

		localStorage.setItem('cf_saved_queries', JSON.stringify(savedQueries));
		newQueryName = '';
		showSaveDialog = false;
	}

	function loadQuery(query: string) {
		sqlQuery = query;
		if (editorView) {
			const transaction = editorView.dispatch({
				changes: { from: 0, to: editorView.state.doc.length, insert: query }
			});
		}
	}

	function deleteQuery(index: number) {
		savedQueries = savedQueries.filter((_, i) => i !== index);
		localStorage.setItem('cf_saved_queries', JSON.stringify(savedQueries));
	}

	async function executeQuery() {
		if (!accountId || !apiKey || !sqlQuery) {
			error = 'Please provide Account ID, API Key, and SQL query';
			return;
		}

		// Save credentials
		saveCredentials();

		loading = true;
		error = '';
		result = '';

		try {
			const response = await fetch('/api/analytics', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					accountId,
					apiKey,
					sql: sqlQuery
				})
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				error = data.errors?.[0]?.message || 'An error occurred while executing the query';
			} else {
				// Format the result nicely
				try {
					// If the result is already a string, try to parse it as JSON for pretty formatting
					if (typeof data.result === 'string') {
						try {
							const parsedResult = JSON.parse(data.result);
							result = JSON.stringify(parsedResult, null, 2);
						} catch {
							// If it's not valid JSON, just use the string as is
							result = data.result;
						}
					} else {
						// Otherwise, stringify the object with pretty formatting
						result = JSON.stringify(data.result, null, 2);
					}
				} catch (err) {
					console.error('Error formatting result:', err);
					result = String(data.result);
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			loading = false;
		}
	}

	function toggleDropdown() {
		if (savedQueriesDropdown) {
			savedQueriesDropdown.classList.toggle('hidden');
		}
	}

	function hideDropdown() {
		if (savedQueriesDropdown) {
			savedQueriesDropdown.classList.add('hidden');
		}
	}
</script>

<div class="container mx-auto max-w-4xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Cloudflare Analytics Engine Playground</h1>
		<a
			href="https://developers.cloudflare.com/analytics/analytics-engine/sql-api/"
			target="_blank"
			rel="noopener noreferrer"
			class="flex items-center text-blue-600 hover:text-blue-800"
		>
			<span>Documentation</span>
			<svg
				class="ml-1 h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
				></path>
			</svg>
		</a>
	</div>

	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
		<div>
			<label for="accountId" class="mb-1 block text-sm font-medium">Cloudflare Account ID</label>
			<input
				id="accountId"
				type="text"
				bind:value={accountId}
				class="w-full rounded border p-2"
				placeholder="Enter your Cloudflare Account ID"
			/>
		</div>
		<div>
			<label for="apiKey" class="mb-1 block text-sm font-medium">API Key</label>
			<input
				id="apiKey"
				type="password"
				bind:value={apiKey}
				class="w-full rounded border p-2"
				placeholder="Enter your Cloudflare API Key"
			/>
		</div>
	</div>

	<div class="mb-6">
		<div class="mb-1 flex items-center justify-between">
			<label for="sqlEditor" class="block text-sm font-medium">SQL Query</label>
			<div class="flex space-x-2">
				<button
					on:click={() => (showSaveDialog = true)}
					class="rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300"
				>
					Save Query
				</button>
				{#if savedQueries.length > 0}
					<div class="relative inline-block text-left">
						<button
							type="button"
							class="inline-flex items-center rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300"
							on:click={toggleDropdown}
						>
							Load Query
							<svg
								class="ml-1 h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								></path>
							</svg>
						</button>
						<div
							id="saved-queries-dropdown"
							bind:this={savedQueriesDropdown}
							class="ring-opacity-5 absolute right-0 z-10 mt-2 hidden w-56 rounded-md bg-white shadow-lg ring-1 ring-black"
						>
							<div class="py-1" role="menu" aria-orientation="vertical">
								{#each savedQueries as query, i}
									<div
										class="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
									>
										<button
											class="flex-grow text-left"
											on:click={() => {
												loadQuery(query.query);
												hideDropdown();
											}}
										>
											{query.name}
										</button>
										<button
											class="text-red-500 hover:text-red-700"
											on:click={() => {
												deleteQuery(i);
												hideDropdown();
											}}
											aria-label={`Delete query ${query.name}`}
										>
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												></path>
											</svg>
										</button>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
		<div id="sqlEditor" bind:this={editorElement} class="h-64 rounded border"></div>
	</div>

	<div class="mb-6">
		<h2 class="mb-2 text-lg font-semibold">Example Queries</h2>
		<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
			{#each exampleQueries as example}
				<button
					on:click={() => loadQuery(example.query)}
					class="rounded border p-2 text-left hover:bg-gray-100"
				>
					{example.name}
				</button>
			{/each}
		</div>
	</div>

	<div class="mb-6">
		<button
			on:click={executeQuery}
			disabled={loading}
			class="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{loading ? 'Executing...' : 'Execute Query'}
		</button>
	</div>

	{#if error}
		<div class="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
			<p class="font-medium">Error:</p>
			<p>{error}</p>
		</div>
	{/if}

	{#if result}
		<div class="mb-6">
			<h2 class="mb-2 text-xl font-semibold">Result:</h2>
			<pre class="max-h-96 overflow-auto rounded bg-gray-100 p-4 whitespace-pre-wrap">{result}</pre>
		</div>
	{/if}
</div>

{#if showSaveDialog}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-semibold">Save Query</h2>
			<div class="mb-4">
				<label for="queryName" class="mb-1 block text-sm font-medium">Query Name</label>
				<input
					id="queryName"
					type="text"
					bind:value={newQueryName}
					class="w-full rounded border p-2"
					placeholder="Enter a name for your query"
				/>
			</div>
			<div class="flex justify-end space-x-2">
				<button
					on:click={() => (showSaveDialog = false)}
					class="rounded border px-4 py-2 hover:bg-gray-100"
				>
					Cancel
				</button>
				<button
					on:click={saveQuery}
					class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* CodeMirror styling */
	:global(.cm-editor) {
		height: 100%;
		border-radius: 0.25rem;
	}

	:global(.cm-scroller) {
		overflow: auto;
	}
</style>
