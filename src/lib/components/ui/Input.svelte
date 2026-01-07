<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		label?: string;
		error?: string;
		hint?: string;
		value?: string;
	}

	let {
		label,
		error,
		hint,
		id,
		value = $bindable(''),
		class: className = '',
		...rest
	}: Props = $props();

	const inputId = id ?? crypto.randomUUID();
</script>

<div class="w-full">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-gray-700 mb-1.5">
			{label}
		</label>
	{/if}
	<input
		id={inputId}
		bind:value
		class="block w-full h-10 px-3 text-sm bg-white border rounded-md shadow-sm
			transition-all duration-150 ease-out
			placeholder:text-gray-400
			{error
				? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
				: 'border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100'}
			focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed {className}"
		{...rest}
	/>
	{#if error}
		<p class="mt-1.5 text-sm text-red-600 flex items-center gap-1">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			{error}
		</p>
	{:else if hint}
		<p class="mt-1.5 text-sm text-gray-500">{hint}</p>
	{/if}
</div>
