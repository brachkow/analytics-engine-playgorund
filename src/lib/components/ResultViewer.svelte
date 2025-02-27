<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { json } from '@codemirror/lang-json';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorState } from '@codemirror/state';
	import { keymap } from '@codemirror/view';
	import { indentWithTab } from '@codemirror/commands';

	const { result = '', loading = false } = $props<{
		result?: string;
		loading?: boolean;
	}>();

	let resultEditorElement: HTMLElement;
	let resultEditorView: EditorView;
	let viewMode = $state('table'); // 'table' or 'raw'
	let parsedResult = $state<any>(null);
	let parseError = $state<string | null>(null);

	onMount(() => {
		// Initialize Result CodeMirror (readonly)
		initializeEditor();
	});

	onDestroy(() => {
		if (resultEditorView) {
			resultEditorView.destroy();
		}
	});

	// Initialize or reinitialize the editor
	function initializeEditor() {
		try {
			// Destroy existing editor if it exists
			if (resultEditorView) {
				resultEditorView.destroy();
			}

			// Only initialize if the element exists
			if (resultEditorElement) {
				resultEditorView = new EditorView({
					doc: result || '// Results will appear here after executing a query',
					extensions: [
						basicSetup,
						json(),
						oneDark,
						keymap.of([indentWithTab]),
						EditorState.readOnly.of(true)
					],
					parent: resultEditorElement
				});
			}
		} catch (e) {
			console.error('Error initializing result editor:', e);
		}
	}

	// Parse the result when it changes
	$effect(() => {
		if (result) {
			try {
				parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
				parseError = null;
			} catch (e) {
				console.error('Error parsing result:', e);
				parsedResult = null;
				parseError = 'Failed to parse result as JSON';
			}
		} else {
			parsedResult = null;
		}
	});

	// Update result editor when result changes or view mode changes
	$effect(() => {
		if (resultEditorView && result) {
			resultEditorView.dispatch({
				changes: { from: 0, to: resultEditorView.state.doc.length, insert: result }
			});
		}
	});

	// Reinitialize editor when view mode changes to raw
	$effect(() => {
		if (viewMode === 'raw' && result) {
			// Use setTimeout to ensure the DOM is updated before initializing
			setTimeout(() => {
				initializeEditor();
			}, 0);
		}
	});

	function toggleViewMode() {
		viewMode = viewMode === 'table' ? 'raw' : 'table';
	}

	// Helper function to determine if a value is a number
	function isNumber(value: any): boolean {
		return typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
	}

	// Helper function to format cell values
	function formatCellValue(value: any): string {
		if (value === null || value === undefined) {
			return '';
		} else if (typeof value === 'object') {
			return JSON.stringify(value);
		}
		return String(value);
	}
</script>

<div class="flex w-full flex-col">
	<div class="mb-2 flex items-center justify-between">
		<h2 class="text-xl font-semibold">Result:</h2>
		<div class="flex items-center gap-2">
			{#if loading}
				<div class="text-sm text-gray-600">Executing query...</div>
			{/if}
			{#if result}
				<button
					onclick={toggleViewMode}
					class="rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300"
				>
					{viewMode === 'table' ? 'View Raw' : 'View Table'}
				</button>
			{/if}
		</div>
	</div>

	{#if !result}
		<div class="flex h-full items-center justify-center text-gray-500">
			Execute a query to see results
		</div>
	{:else if viewMode === 'table' && parsedResult}
		<div class="h-full overflow-auto p-2">
			{#if parseError}
				<div class="text-red-500">{parseError}</div>
			{:else if parsedResult.meta && parsedResult.data}
				<!-- Table view for structured data -->
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-sm">
						<thead>
							<tr class="bg-gray-100">
								{#each parsedResult.meta as column}
									<th class="border border-gray-300 p-2 text-left">{column.name}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each parsedResult.data as row}
								<tr class="hover:bg-gray-50">
									{#each parsedResult.meta as column}
										<td
											class="border border-gray-300 p-2 {isNumber(row[column.name])
												? 'text-right'
												: 'text-left'} {column.type === 'DateTime' ? 'whitespace-nowrap' : ''}"
										>
											{formatCellValue(row[column.name])}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
					{#if parsedResult.rows !== undefined}
						<div class="mt-2 text-sm text-gray-600">
							Showing {parsedResult.rows} row{parsedResult.rows !== 1 ? 's' : ''}
							{#if parsedResult.rows_before_limit_at_least > parsedResult.rows}
								of at least {parsedResult.rows_before_limit_at_least}
							{/if}
						</div>
					{/if}
				</div>
			{:else}
				<!-- Generic table view for other JSON structures -->
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-sm">
						{#if Array.isArray(parsedResult)}
							<!-- Array of objects -->
							{#if parsedResult.length > 0 && typeof parsedResult[0] === 'object'}
								<thead>
									<tr class="bg-gray-100">
										{#each Object.keys(parsedResult[0]) as key}
											<th class="border border-gray-300 p-2 text-left">{key}</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each parsedResult as item}
										<tr class="hover:bg-gray-50">
											{#each Object.keys(parsedResult[0]) as key}
												<td
													class="border border-gray-300 p-2 {isNumber(item[key])
														? 'text-right'
														: 'text-left'}"
												>
													{formatCellValue(item[key])}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							{:else}
								<!-- Simple array -->
								<thead>
									<tr class="bg-gray-100">
										<th class="border border-gray-300 p-2 text-left">Index</th>
										<th class="border border-gray-300 p-2 text-left">Value</th>
									</tr>
								</thead>
								<tbody>
									{#each parsedResult as item, index}
										<tr class="hover:bg-gray-50">
											<td class="border border-gray-300 p-2 text-right">{index}</td>
											<td class="border border-gray-300 p-2">{formatCellValue(item)}</td>
										</tr>
									{/each}
								</tbody>
							{/if}
						{:else if typeof parsedResult === 'object'}
							<!-- Simple object -->
							<thead>
								<tr class="bg-gray-100">
									<th class="border border-gray-300 p-2 text-left">Key</th>
									<th class="border border-gray-300 p-2 text-left">Value</th>
								</tr>
							</thead>
							<tbody>
								{#each Object.entries(parsedResult) as [key, value]}
									<tr class="hover:bg-gray-50">
										<td class="border border-gray-300 p-2">{key}</td>
										<td class="border border-gray-300 p-2">{formatCellValue(value)}</td>
									</tr>
								{/each}
							</tbody>
						{:else}
							<div class="p-4">
								{formatCellValue(parsedResult)}
							</div>
						{/if}
					</table>
				</div>
			{/if}
		</div>
	{:else}
		<div id="resultEditor" bind:this={resultEditorElement} class="h-full"></div>
	{/if}
</div>

<style>
	/* Make sure table headers stay fixed when scrolling horizontally */
	thead {
		position: sticky;
		top: 0;
		z-index: 1;
	}
</style>
