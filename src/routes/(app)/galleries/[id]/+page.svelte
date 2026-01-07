<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Input, Modal, Pagination, Upload, toast } from '$lib/components/ui';
	import { goto, invalidateAll } from '$app/navigation';
	import type { Image } from '$lib/server/db/schema';

	let { data, form } = $props();

	let showToken = $state(false);
	let renameModalOpen = $state(false);
	let tokenModalOpen = $state(false);
	let imageModalOpen = $state(false);
	let compressionModalOpen = $state(false);
	let selectedImage = $state<Image | null>(null);
	let newName = $state(data.gallery.name);
	let loading = $state(false);

	// Compression settings state
	let thumbSize = $state(data.gallery.thumbSize?.toString() ?? '');
	let thumbQuality = $state(data.gallery.thumbQuality?.toString() ?? '');
	let imageQuality = $state(data.gallery.imageQuality?.toString() ?? '');

	// Upload state
	let uploading = $state(false);
	let uploadProgress = $state<Map<string, number>>(new Map());

	// Selection mode
	let selectionMode = $state(false);
	let selectedIds = $state<Set<string>>(new Set());
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
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(date));
	}

	function copyToClipboard(text: string, message: string) {
		navigator.clipboard.writeText(text);
		toast(message, 'success');
	}

	function handlePageChange(newPage: number) {
		goto(`?page=${newPage}`, { keepFocus: true });
	}

	function openImageModal(image: Image) {
		if (selectionMode) {
			toggleSelection(image.id);
		} else {
			selectedImage = image;
			imageModalOpen = true;
		}
	}

	function toggleSelection(id: string) {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedIds = newSet;
	}

	function toggleSelectAll() {
		if (selectedIds.size === data.images.length) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(data.images.map(i => i.id));
		}
	}

	function cancelSelection() {
		selectionMode = false;
		selectedIds = new Set();
	}

	async function handleFilesSelected(event: CustomEvent<File[]>) {
		const files = event.detail;
		if (files.length === 0) return;

		uploading = true;
		let successCount = 0;
		let errorCount = 0;

		for (const file of files) {
			const formData = new FormData();
			formData.append('file', file);

			try {
				const res = await fetch('/api/images/upload', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${data.gallery.accessToken}`
					},
					body: formData
				});

				if (res.ok) {
					successCount++;
				} else {
					errorCount++;
				}
			} catch (e) {
				errorCount++;
			}
		}

		uploading = false;

		if (successCount > 0) {
			toast(`${successCount} image${successCount > 1 ? 's' : ''} uploaded`, 'success');
			await invalidateAll();
		}
		if (errorCount > 0) {
			toast(`${errorCount} upload${errorCount > 1 ? 's' : ''} failed`, 'error');
		}
	}

	async function deleteSelected() {
		if (selectedIds.size === 0) return;

		deleting = true;
		try {
			const res = await fetch('/api/images', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${data.gallery.accessToken}`
				},
				body: JSON.stringify({ ids: Array.from(selectedIds) })
			});

			if (res.ok) {
				const result = await res.json();
				toast(`${result.deleted} image${result.deleted > 1 ? 's' : ''} deleted`, 'success');
				cancelSelection();
				await invalidateAll();
			} else {
				const err = await res.json();
				toast(err.error ?? 'Error deleting images', 'error');
			}
		} catch (e) {
			toast('Error deleting images', 'error');
		}
		deleting = false;
	}

	async function deleteSingleImage(imageId: string) {
		try {
			const res = await fetch(`/api/images/${imageId}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${data.gallery.accessToken}`
				}
			});

			if (res.ok) {
				toast('Image deleted', 'success');
				imageModalOpen = false;
				await invalidateAll();
			} else {
				const err = await res.json();
				toast(err.error ?? 'Error deleting image', 'error');
			}
		} catch (e) {
			toast('Error deleting image', 'error');
		}
	}

	$effect(() => {
		if (form?.success && form?.action === 'rename') {
			renameModalOpen = false;
			toast('Gallery renamed', 'success');
		}
		if (form?.success && form?.action === 'regenerateToken') {
			toast('Token regenerated', 'success');
		}
		if (form?.success && form?.action === 'compression') {
			compressionModalOpen = false;
			toast('Compression settings saved', 'success');
		}
	});
</script>

