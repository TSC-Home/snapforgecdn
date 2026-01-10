<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Map, Marker, LeafletMouseEvent } from "leaflet";

  interface Props {
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    readonly?: boolean;
    onchange?: (data: {
      latitude: number | null;
      longitude: number | null;
      locationName: string | null;
    }) => void;
  }

  let {
    latitude = $bindable(null),
    longitude = $bindable(null),
    locationName = $bindable(null),
    readonly = false,
    onchange,
  }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map: Map | null = null;
  let marker: Marker | null = null;
  let L: typeof import("leaflet") | null = null;
  let searchInput = $state("");
  let searching = $state(false);

  onMount(async () => {
    // Dynamic import Leaflet (client-side only)
    L = await import("leaflet");

    // Initialize map
    map = L.map(mapContainer).setView(
      [latitude ?? 51.505, longitude ?? -0.09],
      latitude && longitude ? 13 : 2
    );

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add existing marker if coordinates exist
    if (latitude && longitude) {
      marker = L.marker([latitude, longitude]).addTo(map);
    }

    // Add click handler for setting location
    if (!readonly) {
      map.on("click", handleMapClick);
    }
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  function handleMapClick(e: LeafletMouseEvent) {
    if (!L || !map || readonly) return;

    const { lat, lng } = e.latlng;

    // Update or create marker
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng]).addTo(map);
    }

    latitude = lat;
    longitude = lng;

    // Reverse geocode to get location name
    reverseGeocode(lat, lng);

    onchange?.({ latitude: lat, longitude: lng, locationName });
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`
      );
      if (res.ok) {
        const data = await res.json();
        locationName =
          data.display_name?.split(",").slice(0, 3).join(", ") || null;
        onchange?.({ latitude: lat, longitude: lng, locationName });
      }
    } catch {
      // Ignore geocoding errors
    }
  }

  async function searchLocation() {
    if (!searchInput.trim() || !L || !map) return;

    searching = true;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&limit=1`
      );
      if (res.ok) {
        const results = await res.json();
        if (results.length > 0) {
          const { lat, lon, display_name } = results[0];
          const latNum = parseFloat(lat);
          const lngNum = parseFloat(lon);

          map.setView([latNum, lngNum], 13);

          if (marker) {
            marker.setLatLng([latNum, lngNum]);
          } else {
            marker = L.marker([latNum, lngNum]).addTo(map);
          }

          latitude = latNum;
          longitude = lngNum;
          locationName =
            display_name?.split(",").slice(0, 3).join(", ") || null;

          onchange?.({ latitude: latNum, longitude: lngNum, locationName });
        }
      }
    } catch {
      // Ignore search errors
    }
    searching = false;
  }

  function clearLocation() {
    if (marker && map && L) {
      map.removeLayer(marker);
      marker = null;
    }
    latitude = null;
    longitude = null;
    locationName = null;
    onchange?.({ latitude: null, longitude: null, locationName: null });
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      searchLocation();
    }
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    crossorigin=""
  />
</svelte:head>

<div class="space-y-3">
  {#if !readonly}
    <div class="flex gap-2 items-center">
      <input
        type="text"
        bind:value={searchInput}
        onkeydown={handleSearchKeydown}
        placeholder="Search location..."
        class="flex-1 h-9 px-3 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      />
      <button
        type="button"
        onclick={searchLocation}
        disabled={searching}
        class="px-3 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
      >
        {searching ? "Searching..." : "Search"}
      </button>
    </div>
  {/if}

  <div
    bind:this={mapContainer}
    class="w-full h-64 rounded-lg border border-gray-200 overflow-hidden"
    style="z-index: 0;"
  ></div>

  {#if latitude !== null && longitude !== null}
    <div
      class="flex items-start justify-between gap-2 p-3 bg-gray-50 rounded-lg"
    >
      <div class="min-w-0 flex-1">
        {#if locationName}
          <p class="text-sm font-medium text-gray-900 truncate">
            {locationName}
          </p>
        {/if}
        <p class="text-xs text-gray-500">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      </div>
      {#if !readonly}
        <button
          type="button"
          onclick={clearLocation}
          aria-label="Clear location"
          class="p-1 text-gray-400 hover:text-gray-600"
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
      {/if}
    </div>
  {:else if readonly}
    <p class="text-sm text-gray-500 text-center py-2">No location set</p>
  {:else}
    <p class="text-xs text-gray-500 text-center">
      Click on the map to set location
    </p>
  {/if}
</div>
