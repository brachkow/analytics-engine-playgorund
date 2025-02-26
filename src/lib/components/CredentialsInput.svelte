<script lang="ts">
	const {
		accountId = '',
		apiKey = '',
		onAccountIdChange,
		onApiKeyChange
	} = $props<{
		accountId?: string;
		apiKey?: string;
		onAccountIdChange?: (id: string) => void;
		onApiKeyChange?: (key: string) => void;
	}>();

	let currentAccountId = $state(accountId);
	let currentApiKey = $state(apiKey);

	function handleAccountIdChange(e: Event) {
		const target = e.target as HTMLInputElement;
		currentAccountId = target.value;
		if (onAccountIdChange) {
			onAccountIdChange(currentAccountId);
		}
	}

	function handleApiKeyChange(e: Event) {
		const target = e.target as HTMLInputElement;
		currentApiKey = target.value;
		if (onApiKeyChange) {
			onApiKeyChange(currentApiKey);
		}
	}

	$effect(() => {
		if (accountId !== currentAccountId) {
			currentAccountId = accountId;
		}
	});

	$effect(() => {
		if (apiKey !== currentApiKey) {
			currentApiKey = apiKey;
		}
	});
</script>

<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
	<div>
		<label for="accountId" class="mb-1 block text-sm font-medium">Cloudflare Account ID</label>
		<input
			id="accountId"
			type="text"
			value={currentAccountId}
			oninput={handleAccountIdChange}
			class="w-full rounded border p-2"
			placeholder="Enter your Cloudflare Account ID"
		/>
	</div>
	<div>
		<label for="apiKey" class="mb-1 block text-sm font-medium">API Key</label>
		<input
			id="apiKey"
			type="password"
			value={currentApiKey}
			oninput={handleApiKeyChange}
			class="w-full rounded border p-2"
			placeholder="Enter your Cloudflare API Key"
		/>
	</div>
	<div class="col-span-1 text-sm md:col-span-2">
		<p>
			This app runs entirely in your browser. Your Cloudflare credentials are stored only in your
			browser's local storage and are never sent to any server other than Cloudflare's API.
		</p>
	</div>
</div>
