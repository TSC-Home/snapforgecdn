<script lang="ts">
	import type { Snippet } from 'svelte';

	interface NavItem {
		label: string;
		href: string;
		icon?: Snippet;
		active?: boolean;
	}

	interface Props {
		items: NavItem[];
		header?: Snippet;
		footer?: Snippet;
	}

	let { items, header, footer }: Props = $props();
</script>

<aside class="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
	{#if header}
		<div class="h-16 px-5 flex items-center border-b border-gray-100">
			{@render header()}
		</div>
	{/if}

	<nav class="flex-1 py-3 overflow-y-auto">
		<ul class="space-y-1 px-3">
			{#each items as item}
				<li>
					<a
						href={item.href}
						class="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-all duration-150
							{item.active
								? 'bg-gray-100 text-gray-900 font-medium'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
					>
						{#if item.icon}
							<span class="w-5 h-5 flex-shrink-0 opacity-70">
								{@render item.icon()}
							</span>
						{/if}
						<span>{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	{#if footer}
		<div class="px-5 py-4 border-t border-gray-100">
			{@render footer()}
		</div>
	{/if}
</aside>
