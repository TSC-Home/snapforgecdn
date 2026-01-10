<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button, Card, Input, Select, toast } from '$lib/components/ui';

	let { data, form } = $props();

	type TabType = 'general' | 'processing' | 'api' | 'danger';
	let activeTab = $state<TabType>('general');
	let loading = $state(false);
	let showToken = $state(false);

	// General settings
	let galleryName = $state(data.gallery.name);

	// Processing settings
	let thumbSize = $state(data.gallery.thumbSize?.toString() ?? '');
	let thumbQuality = $state(data.gallery.thumbQuality?.toString() ?? '');
	let outputFormat = $state(data.gallery.outputFormat ?? '');
	let resizeMethod = $state(data.gallery.resizeMethod ?? '');
	let jpegQuality = $state(data.gallery.jpegQuality?.toString() ?? '');
	let webpQuality = $state(data.gallery.webpQuality?.toString() ?? '');
	let avifQuality = $state(data.gallery.avifQuality?.toString() ?? '');
	let pngCompressionLevel = $state(data.gallery.pngCompressionLevel?.toString() ?? '');
	let effort = $state(data.gallery.effort?.toString() ?? '');
	let chromaSubsampling = $state(data.gallery.chromaSubsampling ?? '');
	let stripMetadata = $state(data.gallery.stripMetadata ?? false);
	let autoOrient = $state(data.gallery.autoOrient ?? true);

	// Sync state when data changes (e.g., after invalidateAll)
	$effect(() => {
		galleryName = data.gallery.name;
		thumbSize = data.gallery.thumbSize?.toString() ?? '';
		thumbQuality = data.gallery.thumbQuality?.toString() ?? '';
		outputFormat = data.gallery.outputFormat ?? '';
		resizeMethod = data.gallery.resizeMethod ?? '';
		jpegQuality = data.gallery.jpegQuality?.toString() ?? '';
		webpQuality = data.gallery.webpQuality?.toString() ?? '';
		avifQuality = data.gallery.avifQuality?.toString() ?? '';
		pngCompressionLevel = data.gallery.pngCompressionLevel?.toString() ?? '';
		effort = data.gallery.effort?.toString() ?? '';
		chromaSubsampling = data.gallery.chromaSubsampling ?? '';
		stripMetadata = data.gallery.stripMetadata ?? false;
		autoOrient = data.gallery.autoOrient ?? true;
	});

	function copyToClipboard(text: string, message: string) {
		navigator.clipboard.writeText(text);
		toast(message, 'success');
	}

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

	$effect(() => {
		if (form?.success) {
			if (form.action === 'rename') {
				toast('Gallery renamed', 'success');
				invalidateAll();
			} else if (form.action === 'compression') {
				toast('Processing settings saved', 'success');
			} else if (form.action === 'regenerateToken') {
				toast('Token regenerated', 'success');
				invalidateAll();
			}
		}
		if (form?.error) {
			toast(form.error, 'error');
		}
	});
</script>

