<script lang="ts" module>
	import { writable, get } from 'svelte/store';

	export interface UploadItem {
		id: string;
		filename: string;
		progress: number;
		status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
		error?: string;
	}

	export interface UploadSession {
		id: string;
		galleryName: string;
		items: UploadItem[];
		currentIndex: number;
		successCount: number;
		errorCount: number;
	}

	export const uploadSessions = writable<UploadSession[]>([]);

	export function startUploadSession(galleryName: string, files: File[]): string {
		const sessionId = crypto.randomUUID();
		const items: UploadItem[] = files.map((file) => ({
			id: crypto.randomUUID(),
			filename: file.name,
			progress: 0,
			status: 'pending'
		}));

		uploadSessions.update((sessions) => [
			...sessions,
			{
				id: sessionId,
				galleryName,
				items,
				currentIndex: 0,
				successCount: 0,
				errorCount: 0
			}
		]);

		return sessionId;
	}

	export function updateUploadItem(
		sessionId: string,
		itemIndex: number,
		update: Partial<UploadItem>
	) {
		uploadSessions.update((sessions) =>
			sessions.map((session) => {
				if (session.id !== sessionId) return session;
				const items = [...session.items];
				items[itemIndex] = { ...items[itemIndex], ...update };
				return {
					...session,
					items,
					currentIndex: itemIndex,
					successCount:
						update.status === 'success' ? session.successCount + 1 : session.successCount,
					errorCount: update.status === 'error' ? session.errorCount + 1 : session.errorCount
				};
			})
		);
	}

	export function completeUploadSession(sessionId: string) {
		// Keep for a moment to show final state, then remove
		setTimeout(() => {
			uploadSessions.update((sessions) => sessions.filter((s) => s.id !== sessionId));
		}, 3000);
	}

	export function cancelUploadSession(sessionId: string) {
		uploadSessions.update((sessions) => sessions.filter((s) => s.id !== sessionId));
	}

	export function hasActiveUploads(): boolean {
		const sessions = get(uploadSessions);
		return sessions.some((s) =>
			s.items.some((item) => item.status === 'uploading' || item.status === 'processing')
		);
	}
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let minimized = $state<Record<string, boolean>>({});

	function toggleMinimize(sessionId: string) {
		minimized = { ...minimized, [sessionId]: !minimized[sessionId] };
	}

	function getSessionProgress(session: UploadSession): number {
		const completed = session.successCount + session.errorCount;
		return (completed / session.items.length) * 100;
	}

	function isSessionActive(session: UploadSession): boolean {
		return session.items.some(
			(item) =>
				item.status === 'uploading' || item.status === 'processing' || item.status === 'pending'
		);
	}

	function isSessionComplete(session: UploadSession): boolean {
		return session.successCount + session.errorCount === session.items.length;
	}

	// beforeunload handler
	function handleBeforeUnload(e: BeforeUnloadEvent) {
		if (hasActiveUploads()) {
			e.preventDefault();
			e.returnValue = 'Upload in progress. Are you sure you want to leave?';
			return e.returnValue;
		}
	}

	onMount(() => {
		if (browser) {
			window.addEventListener('beforeunload', handleBeforeUnload);
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('beforeunload', handleBeforeUnload);
		}
	});
</script>

<div class="fixed bottom-4 right-4 z-40 flex flex-col gap-2 pointer-events-none">
	{#each $uploadSessions as session (session.id)}
		{@const isActive = isSessionActive(session)}
		{@const isComplete = isSessionComplete(session)}
		{@const currentItem = session.items[session.currentIndex]}
		{@const progress = getSessionProgress(session)}
		<div
			class="pointer-events-auto w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between px-4 py-3 {isComplete
					? session.errorCount > 0
						? 'bg-amber-50'
						: 'bg-emerald-50'
					: 'bg-gray-50'} border-b border-gray-100"
			>
				<div class="flex items-center gap-2 min-w-0">
					{#if isActive}
						<div class="w-5 h-5 flex-shrink-0">
							<svg class="w-5 h-5 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
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
					{:else if isComplete}
						<svg
							class="w-5 h-5 flex-shrink-0 {session.errorCount > 0
								? 'text-amber-500'
								: 'text-emerald-500'}"
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
					{/if}
					<div class="min-w-0">
						<p class="text-sm font-medium text-gray-900 truncate">
							{isComplete ? 'Upload complete' : 'Uploading...'}
						</p>
						<p class="text-xs text-gray-500 truncate">{session.galleryName}</p>
					</div>
				</div>
				<div class="flex items-center gap-1">
					<button
						type="button"
						onclick={() => toggleMinimize(session.id)}
						class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
						aria-label={minimized[session.id] ? 'Expand' : 'Minimize'}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							{#if minimized[session.id]}
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 15l7-7 7 7"
								/>
							{:else}
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							{/if}
						</svg>
					</button>
					{#if isComplete}
						<button
							type="button"
							onclick={() => cancelUploadSession(session.id)}
							class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
							aria-label="Dismiss"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
			</div>

			{#if !minimized[session.id]}
				<!-- Progress Bar -->
				<div class="px-4 pt-3">
					<div class="flex items-center justify-between text-xs mb-1.5">
						<span class="text-gray-600 font-medium">
							{session.successCount + session.errorCount} of {session.items.length}
						</span>
						<span class="text-gray-400 tabular-nums">{Math.round(progress)}%</span>
					</div>
					<div class="h-2 bg-gray-100 rounded-full overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-300 {isComplete
								? session.errorCount > 0
									? 'bg-amber-500'
									: 'bg-emerald-500'
								: 'bg-gray-900'}"
							style="width: {progress}%"
						></div>
					</div>
				</div>

				<!-- Current File -->
				{#if currentItem && isActive}
					<div class="px-4 py-3">
						<div class="flex items-center gap-2">
							<div class="flex-shrink-0">
								{#if currentItem.status === 'processing'}
									<div class="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
										<svg
											class="w-3.5 h-3.5 text-amber-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
											/>
										</svg>
									</div>
								{:else}
									<div class="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
										<svg
											class="w-3.5 h-3.5 text-gray-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
											/>
										</svg>
									</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm text-gray-700 truncate">{currentItem.filename}</p>
								<p class="text-xs text-gray-400">
									{currentItem.status === 'processing' ? 'Processing...' : 'Uploading...'}
								</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Summary when complete -->
				{#if isComplete}
					<div class="px-4 py-3 border-t border-gray-100">
						<div class="flex items-center gap-4 text-xs">
							{#if session.successCount > 0}
								<span class="flex items-center gap-1 text-emerald-600">
									<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clip-rule="evenodd"
										/>
									</svg>
									{session.successCount} uploaded
								</span>
							{/if}
							{#if session.errorCount > 0}
								<span class="flex items-center gap-1 text-red-600">
									<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
											clip-rule="evenodd"
										/>
									</svg>
									{session.errorCount} failed
								</span>
							{/if}
						</div>
						<!-- Show failed files with error messages -->
						{#if session.errorCount > 0}
							<div class="mt-2 max-h-24 overflow-y-auto">
								{#each session.items.filter((item) => item.status === 'error') as failedItem}
									<div class="text-xs py-1 border-t border-gray-50">
										<p class="text-gray-700 truncate">{failedItem.filename}</p>
										<p class="text-red-500 truncate">{failedItem.error || 'Upload failed'}</p>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	{/each}
</div>
