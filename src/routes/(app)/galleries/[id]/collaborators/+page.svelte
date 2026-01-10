<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button, Card, Input, Select, toast } from '$lib/components/ui';

	let { data, form } = $props();

	let loading = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state<'viewer' | 'editor' | 'manager'>('viewer');
	let lastInviteUrl = $state<string | null>(null);

	const roleOptions = [
		{ value: 'viewer', label: 'Viewer' },
		{ value: 'editor', label: 'Editor' },
		{ value: 'manager', label: 'Manager' }
	];

	const roleInfo = {
		viewer: { label: 'Viewer', description: 'Can view images', color: 'bg-gray-100 text-gray-700' },
		editor: { label: 'Editor', description: 'Can view, upload, and delete images', color: 'bg-blue-50 text-blue-700' },
		manager: { label: 'Manager', description: 'Full access including collaborator management', color: 'bg-amber-50 text-amber-700' }
	};

	function formatDate(date: Date | string): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(date));
	}

	function formatExpiry(date: Date | string): string {
		const d = new Date(date);
		const now = new Date();
		const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		if (diffDays <= 0) return 'Expired';
		if (diffDays === 1) return '1 day left';
		return `${diffDays} days left`;
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast('Link copied', 'success');
		} catch {
			toast('Failed to copy', 'error');
		}
	}

	$effect(() => {
		if (form?.success) {
			if (form.action === 'invite') {
				toast(form.emailSent ? 'Invitation sent' : 'Invitation created', 'success');
				lastInviteUrl = form.inviteUrl || null;
				inviteEmail = '';
				inviteRole = 'viewer';
				invalidateAll();
			} else if (form.action === 'updateRole') {
				toast('Role updated', 'success');
				invalidateAll();
			} else if (form.action === 'remove') {
				toast('Collaborator removed', 'success');
				invalidateAll();
			} else if (form.action === 'cancelInvite') {
				toast('Invitation cancelled', 'success');
				lastInviteUrl = null;
				invalidateAll();
			}
		}
		if (form?.error) {
			toast(form.error, 'error');
		}
	});
</script>

