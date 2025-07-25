import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),

    // Disable service worker for pure static hosting
    serviceWorker: {
      register: false,
    },

    // Configure prerendering for static generation
    prerender: {
      handleHttpError: "warn",
      handleMissingId: "warn",
      entries: ["*"],
      crawl: true,
    },

    // Minimal CSP for static hosting
    csp: {
      mode: "auto",
    },
  },

  // Configure Svelte compiler for production
  compilerOptions: {
    dev: false,
  },
};

export default config;
