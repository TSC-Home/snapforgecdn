<script lang="ts">
	interface UploadFile {
		id: string;
		file: File;
		progress: number;
		status: 'pending' | 'uploading' | 'success' | 'error';
		error?: string;
	}

	interface Props {
		accept?: string;
		multiple?: boolean;
		maxSize?: number;
		disabled?: boolean;
		class?: string;
		onfiles?: (event: CustomEvent<File[]>) => void;
	}

	let {
		accept = 'image/*',
		multiple = true,
		maxSize = 50 * 1024 * 1024, // 50MB
		disabled = false,
		class: className = '',
		onfiles
	}: Props = $props();

	let isDragging = $state(false);
	let files = $state<UploadFile[]>([]);
	let inputRef: HTMLInputElement;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (!disabled) isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (disabled) return;

		const droppedFiles = e.dataTransfer?.files;
		if (droppedFiles) {
			processFiles(droppedFiles);
		}
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files) {
			processFiles(target.files);
		}
		target.value = '';
	}

	function processFiles(fileList: FileList) {
		const newFiles: File[] = [];

		for (const file of fileList) {
			if (file.size > maxSize) {
				continue;
			}
			newFiles.push(file);
		}

		if (newFiles.length > 0 && onfiles) {
			onfiles(new CustomEvent('files', { detail: newFiles }));
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function openFilePicker() {
		inputRef?.click();
	}
</script>

<div class={className}>
	<!-- Dropzone -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
			{isDragging
				? 'border-gray-400 bg-gray-100'
				: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
			{disabled ? 'opacity-50 cursor-not-allowed' : ''}"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		onclick={openFilePicker}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
	>
		<input
			bind:this={inputRef}
			type="file"
			{accept}
			{multiple}
			{disabled}
			onchange={handleFileSelect}
			class="sr-only"
		/>

		<div class="py-10 px-6 text-center">
			<!-- Upload Icon -->
			<div class="mx-auto w-12 h-12 mb-4 rounded-full bg-gray-100 flex items-center justify-center
				{isDragging ? 'bg-gray-200' : ''}">
				<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			</div>

			<!-- Text -->
			<div class="space-y-1">
				<p class="text-sm font-medium text-gray-700">
					{#if isDragging}
						Drop files here
					{:else}
						<span class="text-gray-900">Click to upload</span> or drag and drop
					{/if}
				</p>
				<p class="text-xs text-gray-500">
					PNG, JPG, WebP, GIF up to {formatBytes(maxSize)}
				</p>
			</div>
		</div>
	</div>
</div>
