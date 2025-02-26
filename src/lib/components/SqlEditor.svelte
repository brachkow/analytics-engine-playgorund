<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { sql } from '@codemirror/lang-sql';
	import { EditorState } from '@codemirror/state';
	import { oneDark } from '@codemirror/theme-one-dark';

	const props = $props<{
		sqlQuery: string;
		onSqlQueryChange: (query: string) => void;
		onEditorReady: (api: { updateEditor: (query: string) => void }) => void;
		showSaveDialog: (show: boolean) => void;
		hasSavedQueries: boolean;
		toggleSavedQueriesDropdown: () => void;
		executeQuery: () => void;
		loading: boolean;
		error: string;
	}>();

	let editorContainer: HTMLElement;
	let editor: EditorView;

	// Function to update the editor content
	function updateEditor(query: string) {
		if (editor) {
			const transaction = editor.state.update({
				changes: {
					from: 0,
					to: editor.state.doc.length,
					insert: query
				}
			});
			editor.dispatch(transaction);
		}
	}

	onMount(() => {
		// Initialize CodeMirror
		const startState = EditorState.create({
			doc: props.sqlQuery,
			extensions: [
				basicSetup,
				sql(),
				oneDark,
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						const newQuery = update.state.doc.toString();
						props.onSqlQueryChange(newQuery);
					}
				})
			]
		});

		editor = new EditorView({
			state: startState,
			parent: editorContainer
		});

		// Expose the updateEditor function to the parent component
		props.onEditorReady({ updateEditor });

		return () => {
			editor.destroy();
		};
	});
</script>

<div class="flex flex-col">
	<div class="mb-4 h-64 w-full overflow-hidden rounded border" bind:this={editorContainer}></div>

	{#if props.error}
		<div class="mb-2 rounded bg-red-100 p-2 text-red-700">
			{props.error}
		</div>
	{/if}

	<div class="mb-2 flex items-center justify-between">
		<div class="flex gap-2">
			<button
				class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
				onclick={() => props.executeQuery()}
				disabled={props.loading}
			>
				{props.loading ? 'Running...' : 'Run Query'}
			</button>
			<button
				class="rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-700"
				onclick={() => props.showSaveDialog(true)}
			>
				Save Query
			</button>
		</div>
		{#if props.hasSavedQueries}
			<button
				class="rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
				onclick={props.toggleSavedQueriesDropdown}
			>
				Saved Queries
			</button>
		{/if}
	</div>
</div>
