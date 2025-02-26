<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { json } from '@codemirror/lang-json';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorState } from '@codemirror/state';

	const { result = '', loading = false } = $props<{
		result?: string;
		loading?: boolean;
	}>();

	let resultEditorElement: HTMLElement;
	let resultEditorView: EditorView;

	onMount(() => {
		// Initialize Result CodeMirror (readonly)
		try {
			resultEditorView = new EditorView({
				doc: result || '// Results will appear here after executing a query',
				extensions: [basicSetup, json(), oneDark, EditorState.readOnly.of(true)],
				parent: resultEditorElement
			});
		} catch (e) {
			console.error('Error initializing result editor:', e);
		}
	});

	onDestroy(() => {
		if (resultEditorView) {
			resultEditorView.destroy();
		}
	});

	// Update result editor when result changes
	$effect(() => {
		if (resultEditorView && result) {
			resultEditorView.dispatch({
				changes: { from: 0, to: resultEditorView.state.doc.length, insert: result }
			});
		}
	});
</script>

<div class="flex h-[300px] w-full flex-col md:h-auto md:w-1/2">
	<div class="mb-2 flex items-center justify-between">
		<h2 class="text-xl font-semibold">Result:</h2>
		{#if loading}
			<div class="text-sm text-gray-600">Executing query...</div>
		{/if}
	</div>
	<div id="resultEditor" bind:this={resultEditorElement} class="flex-grow rounded border"></div>
</div>
