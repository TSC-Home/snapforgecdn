<script lang="ts">
  import {
    Button,
    Input,
    Select,
    Card,
    Modal,
    Toast,
    toast,
    Table,
    Th,
    Td,
    Pagination,
    Dropdown,
    DropdownItem,
  } from "$lib/components/ui";
  import { AppShell, Sidebar, Header } from "$lib/components/layout";

  let modalOpen = $state(false);
  let inputValue = $state("");
  let selectValue = $state("");
  let currentPage = $state(1);

  const selectOptions = [
    { value: "opt1", label: "Option 1" },
    { value: "opt2", label: "Option 2" },
    { value: "opt3", label: "Option 3" },
  ];

  const navItems = [
    { label: "Dashboard", href: "/", active: true },
    { label: "Galleries", href: "/galleries" },
    { label: "Settings", href: "/settings" },
  ];

  const tableData = [
    { id: 1, name: "image_001.jpg", size: "2.4 MB", date: "2024-01-15" },
    { id: 2, name: "photo_test.png", size: "1.8 MB", date: "2024-01-14" },
    { id: 3, name: "screenshot.webp", size: "456 KB", date: "2024-01-13" },
  ];
</script>

<Toast />

<AppShell>
  {#snippet sidebar()}
    <Sidebar items={navItems}>
      {#snippet header()}
        <span class="text-lg font-bold">SnapForgeCDN</span>
      {/snippet}
      {#snippet footer()}
        <span class="text-sm text-gray-500">v0.0.1</span>
      {/snippet}
    </Sidebar>
  {/snippet}

  {#snippet header()}
    <Header title="Component Showcase">
      {#snippet actions()}
        <Button size="sm">Action</Button>
      {/snippet}
    </Header>
  {/snippet}

  <div class="space-y-8 max-w-4xl">
    <!-- Buttons -->
    <Card>
      {#snippet header()}Buttons{/snippet}
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button loading>Loading...</Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>
    </Card>

    <!-- Inputs -->
    <Card>
      {#snippet header()}Inputs{/snippet}
      <div class="grid gap-4 md:grid-cols-2">
        <Input
          label="Default Input"
          placeholder="Enter text..."
          bind:value={inputValue}
        />
        <Input
          label="With Hint"
          hint="This is a helpful hint"
          placeholder="Type here..."
        />
        <Input
          label="With Error"
          error="This field is required"
          value="Invalid"
        />
        <Input label="Disabled" disabled value="Cannot edit" />
        <Input
          label="Password"
          type="password"
          placeholder="Enter password..."
        />
      </div>
    </Card>

    <!-- Select -->
    <Card>
      {#snippet header()}Select{/snippet}
      <div class="grid gap-4 md:grid-cols-2">
        <Select
          label="Default Select"
          options={selectOptions}
          bind:value={selectValue}
          placeholder="Choose an option..."
        />
        <Select
          label="With Error"
          options={selectOptions}
          error="Please select an option"
        />
      </div>
    </Card>

    <!-- Cards -->
    <Card>
      {#snippet header()}Cards{/snippet}
      <div class="grid gap-4 md:grid-cols-3">
        <Card padding="sm">
          <p class="text-sm text-gray-600">Small Padding</p>
        </Card>
        <Card padding="md">
          <p class="text-sm text-gray-600">Medium Padding</p>
        </Card>
        <Card padding="lg">
          <p class="text-sm text-gray-600">Large Padding</p>
        </Card>
      </div>
      <div class="mt-4">
        <Card>
          {#snippet header()}Card with Header{/snippet}
          <p class="text-gray-600">Card content goes here.</p>
          {#snippet footer()}
            <Button size="sm">Footer Action</Button>
          {/snippet}
        </Card>
      </div>
    </Card>

    <!-- Modal -->
    <Card>
      {#snippet header()}Modal{/snippet}
      <Button onclick={() => (modalOpen = true)}>Open Modal</Button>
    </Card>

    <Modal bind:open={modalOpen} title="Example Modal" size="md">
      <p class="text-gray-600">
        This is the modal content. Press ESC or click outside to close.
      </p>
      {#snippet footer()}
        <Button variant="ghost" onclick={() => (modalOpen = false)}
          >Cancel</Button
        >
        <Button
          onclick={() => {
            modalOpen = false;
            toast("Saved!", "success");
          }}>Save</Button
        >
      {/snippet}
    </Modal>

    <!-- Toast -->
    <Card>
      {#snippet header()}Toast Notifications{/snippet}
      <div class="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onclick={() => toast("Info message", "info")}>Info Toast</Button
        >
        <Button
          variant="secondary"
          onclick={() => toast("Success message", "success")}
          >Success Toast</Button
        >
        <Button
          variant="secondary"
          onclick={() => toast("Error message", "error")}>Error Toast</Button
        >
      </div>
    </Card>

    <!-- Table -->
    <Card>
      {#snippet header()}Table{/snippet}
      <Table>
        {#snippet header()}
          <tr>
            <Th>ID</Th>
            <Th>Name</Th>
            <Th>Size</Th>
            <Th>Date</Th>
            <Th align="right">Actions</Th>
          </tr>
        {/snippet}
        {#each tableData as row}
          <tr class="hover:bg-gray-50">
            <Td>{row.id}</Td>
            <Td>{row.name}</Td>
            <Td>{row.size}</Td>
            <Td>{row.date}</Td>
            <Td align="right">
              <Button size="sm" variant="ghost">Edit</Button>
            </Td>
          </tr>
        {/each}
      </Table>
    </Card>

    <!-- Pagination -->
    <Card>
      {#snippet header()}Pagination{/snippet}
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-600">Page {currentPage} of 10</span>
        <Pagination bind:page={currentPage} totalPages={10} />
      </div>
    </Card>

    <!-- Dropdown -->
    <Card>
      {#snippet header()}Dropdown{/snippet}
      <div class="flex gap-4">
        <Dropdown align="left">
          {#snippet trigger()}
            <Button variant="secondary">Dropdown Left</Button>
          {/snippet}
          <DropdownItem onclick={() => toast("Edit clicked", "info")}
            >Edit</DropdownItem
          >
          <DropdownItem onclick={() => toast("Duplicate clicked", "info")}
            >Duplicate</DropdownItem
          >
          <DropdownItem danger onclick={() => toast("Delete clicked", "error")}
            >Delete</DropdownItem
          >
        </Dropdown>

        <Dropdown align="right">
          {#snippet trigger()}
            <Button variant="secondary">Dropdown Right</Button>
          {/snippet}
          <DropdownItem href="/">Go to Home</DropdownItem>
          <DropdownItem disabled>Disabled Item</DropdownItem>
        </Dropdown>
      </div>
    </Card>
  </div>
</AppShell>
