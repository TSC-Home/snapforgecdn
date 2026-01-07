<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		header?: Snippet;
	}

	let { children, header }: Props = $props();
</script>

<div class="overflow-x-auto border border-gray-200">
	<table class="w-full text-sm">
		{#if header}
			<thead class="bg-gray-50 border-b border-gray-200">
				{@render header()}
			</thead>
		{/if}
		<tbody class="divide-y divide-gray-200">
			{@render children()}
		</tbody>
	</table>
</div>
