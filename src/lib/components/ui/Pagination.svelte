<script lang="ts">
  interface Props {
    page: number;
    totalPages: number;
    onchange?: (page: number) => void;
  }

  let { page = $bindable(1), totalPages, onchange }: Props = $props();

  function goTo(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      page = newPage;
      onchange?.(page);
    }
  }

  const visiblePages = $derived(() => {
    const pages: (number | "...")[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - delta && i <= page + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }

    return pages;
  });
</script>

{#if totalPages > 1}
  <nav class="flex items-center gap-1">
    <button
      onclick={() => goTo(page - 1)}
      disabled={page === 1}
      class="h-8 px-2 text-sm cursor-pointer text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label="Vorherige Seite"
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
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>

    {#each visiblePages() as p}
      {#if p === "..."}
        <span class="h-8 px-2 flex items-center text-gray-400">...</span>
      {:else}
        <button
          onclick={() => goTo(p)}
          class="h-8 min-w-[32px] px-2 text-sm transition- rounded-md cursor-pointer
						{p === page ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}"
        >
          {p}
        </button>
      {/if}
    {/each}

    <button
      onclick={() => goTo(page + 1)}
      disabled={page === totalPages}
      class="h-8 px-2 text-sm text-gray- cursor-pointer hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      aria-label="Naechste Seite"
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
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  </nav>
{/if}