<svelte:head>
	<title>Share - {data.gallery.name} - SnapForgeCDN</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<a href="/galleries/{data.gallery.id}" class="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-2">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			{data.gallery.name}
		</a>
		<h1 class="text-2xl font-semibold text-gray-900 tracking-tight">Share</h1>
		<p class="text-sm text-gray-500 mt-1">Manage who can access this gallery</p>
	</div>

	<!-- Owner Badge -->
	<div class="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
		<div class="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium">
			{data.owner?.email?.charAt(0).toUpperCase()}
		</div>
		<div class="flex-1 min-w-0">
			<p class="text-sm font-medium text-gray-900 truncate">{data.owner?.email}</p>
			<p class="text-xs text-gray-500">Owner</p>
		</div>
		<span class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded bg-gray-900 text-white">
			Owner
		</span>
	</div>

	<!-- Invite Section -->
	{#if data.permissions.canManageCollaborators}
		<Card>
			{#snippet header()}
				<div class="flex items-center gap-2">
					<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
					Invite People
				</div>
			{/snippet}

			<form
				method="POST"
				action="?/invite"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
				class="space-y-4"
			>
				{#if form?.error && form?.action === 'invite'}
					<div class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
						{form.error}
					</div>
				{/if}

				<div class="flex gap-3">
					<div class="flex-1">
						<Input
							name="email"
							type="email"
							bind:value={inviteEmail}
							placeholder="Email address"
							required
						/>
					</div>
					<div class="w-32">
						<Select
							name="role"
							bind:value={inviteRole}
							options={roleOptions}
						/>
					</div>
					<Button type="submit" {loading}>
						<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
						</svg>
						Invite
					</Button>
				</div>

				<!-- Role Description -->
				<div class="flex items-center gap-2 text-xs text-gray-500">
					<span class="font-medium">{roleInfo[inviteRole].label}:</span>
					<span>{roleInfo[inviteRole].description}</span>
				</div>

				{#if !data.smtpConfigured}
					<div class="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-sm text-amber-700">
						<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Email not configured. Share the invite link manually.
					</div>
				{/if}
			</form>

			<!-- Last Invite URL -->
			{#if lastInviteUrl && !data.smtpConfigured}
				<div class="mt-4 pt-4 border-t border-gray-100">
					<div class="flex items-center justify-between mb-2">
						<span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Invite Link</span>
						<span class="text-xs text-gray-400">Expires in 7 days</span>
					</div>
					<div class="flex gap-2">
						<code class="flex-1 px-3 py-2 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg truncate">
							{lastInviteUrl}
						</code>
						<Button variant="secondary" onclick={() => copyToClipboard(lastInviteUrl!)}>
							Copy
						</Button>
					</div>
				</div>
			{/if}
		</Card>
	{/if}

	<!-- Collaborators -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-sm font-medium text-gray-900">
				Collaborators
				{#if data.collaborators.length > 0}
					<span class="ml-1 text-gray-400">({data.collaborators.length})</span>
				{/if}
			</h2>
		</div>

		{#if data.collaborators.length === 0}
			<div class="text-center py-12 bg-gray-50 border border-gray-200 border-dashed rounded-lg">
				<svg class="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				<p class="text-sm text-gray-500">No collaborators yet</p>
				<p class="text-xs text-gray-400 mt-1">Invite people to collaborate on this gallery</p>
			</div>
		{:else}
			<div class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
				{#each data.collaborators as collab}
					<div class="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors">
						<div class="flex items-center gap-3 min-w-0">
							<div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm flex-shrink-0">
								{collab.user.email.charAt(0).toUpperCase()}
							</div>
							<div class="min-w-0">
								<p class="text-sm font-medium text-gray-900 truncate">{collab.user.email}</p>
								<p class="text-xs text-gray-400">Joined {formatDate(collab.acceptedAt || collab.invitedAt)}</p>
							</div>
						</div>
						<div class="flex items-center gap-2 flex-shrink-0 ml-4">
							{#if data.permissions.canManageCollaborators}
								<form
									method="POST"
									action="?/updateRole"
									use:enhance={() => {
										loading = true;
										return async ({ update }) => {
											await update();
											loading = false;
										};
									}}
								>
									<input type="hidden" name="userId" value={collab.userId} />
									<select
										name="role"
										value={collab.role}
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
										class="h-8 pl-2.5 pr-7 text-xs font-medium bg-white border border-gray-200 rounded-md appearance-none cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100"
									>
										{#each roleOptions as option}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
								</form>
								<form
									method="POST"
									action="?/remove"
									use:enhance={({ cancel }) => {
										if (!confirm('Remove this collaborator?')) {
											cancel();
											return;
										}
										loading = true;
										return async ({ update }) => {
											await update();
											loading = false;
										};
									}}
								>
									<input type="hidden" name="userId" value={collab.userId} />
									<button
										type="submit"
										class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
										title="Remove"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</form>
							{:else}
								<span class="px-2.5 py-1 text-xs font-medium rounded-md {roleInfo[collab.role as keyof typeof roleInfo].color}">
									{roleInfo[collab.role as keyof typeof roleInfo].label}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Pending Invitations -->
	{#if data.permissions.canManageCollaborators && data.invitations.length > 0}
		<div class="space-y-3">
			<h2 class="text-sm font-medium text-gray-900">
				Pending
				<span class="ml-1 text-gray-400">({data.invitations.length})</span>
			</h2>

			<div class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
				{#each data.invitations as invite}
					<div class="flex items-center justify-between p-4">
						<div class="flex items-center gap-3 min-w-0">
							<div class="w-9 h-9 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-sm font-medium text-gray-900 truncate">{invite.email}</p>
								<div class="flex items-center gap-2 text-xs text-gray-400">
									<span class="capitalize">{invite.role}</span>
									<span>·</span>
									<span>{formatExpiry(invite.expiresAt)}</span>
								</div>
							</div>
						</div>
						<div class="flex items-center gap-1 flex-shrink-0 ml-4">
							<button
								type="button"
								onclick={() => copyToClipboard(`${window.location.origin}/invitations/${invite.token}`)}
								class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
								title="Copy link"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
								</svg>
							</button>
							<form
								method="POST"
								action="?/cancelInvite"
								use:enhance={() => {
									loading = true;
									return async ({ update }) => {
										await update();
										loading = false;
									};
								}}
							>
								<input type="hidden" name="inviteId" value={invite.id} />
								<button
									type="submit"
									class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
									title="Cancel"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Permissions Info -->
	<div class="pt-4 border-t border-gray-100">
		<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Role Permissions</h3>
		<div class="grid gap-2">
			{#each Object.entries(roleInfo) as [role, info]}
				<div class="flex items-center gap-3 text-sm">
					<span class="w-20 px-2 py-0.5 text-xs font-medium rounded {info.color}">{info.label}</span>
					<span class="text-gray-500">{info.description}</span>
				</div>
			{/each}
		</div>
	</div>
</div>
