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
			<p class="text-sm text-gray-500">{data.galleries.length} / {data.maxGalleries} used</p>
		</div>
		{#if data.galleries.length < data.maxGalleries}
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
							<a href="/galleries/{gallery.id}" class="font-medium text-gray-900 hover:underline">
								{gallery.name}
							</a>
						</Td>
						<Td>{gallery.imageCount}</Td>
						<Td>{formatBytes(gallery.totalSize)}</Td>
						<Td>{formatDate(gallery.createdAt)}</Td>
						<Td align="right">
							<div class="flex justify-end gap-2">
								<Button size="sm" variant="ghost" href="/galleries/{gallery.id}">
									Open
								</Button>
								<Button size="sm" variant="ghost" onclick={() => openDeleteModal(gallery)}>
									Delete
								</Button>
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
