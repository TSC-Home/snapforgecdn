<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { Button, Card, Input, Select, toast } from "$lib/components/ui";

  let { data, form } = $props();

  type TabType = "account" | "admin";
  let activeTab = $state<TabType>("account");
  let loading = $state(false);

  // Account form states
  let email = $state(data.user?.email ?? "");
  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");

  // Admin form states
  let storageType = $state(data.settings?.storage.type ?? "local");

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  }

  // SMTP form states
  let smtpEnabled = $state(data.settings?.smtp.enabled ?? false);

  $effect(() => {
    if (form?.success) {
      if (form.action === "email") {
        toast("Email updated", "success");
        invalidateAll();
      } else if (form.action === "password") {
        toast("Password changed", "success");
        currentPassword = "";
        newPassword = "";
        confirmPassword = "";
      } else if (
        form.action === "general" ||
        form.action === "storage" ||
        form.action === "smtp"
      ) {
        toast("Settings saved", "success");
      } else if (form.action === "testSmtp") {
        toast(form.message || "Test email sent", "success");
      }
    }
    if (form?.error) {
      toast(form.error, "error");
    }
  });

  $effect(() => {
    if (data.settings) {
      storageType = data.settings.storage.type;
      smtpEnabled = data.settings.smtp.enabled;
    }
  });
</script>

<svelte:head>
  <title>Settings - SnapForgeCDN</title>
</svelte:head>