<svelte:head>
	<title>{data.gallery.name} - SnapForgeCDN</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<a href="/galleries" class="text-sm text-gray-500 hover:text-gray-700 mb-2 block">
				← Back to Galleries
			</a>
			<h2 class="text-xl font-semibold text-gray-900">{data.gallery.name}</h2>
			<p class="text-sm text-gray-500">
				{data.stats.imageCount} images · {formatBytes(data.stats.totalSize)}
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="secondary" onclick={() => compressionModalOpen = true}>Settings</Button>
			<Button variant="secondary" onclick={() => renameModalOpen = true}>Rename</Button>
			<Button variant="secondary" onclick={() => tokenModalOpen = true}>API Token</Button>
		</div>
	</div>

	<!-- Upload Zone -->
	<Upload onfiles={handleFilesSelected} disabled={uploading} />

	{#if uploading}
		<Card>
			<div class="flex items-center gap-3">
				<svg class="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<span class="text-sm text-gray-600">Uploading images...</span>
			</div>
		</Card>
	{/if}

	<!-- API Info Card -->
	<Card>
		{#snippet header()}API Access{/snippet}
		<div class="space-y-3">
			<div>
				<span class="block text-sm font-medium text-gray-700 mb-1">Upload URL</span>
				<div class="flex gap-2">
					<code class="flex-1 px-3 py-2 bg-gray-100 text-sm font-mono rounded-md overflow-x-auto">
						POST {data.baseUrl}/api/images/upload
					</code>
					<Button size="sm" variant="ghost" onclick={() => copyToClipboard(`${data.baseUrl}/api/images/upload`, 'URL copied')}>
						Copy
					</Button>
				</div>
			</div>
			<div>
				<span class="block text-sm font-medium text-gray-700 mb-1">Access Token</span>
				<div class="flex gap-2">
					<code class="flex-1 px-3 py-2 bg-gray-100 text-sm font-mono rounded-md overflow-x-auto">
						{showToken ? data.gallery.accessToken : '••••••••••••••••••••••••••••••••'}
					</code>
					<Button size="sm" variant="ghost" onclick={() => showToken = !showToken}>
						{showToken ? 'Hide' : 'Show'}
					</Button>
					<Button size="sm" variant="ghost" onclick={() => copyToClipboard(data.gallery.accessToken, 'Token copied')}>
						Copy
					</Button>
				</div>
			</div>
		</div>
	</Card>

	<!-- Images Grid -->
	<Card>
		{#snippet header()}
			<div class="flex items-center justify-between w-full">
				<span>Images</span>
				<div class="flex items-center gap-2">
					{#if selectionMode}
						<span class="text-sm font-normal text-gray-500">{selectedIds.size} selected</span>
						<Button size="sm" variant="ghost" onclick={toggleSelectAll}>
							{selectedIds.size === data.images.length ? 'Deselect all' : 'Select all'}
						</Button>
						<Button size="sm" variant="danger" onclick={deleteSelected} loading={deleting} disabled={selectedIds.size === 0}>
							Delete
						</Button>
						<Button size="sm" variant="ghost" onclick={cancelSelection}>Cancel</Button>
					{:else if data.images.length > 0}
						<span class="text-sm font-normal text-gray-500">
							{(data.pagination.page - 1) * data.pagination.perPage + 1}-{Math.min(data.pagination.page * data.pagination.perPage, data.pagination.total)} of {data.pagination.total}
						</span>
						<Button size="sm" variant="ghost" onclick={() => selectionMode = true}>Select</Button>
					{/if}
				</div>
			</div>
		{/snippet}

		{#if data.images.length === 0}
			<div class="text-center py-12">
				<p class="text-gray-500 mb-2">No images in this gallery yet.</p>
				<p class="text-sm text-gray-400">
					Drag and drop images above or use the API to upload.
				</p>
			</div>
		{:else}
			<div class="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2 space-y-2">
				{#each data.images as image}
					<button
						type="button"
						onclick={() => openImageModal(image)}
						class="w-full bg-gray-100 rounded-md overflow-hidden hover:opacity-90 transition-opacity relative break-inside-avoid mb-2"
					>
						<img
							src="{data.baseUrl}/i/{image.id}?thumb"
							alt={image.originalFilename}
							class="w-full h-auto object-contain"
							loading="lazy"
						/>
						{#if selectionMode}
							<div class="absolute inset-0 flex items-center justify-center bg-black/20">
								<div class="w-6 h-6 border-2 border-white rounded flex items-center justify-center {selectedIds.has(image.id) ? 'bg-gray-900' : 'bg-white/50'}">
									{#if selectedIds.has(image.id)}
										<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</div>
							</div>
						{/if}
					</button>
				{/each}
			</div>

			{#if data.pagination.totalPages > 1}
				<div class="mt-4 flex justify-center">
					<Pagination
						page={data.pagination.page}
						totalPages={data.pagination.totalPages}
						onchange={handlePageChange}
					/>
				</div>
			{/if}
		{/if}
	</Card>
</div>

<!-- Rename Modal -->
<Modal bind:open={renameModalOpen} title="Rename Gallery" size="sm">
	<form
		method="POST"
		action="?/rename"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
		class="space-y-4"
	>
		{#if form?.error && form?.action !== 'regenerateToken'}
			<div class="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
				{form.error}
			</div>
		{/if}
		<Input name="name" label="Name" bind:value={newName} required />
		{#snippet footer()}
			<Button variant="ghost" onclick={() => renameModalOpen = false}>Cancel</Button>
			<Button type="submit" {loading}>Save</Button>
		{/snippet}
	</form>
</Modal>

<!-- Token Modal -->
<Modal bind:open={tokenModalOpen} title="API Token" size="md">
	<div class="space-y-4">
		<p class="text-sm text-gray-600">
			Use this token to upload images via the API. Keep this token secret!
		</p>

		<div>
			<span class="block text-sm font-medium text-gray-700 mb-1">Access Token</span>
			<code class="block px-3 py-2 bg-gray-100 text-sm font-mono break-all rounded-md">
				{data.gallery.accessToken}
			</code>
		</div>

		<div>
			<span class="block text-sm font-medium text-gray-700 mb-1">Header</span>
			<code class="block px-3 py-2 bg-gray-100 text-sm font-mono rounded-md">
				Authorization: Bearer {data.gallery.accessToken}
			</code>
		</div>

		<div class="pt-2 border-t">
			<p class="text-sm text-gray-500 mb-2">
				Regenerate token? The old token will be invalidated immediately.
			</p>
			<form
				method="POST"
				action="?/regenerateToken"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						await invalidateAll();
					};
				}}
			>
				<Button type="submit" variant="danger" size="sm">Regenerate Token</Button>
			</form>
		</div>
	</div>
	{#snippet footer()}
		<Button variant="ghost" onclick={() => tokenModalOpen = false}>Close</Button>
		<Button onclick={() => copyToClipboard(data.gallery.accessToken, 'Token copied')}>Copy Token</Button>
	{/snippet}
</Modal>

<!-- Image Detail Modal -->
<Modal bind:open={imageModalOpen} title="Image Details" size="lg">
	{#if selectedImage}
		<div class="space-y-4">
			<div class="bg-gray-100 rounded-lg flex items-center justify-center" style="max-height: 400px;">
				<img
					src="{data.baseUrl}/i/{selectedImage.id}"
					alt={selectedImage.originalFilename}
					class="max-w-full max-h-[400px] object-contain rounded"
				/>
			</div>

			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-gray-500">Filename</span>
					<p class="font-medium">{selectedImage.originalFilename}</p>
				</div>
				<div>
					<span class="text-gray-500">Size</span>
					<p class="font-medium">{formatBytes(selectedImage.sizeBytes)}</p>
				</div>
				<div>
					<span class="text-gray-500">Resolution</span>
					<p class="font-medium">{selectedImage.width} x {selectedImage.height}</p>
				</div>
				<div>
					<span class="text-gray-500">Uploaded</span>
					<p class="font-medium">{formatDate(selectedImage.createdAt)}</p>
				</div>
			</div>

			<div>
				<span class="block text-sm text-gray-500 mb-1">CDN URL</span>
				<div class="flex gap-2">
					<code class="flex-1 px-3 py-2 bg-gray-100 text-sm font-mono rounded-md overflow-x-auto">
						{data.baseUrl}/i/{selectedImage.id}
					</code>
					<Button size="sm" variant="ghost" onclick={() => copyToClipboard(`${data.baseUrl}/i/${selectedImage!.id}`, 'URL copied')}>
						Copy
					</Button>
				</div>
			</div>
		</div>
		{#snippet footer()}
			<Button variant="danger" onclick={() => deleteSingleImage(selectedImage!.id)}>Delete</Button>
			<Button variant="ghost" onclick={() => imageModalOpen = false}>Close</Button>
			<a href="{data.baseUrl}/i/{selectedImage!.id}" target="_blank" class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 rounded-md transition-colors">Open Original</a>
		{/snippet}
	{/if}
</Modal>

<!-- Compression Settings Modal -->
<Modal bind:open={compressionModalOpen} title="Gallery Settings" size="md">
	<form
		method="POST"
		action="?/compression"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
		class="space-y-4"
	>
		{#if form?.error && form?.action === 'compression'}
			<div class="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
				{form.error}
			</div>
		{/if}

		<p class="text-sm text-gray-600">
			Override compression settings for this gallery. Leave empty to use system defaults.
		</p>

		<Input
			name="thumbSize"
			label="Thumbnail Size (px)"
			type="number"
			min="50"
			max="500"
			placeholder="System default"
			bind:value={thumbSize}
			hint="Maximum dimension for thumbnails (50-500px)"
		/>

		<Input
			name="thumbQuality"
			label="Thumbnail Quality (%)"
			type="number"
			min="10"
			max="100"
			placeholder="System default"
			bind:value={thumbQuality}
			hint="JPEG compression quality for thumbnails (10-100%)"
		/>

		<Input
			name="imageQuality"
			label="Image Quality (%)"
			type="number"
			min="10"
			max="100"
			placeholder="System default"
			bind:value={imageQuality}
			hint="JPEG compression quality for full images (10-100%). Leave empty to serve originals."
		/>

		{#snippet footer()}
			<Button variant="ghost" onclick={() => compressionModalOpen = false}>Cancel</Button>
			<Button type="submit" {loading}>Save</Button>
		{/snippet}
	</form>
</Modal>
