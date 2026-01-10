<script lang="ts">
    import { page } from "$app/stores";

    const errorMessages: Record<
        number,
        { title: string; description: string }
    > = {
        404: {
            title: "Page not found",
            description:
                "The page you're looking for doesn't exist or has been moved.",
        },
        500: {
            title: "Server error",
            description:
                "Something went wrong on our end. Please try again later.",
        },
        403: {
            title: "Access denied",
            description: "You don't have permission to access this resource.",
        },
        401: {
            title: "Unauthorized",
            description: "Please sign in to access this page.",
        },
    };

    $: error = errorMessages[$page.status] || {
        title: "Something went wrong",
        description: "An unexpected error occurred.",
    };
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <!-- Card -->
        <div
            class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
            <!-- Status Badge -->
            <div class="pt-10 pb-6 px-8 text-center">
                <!-- Status Code -->
                <div
                    class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-600 mb-4"
                >
                    <span
                        class="w-2 h-2 rounded-full {$page.status >= 500
                            ? 'bg-red-400'
                            : $page.status >= 400
                              ? 'bg-amber-400'
                              : 'bg-gray-400'}"
                    ></span>
                    Error {$page.status}
                </div>

                <!-- Title -->
                <h1 class="text-2xl font-semibold text-gray-900 mb-2">
                    {error.title}
                </h1>

                <!-- Description -->
                <p class="text-gray-500 leading-relaxed">
                    {error.description}
                </p>

                {#if $page.error?.message && $page.error.message !== error.description}
                    <p
                        class="mt-3 text-sm text-gray-400 font-mono bg-gray-50 rounded-lg px-4 py-2"
                    >
                        {$page.error.message}
                    </p>
                {/if}
            </div>

            <!-- Actions -->
            <div class="px-8 pb-8 pt-2 flex flex-col gap-3">
                <a
                    href="/login"
                    class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
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
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                    </svg>
                    Go to Login
                </a>
                <button
                    onclick={() => history.back()}
                    class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
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
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                    Go Back
                </button>
            </div>
        </div>

        <!-- Footer -->
        <p class="text-center text-sm text-gray-400 mt-6">SnapForgeCDN</p>
    </div>
</div>
