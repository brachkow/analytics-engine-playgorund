<script lang="ts">
	const {
		savedQueries = [],
		loadQuery,
		deleteQuery,
		isVisible = false,
		onVisibilityChange
	} = $props<{
		savedQueries?: { name: string; query: string }[];
		loadQuery: (query: string) => void;
		deleteQuery: (index: number) => void;
		isVisible?: boolean;
		onVisibilityChange?: (visible: boolean) => void;
	}>();

	function handleLoadQuery(query: string) {
		loadQuery(query);
		if (onVisibilityChange) {
			onVisibilityChange(false);
		}
	}
</script>

<div
	id="saved-queries-dropdown"
	class="ring-opacity-5 absolute right-0 z-10 mt-2 {isVisible
		? ''
		: 'hidden'} w-56 rounded-md bg-white shadow-lg ring-1 ring-black"
>
	<div class="py-1" role="menu" aria-orientation="vertical">
		{#each savedQueries as query, i}
			<div
				class="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
			>
				<button class="flex-grow text-left" onclick={() => handleLoadQuery(query.query)}>
					{query.name}
				</button>
				<button
					class="text-red-500 hover:text-red-700"
					onclick={() => {
						deleteQuery(i);
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
