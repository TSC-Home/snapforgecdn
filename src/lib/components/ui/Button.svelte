<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		loading?: boolean;
		disabled?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
		class?: string;
	}

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		disabled = false,
		href,
		type = 'button',
		onclick,
		children,
		class: className = ''
	}: Props = $props();

	const baseStyles = `
		inline-flex items-center justify-center font-medium
		rounded-md transition-all duration-150 ease-out
		focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2
		disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
		active:scale-[0.98]
	`;

	const variants: Record<Variant, string> = {
		primary: 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md',
		secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
		ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
		danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md'
	};

	const sizes: Record<Size, string> = {
		sm: 'h-8 px-3 text-sm gap-1.5',
		md: 'h-10 px-4 text-sm gap-2',
		lg: 'h-12 px-6 text-base gap-2'
	};
</script>

{#if href}
	<a
		{href}
		class="{baseStyles} {variants[variant]} {sizes[size]} {className}"
		class:pointer-events-none={disabled}
		class:opacity-50={disabled}
	>
		{@render children()}
	</a>
{:else}
	<button
		{type}
		{onclick}
		class="{baseStyles} {variants[variant]} {sizes[size]} {className}"
		disabled={disabled || loading}
	>
		{#if loading}
			<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
			</svg>
		{/if}
		{@render children()}
	</button>
{/if}
