<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		padding?: 'none' | 'sm' | 'md' | 'lg';
		children: Snippet;
		header?: Snippet;
		footer?: Snippet;
	}

	let {
		padding = 'md',
		children,
		header,
		footer,
		class: className = '',
		...rest
	}: Props = $props();

	const paddings = {
		none: '',
		sm: 'p-3',
		md: 'p-5',
		lg: 'p-6'
	};
</script>

<div
	class="bg-white border border-gray-200 rounded-lg shadow-sm {className}"
	{...rest}
>
	{#if header}
		<div class="px-5 py-4 border-b border-gray-100 font-medium text-gray-900">
			{@render header()}
		</div>
	{/if}
	<div class={paddings[padding]}>
		{@render children()}
	</div>
	{#if footer}
		<div class="px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg flex justify-end gap-2">
			{@render footer()}
		</div>
	{/if}
</div>
