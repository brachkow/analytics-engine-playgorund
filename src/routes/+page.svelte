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
	let tables: string[] = [];
	let loadingTables = false;

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

	async function fetchTables() {
		if (!accountId || !apiKey) {
			error = 'Please provide Account ID and API Key';
			return;
		}

		// Save credentials
		saveCredentials();

		loadingTables = true;
		error = '';
		tables = [];

		try {
			const response = await fetch('/api/analytics', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					accountId,
					apiKey,
					sql: 'SHOW TABLES'
				})
			});

			const data = await response.json();
			console.log('SHOW TABLES response:', data);

			if (!response.ok || !data.success) {
				error = data.errors?.[0]?.message || 'An error occurred while fetching tables';
			} else {
				// Handle the specific response format for SHOW TABLES
				if (data.result && data.result.data && Array.isArray(data.result.data)) {
					tables = data.result.data.map((item: any) => item.dataset).filter(Boolean);
				}

				console.log('Processed tables:', tables);

				if (tables.length === 0) {
					error = 'No tables found. This could be because your account has no data yet.';
				}
			}
		} catch (err) {
			console.error('Error fetching tables:', err);
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			loadingTables = false;
		}
	}

	function selectTable(tableName: string) {
		const query = `SELECT * FROM ${tableName} LIMIT 10`;
		loadQuery(query);
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

<svelte:head>
	<title>Cloudflare Analytics Engine Playground</title>
	<meta
		name="description"
		content="A playground for exploring Cloudflare Analytics Engine SQL API"
	/>
	<meta name="keywords" content="cloudflare, analytics, sql, api, playground" />
	<meta property="og:title" content="Cloudflare Analytics Engine Playground" />
	<meta
		property="og:description"
		content="A playground for exploring Cloudflare Analytics Engine SQL API"
	/>
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Cloudflare Analytics Engine Playground" />
	<meta
		name="twitter:description"
		content="A playground for exploring Cloudflare Analytics Engine SQL API"
	/>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Cloudflare Analytics Engine Playground</h1>
		<div class="flex items-center space-x-4">
			<a
				href="https://github.com/brachkow/analytics-engine-playground"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center text-gray-600 hover:text-gray-800"
			>
				<svg
					class="h-6 w-6"
					fill="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
					/>
				</svg>
				<span class="ml-1">GitHub</span>
			</a>
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
	</div>

	<div class="mb-4 rounded-lg bg-blue-50 p-4 text-blue-800">
		<p>
			<strong>Note:</strong> This app runs entirely in your browser. Your Cloudflare credentials are
			stored only in your local browser's storage and are never sent to any server other than Cloudflare's
			API.
		</p>
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

	<div class="mb-4">
		<button
			on:click={fetchTables}
			disabled={loadingTables || !accountId || !apiKey}
			class="rounded bg-gray-600 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
		>
			{loadingTables ? 'Loading Tables...' : 'Show Available Tables'}
		</button>
	</div>

	{#if tables.length > 0}
		<div class="mb-6">
			<h2 class="mb-2 text-lg font-semibold">Available Tables:</h2>
			<div class="flex flex-wrap gap-2">
				{#each tables as table}
					<button
						on:click={() => selectTable(table)}
						class="rounded bg-blue-100 px-3 py-1 text-sm text-blue-800 hover:bg-blue-200"
					>
						{table}
					</button>
				{/each}
			</div>
		</div>
	{:else if loadingTables}
		<div class="mb-6">
			<p class="text-gray-600">Loading tables...</p>
		</div>
	{:else if error && error.includes('No tables found')}
		<div class="mb-6 rounded-lg bg-yellow-50 p-4 text-yellow-800">
			<p>
				No tables found. This could be because you haven't published any data to Analytics Engine
				yet.
			</p>
		</div>
	{/if}

	<div class="mb-6">
		<div class="mb-1 flex items-center justify-between">
			<label for="sqlEditor" class="block text-sm font-medium">SQL Query</label>
			<div class="flex space-x-2">
				<button
					on:click={() => loadQuery("SELECT 'Hello Cloudflare Analytics Engine' AS message")}
					class="rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300"
					title="Run a simple test query"
				>
					Sample Query
				</button>
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
	<div class="bg-opacity-30 fixed inset-0 z-50 flex items-center justify-center bg-black">
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