<div class="max-w-3xl space-y-6">
  <!-- Header -->
  <div>
    <h2 class="text-xl font-semibold text-gray-900">Settings</h2>
    <p class="text-sm text-gray-500">
      Manage your account and system configuration
    </p>
  </div>

  <!-- Tab Navigation -->
  <div class="border-b border-gray-200">
    <nav class="flex gap-1">
      <button
        type="button"
        onclick={() => (activeTab = "account")}
        class="relative cursor-pointer px-4 py-2.5 text-sm font-medium rounded-t-md
					{activeTab === 'account'
          ? 'text-gray-900 bg-gray-50 border border-gray-200 border-b-0 -mb-px'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
      >
        Account
      </button>
      {#if data.isAdmin}
        <button
          type="button"
          onclick={() => (activeTab = "admin")}
          class="relative px-4 py-2.5 text-sm font-medium rounded-t-md transition-all duration-200 flex items-center gap-2 cursor-pointer
						{activeTab === 'admin'
            ? 'text-gray-900 bg-gray-50 border  border-gray-200 -mb-px border-b-0'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}"
        >
          Admin
          <span
            class="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-amber-100 text-amber-700"
          >
            System
          </span>
        </button>
      {/if}
    </nav>
  </div>

  <!-- Account Tab -->
  {#if activeTab === "account"}
    <div class="space-y-6 animate-in fade-in duration-200">
      <!-- Account Overview -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Account Overview
          </div>
        {/snippet}
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div>
            <span
              class="text-xs font-medium text-gray-400 uppercase tracking-wide"
              >Role</span
            >
            <p class="mt-1 text-sm font-medium text-gray-900 capitalize">
              {data.user?.role}
            </p>
          </div>
          <div>
            <span
              class="text-xs font-medium text-gray-400 uppercase tracking-wide"
              >Gallery Limit</span
            >
            <p class="mt-1 text-sm font-medium text-gray-900">
              {data.user?.maxGalleries}
            </p>
          </div>
          <div>
            <span
              class="text-xs font-medium text-gray-400 uppercase tracking-wide"
              >Member Since</span
            >
            <p class="mt-1 text-sm font-medium text-gray-900">
              {data.user?.createdAt ? formatDate(data.user.createdAt) : "—"}
            </p>
          </div>
        </div>
      </Card>

      <!-- Email -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Email Address
          </div>
        {/snippet}
        <form
          method="POST"
          action="?/email"
          use:enhance={() => {
            loading = true;
            return async ({ update }) => {
              await update();
              loading = false;
            };
          }}
          class="space-y-4"
        >
          {#if form?.error && form?.action === "email"}
            <div
              class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-md"
            >
              {form.error}
            </div>
          {/if}
          <Input
            name="email"
            label="Email"
            type="email"
            bind:value={email}
            required
          />
          <Button type="submit" {loading}>Update Email</Button>
        </form>
      </Card>

      <!-- Password -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Change Password
          </div>
        {/snippet}
        <form
          method="POST"
          action="?/password"
          use:enhance={() => {
            loading = true;
            return async ({ update }) => {
              await update();
              loading = false;
            };
          }}
          class="space-y-4"
        >
          {#if form?.error && form?.action === "password"}
            <div
              class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-md"
            >
              {form.error}
            </div>
          {/if}
          <Input
            name="currentPassword"
            label="Current Password"
            type="password"
            bind:value={currentPassword}
            required
          />
          <div class="grid sm:grid-cols-2 gap-4">
            <Input
              name="newPassword"
              label="New Password"
              type="password"
              bind:value={newPassword}
              hint="Minimum 8 characters"
              required
            />
            <Input
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              bind:value={confirmPassword}
              required
            />
          </div>
          <Button type="submit" {loading}>Change Password</Button>
        </form>
      </Card>
    </div>
  {/if}

  <!-- Admin Tab -->
  {#if activeTab === "admin" && data.isAdmin && data.settings}
    <div class="space-y-6 animate-in fade-in duration-200">
      <!-- System Settings -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            System Settings
          </div>
        {/snippet}
        <form
          method="POST"
          action="?/general"
          use:enhance={() => {
            loading = true;
            return async ({ update }) => {
              await update();
              loading = false;
            };
          }}
          class="space-y-5"
        >
          {#if form?.error && form?.action === "general"}
            <div
              class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-md"
            >
              {form.error}
            </div>
          {/if}

          <div class="grid sm:grid-cols-2 gap-4">
            <Input
              name="defaultMaxGalleries"
              label="Default galleries per user"
              type="number"
              min="1"
              max="1000"
              value={data.settings.general.defaultMaxGalleries.toString()}
              hint="For new users"
            />
            <Input
              name="maxUploadSizeMB"
              label="Max upload size (MB)"
              type="number"
              min="1"
              max="500"
              value={data.settings.images.maxUploadSizeMB.toString()}
              hint="Per image"
            />
          </div>

          <div class="pt-4 border-t border-gray-100">
            <label class="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="allowRegistration"
                checked={data.settings.general.allowRegistration}
                class=" w-4 h-4 mt-1.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500 focus:ring-offset-0"
              />
              <div class="flex-1">
                <span
                  class="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors"
                >
                  Allow public registration
                </span>
                <p class="text-sm text-gray-500">
                  Enable self-service account creation for new users.
                </p>
              </div>
            </label>
          </div>

          <div
            class="pt-4 border-t border-gray-100 flex items-center justify-between"
          >
            <p class="text-xs text-gray-400">JPEG, PNG, WebP, GIF supported</p>
            <Button type="submit" {loading}>Save Changes</Button>
          </div>
        </form>
      </Card>

      <!-- Storage Configuration -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
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
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
            Storage
          </div>
        {/snippet}
        <form
          method="POST"
          action="?/storage"
          use:enhance={() => {
            loading = true;
            return async ({ update }) => {
              await update();
              loading = false;
            };
          }}
          class="space-y-5"
        >
          {#if form?.error && form?.action === "storage"}
            <div
              class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-md"
            >
              {form.error}
            </div>
          {/if}

          <Select
            name="type"
            label="Storage Backend"
            bind:value={storageType}
            options={[
              { value: "local", label: "Local Filesystem" },
              { value: "s3", label: "S3-compatible Storage" },
            ]}
          />

          {#if storageType === "local"}
            <Input
              name="localPath"
              label="Storage Path"
              value={data.settings.storage.localPath}
              hint="Relative or absolute path"
            />
          {/if}

          {#if storageType === "s3"}
            <div
              class="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4"
            >
              <div
                class="flex items-center gap-2 text-sm font-medium text-gray-700"
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
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
                S3 Configuration
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <Input
                  name="s3Bucket"
                  label="Bucket"
                  value={data.settings.storage.s3Bucket}
                  required={storageType === "s3"}
                />
                <Input
                  name="s3Region"
                  label="Region"
                  value={data.settings.storage.s3Region}
                  placeholder="us-east-1"
                  required={storageType === "s3"}
                />
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <Input
                  name="s3AccessKey"
                  label="Access Key"
                  value={data.settings.storage.s3AccessKey}
                  required={storageType === "s3"}
                />
                <Input
                  name="s3SecretKey"
                  label="Secret Key"
                  type="password"
                  value={data.settings.storage.s3SecretKey}
                  required={storageType === "s3"}
                />
              </div>

              <Input
                name="s3Endpoint"
                label="Custom Endpoint"
                value={data.settings.storage.s3Endpoint}
                placeholder="https://s3.example.com"
                hint="MinIO, B2, R2, etc. Leave empty for AWS."
              />
            </div>

            <div
              class="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg"
            >
              <svg
                class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p class="text-sm text-amber-700">
                Existing images must be migrated manually after switching
                storage backends.
              </p>
            </div>
          {/if}

          <!-- Hidden fields -->
          {#if storageType === "local"}
            <input
              type="hidden"
              name="s3Bucket"
              value={data.settings.storage.s3Bucket}
            />
            <input
              type="hidden"
              name="s3Region"
              value={data.settings.storage.s3Region}
            />
            <input
              type="hidden"
              name="s3AccessKey"
              value={data.settings.storage.s3AccessKey}
            />
            <input
              type="hidden"
              name="s3SecretKey"
              value={data.settings.storage.s3SecretKey}
            />
            <input
              type="hidden"
              name="s3Endpoint"
              value={data.settings.storage.s3Endpoint}
            />
          {:else}
            <input
              type="hidden"
              name="localPath"
              value={data.settings.storage.localPath}
            />
          {/if}

          <div class="pt-4 border-t border-gray-100">
            <Button type="submit" {loading}>Save Storage</Button>
          </div>
        </form>
      </Card>

      <!-- SMTP Configuration -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Email (SMTP)
          </div>
        {/snippet}
        <form
          method="POST"
          action="?/smtp"
          use:enhance={() => {
            loading = true;
            return async ({ update }) => {
              await update();
              loading = false;
            };
          }}
          class="space-y-5"
        >
          {#if form?.error && form?.action === "smtp"}
            <div
              class="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-md"
            >
              {form.error}
            </div>
          {/if}

          <div class="pb-4 border-b border-gray-100">
            <label class="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="enabled"
                bind:checked={smtpEnabled}
                class="mt-1.5 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 focus:ring-offset-0"
              />
              <div class="flex-1">
                <span
                  class="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors"
                >
                  Enable email notifications
                </span>
                <p class="text-sm text-gray-500">
                  Send invitation emails to collaborators. Without this, you'll
                  need to share invite links manually.
                </p>
              </div>
            </label>
          </div>

          {#if smtpEnabled}
            <div
              class="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4"
            >
              <div
                class="flex items-center gap-2 text-sm font-medium text-gray-700"
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
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                  />
                </svg>
                SMTP Server Configuration
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <Input
                  name="host"
                  label="SMTP Host"
                  value={data.settings.smtp.host}
                  placeholder="smtp.example.com"
                  required={smtpEnabled}
                />
                <Input
                  name="port"
                  label="Port"
                  type="number"
                  value={data.settings.smtp.port.toString()}
                  placeholder="587"
                />
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <Input
                  name="username"
                  label="Username"
                  value={data.settings.smtp.username}
                  placeholder="Optional"
                />
                <Input
                  name="password"
                  label="Password"
                  type="password"
                  value={data.settings.smtp.password}
                  placeholder="Optional"
                />
              </div>

              <div class="pt-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="secure"
                    checked={data.settings.smtp.secure}
                    class="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 focus:ring-offset-0"
                  />
                  <span class="text-sm text-gray-700"
                    >Use TLS/SSL (port 465)</span
                  >
                </label>
              </div>
            </div>

            <div
              class="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4"
            >
              <div
                class="flex items-center gap-2 text-sm font-medium text-gray-700"
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
                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                  />
                </svg>
                Sender Information
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <Input
                  name="fromEmail"
                  label="From Email"
                  type="email"
                  value={data.settings.smtp.fromEmail}
                  placeholder="noreply@example.com"
                  required={smtpEnabled}
                />
                <Input
                  name="fromName"
                  label="From Name"
                  value={data.settings.smtp.fromName}
                  placeholder="SnapForgeCDN"
                />
              </div>
            </div>
          {/if}

          <div
            class="pt-4 border-t border-gray-100 flex items-center justify-between gap-4"
          >
            {#if smtpEnabled && data.settings.smtp.enabled}
              <form
                method="POST"
                action="?/testSmtp"
                use:enhance={() => {
                  loading = true;
                  return async ({ update }) => {
                    await update();
                    loading = false;
                  };
                }}
                class="flex items-center gap-2"
              >
                <input
                  type="hidden"
                  name="testEmail"
                  value={data.user?.email}
                />
                <Button type="submit" variant="secondary" {loading}>
                  Send Test Email
                </Button>
              </form>
            {:else}
              <div></div>
            {/if}
            <Button type="submit" {loading}>Save Email Settings</Button>
          </div>
        </form>
      </Card>
    </div>
  {/if}
</div>

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
  .animate-in {
    animation: fade-in 0.2s ease-out;
  }
</style>
