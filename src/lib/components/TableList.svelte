<script lang="ts">
	const {
		tables = [],
		loadingTables = false,
		error = '',
		selectTable,
		fetchTables,
		hasCredentials = false,
		lastSelectedTable = ''
	} = $props<{
		tables?: string[];
		loadingTables?: boolean;
		error?: string;
		selectTable: (tableName: string) => void;
		fetchTables: () => void;
		hasCredentials?: boolean;
		lastSelectedTable?: string;
	}>();
</script>

{#if tables.length > 0}
	<div class="mb-4">
		<h2 class="mb-2 text-lg font-semibold">Available Tables:</h2>
		<div class="flex flex-wrap gap-2">
			{#each tables as table}
				<button
					onclick={() => selectTable(table)}
					class={`rounded px-3 py-1 text-sm ${
						lastSelectedTable === table
							? 'bg-blue-500 text-white'
							: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
					}`}
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
			No tables found. This could be because you haven't published any data to Analytics Engine yet.
		</p>
	</div>
{/if}

<div class="mb-4">
	<button
		onclick={fetchTables}
		disabled={loadingTables || !hasCredentials}
		class="rounded bg-gray-600 px-4 py-2 font-medium text-white hover:bg-gray-700 disabled:opacity-50"
	>
		{loadingTables ? 'Loading Tables...' : 'Fetch available tables'}
	</button>
</div>
