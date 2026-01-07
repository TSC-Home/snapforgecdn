<script lang="ts">
	import { Card, Button } from '$lib/components/ui';

	let { data } = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}
</script>

<svelte:head>
	<title>Dashboard - SnapForgeCDN</title>
</svelte:head>

<div class="space-y-6">
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card>
			<div class="text-sm text-gray-500">Galleries</div>
			<div class="text-2xl font-bold text-gray-900">
				{data.stats.galleries} / {data.stats.maxGalleries}
			</div>
		</Card>

		<Card>
			<div class="text-sm text-gray-500">Images</div>
			<div class="text-2xl font-bold text-gray-900">
				{data.stats.images}
			</div>
		</Card>

		<Card>
			<div class="text-sm text-gray-500">Storage</div>
			<div class="text-2xl font-bold text-gray-900">
				{formatBytes(data.stats.storageUsed)}
			</div>
		</Card>

		<Card>
			<div class="text-sm text-gray-500">Status</div>
			<div class="text-2xl font-bold text-green-600">
				Online
			</div>
		</Card>
	</div>

	<Card>
		{#snippet header()}Quick Start{/snippet}
		<div class="space-y-4">
			<p class="text-gray-600">
				Welcome to SnapForgeCDN! Create a gallery to start uploading images.
			</p>
			<div class="flex gap-2">
				<Button href="/galleries">Manage Galleries</Button>
				<Button variant="secondary" href="/galleries/new">New Gallery</Button>
			</div>
		</div>
	</Card>
</div>
