<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		align?: 'left' | 'center' | 'right';
	}

	let { children, align = 'left' }: Props = $props();

	const alignments = {
		left: 'text-left',
		center: 'text-center',
		right: 'text-right'
	};
</script>

<th class="px-4 py-3 font-medium text-gray-700 {alignments[align]}">
	{@render children()}
</th>
