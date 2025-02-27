<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import CredentialsInput from '$lib/components/CredentialsInput.svelte';
	import TableList from '$lib/components/TableList.svelte';
	import SqlEditor from '$lib/components/SqlEditor.svelte';
	import ResultViewer from '$lib/components/ResultViewer.svelte';
	import SavedQueriesDropdown from '$lib/components/SavedQueriesDropdown.svelte';
	import SaveQueryDialog from '$lib/components/SaveQueryDialog.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import * as analyticsService from '$lib/services/analyticsService';

	// State variables
	let accountId = $state('');
	let apiKey = $state('');
	let sqlQuery = $state('SELECT * FROM http_requests LIMIT 10');
	let result = $state('');
	let error = $state('');
	let loading = $state(false);
	let savedQueries: { name: string; query: string }[] = $state([]);
	let newQueryName = $state('');
	let showSaveDialog = $state(false);
	let savedQueriesVisible = $state(false);
	let tables: string[] = $state([]);
	let loadingTables = $state(false);
	let credentialsComplete = $state(false);
	let lastSelectedTable = $state('');

	// SQL Editor reference
	let sqlEditorApi = $state<{ updateEditor: (query: string) => void } | null>(null);

	// Check if credentials are complete
	$effect(() => {
		const hasCredentials = accountId && apiKey;
		if (hasCredentials && !credentialsComplete) {
			credentialsComplete = true;
			fetchTables();
		} else if (!hasCredentials) {
			credentialsComplete = false;
		}
	});

	onMount(() => {
		// Load saved credentials from localStorage
		const credentials = analyticsService.loadCredentials();
		accountId = credentials.accountId;
		apiKey = credentials.apiKey;

		// Load saved queries from localStorage
		savedQueries = analyticsService.loadSavedQueries();

		// Load last selected table from localStorage
		lastSelectedTable = analyticsService.loadLastSelectedTable();
	});

	// Functions for handling saved queries
	function saveQuery() {
		if (!newQueryName || !sqlQuery) return;

		const existingIndex = savedQueries.findIndex((q) => q.name === newQueryName);

		if (existingIndex >= 0) {
			savedQueries[existingIndex].query = sqlQuery;
		} else {
			savedQueries = [...savedQueries, { name: newQueryName, query: sqlQuery }];
		}

		analyticsService.saveQueries(savedQueries);
		newQueryName = '';
		showSaveDialog = false;
	}

	function loadQuery(query: string) {
		sqlQuery = query;
		if (sqlEditorApi) {
			sqlEditorApi.updateEditor(query);
		}
	}

	function deleteQuery(index: number) {
		savedQueries = savedQueries.filter((_, i) => i !== index);
		analyticsService.saveQueries(savedQueries);
	}

	// Functions for query execution
	async function executeQuery() {
		if (!accountId || !apiKey || !sqlQuery) {
			error = 'Please provide Account ID, API Key, and SQL query';
			return;
		}

		// Save credentials
		analyticsService.saveCredentials({ accountId, apiKey });

		loading = true;
		error = '';
		result = '';

		try {
			const queryResult = await analyticsService.executeQuery({ accountId, apiKey }, sqlQuery);

			if (!queryResult.success) {
				error = queryResult.error || 'An error occurred while executing the query';
			} else {
				result = analyticsService.formatResult(queryResult.result);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			loading = false;
		}
	}

	// Functions for table fetching
	async function fetchTables() {
		if (!accountId || !apiKey) {
			error = 'Please provide Account ID and API Key';
			return;
		}

		// Save credentials
		analyticsService.saveCredentials({ accountId, apiKey });

		loadingTables = true;
		error = '';
		tables = [];

		try {
			const queryResult = await analyticsService.executeQuery({ accountId, apiKey }, 'SHOW TABLES');

			if (!queryResult.success) {
				error = queryResult.error || 'An error occurred while fetching tables';
			} else {
				// Handle the specific response format for SHOW TABLES
				if (
					queryResult.result &&
					queryResult.result.data &&
					Array.isArray(queryResult.result.data)
				) {
					tables = queryResult.result.data.map((item: any) => item.dataset).filter(Boolean);

					// If we have a last selected table and it exists in the tables list, select it
					if (lastSelectedTable && tables.includes(lastSelectedTable)) {
						selectTable(lastSelectedTable);
					}
				}

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
		const query = `SELECT * FROM '${tableName}' LIMIT 10`;
		loadQuery(query);

		// Save the selected table
		lastSelectedTable = tableName;
		analyticsService.saveLastSelectedTable(tableName);
	}

	// Functions for dropdown handling
	function toggleDropdown() {
		savedQueriesVisible = !savedQueriesVisible;
	}

	function setShowSaveDialog(show: boolean) {
		showSaveDialog = show;
	}

	function handleAccountIdChange(id: string) {
		accountId = id;
	}

	function handleApiKeyChange(key: string) {
		apiKey = key;
	}

	function handleSqlQueryChange(query: string) {
		sqlQuery = query;
	}

	function handleQueryNameChange(name: string) {
		newQueryName = name;
	}

	function handleDropdownVisibilityChange(visible: boolean) {
		savedQueriesVisible = visible;
	}

	function handleEditorReady(editor: { updateEditor: (query: string) => void }) {
		sqlEditorApi = editor;
	}
</script>

<div class="container mx-auto max-w-6xl p-4">
	<Header />

	<!-- Single column layout -->
	<div class="flex flex-col gap-6">
		<!-- Credentials section -->
		<CredentialsInput
			{accountId}
			{apiKey}
			onAccountIdChange={handleAccountIdChange}
			onApiKeyChange={handleApiKeyChange}
		/>

		<!-- Tables section -->
		<TableList
			{tables}
			{loadingTables}
			{error}
			{selectTable}
			{fetchTables}
			hasCredentials={!!accountId && !!apiKey}
			{lastSelectedTable}
		/>

		<!-- SQL Editor section -->
		<div class="relative">
			<SqlEditor
				{sqlQuery}
				onSqlQueryChange={handleSqlQueryChange}
				onEditorReady={handleEditorReady}
				showSaveDialog={setShowSaveDialog}
				hasSavedQueries={savedQueries.length > 0}
				toggleSavedQueriesDropdown={toggleDropdown}
				{executeQuery}
				{loading}
				{error}
			/>

			<SavedQueriesDropdown
				{savedQueries}
				{loadQuery}
				{deleteQuery}
				isVisible={savedQueriesVisible}
				onVisibilityChange={handleDropdownVisibilityChange}
			/>
		</div>

		<!-- Results section -->
		<ResultViewer {result} {loading} />
	</div>

	<Footer />
</div>

<SaveQueryDialog
	{showSaveDialog}
	{newQueryName}
	onQueryNameChange={handleQueryNameChange}
	{saveQuery}
	closeDialog={() => setShowSaveDialog(false)}
/>

<style>
	/* CodeMirror styling */
	:global(.cm-editor) {
		height: 100%;
		border-radius: 0.25rem;
		overflow: hidden;
	}

	:global(.cm-scroller) {
		overflow: auto;
	}

	@media (max-width: 768px) {
		:global(.cm-editor) {
			min-height: 200px;
		}
	}
</style>
