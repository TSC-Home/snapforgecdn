<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, toast } from '$lib/components/ui';

	let { data, form } = $props();
	let loading = $state(false);

	const roleDescriptions: Record<string, string> = {
		viewer: 'View images in this gallery',
		editor: 'View, upload, and delete images',
		manager: 'Manage images and invite others'
	};

	$effect(() => {
		if (form?.error) {
			toast(form.error, 'error');
		}
	});
</script>

<svelte:head>
	<title>Gallery Invitation - SnapForgeCDN</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
	<div class="w-full max-w-md">
		{#if !data.invitation}
			<!-- Invalid/Expired Invitation -->
			<Card>
				<div class="text-center py-6">
					<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
						<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h2 class="text-lg font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
					<p class="text-sm text-gray-500 mb-6">{data.error || 'This invitation is invalid or has expired.'}</p>
					<a href="/login" class="text-sm text-gray-600 hover:text-gray-900 underline">
						Go to login
					</a>
				</div>
			</Card>
		{:else}
			<!-- Valid Invitation -->
			<Card>
				<div class="text-center py-4">
					<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
						<svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
					</div>
					<h2 class="text-lg font-semibold text-gray-900 mb-1">Gallery Invitation</h2>
					<p class="text-sm text-gray-500">
						<span class="font-medium text-gray-700">{data.invitation.inviter.email}</span> invited you to collaborate
					</p>
				</div>

				<div class="border-t border-b border-gray-100 py-4 my-4 -mx-5 px-5">
					<div class="flex items-center justify-between mb-3">
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Gallery</span>
						<span class="text-sm font-medium text-gray-900">{data.invitation.gallery.name}</span>
					</div>
					<div class="flex items-center justify-between mb-3">
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Your Role</span>
						<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize">
							{data.invitation.role}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Permissions</span>
						<span class="text-sm text-gray-600">{roleDescriptions[data.invitation.role]}</span>
					</div>
				</div>

				{#if !data.isLoggedIn}
					<!-- Not logged in -->
					<div class="space-y-3">
						<p class="text-sm text-gray-600 text-center">
							This invitation is for <span class="font-medium">{data.invitation.email}</span>
						</p>
						<div class="grid grid-cols-2 gap-3">
							<a
								href="/login?redirect=/invitations/{data.token}"
								class="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
							>
								Login
							</a>
							<a
								href="/register?invite={data.token}&email={encodeURIComponent(data.invitation.email)}"
								class="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
							>
								Create Account
							</a>
						</div>
					</div>
				{:else if !data.emailMatches}
					<!-- Logged in but wrong email -->
					<div class="p-3 bg-amber-50 border border-amber-100 rounded-lg mb-4">
						<div class="flex items-start gap-2">
							<svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							<div class="text-sm text-amber-700">
								<p class="font-medium">Email mismatch</p>
								<p class="mt-1">
									This invitation is for <span class="font-medium">{data.invitation.email}</span>,
									but you're logged in as <span class="font-medium">{data.currentUserEmail}</span>.
								</p>
							</div>
						</div>
					</div>
					<div class="space-y-3">
						<a
							href="/login?redirect=/invitations/{data.token}"
							class="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
						>
							Login with different account
						</a>
					</div>
				{:else}
					<!-- Logged in and email matches -->
					<form
						method="POST"
						action="?/accept"
						use:enhance={() => {
							loading = true;
							return async ({ update }) => {
								await update();
								loading = false;
							};
						}}
						class="space-y-3"
					>
						{#if form?.error}
							<div class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-md">
								{form.error}
							</div>
						{/if}
						<Button type="submit" class="w-full" {loading}>
							Accept Invitation
						</Button>
						<a
							href="/galleries"
							class="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
						>
							Decline
						</a>
					</form>
				{/if}
			</Card>

			<p class="mt-4 text-center text-xs text-gray-400">
				Invitation expires {new Date(data.invitation.expiresAt).toLocaleDateString()}
			</p>
		{/if}
	</div>
</div>
