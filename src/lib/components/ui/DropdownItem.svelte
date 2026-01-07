<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		onclick?: () => void;
		href?: string;
		danger?: boolean;
		disabled?: boolean;
	}

	let { children, onclick, href, danger = false, disabled = false }: Props = $props();

	const baseStyles = 'block w-full px-4 py-2 text-sm text-left transition-colors';
	const enabledStyles = danger
		? 'text-red-600 hover:bg-red-50'
		: 'text-gray-700 hover:bg-gray-50';
	const disabledStyles = 'text-gray-400 cursor-not-allowed';
</script>

{#if href && !disabled}
	<a {href} class="{baseStyles} {enabledStyles}">
		{@render children()}
	</a>
{:else}
	<button
		type="button"
		{onclick}
		{disabled}
		class="{baseStyles} {disabled ? disabledStyles : enabledStyles}"
	>
		{@render children()}
	</button>
{/if}
