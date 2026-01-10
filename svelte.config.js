import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      out: "build",
      precompress: false,
      envPrefix: "",
    }),
    csrf: {
      // Disable origin check when behind reverse proxy (Coolify/Caddy)
      checkOrigin: false,
    },
  },
  vitePlugin: {
    inspector: {
      // show or hide the inspector option
      showToggleButton: "always",
      // inspector position
      toggleButtonPos: "bottom-right",
    },
  },
};

export default config;
