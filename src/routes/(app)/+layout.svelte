<script lang="ts">
	import { page } from '$app/stores';
	import { AppShell, Sidebar, Header } from '$lib/components/layout';
	import { Dropdown, DropdownItem, Toast } from '$lib/components/ui';

	let { data, children } = $props();

	const navItems = $derived([
		{ label: 'Dashboard', href: '/dashboard', active: $page.url.pathname === '/dashboard' },
		{ label: 'Galleries', href: '/galleries', active: $page.url.pathname.startsWith('/galleries') },
		{ label: 'Settings', href: '/settings', active: $page.url.pathname.startsWith('/settings') }
	]);

	const pageTitle = $derived(() => {
		if ($page.url.pathname === '/dashboard') return 'Dashboard';
		if ($page.url.pathname.startsWith('/galleries')) return 'Galleries';
		if ($page.url.pathname.startsWith('/settings')) return 'Settings';
		return '';
	});
</script>

<Toast />

<AppShell>
	{#snippet sidebar()}
		<Sidebar items={navItems}>
			{#snippet header()}
				<span class="text-lg font-bold text-gray-900">SnapForgeCDN</span>
			{/snippet}
			{#snippet footer()}
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
						{data.user.email.charAt(0).toUpperCase()}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-gray-700 truncate">{data.user.email}</p>
						<p class="text-xs text-gray-400 capitalize">{data.user.role}</p>
					</div>
				</div>
			{/snippet}
		</Sidebar>
	{/snippet}

	{#snippet header()}
		<Header title={pageTitle()}>
			{#snippet actions()}
				<Dropdown align="right">
					{#snippet trigger()}
						<button class="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
							<span class="hidden sm:inline">{data.user.email}</span>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
					{/snippet}
					<DropdownItem href="/settings">Settings</DropdownItem>
					<DropdownItem href="/logout" danger>Logout</DropdownItem>
				</Dropdown>
			{/snippet}
		</Header>
	{/snippet}

	{@render children()}
</AppShell>
