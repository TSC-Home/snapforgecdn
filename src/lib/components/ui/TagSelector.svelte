<script lang="ts">
  import TagBadge from "./TagBadge.svelte";

  interface Tag {
    id: string;
    name: string;
    color?: string | null;
  }

  interface Props {
    availableTags: Tag[];
    selectedTagIds: string[];
    onchange?: (tagIds: string[]) => void;
    allowCreate?: boolean;
    oncreate?: (name: string) => void;
  }

  let {
    availableTags,
    selectedTagIds = $bindable([]),
    onchange,
    allowCreate = false,
    oncreate,
  }: Props = $props();

  let newTagName = $state("");
  let showDropdown = $state(false);
  let inputElement: HTMLInputElement;

  const selectedTags = $derived(
    availableTags.filter((t) => selectedTagIds.includes(t.id))
  );

  const unselectedTags = $derived(
    availableTags.filter((t) => !selectedTagIds.includes(t.id))
  );

  const filteredTags = $derived(
    newTagName.trim()
      ? unselectedTags.filter((t) =>
          t.name.toLowerCase().includes(newTagName.toLowerCase())
        )
      : unselectedTags
  );

  const canCreate = $derived(
    allowCreate &&
      newTagName.trim().length > 0 &&
      !availableTags.some(
        (t) => t.name.toLowerCase() === newTagName.trim().toLowerCase()
      )
  );

  function addTag(tagId: string) {
    if (!selectedTagIds.includes(tagId)) {
      selectedTagIds = [...selectedTagIds, tagId];
      onchange?.(selectedTagIds);
    }
    newTagName = "";
  }

  function removeTag(tagId: string) {
    selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
    onchange?.(selectedTagIds);
  }

  function handleCreate() {
    if (canCreate && oncreate) {
      oncreate(newTagName.trim());
      newTagName = "";
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canCreate) {
        handleCreate();
      } else if (filteredTags.length > 0) {
        addTag(filteredTags[0].id);
      }
    } else if (e.key === "Escape") {
      showDropdown = false;
      inputElement?.blur();
    } else if (
      e.key === "Backspace" &&
      !newTagName &&
      selectedTagIds.length > 0
    ) {
      removeTag(selectedTagIds[selectedTagIds.length - 1]);
    }
  }

  function handleFocus() {
    showDropdown = true;
  }

  function handleBlur() {
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      showDropdown = false;
    }, 150);
  }
</script>

<div class="relative">
  <div
    class="min-h-[42px] p-1.5 border border-gray-200 rounded-md bg-white flex flex-wrap gap-1.5 items-center focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100"
  >
    {#each selectedTags as tag}
      <TagBadge
        name={tag.name}
        color={tag.color}
        removable
        onremove={() => removeTag(tag.id)}
      />
    {/each}
    <input
      bind:this={inputElement}
      type="text"
      bind:value={newTagName}
      onfocus={handleFocus}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      placeholder={selectedTags.length === 0 ? "Add tags..." : ""}
      class="flex-1 min-w-[80px] h-6 px-1 text-sm bg-transparent border-none focus:outline-none"
    />
  </div>

  {#if showDropdown && (filteredTags.length > 0 || canCreate)}
    <div
      class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
    >
      {#if canCreate}
        <button
          type="button"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
          onmousedown={() => handleCreate()}
        >
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span
            >Create "<span class="font-medium">{newTagName.trim()}</span>"</span
          >
        </button>
      {/if}
      {#each filteredTags as tag}
        <button
          type="button"
          class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
          onmousedown={() => addTag(tag.id)}
        >
          <TagBadge name={tag.name} color={tag.color} />
        </button>
      {/each}
    </div>
  {/if}
</div>
