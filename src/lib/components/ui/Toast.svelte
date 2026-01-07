<script lang="ts" module>
	import { writable } from 'svelte/store';

	export type ToastType = 'success' | 'error' | 'info';

	interface Toast {
		id: string;
		message: string;
		type: ToastType;
	}

	export const toasts = writable<Toast[]>([]);

	export function toast(message: string, type: ToastType = 'info', duration = 4000) {
		const id = crypto.randomUUID();
		toasts.update((t) => [...t, { id, message, type }]);

		if (duration > 0) {
			setTimeout(() => {
				toasts.update((t) => t.filter((toast) => toast.id !== id));
			}, duration);
		}

		return id;
	}

	export function dismissToast(id: string) {
		toasts.update((t) => t.filter((toast) => toast.id !== id));
	}
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';

	const typeStyles = {
		success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
		error: 'bg-red-50 border-red-200 text-red-800',
		info: 'bg-gray-50 border-gray-200 text-gray-800'
	};

	const iconColors = {
		success: 'text-emerald-500',
		error: 'text-red-500',
		info: 'text-gray-500'
	};

	const icons = {
		success: 'M5 13l4 4L19 7',
		error: 'M6 18L18 6M6 6l12 12',
		info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
	};
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
	{#each $toasts as t (t.id)}
		<div
			class="flex items-center gap-3 px-4 py-3 min-w-[320px] max-w-md rounded-lg border shadow-lg {typeStyles[t.type]}"
			transition:fly={{ x: 100, duration: 200 }}
		>
			<svg class="w-5 h-5 flex-shrink-0 {iconColors[t.type]}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icons[t.type]} />
			</svg>
			<span class="flex-1 text-sm font-medium">{t.message}</span>
			<button
				onclick={() => dismissToast(t.id)}
				class="p-1 hover:bg-black/5 rounded transition-colors"
				aria-label="Dismiss"
			>
				<svg class="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/each}
</div>
