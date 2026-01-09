<script lang="ts">
	interface Props {
		name: string;
		color?: string | null;
		removable?: boolean;
		onremove?: () => void;
		onclick?: () => void;
		size?: 'sm' | 'md';
		active?: boolean;
	}

	let {
		name,
		color = null,
		removable = false,
		onremove,
		onclick,
		size = 'sm',
		active = false
	}: Props = $props();

	const bgColor = color ? `${color}20` : undefined;
	const textColor = color || undefined;
	const borderColor = color ? `${color}40` : undefined;
</script>

<span
	class="inline-flex items-center gap-1 rounded-full font-medium transition-colors
		{size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
		{onclick ? 'cursor-pointer hover:opacity-80' : ''}
		{active ? 'ring-2 ring-gray-900 ring-offset-1' : ''}"
	style:background-color={bgColor || (active ? '#1f293720' : '#f3f4f6')}
	style:color={textColor || '#374151'}
	style:border={borderColor ? `1px solid ${borderColor}` : '1px solid #e5e7eb'}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
	onclick={onclick}
	onkeydown={onclick ? (e) => e.key === 'Enter' && onclick?.() : undefined}
>
	{name}
	{#if removable && onremove}
		<button
			type="button"
			onclick={(e) => {
				e.stopPropagation();
				onremove?.();
			}}
			class="ml-0.5 -mr-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors"
		>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	{/if}
</span>
