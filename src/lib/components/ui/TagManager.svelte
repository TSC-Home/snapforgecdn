<script lang="ts">
  import { Button, Input } from "$lib/components/ui";
  import TagBadge from "./TagBadge.svelte";

  interface Tag {
    id: string;
    name: string;
    color?: string | null;
    imageCount?: number;
  }

  interface Props {
    tags: Tag[];
    oncreate: (name: string, color?: string) => Promise<void>;
    onupdate: (
      id: string,
      name: string,
      color?: string | null
    ) => Promise<void>;
    ondelete: (id: string) => Promise<void>;
  }

  let { tags, oncreate, onupdate, ondelete }: Props = $props();

  let newTagName = $state("");
  let newTagColor = $state("#6366f1");
  let creating = $state(false);
  let editingId = $state<string | null>(null);
  let editName = $state("");
  let editColor = $state("");
  let saving = $state(false);

  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#06b6d4", // cyan
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#a855f7", // purple
    "#ec4899", // pink
    "#64748b", // slate
  ];

  async function handleCreate() {
    if (!newTagName.trim() || creating) return;
    creating = true;
    try {
      await oncreate(newTagName.trim(), newTagColor);
      newTagName = "";
    } finally {
      creating = false;
    }
  }

  function startEdit(tag: Tag) {
    editingId = tag.id;
    editName = tag.name;
    editColor = tag.color || "#6366f1";
  }

  function cancelEdit() {
    editingId = null;
    editName = "";
    editColor = "";
  }

  async function saveEdit() {
    if (!editingId || !editName.trim() || saving) return;
    saving = true;
    try {
      await onupdate(editingId, editName.trim(), editColor || null);
      cancelEdit();
    } finally {
      saving = false;
    }
  }

  async function handleDelete(id: string) {
    if (saving) return;
    saving = true;
    try {
      await ondelete(id);
    } finally {
      saving = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  }

  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  }
</script>

<div class="space-y-4">
  <!-- Create new tag -->
  <div class="flex gap-2">
    <Input
      bind:value={newTagName}
      onkeydown={handleKeydown}
      placeholder="New tag name..."
      class="flex-1"
    />
    <div class="flex items-center gap-1">
      {#each colors.slice(0, 5) as color}
        <button
          type="button"
          onclick={() => (newTagColor = color)}
          class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer
						{newTagColor === color ? 'border-gray-900 scale-110' : 'border-transparent'}"
          style:background-color={color}
        ></button>
      {/each}
      <input
        type="color"
        bind:value={newTagColor}
        class="w-6 h-6 rounded cursor-pointer"
      />
    </div>
    <Button
      onclick={handleCreate}
      loading={creating}
      disabled={!newTagName.trim()}
    >
      Add
    </Button>
  </div>

  <!-- Tag list -->
  {#if tags.length === 0}
    <p class="text-sm text-gray-500 text-center py-4">
      No tags yet. Create one above.
    </p>
  {:else}
    <div class="space-y-2 overflow-y-scroll h-64 custom-scrollbar">
      {#each tags as tag}
        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          {#if editingId === tag.id}
            <!-- Edit mode -->
            <input
              type="text"
              bind:value={editName}
              onkeydown={handleEditKeydown}
              class="flex-1 h-8 px-2 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:border-gray-400"
            />
            <div class="flex items-center gap-1">
              {#each colors.slice(0, 5) as color}
                <button
                  type="button"
                  onclick={() => (editColor = color)}
                  class="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer
										{editColor === color ? 'border-gray-900 scale-110' : 'border-transparent'}"
                  style:background-color={color}
                ></button>
              {/each}
            </div>
            <button
              type="button"
              onclick={saveEdit}
              disabled={saving}
              class="p-1.5 text-green-600 hover:bg-green-50 rounded cursor-pointer"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onclick={cancelEdit}
              class="p-1.5 text-gray-400 hover:bg-gray-100 rounded cursor-pointer"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          {:else}
            <!-- View mode -->
            <TagBadge name={tag.name} color={tag.color} size="md" />
            {#if tag.imageCount !== undefined}
              <span class="text-xs text-gray-400">{tag.imageCount} images</span>
            {/if}
            <div class="flex-1"></div>
            <button
              type="button"
              onclick={() => startEdit(tag)}
              class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              type="button"
              onclick={() => handleDelete(tag.id)}
              disabled={saving}
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgb(209, 213, 219) transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    height: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgb(209, 213, 219);
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgb(156, 163, 175);
  }
</style>
