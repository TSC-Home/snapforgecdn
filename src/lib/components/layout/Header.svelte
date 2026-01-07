<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title?: string;
    children?: Snippet;
    actions?: Snippet;
  }

  let { title, children, actions }: Props = $props();
</script>

<header
  class="sticky top-0 h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between z-10"
>
  <div class="flex items-center gap-4">
    {#if title}
      <h1 class="text-lg font-semibold text-gray-900">{title}</h1>
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </div>

  {#if actions}
    <div class="flex items-center gap-3">
      {@render actions()}
    </div>
  {/if}
</header>
