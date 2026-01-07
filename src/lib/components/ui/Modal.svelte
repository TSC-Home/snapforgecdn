<script lang="ts">
	import type { Snippet } from 'svelte';
	import { scale, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose?: () => void;
		title?: string;
		children: Snippet;
		footer?: Snippet;
		size?: 'sm' | 'md' | 'lg' | 'xl';
	}

	let {
		open = $bindable(false),
		onclose,
		title,
		children,
		footer,
		size = 'md'
	}: Props = $props();

	const sizes = {
		sm: 'max-w-sm',
		md: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl'
	};

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			open = false;
			onclose?.();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			onclose?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		onclick={handleBackdropClick}
		role="presentation"
		transition:fade={{ duration: 150 }}
	>
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-gray-900/20 backdrop-blur-sm"></div>

		<!-- Modal -->
		<div
			class="relative w-full {sizes[size]} bg-white rounded-xl shadow-xl border border-gray-200"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			{#if title}
				<div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
					<h2 class="text-lg font-semibold text-gray-900">{title}</h2>
					<button
						onclick={() => { open = false; onclose?.(); }}
						class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all"
						aria-label="Close"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}
			<div class="p-5">
				{@render children()}
			</div>
			{#if footer}
				<div class="px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex justify-end gap-2">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
