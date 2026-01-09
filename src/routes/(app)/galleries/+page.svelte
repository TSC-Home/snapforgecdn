<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Table, Th, Td, Modal, toast } from '$lib/components/ui';

	let { data } = $props();

	let deleteModalOpen = $state(false);
	let galleryToDelete = $state<{ id: string; name: string } | null>(null);
	let deleting = $state(false);

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(date));
	}

	function openDeleteModal(gallery: { id: string; name: string }) {
		galleryToDelete = gallery;
		deleteModalOpen = true;
	}
</script>

<svelte:head>
	<title>Galleries - SnapForgeCDN</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold text-gray-900">Galleries</h2>
			<p class="text-sm text-gray-500">{data.ownedCount} / {data.maxGalleries} owned</p>
		</div>
		{#if data.ownedCount < data.maxGalleries}
			<Button href="/galleries/new">New Gallery</Button>
		{/if}
	</div>

	{#if data.galleries.length === 0}
		<Card>
			<div class="text-center py-8">
				<p class="text-gray-500 mb-4">No galleries created yet.</p>
				<Button href="/galleries/new">Create first gallery</Button>
			</div>
		</Card>
	{:else}
		<Card padding="none">
			<Table>
				{#snippet header()}
					<tr>
						<Th>Name</Th>
						<Th>Images</Th>
						<Th>Size</Th>
						<Th>Created</Th>
						<Th align="right">Actions</Th>
					</tr>
				{/snippet}
				{#each data.galleries as gallery}
					<tr class="hover:bg-gray-50">
						<Td>
							<div class="flex items-center gap-2">
								<a href="/galleries/{gallery.id}" class="font-medium text-gray-900 hover:underline">
									{gallery.name}
								</a>
								{#if !gallery.isOwner}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
										{gallery.role}
									</span>
								{/if}
							</div>
						</Td>
						<Td>{gallery.imageCount}</Td>
						<Td>{formatBytes(gallery.totalSize)}</Td>
						<Td>{formatDate(gallery.createdAt)}</Td>
						<Td align="right">
							<div class="flex justify-end gap-2">
								<Button size="sm" variant="ghost" href="/galleries/{gallery.id}">
									Open
								</Button>
								{#if gallery.isOwner}
									<Button size="sm" variant="ghost" onclick={() => openDeleteModal(gallery)}>
										Delete
									</Button>
								{/if}
							</div>
						</Td>
					</tr>
				{/each}
			</Table>
		</Card>
	{/if}
</div>

<Modal bind:open={deleteModalOpen} title="Delete Gallery" size="sm">
	<p class="text-gray-600">
		Are you sure you want to delete <strong>{galleryToDelete?.name}</strong>?
		All images will be permanently deleted.
	</p>
	{#snippet footer()}
		<Button variant="ghost" onclick={() => deleteModalOpen = false}>Cancel</Button>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				deleting = true;
				return async ({ result }) => {
					deleting = false;
					if (result.type === 'success') {
						deleteModalOpen = false;
						toast('Gallery deleted', 'success');
					} else if (result.type === 'failure') {
						toast(String(result.data?.error ?? 'Error deleting gallery'), 'error');
					}
				};
			}}
		>
			<input type="hidden" name="galleryId" value={galleryToDelete?.id} />
			<Button type="submit" variant="danger" loading={deleting}>Delete</Button>
		</form>
	{/snippet}
</Modal>
