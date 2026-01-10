<script lang="ts">
  import {
    Button,
    Card,
    Modal,
    Pagination,
    Upload,
    toast,
    TagBadge,
    TagSelector,
    TagManager,
    LocationPicker,
  } from "$lib/components/ui";
  import { goto, invalidateAll } from "$app/navigation";
  import type { Image } from "$lib/server/db/schema";

  let { data } = $props();

  // Modal states
  let imageDetailOpen = $state(false);
  let tagsModalOpen = $state(false);
  let docsOpen = $state(false);
  let uploadOpen = $state(false);
  let selectedImage = $state<Image | null>(null);
  let imageDetailTab = $state<"info" | "tags" | "location">("info");
  let apiDocsTab = $state<"upload" | "images" | "manage" | "tags">("upload");

  // Image metadata editing (inline in detail view)
  let editingTags = $state<string[]>([]);
  let editingLocation = $state<{
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
  }>({
    latitude: null,
    longitude: null,
    locationName: null,
  });
  let savingMetadata = $state(false);
  let hasUnsavedChanges = $state(false);

  // Upload state
  let uploading = $state(false);
  let uploadProgress = $state<{
    current: number;
    total: number;
    currentFile: string;
    status: "uploading" | "processing";
  }>({ current: 0, total: 0, currentFile: "", status: "uploading" });

  // Selection mode
  let selectionMode = $state(false);
  let selectedIds = $state<Set<string>>(new Set());
  let deleting = $state(false);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function copyToClipboard(text: string, message: string) {
    navigator.clipboard.writeText(text);
    toast(message, "success");
  }

  function handlePageChange(newPage: number) {
    goto(`?page=${newPage}`, { keepFocus: true });
  }

  function openImageDetail(image: Image) {
    if (selectionMode) {
      toggleSelection(image.id);
    } else {
      selectedImage = image;
      imageDetailTab = "info";
      // Load current values for editing
      editingTags = (data.imageTagsMap[image.id] || []).map((t) => t.id);
      editingLocation = {
        latitude: image.latitude,
        longitude: image.longitude,
        locationName: image.locationName,
      };
      hasUnsavedChanges = false;
      imageDetailOpen = true;
    }
  }

  function closeImageDetail() {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Discard them?")) {
        imageDetailOpen = false;
        hasUnsavedChanges = false;
      }
    } else {
      imageDetailOpen = false;
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
      selectedIds = new Set(data.images.map((i) => i.id));
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
    uploadProgress = {
      current: 0,
      total: files.length,
      currentFile: "",
      status: "uploading",
    };
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadProgress = {
        current: i,
        total: files.length,
        currentFile: file.name,
        status: "uploading",
      };

      const formData = new FormData();
      formData.append("file", file);

      try {
        uploadProgress = {
          current: i,
          total: files.length,
          currentFile: file.name,
          status: "processing",
        };

        const res = await fetch("/api/images/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.gallery.accessToken}` },
          body: formData,
        });

        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    uploading = false;
    uploadProgress = {
      current: 0,
      total: 0,
      currentFile: "",
      status: "uploading",
    };

    if (successCount > 0) {
      toast(
        `${successCount} image${successCount > 1 ? "s" : ""} uploaded`,
        "success"
      );
      await invalidateAll();
    }
    if (errorCount > 0) {
      toast(`${errorCount} upload${errorCount > 1 ? "s" : ""} failed`, "error");
    }
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;

    deleting = true;
    try {
      const res = await fetch("/api/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.gallery.accessToken}`,
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (res.ok) {
        const result = await res.json();
        toast(
          `${result.deleted} image${result.deleted > 1 ? "s" : ""} deleted`,
          "success"
        );
        cancelSelection();
        await invalidateAll();
      } else {
        const err = await res.json();
        toast(err.error ?? "Error deleting images", "error");
      }
    } catch {
      toast("Error deleting images", "error");
    }
    deleting = false;
  }

  async function deleteSingleImage(imageId: string) {
    if (!confirm("Delete this image? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${data.gallery.accessToken}` },
      });

      if (res.ok) {
        toast("Image deleted", "success");
        imageDetailOpen = false;
        await invalidateAll();
      } else {
        const err = await res.json();
        toast(err.error ?? "Error deleting image", "error");
      }
    } catch {
      toast("Error deleting image", "error");
    }
  }

  // Tag filter
  function filterByTag(tagId: string | null) {
    if (tagId) {
      goto(`?tag=${tagId}`, { keepFocus: true });
    } else {
      goto("?", { keepFocus: true });
    }
  }

  // Tag management
  async function createTag(name: string, color?: string) {
    const res = await fetch(`/api/galleries/${data.gallery.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      toast("Tag created", "success");
      await invalidateAll();
    } else {
      const err = await res.json();
      toast(err.error ?? "Failed to create tag", "error");
    }
  }

  async function updateTag(id: string, name: string, color?: string | null) {
    const res = await fetch(`/api/galleries/${data.gallery.id}/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      toast("Tag updated", "success");
      await invalidateAll();
    } else {
      const err = await res.json();
      toast(err.error ?? "Failed to update tag", "error");
    }
  }

  async function deleteTag(id: string) {
    const res = await fetch(`/api/galleries/${data.gallery.id}/tags/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("Tag deleted", "success");
      if (data.filterTagId === id) {
        goto("?", { keepFocus: true });
      }
      await invalidateAll();
    } else {
      const err = await res.json();
      toast(err.error ?? "Failed to delete tag", "error");
    }
  }

  // Save image metadata (tags + location)
  async function saveImageMetadata() {
    if (!selectedImage || savingMetadata) return;
    savingMetadata = true;

    try {
      // Save tags
      const tagsRes = await fetch(`/api/images/${selectedImage.id}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.gallery.accessToken}`,
        },
        body: JSON.stringify({ tagIds: editingTags }),
      });

      if (!tagsRes.ok) {
        const err = await tagsRes.json();
        toast(err.error ?? "Failed to save tags", "error");
        savingMetadata = false;
        return;
      }

      // Save location
      const metaRes = await fetch(`/api/images/${selectedImage.id}/metadata`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.gallery.accessToken}`,
        },
        body: JSON.stringify({
          latitude: editingLocation.latitude,
          longitude: editingLocation.longitude,
          locationName: editingLocation.locationName,
        }),
      });

      if (!metaRes.ok) {
        const err = await metaRes.json();
        toast(err.error ?? "Failed to save location", "error");
        savingMetadata = false;
        return;
      }

      toast("Changes saved", "success");
      hasUnsavedChanges = false;
      await invalidateAll();
    } catch {
      toast("Failed to save changes", "error");
    }
    savingMetadata = false;
  }

  async function createTagFromSelector(name: string) {
    const res = await fetch(`/api/galleries/${data.gallery.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const newTag = await res.json();
      editingTags = [...editingTags, newTag.id];
      hasUnsavedChanges = true;
      await invalidateAll();
    } else {
      const err = await res.json();
      toast(err.error ?? "Failed to create tag", "error");
    }
  }

  function handleTagsChange(newTags: string[]) {
    editingTags = newTags;
    hasUnsavedChanges = true;
  }

  function handleLocationChange() {
    hasUnsavedChanges = true;
  }
</script>

<svelte:head>
  <title>{data.gallery.name} - SnapForgeCDN</title>
</svelte:head>

<div class="space-y-5">
  <!-- Header -->
  <div class="flex items-start justify-between">
    <div>
      <a
        href="/galleries"
        class="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-2"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Galleries
      </a>
      <h1 class="text-2xl font-semibold text-gray-900 tracking-tight">
        {data.gallery.name}
      </h1>
      <div class="flex items-center gap-3 mt-1">
        <span class="text-sm text-gray-500">{data.stats.imageCount} images</span
        >
        <span class="text-gray-300">·</span>
        <span class="text-sm text-gray-500"
          >{formatBytes(data.stats.totalSize)}</span
        >
      </div>
    </div>
    <div class="flex items-center gap-2">
      <!-- Upload Button -->
      <button
        type="button"
        onclick={() => (uploadOpen = true)}
        class="group cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
      >
        <svg
          class="w-4 h-4 transition-transform group-hover:-translate-y-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m0-16l-4 4m4-4l4 4"
          />
        </svg>
        Upload
      </button>
      <!-- Settings -->
      <a
        href="/galleries/{data.gallery.id}/settings"
        class="group inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 hover:shadow-sm active:scale-95 transition-all duration-200"
        title="Gallery settings"
      >
        <svg
          class="w-5 h-5 transition-transform duration-300 group-hover:rotate-45"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </a>
    </div>
  </div>

  <!-- Toolbar -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <!-- Tag Filter -->
      {#if data.tags.length > 0}
        <div class="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onclick={() => filterByTag(null)}
            class="px-2.5 py-1 text-xs font-medium rounded transition-all cursor-pointer {!data.filterTagId
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
          >
            All
          </button>
          {#each data.tags as tag}
            <button
              type="button"
              onclick={() => filterByTag(tag.id)}
              class="px-2.5 py-1 text-xs font-medium rounded transition-all cursor-pointer"
              style:background-color={data.filterTagId === tag.id
                ? tag.color || "#111"
                : tag.color
                  ? `${tag.color}20`
                  : "#f3f4f6"}
              style:color={data.filterTagId === tag.id
                ? "#fff"
                : tag.color || "#4b5563"}
            >
              {tag.name}
            </button>
          {/each}
          <button
            type="button"
            onclick={() => (tagsModalOpen = true)}
            class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
            title="Manage tags"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>
      {:else}
        <button
          type="button"
          onclick={() => (tagsModalOpen = true)}
          class="px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
        >
          + Add tags
        </button>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if data.images.length > 0 && !selectionMode}
        <span class="text-xs text-gray-400 tabular-nums">
          {(data.pagination.page - 1) * data.pagination.perPage + 1}–{Math.min(
            data.pagination.page * data.pagination.perPage,
            data.pagination.total
          )} of {data.pagination.total}
        </span>
        <button
          type="button"
          onclick={() => (selectionMode = true)}
          class="p-1.5 cursor-pointer text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Select images"
        >
          <svg class="w-4 h-4" viewBox="0 0 256 256"
            ><rect width="256" height="256" fill="none" /><rect
              x="40"
              y="40"
              width="176"
              height="176"
              rx="8"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="16"
            /></svg
          >
        </button>
        <a
          href="/galleries/{data.gallery.id}/collaborators"
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Share gallery"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </a>
        <button
          type="button"
          onclick={() => (docsOpen = true)}
          class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
          title="API documentation"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Images Grid -->
  {#if data.images.length === 0}
    <Card padding="lg">
      <div class="text-center py-12">
        <div
          class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <svg
            class="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p class="text-gray-900 font-medium mb-1">No images yet</p>
        <p class="text-sm text-gray-500 mb-4">Upload images to get started</p>
        <Button onclick={() => (uploadOpen = true)}>
          <svg
            class="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload Images
        </Button>
      </div>
    </Card>
  {:else}
    <div
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
    >
      {#each data.images as image}
        {@const imageTags = data.imageTagsMap[image.id] || []}
        <button
          type="button"
          onclick={() => openImageDetail(image)}
          class="group cursor-pointer relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-gray-900 hover:ring-offset-2 transition-all focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          <img
            src="{data.baseUrl}/i/{image.id}?thumb"
            alt={image.originalFilename}
            class="w-full h-full object-cover cursor-pointer"
            loading="lazy"
          />

          {#if selectionMode}
            <div
              class="absolute inset-0 bg-black/30 flex items-center justify-center"
            >
              <div
                class="w-6 h-6 rounded border-2 border-white flex items-center justify-center {selectedIds.has(
                  image.id
                )
                  ? 'bg-gray-900'
                  : 'bg-white/30'}"
              >
                {#if selectedIds.has(image.id)}
                  <svg
                    class="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                {/if}
              </div>
            </div>
          {:else}
            <!-- Hover overlay with metadata indicators -->
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div class="absolute bottom-0 left-0 right-0 p-2">
                <div class="flex items-center gap-1 flex-wrap">
                  {#if image.latitude}
                    <span
                      class="inline-flex items-center px-1.5 py-0.5 rounded bg-white/90 text-gray-700"
                    >
                      <svg
                        class="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                      </svg>
                    </span>
                  {/if}
                  {#each imageTags.slice(0, 2) as tag}
                    <span
                      class="px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[60px]"
                      style:background-color={tag.color
                        ? `${tag.color}ee`
                        : "#ffffffee"}
                      style:color={tag.color ? "#fff" : "#374151"}
                    >
                      {tag.name}
                    </span>
                  {/each}
                  {#if imageTags.length > 2}
                    <span
                      class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/90 text-gray-600"
                    >
                      +{imageTags.length - 2}
                    </span>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
        </button>
      {/each}
    </div>

    {#if data.pagination.totalPages > 1}
      <div class="flex justify-center pt-4">
        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onchange={handlePageChange}
        />
      </div>
    {/if}
  {/if}
</div>

<!-- Image Detail Drawer -->
{#if imageDetailOpen && selectedImage}
  {@const imageTags = data.imageTagsMap[selectedImage.id] || []}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex"
    onkeydown={(e) => e.key === "Escape" && closeImageDetail()}
    role="presentation"
  >
    <!-- Backdrop -->
    <button
      type="button"
      class="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onclick={closeImageDetail}
      aria-label="Close"
    ></button>

    <!-- Panel -->
    <div
      class="relative ml-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-slide-in"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-gray-100"
      >
        <div class="min-w-0 flex-1">
          <h2 class="text-lg font-semibold text-gray-900 truncate">
            {selectedImage.originalFilename}
          </h2>
          <p class="text-sm text-gray-500">
            {formatDate(selectedImage.createdAt)}
          </p>
        </div>
        <div class="flex items-center gap-2 ml-4">
          {#if hasUnsavedChanges}
            <Button
              size="sm"
              onclick={saveImageMetadata}
              loading={savingMetadata}
            >
              Save Changes
            </Button>
          {/if}
          <button
            type="button"
            onclick={closeImageDetail}
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Image Preview -->
      <div
        class="relative bg-gray-950 flex items-center justify-center"
        style="height: 320px;"
      >
        <img
          src="{data.baseUrl}/i/{selectedImage.id}"
          alt={selectedImage.originalFilename}
          class="max-w-full cursor-pointer max-h-full object-contain"
        />
        <a
          href="{data.baseUrl}/i/{selectedImage.id}"
          target="_blank"
          class="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
          title="Open original"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="flex px-6">
          <button
            type="button"
            onclick={() => (imageDetailTab = "info")}
            class="px-4 cursor-pointer py-3 text-sm font-medium border-b-2 transition-colors {imageDetailTab ===
            'info'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'}"
          >
            Info
          </button>
          <button
            type="button"
            onclick={() => (imageDetailTab = "tags")}
            class="px-4 cursor-pointer py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 {imageDetailTab ===
            'tags'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'}"
          >
            Tags
            {#if imageTags.length > 0}
              <span
                class="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-600"
                >{imageTags.length}</span
              >
            {/if}
          </button>
          <button
            type="button"
            onclick={() => (imageDetailTab = "location")}
            class="px-4 cursor-pointer py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 {imageDetailTab ===
            'location'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'}"
          >
            Location
            {#if selectedImage.latitude}
              <svg
                class="w-3.5 h-3.5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                />
              </svg>
            {/if}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-y-auto p-6">
        {#if imageDetailTab === "info"}
          <div class="space-y-6 animate-in">
            <!-- File Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span
                  class="text-xs font-medium text-gray-400 uppercase tracking-wide"
                  >Size</span
                >
                <p class="mt-1 text-sm font-medium text-gray-900">
                  {formatBytes(selectedImage.sizeBytes)}
                </p>
              </div>
              <div>
                <span
                  class="text-xs font-medium text-gray-400 uppercase tracking-wide"
                  >Resolution</span
                >
                <p class="mt-1 text-sm font-medium text-gray-900">
                  {selectedImage.width} × {selectedImage.height}
                </p>
              </div>
              <div>
                <span
                  class="text-xs font-medium text-gray-400 uppercase tracking-wide"
                  >Format</span
                >
                <p class="mt-1 text-sm font-medium text-gray-900 uppercase">
                  {selectedImage.mimeType.split("/")[1]}
                </p>
              </div>
              {#if selectedImage.takenAt}
                <div>
                  <span
                    class="text-xs font-medium text-gray-400 uppercase tracking-wide"
                    >Taken</span
                  >
                  <p class="mt-1 text-sm font-medium text-gray-900">
                    {formatDate(selectedImage.takenAt)}
                  </p>
                </div>
              {/if}
            </div>

            <!-- CDN URL -->
            <div class="pt-4 border-t border-gray-100">
              <span
                class="text-xs font-medium text-gray-400 uppercase tracking-wide"
                >CDN URL</span
              >
              <div class="mt-2 flex items-center gap-2">
                <code
                  class="flex-1 px-3 py-2 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate"
                >
                  {data.baseUrl}/i/{selectedImage.id}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onclick={() =>
                    copyToClipboard(
                      `${data.baseUrl}/i/${selectedImage!.id}`,
                      "URL copied"
                    )}
                >
                  Copy
                </Button>
              </div>
            </div>

            <!-- Quick Tags Preview -->
            {#if imageTags.length > 0}
              <div class="pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between mb-2">
                  <span
                    class="text-xs font-medium text-gray-400 uppercase tracking-wide"
                    >Tags</span
                  >
                  <button
                    type="button"
                    onclick={() => (imageDetailTab = "tags")}
                    class="text-xs text-gray-500 hover:text-gray-700"
                    >Edit</button
                  >
                </div>
                <div class="flex flex-wrap gap-1.5">
                  {#each imageTags as tag}
                    <TagBadge name={tag.name} color={tag.color} />
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Quick Location Preview -->
            {#if selectedImage.latitude && selectedImage.longitude}
              <div class="pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between mb-2">
                  <span
                    class="text-xs font-medium text-gray-400 uppercase tracking-wide"
                    >Location</span
                  >
                  <button
                    type="button"
                    onclick={() => (imageDetailTab = "location")}
                    class="text-xs text-gray-500 hover:text-gray-700"
                    >Edit</button
                  >
                </div>
                <div class="p-3 bg-gray-50 rounded-lg">
                  {#if selectedImage.locationName}
                    <p class="text-sm font-medium text-gray-900">
                      {selectedImage.locationName}
                    </p>
                  {/if}
                  <p class="text-xs text-gray-500 font-mono">
                    {selectedImage.latitude.toFixed(6)}, {selectedImage.longitude.toFixed(
                      6
                    )}
                  </p>
                </div>
              </div>
            {/if}
          </div>
        {:else if imageDetailTab === "tags"}
          <div class="space-y-4 animate-in">
            <p class="text-sm text-gray-500">
              Click tags to add or remove them from this image.
            </p>
            <TagSelector
              availableTags={data.tags}
              selectedTagIds={editingTags}
              onchange={handleTagsChange}
              allowCreate
              oncreate={createTagFromSelector}
            />
            {#if data.tags.length === 0}
              <div class="pt-4 text-center">
                <p class="text-sm text-gray-500 mb-2">
                  No tags in this gallery yet.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onclick={() => {
                    imageDetailOpen = false;
                    tagsModalOpen = true;
                  }}
                >
                  Manage Tags
                </Button>
              </div>
            {/if}
          </div>
        {:else if imageDetailTab === "location"}
          <div class="space-y-4 animate-in">
            <p class="text-sm text-gray-500">
              Click on the map to set the image location, or search for a place.
            </p>
            <LocationPicker
              bind:latitude={editingLocation.latitude}
              bind:longitude={editingLocation.longitude}
              bind:locationName={editingLocation.locationName}
              onchange={handleLocationChange}
            />
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between"
      >
        <Button
          variant="danger"
          size="sm"
          onclick={() => deleteSingleImage(selectedImage!.id)}
        >
          <svg
            class="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </Button>
        <div class="flex items-center gap-2">
          {#if hasUnsavedChanges}
            <span class="text-xs text-amber-600">Unsaved changes</span>
          {/if}
          <Button variant="ghost" onclick={closeImageDetail}>Close</Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Upload Modal -->
{#if uploadOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    onkeydown={(e) => e.key === "Escape" && !uploading && (uploadOpen = false)}
    role="presentation"
  >
    <!-- Backdrop with blur -->
    <button
      type="button"
      class="absolute inset-0 bg-gray-900/40 backdrop-blur-md transition-opacity"
      onclick={() => !uploading && (uploadOpen = false)}
      disabled={uploading}
      aria-label="Close"
    ></button>

    <!-- Modal Panel -->
    <div
      class="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden animate-modal-in"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-gray-100"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Upload Images</h2>
            <p class="text-xs text-gray-500">Drag & drop or click to select</p>
          </div>
        </div>
        {#if !uploading}
          <button
            type="button"
            onclick={() => (uploadOpen = false)}
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        {/if}
      </div>

      <!-- Content -->
      <div class="p-6">
        {#if uploading}
          <!-- Upload Progress -->
          <div class="space-y-4">
            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div
                class="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0"
              >
                <svg
                  class="w-5 h-5 text-white animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="3"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-sm font-medium text-gray-900">
                    {uploadProgress.status === "processing"
                      ? "Processing..."
                      : "Uploading..."}
                  </p>
                  <span
                    class="text-sm tabular-nums font-semibold text-gray-900"
                  >
                    {uploadProgress.current + 1} / {uploadProgress.total}
                  </span>
                </div>
                <p class="text-xs text-gray-500 truncate mb-2">
                  {uploadProgress.currentFile}
                </p>
                <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300 {uploadProgress.status ===
                    'processing'
                      ? 'bg-amber-500'
                      : 'bg-gray-900'}"
                    style="width: {((uploadProgress.current +
                      (uploadProgress.status === 'processing' ? 0.5 : 0)) /
                      uploadProgress.total) *
                      100}%"
                  ></div>
                </div>
              </div>
            </div>
            <p class="text-xs text-center text-gray-400">
              Please wait while your images are being uploaded...
            </p>
          </div>
        {:else}
          <!-- Drag & Drop Zone -->
          <Upload onfiles={handleFilesSelected} disabled={uploading} />
          <p class="mt-3 text-xs text-center text-gray-400">
            Supports PNG, JPG, WebP, GIF up to 50MB each
          </p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Tags Management Modal -->
<Modal bind:open={tagsModalOpen} title="Manage Tags" size="md">
  <TagManager
    tags={data.tags}
    oncreate={createTag}
    onupdate={updateTag}
    ondelete={deleteTag}
  />
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (tagsModalOpen = false)}
      >Close</Button
    >
  {/snippet}
</Modal>

<!-- API Documentation Modal -->
{#if docsOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    onkeydown={(e) => e.key === "Escape" && (docsOpen = false)}
    role="presentation"
  >
    <!-- Backdrop -->
    <button
      type="button"
      class="absolute inset-0 bg-gray-900/40 backdrop-blur-md cursor-pointer"
      onclick={() => (docsOpen = false)}
      aria-label="Close"
    ></button>

    <!-- Modal Panel -->
    <div
      class="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden animate-modal-in flex flex-col"
      style="max-height: 85vh;"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">API Reference</h2>
            <p class="text-xs text-gray-500">
              RESTful endpoints for {data.gallery.name}
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (docsOpen = false)}
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-all"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Auth Banner -->
      <div
        class="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-shrink-0"
      >
        <div class="flex items-center gap-2 text-xs">
          <svg
            class="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          <code class="font-mono text-gray-600"
            >Authorization: Bearer {data.gallery.accessToken.slice(
              0,
              12
            )}...</code
          >
        </div>
        <button
          type="button"
          onclick={() =>
            copyToClipboard(
              `Bearer ${data.gallery.accessToken}`,
              "Auth header copied"
            )}
          class="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 cursor-pointer rounded-md transition-colors"
        >
          Copy
        </button>
      </div>

      <!-- Tabs -->
      <div class="px-6 border-b border-gray-100 flex-shrink-0">
        <nav class="flex gap-1 -mb-px">
          {#each [{ id: "upload", label: "Upload", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" }, { id: "images", label: "Images", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" }, { id: "manage", label: "Manage", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" }, { id: "tags", label: "Tags", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" }] as tab}
            <button
              type="button"
              onclick={() => (apiDocsTab = tab.id as typeof apiDocsTab)}
              class="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer {apiDocsTab ===
              tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'}"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d={tab.icon}
                />
              </svg>
              {tab.label}
            </button>
          {/each}
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-y-auto p-6">
        {#if apiDocsTab === "upload"}
          <div class="space-y-4 animate-in">
            <!-- Upload Endpoint -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-700"
                    >POST</span
                  >
                  <code class="text-sm font-mono font-medium text-gray-900"
                    >/api/images/upload</code
                  >
                </div>
                <button
                  type="button"
                  onclick={() =>
                    copyToClipboard(
                      `curl -X POST "${data.baseUrl}/api/images/upload" -H "Authorization: Bearer ${data.gallery.accessToken}" -F "file=@image.jpg"`,
                      "cURL command copied"
                    )}
                  class="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 cursor-pointer border border-gray-200 rounded-lg transition-colors"
                >
                  Copy cURL
                </button>
              </div>
              <div class="space-y-3 text-sm">
                <div>
                  <span class="text-xs font-medium text-gray-500 uppercase"
                    >Content-Type</span
                  >
                  <p class="font-mono text-gray-700">multipart/form-data</p>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-3 bg-white rounded-lg border border-gray-200">
                    <span class="text-xs font-medium text-gray-400 uppercase"
                      >Request Body</span
                    >
                    <ul class="mt-2 space-y-1 text-xs">
                      <li>
                        <code class="text-gray-800">file</code>
                        <span class="text-red-500">*</span> - Image file (max 50MB)
                      </li>
                      <li>
                        <code class="text-gray-800">tags</code> - Comma-separated
                        tag IDs
                      </li>
                    </ul>
                  </div>
                  <div class="p-3 bg-white rounded-lg border border-gray-200">
                    <span class="text-xs font-medium text-gray-400 uppercase"
                      >Response</span
                    >
                    <code
                      class="block mt-2 text-xs font-mono text-gray-600 whitespace-pre"
                      >{`{ "id", "url", "thumbnail",
  "width", "height", "size" }`}</code
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        {:else if apiDocsTab === "images"}
          <div class="space-y-4 animate-in">
            <!-- CDN URL -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center gap-2 mb-3">
                <span
                  class="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700"
                  >GET</span
                >
                <code class="text-sm font-mono font-medium text-gray-900"
                  >/i/{"{id}"}</code
                >
                <span class="ml-auto text-xs text-gray-400">Public CDN</span>
              </div>
              <p class="text-xs text-gray-600 mb-3">
                No authentication required. Cached for 1 year.
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-white rounded-lg border border-gray-200">
                  <span class="text-xs font-medium text-gray-400 uppercase"
                    >Parameters</span
                  >
                  <ul class="mt-2 space-y-1 text-xs">
                    <li>
                      <code class="text-gray-800">thumb</code> - Thumbnail (~150px)
                    </li>
                    <li>
                      <code class="text-gray-800">w</code> - Width in pixels
                    </li>
                    <li>
                      <code class="text-gray-800">h</code> - Height in pixels
                    </li>
                    <li>
                      <code class="text-gray-800">q</code> - Quality (1-100)
                    </li>
                  </ul>
                </div>
                <div class="p-3 bg-white rounded-lg border border-gray-200">
                  <span class="text-xs font-medium text-gray-400 uppercase"
                    >Examples</span
                  >
                  <ul class="mt-2 space-y-1 text-xs font-mono text-gray-600">
                    <li>/i/abc?thumb</li>
                    <li>/i/abc?w=800</li>
                    <li>/i/abc?w=400&h=300</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- List Images -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center gap-2 mb-3">
                <span
                  class="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700"
                  >GET</span
                >
                <code class="text-sm font-mono font-medium text-gray-900"
                  >/api/images</code
                >
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-600">
                <span class="text-gray-400">Params:</span>
                <code
                  class="px-1.5 py-0.5 bg-white rounded border border-gray-200"
                  >page</code
                >
                <code
                  class="px-1.5 py-0.5 bg-white rounded border border-gray-200"
                  >perPage</code
                >
                <code
                  class="px-1.5 py-0.5 bg-white rounded border border-gray-200"
                  >tag</code
                >
              </div>
            </div>

            <!-- Get Single -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700"
                  >GET</span
                >
                <code class="text-sm font-mono font-medium text-gray-900"
                  >/api/images/{"{id}"}</code
                >
                <span class="ml-auto text-xs text-gray-400"
                  >Returns image details</span
                >
              </div>
            </div>
          </div>
        {:else if apiDocsTab === "manage"}
          <div class="space-y-4 animate-in">
            <!-- Update Metadata -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center gap-2 mb-3">
                <span
                  class="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-700"
                  >PATCH</span
                >
                <code class="text-sm font-mono font-medium text-gray-900"
                  >/api/images/{"{id}"}/metadata</code
                >
              </div>
              <code
                class="block p-3 bg-white rounded-lg border border-gray-200 text-xs font-mono text-gray-700 whitespace-pre"
                >{`{
  "latitude": 52.520008,
  "longitude": 13.404954,
  "locationName": "Berlin, Germany"
}`}</code
              >
            </div>

            <!-- Set Tags -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center gap-2 mb-3">
                <span
                  class="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-700"
                  >POST</span
                >
                <code class="text-sm font-mono font-medium text-gray-900"
                  >/api/images/{"{id}"}/tags</code
                >
              </div>
              <code
                class="block p-3 bg-white rounded-lg border border-gray-200 text-xs font-mono text-gray-700"
                >{`{ "tagIds": ["tag1", "tag2"] }`}</code
              >
            </div>

            <!-- Delete Single -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-700"
                  >DELETE</span
                >
                <code class="text-sm font-mono font-medium text-gray-900"
                  >/api/images/{"{id}"}</code
                >
              </div>
            </div>

            <!-- Batch Delete -->
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center gap-2 mb-3">
                <span
                  class="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-700"
                  >DELETE</span
                >
                <code class="text-sm font-mono font-medium text-gray-900"
                  >/api/images</code
                >
                <span class="ml-auto text-xs text-gray-400">Batch delete</span>
              </div>
              <code
                class="block p-3 bg-white rounded-lg border border-gray-200 text-xs font-mono text-gray-700"
                >{`{ "ids": ["id1", "id2", "id3"] }`}</code
              >
            </div>
          </div>
        {:else if apiDocsTab === "tags"}
          <div class="space-y-3 animate-in">
            <p class="text-sm text-gray-600 mb-4">
              Manage tags for organizing images in your gallery.
            </p>

            <div
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
            >
              <span
                class="px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700"
                >GET</span
              >
              <code class="flex-1 text-xs font-mono text-gray-700 truncate"
                >/api/galleries/{data.gallery.id}/tags</code
              >
              <span class="text-xs text-gray-400">List all tags</span>
            </div>
            <div
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
            >
              <span
                class="px-2 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-700"
                >POST</span
              >
              <code class="flex-1 text-xs font-mono text-gray-700 truncate"
                >/api/galleries/{data.gallery.id}/tags</code
              >
              <span class="text-xs text-gray-400">Create tag</span>
            </div>
            <div
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
            >
              <span
                class="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-700"
                >PATCH</span
              >
              <code class="flex-1 text-xs font-mono text-gray-700 truncate"
                >/api/galleries/{data.gallery.id}/tags/{"{tagId}"}</code
              >
              <span class="text-xs text-gray-400">Update tag</span>
            </div>
            <div
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
            >
              <span
                class="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-700"
                >DELETE</span
              >
              <code class="flex-1 text-xs font-mono text-gray-700 truncate"
                >/api/galleries/{data.gallery.id}/tags/{"{tagId}"}</code
              >
              <span class="text-xs text-gray-400">Delete tag</span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0"
      >
        <p class="text-xs text-gray-400">
          Base URL: <code class="font-mono">{data.baseUrl}</code>
        </p>
        <Button variant="ghost" onclick={() => (docsOpen = false)}>Close</Button
        >
      </div>
    </div>
  </div>
{/if}

<!-- Selection Mode Bottom Bar -->
{#if selectionMode}
  <div class="fixed bottom-0 left-0 right-0 z-40 animate-slide-up">
    <div class="bg-white border-t border-gray-200 shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Left: Selection info -->
          <div class="flex items-center gap-4">
            <button
              type="button"
              onclick={cancelSelection}
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              title="Cancel selection"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div class="h-6 w-px bg-gray-200"></div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 tabular-nums"
                >{selectedIds.size}</span
              >
              <span class="text-sm text-gray-500">selected</span>
            </div>
          </div>

          <!-- Center: Actions -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={toggleSelectAll}
              class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
            >
              {selectedIds.size === data.images.length
                ? "Deselect all"
                : "Select all"}
            </button>
          </div>

          <!-- Right: Delete action -->
          <div class="flex items-center gap-3">
            {#if selectedIds.size > 0}
              <button
                type="button"
                onclick={deleteSelected}
                disabled={deleting}
                class="px-4 py-1.5 cursor-pointer text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors flex items-center gap-2"
              >
                {#if deleting}
                  <svg
                    class="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Deleting...
                {:else}
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete {selectedIds.size}
                {/if}
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes modal-in {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .animate-in {
    animation: fade-in 0.2s ease-out;
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }

  .animate-slide-up {
    animation: slide-up 0.2s ease-out;
  }

  .animate-modal-in {
    animation: modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
</style>
