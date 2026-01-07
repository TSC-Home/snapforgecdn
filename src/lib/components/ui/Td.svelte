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

<td class="px-4 py-3 text-gray-600 {alignments[align]}">
	{@render children()}
</td>
