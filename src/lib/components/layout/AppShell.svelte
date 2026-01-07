<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		sidebar?: Snippet;
		header?: Snippet;
		children: Snippet;
	}

	let { sidebar, header, children }: Props = $props();
</script>

<div class="min-h-screen bg-gray-50 flex">
	{#if sidebar}
		{@render sidebar()}
	{/if}

	<div class="flex-1 flex flex-col min-w-0">
		{#if header}
			{@render header()}
		{/if}

		<main class="flex-1 p-6 overflow-auto">
			{@render children()}
		</main>
	</div>
</div>