<svelte:head>
	<title>Settings - {data.gallery.name} - SnapForgeCDN</title>
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
		<h1 class="text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
		<p class="text-sm text-gray-500 mt-1">Configure gallery options and image processing</p>
	</div>

	<!-- Tab Navigation -->
	<div class="border-b border-gray-200">
		<nav class="flex gap-1">
			<button
				type="button"
				onclick={() => activeTab = 'general'}
				class="relative px-4 py-2.5 text-sm font-medium rounded-t-md transition-all duration-200
					{activeTab === 'general'
						? 'text-gray-900 bg-white border border-b-white border-gray-200 -mb-px'
						: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
			>
				General
			</button>
			<button
				type="button"
				onclick={() => activeTab = 'processing'}
				class="relative px-4 py-2.5 text-sm font-medium rounded-t-md transition-all duration-200
					{activeTab === 'processing'
						? 'text-gray-900 bg-white border border-b-white border-gray-200 -mb-px'
						: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
			>
				Processing
			</button>
			<button
				type="button"
				onclick={() => activeTab = 'api'}
				class="relative px-4 py-2.5 text-sm font-medium rounded-t-md transition-all duration-200
					{activeTab === 'api'
						? 'text-gray-900 bg-white border border-b-white border-gray-200 -mb-px'
						: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
			>
				API
			</button>
			<button
				type="button"
				onclick={() => activeTab = 'danger'}
				class="relative px-4 py-2.5 text-sm font-medium rounded-t-md transition-all duration-200
					{activeTab === 'danger'
						? 'text-red-600 bg-white border border-b-white border-gray-200 -mb-px'
						: 'text-gray-500 hover:text-red-600 hover:bg-gray-50'}"
			>
				Danger Zone
			</button>
		</nav>
	</div>

	<!-- General Tab -->
	{#if activeTab === 'general'}
		<div class="space-y-6 animate-in">
			<!-- Gallery Info -->
			<Card>
				{#snippet header()}
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
						Gallery Overview
					</div>
				{/snippet}
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
					<div>
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Images</span>
						<p class="mt-1 text-sm font-medium text-gray-900">{data.stats.imageCount}</p>
					</div>
					<div>
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Storage</span>
						<p class="mt-1 text-sm font-medium text-gray-900">{formatBytes(data.stats.totalSize)}</p>
					</div>
					<div>
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Created</span>
						<p class="mt-1 text-sm font-medium text-gray-900">{formatDate(data.gallery.createdAt)}</p>
					</div>
					<div>
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Collaborators</span>
						<p class="mt-1 text-sm font-medium text-gray-900">{data.collaboratorCount}</p>
					</div>
				</div>
			</Card>

			<!-- Rename -->
			<Card>
				{#snippet header()}
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
						Gallery Name
					</div>
				{/snippet}
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
					{#if form?.error && form?.action === 'rename'}
						<div class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
							{form.error}
						</div>
					{/if}
					<Input
						name="name"
						label="Name"
						bind:value={galleryName}
						required
					/>
					<Button type="submit" {loading}>Save Name</Button>
				</form>
			</Card>
		</div>
	{/if}

	<!-- Processing Tab -->
	{#if activeTab === 'processing'}
		<div class="space-y-6 animate-in">
			<Card>
				{#snippet header()}
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
						</svg>
						Image Processing
					</div>
				{/snippet}
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
					class="space-y-6"
				>
					{#if form?.error && form?.action === 'compression'}
						<div class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
							{form.error}
						</div>
					{/if}

					<p class="text-sm text-gray-600">
						Configure how images are processed when uploaded. Leave fields empty to use system defaults.
					</p>

					<!-- Thumbnails -->
					<div class="space-y-4 pb-5 border-b border-gray-100">
						<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Thumbnails</h3>
						<div class="grid sm:grid-cols-2 gap-4">
							<Input
								name="thumbSize"
								label="Size (px)"
								type="number"
								min="50"
								max="500"
								placeholder="System default"
								bind:value={thumbSize}
								hint="Maximum dimension (50-500)"
							/>
							<Input
								name="thumbQuality"
								label="Quality (%)"
								type="number"
								min="10"
								max="100"
								placeholder="System default"
								bind:value={thumbQuality}
								hint="JPEG quality (10-100)"
							/>
						</div>
					</div>

					<!-- Output Format -->
					<div class="space-y-4 pb-5 border-b border-gray-100">
						<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Output Format</h3>
						<Select
							name="outputFormat"
							label="Convert images to"
							bind:value={outputFormat}
							options={[
								{ value: '', label: 'Keep original format' },
								{ value: 'jpeg', label: 'JPEG - Best compatibility' },
								{ value: 'webp', label: 'WebP - Modern format, smaller files' },
								{ value: 'avif', label: 'AVIF - Best compression (slower)' },
								{ value: 'png', label: 'PNG - Lossless' }
							]}
							hint="All uploaded images will be converted to this format"
						/>
					</div>

					<!-- Quality -->
					<div class="space-y-4 pb-5 border-b border-gray-100">
						<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quality Settings</h3>
						<div class="grid sm:grid-cols-2 gap-4">
							<Input
								name="jpegQuality"
								label="JPEG Quality (%)"
								type="number"
								min="1"
								max="100"
								placeholder="Default: 80"
								bind:value={jpegQuality}
							/>
							<Input
								name="webpQuality"
								label="WebP Quality (%)"
								type="number"
								min="1"
								max="100"
								placeholder="Default: 80"
								bind:value={webpQuality}
							/>
							<Input
								name="avifQuality"
								label="AVIF Quality (%)"
								type="number"
								min="1"
								max="100"
								placeholder="Default: 65"
								bind:value={avifQuality}
							/>
							<Input
								name="pngCompressionLevel"
								label="PNG Compression (0-9)"
								type="number"
								min="0"
								max="9"
								placeholder="Default: 6"
								bind:value={pngCompressionLevel}
							/>
						</div>
					</div>

					<!-- Advanced -->
					<div class="space-y-4">
						<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Advanced</h3>
						<div class="grid sm:grid-cols-2 gap-4">
							<Select
								name="resizeMethod"
								label="Resize Algorithm"
								bind:value={resizeMethod}
								options={[
									{ value: '', label: 'Default (Lanczos3)' },
									{ value: 'lanczos3', label: 'Lanczos3 - Best quality' },
									{ value: 'lanczos2', label: 'Lanczos2 - Faster' },
									{ value: 'mitchell', label: 'Mitchell - Balanced' },
									{ value: 'nearest', label: 'Nearest - Fastest' }
								]}
							/>
							<Select
								name="chromaSubsampling"
								label="Chroma Subsampling"
								bind:value={chromaSubsampling}
								options={[
									{ value: '', label: 'Default (4:2:0)' },
									{ value: '420', label: '4:2:0 - Smaller files' },
									{ value: '422', label: '4:2:2 - Balanced' },
									{ value: '444', label: '4:4:4 - Best quality' }
								]}
							/>
							<Input
								name="effort"
								label="Compression Effort (1-10)"
								type="number"
								min="1"
								max="10"
								placeholder="Default: 4"
								bind:value={effort}
								hint="Higher = slower, smaller files"
							/>
							<div class="space-y-4 pt-6">
								<label class="flex items-start gap-3 cursor-pointer group">
									<input
										type="checkbox"
										name="stripMetadata"
										bind:checked={stripMetadata}
										class="mt-0.5 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 focus:ring-offset-0"
									/>
									<div>
										<span class="text-sm font-medium text-gray-700 group-hover:text-gray-900">Strip metadata</span>
										<p class="text-xs text-gray-500">Remove EXIF data from images</p>
									</div>
								</label>
								<label class="flex items-start gap-3 cursor-pointer group">
									<input
										type="checkbox"
										name="autoOrient"
										bind:checked={autoOrient}
										class="mt-0.5 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 focus:ring-offset-0"
									/>
									<div>
										<span class="text-sm font-medium text-gray-700 group-hover:text-gray-900">Auto-orient</span>
										<p class="text-xs text-gray-500">Rotate based on EXIF orientation</p>
									</div>
								</label>
							</div>
						</div>
					</div>

					<div class="pt-4 border-t border-gray-100">
						<Button type="submit" {loading}>Save Processing Settings</Button>
					</div>
				</form>
			</Card>
		</div>
	{/if}

	<!-- API Tab -->
	{#if activeTab === 'api'}
		<div class="space-y-6 animate-in">
			<Card>
				{#snippet header()}
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
						</svg>
						API Credentials
					</div>
				{/snippet}
				<div class="space-y-4">
					<p class="text-sm text-gray-600">
						Use these credentials to authenticate API requests. Keep the token secret!
					</p>

					<div>
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Gallery ID</span>
						<div class="mt-2 flex gap-2">
							<code class="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 text-sm font-mono break-all rounded-lg">
								{data.gallery.id}
							</code>
							<Button size="sm" variant="ghost" onclick={() => copyToClipboard(data.gallery.id, 'Gallery ID copied')}>
								Copy
							</Button>
						</div>
					</div>

					<div>
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Access Token</span>
						<div class="mt-2 flex gap-2">
							<code class="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 text-sm font-mono break-all rounded-lg">
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

					<div>
						<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Authorization Header</span>
						<code class="mt-2 block px-3 py-2 bg-gray-50 border border-gray-200 text-sm font-mono rounded-lg">
							Authorization: Bearer {showToken ? data.gallery.accessToken : '••••••••'}
						</code>
					</div>

					<div class="pt-4 border-t border-gray-100">
						<p class="text-sm text-gray-500 mb-3">
							Regenerating will invalidate the current token immediately.
						</p>
						<form
							method="POST"
							action="?/regenerateToken"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
								};
							}}
						>
							<Button type="submit" variant="secondary">Regenerate Token</Button>
						</form>
					</div>
				</div>
			</Card>

			<!-- API Docs -->
			<Card>
				{#snippet header()}
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
						</svg>
						API Reference
					</div>
				{/snippet}
				<div class="space-y-6">
					<div>
						<h4 class="text-sm font-medium text-gray-900 mb-2">Upload Image</h4>
						<code class="block p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre">POST /api/images/upload
Authorization: Bearer {'<token>'}
Content-Type: multipart/form-data

file: (binary)</code>
					</div>

					<div>
						<h4 class="text-sm font-medium text-gray-900 mb-2">Get Image</h4>
						<code class="block p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs">
							GET /i/{'{imageId}'}?thumb&w=800&h=600&q=80
						</code>
						<p class="mt-2 text-xs text-gray-500">
							<span class="font-medium">Parameters:</span> thumb (thumbnail), w (width), h (height), q (quality 1-100)
						</p>
					</div>

					<div>
						<h4 class="text-sm font-medium text-gray-900 mb-2">Delete Image</h4>
						<code class="block p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs whitespace-pre">DELETE /api/images/{'{imageId}'}
Authorization: Bearer {'<token>'}</code>
					</div>

					<div>
						<h4 class="text-sm font-medium text-gray-900 mb-2">List Images</h4>
						<code class="block p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs whitespace-pre">GET /api/galleries/{data.gallery.id}/images
Authorization: Bearer {'<token>'}</code>
					</div>
				</div>
			</Card>
		</div>
	{/if}

	<!-- Danger Zone Tab -->
	{#if activeTab === 'danger'}
		<div class="space-y-6 animate-in">
			<Card class="border-red-200">
				{#snippet header()}
					<div class="flex items-center gap-2 text-red-600">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						Danger Zone
					</div>
				{/snippet}
				<div class="space-y-6">
					<div class="p-4 bg-red-50 border border-red-100 rounded-lg">
						<h4 class="text-sm font-medium text-red-900 mb-1">Delete Gallery</h4>
						<p class="text-sm text-red-700 mb-4">
							This will permanently delete this gallery and all {data.stats.imageCount} images.
							This action cannot be undone.
						</p>
						<form
							method="POST"
							action="?/delete"
							use:enhance={({ cancel }) => {
								const name = prompt(`Type "${data.gallery.name}" to confirm deletion:`);
								if (name !== data.gallery.name) {
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
							<Button type="submit" variant="danger" {loading}>
								Delete Gallery
							</Button>
						</form>
					</div>
				</div>
			</Card>
		</div>
	{/if}
</div>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.animate-in {
		animation: fade-in 0.2s ease-out;
	}
</style>
