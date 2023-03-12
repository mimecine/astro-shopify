import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel/serverless";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
import svelte from "@astrojs/svelte";

// https://astro.build/config
import netlify from "@astrojs/netlify/functions";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: netlify(),
  integrations: [tailwind({
    config: {
      applyBaseStyles: false
    }
  }), svelte()]
});