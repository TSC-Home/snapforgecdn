<script lang="ts">
  interface UploadFile {
    id: string;
    file: File;
    progress: number;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
  }

  interface Props {
    accept?: string;
    multiple?: boolean;
    maxSize?: number;
    disabled?: boolean;
    class?: string;
    compact?: boolean;
    onfiles?: (event: CustomEvent<File[]>) => void;
  }

  let {
    accept = "image/*",
    multiple = true,
    maxSize = 50 * 1024 * 1024, // 50MB
    disabled = false,
    class: className = "",
    compact = false,
    onfiles,
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
    target.value = "";
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
      onfiles(new CustomEvent("files", { detail: newFiles }));
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function openFilePicker() {
    inputRef?.click();
  }
</script>

<div class={className}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="relative transition-all rounded-md duration-150 cursor-pointer group
			{isDragging
      ? 'bg-gray-100 border-gray-400'
      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'}
			{disabled ? 'opacity-50 cursor-not-allowed' : ''}
			{compact ? 'border p-4' : 'border p-8'}"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    onclick={openFilePicker}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === "Enter" && openFilePicker()}
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

    <div
      class="flex {compact
        ? 'items-center gap-4'
        : 'flex-col items-center text-center'}"
    >
      <!-- Upload Icon -->
      <div
        class="{compact
          ? 'w-10 h-10'
          : 'w-14 h-14 mb-3'} flex rounded-md items-center justify-center border {isDragging
          ? 'border-gray-400 bg-white'
          : 'border-gray-200 bg-white group-hover:border-gray-300'} transition-colors"
      >
        <svg
          class="{compact
            ? 'w-5 h-5'
            : 'w-6 h-6'} text-gray-400 group-hover:text-gray-500 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {#if isDragging}
            <path
              stroke-linecap="square"
              stroke-linejoin="miter"
              stroke-width="1.5"
              d="M19 14l-7-7m0 0l-7 7m7-7v18"
            />
          {:else}
            <path
              stroke-linecap="square"
              stroke-linejoin="miter"
              stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          {/if}
        </svg>
      </div>

      <!-- Text -->
      <div class={compact ? "" : "space-y-1"}>
        {#if isDragging}
          <p class="text-sm font-medium text-gray-700">Drop files here</p>
        {:else}
          <p class="text-sm text-gray-600">
            <span class="font-medium text-gray-900">Click to upload</span
            >{#if !compact}<br />{/if}
            <span class={compact ? "ml-1" : ""}>or drag and drop</span>
          </p>
          {#if !compact}
            <p class="text-xs text-gray-400">
              PNG, JPG, WebP, GIF up to {formatBytes(maxSize)}
            </p>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>
