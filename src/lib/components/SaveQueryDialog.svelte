<script lang="ts">
	const {
		showSaveDialog = false,
		newQueryName = '',
		saveQuery,
		closeDialog,
		onQueryNameChange
	} = $props<{
		showSaveDialog?: boolean;
		newQueryName?: string;
		saveQuery: () => void;
		closeDialog: () => void;
		onQueryNameChange?: (name: string) => void;
	}>();

	let queryName = $state(newQueryName);

	function handleNameChange(e: Event) {
		const target = e.target as HTMLInputElement;
		queryName = target.value;
		if (onQueryNameChange) {
			onQueryNameChange(queryName);
		}
	}

	$effect(() => {
		if (newQueryName !== queryName) {
			queryName = newQueryName;
		}
	});
</script>

{#if showSaveDialog}
	<div class="bg-opacity-30 fixed inset-0 z-50 flex items-center justify-center bg-black">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-semibold">Save Query</h2>
			<div class="mb-4">
				<label for="queryName" class="mb-1 block text-sm font-medium">Query Name</label>
				<input
					id="queryName"
					type="text"
					value={queryName}
					oninput={handleNameChange}
					class="w-full rounded border p-2"
					placeholder="Enter a name for your query"
				/>
			</div>
			<div class="flex justify-end space-x-2">
				<button onclick={closeDialog} class="rounded border px-4 py-2 hover:bg-gray-100">
					Cancel
				</button>
				<button
					onclick={saveQuery}
					class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}
