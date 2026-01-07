<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Option {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props extends Omit<HTMLSelectAttributes, 'value'> {
		label?: string;
		error?: string;
		hint?: string;
		options: Option[];
		value?: string;
		placeholder?: string;
	}

	let {
		label,
		error,
		hint,
		options,
		value = $bindable(''),
		placeholder,
		id,
		class: className = '',
		...rest
	}: Props = $props();

	const selectId = id || crypto.randomUUID();
</script>

<div class="w-full">
	{#if label}
		<label for={selectId} class="block text-sm font-medium text-gray-700 mb-1.5">
			{label}
		</label>
	{/if}
	<div class="relative">
		<select
			id={selectId}
			bind:value
			class="block w-full h-10 pl-3 pr-10 text-sm bg-white border rounded-md shadow-sm
				appearance-none cursor-pointer transition-all duration-150 ease-out
				{error
					? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
					: 'border-gray-200 hover:border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-100'}
				focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed {className}"
			{...rest}
		>
			{#if placeholder}
				<option value="" disabled>{placeholder}</option>
			{/if}
			{#each options as option}
				<option value={option.value} disabled={option.disabled}>
					{option.label}
				</option>
			{/each}
		</select>
		<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
			<svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</div>
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
