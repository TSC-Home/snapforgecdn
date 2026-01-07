<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		trigger: Snippet;
		children: Snippet;
		align?: 'left' | 'right';
	}

	let { trigger, children, align = 'left' }: Props = $props();
	let open = $state(false);
	let dropdownRef: HTMLDivElement;

	function handleClickOutside(e: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
			open = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative inline-block" bind:this={dropdownRef}>
	<div onclick={() => (open = !open)} onkeydown={(e) => e.key === 'Enter' && (open = !open)} role="button" tabindex="0">
		{@render trigger()}
	</div>

	{#if open}
		<div
			class="absolute z-40 mt-1 min-w-[160px] bg-white border border-gray-200 shadow-lg py-1
				{align === 'right' ? 'right-0' : 'left-0'}"
		>
			{@render children()}
		</div>
	{/if}
</div>
