import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import { svelteTesting } from "@testing-library/svelte/vite";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  plugins: [
    sveltekit(),
    svelteTesting(),
    // Add compression for production builds
    ...(mode === "production"
      ? [
          compression({
            algorithm: "gzip",
            ext: ".gz",
            threshold: 1024,
            deleteOriginFile: false,
          }),
          compression({
            algorithm: "brotliCompress",
            ext: ".br",
            threshold: 1024,
            deleteOriginFile: false,
          }),
          // Bundle analyzer for optimization insights
          visualizer({
            filename: "build/stats.html",
            open: false,
            gzipSize: true,
            brotliSize: true,
            template: "treemap",
          }),
        ]
      : []),
  ],

  // Development server configuration
  server: {
    port: 5173,
    host: true,
    open: false,
    hmr: {
      port: 5174,
    },
  },

  // Build configuration with production optimizations
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching
        manualChunks: (id) => {
          // Vendor chunk for external dependencies
          if (id.includes("node_modules")) {
            if (id.includes("svelte")) {
              return "svelte-vendor";
            }
            // Split large vendor libraries into separate chunks
            if (id.includes("@testing-library") || id.includes("vitest")) {
              return "test-vendor";
            }
            return "vendor";
          }
          // Component chunks for better code splitting
          if (id.includes("src/lib/components")) {
            return "components";
          }
          // Utility chunks for shared code
          if (id.includes("src/lib/utils")) {
            return "utils";
          }
        },
        // Optimize asset naming for better caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          if (/woff2?|ttf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
      },
      // Additional Rollup optimizations
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    // Enable asset inlining for small files (4KB threshold)
    assetsInlineLimit: 4096,
    // Additional production optimizations
    cssCodeSplit: true,
    emptyOutDir: true,
    // Optimize for modern browsers in production
    ...(mode === "production" && {
      target: ["es2022", "chrome89", "firefox89", "safari15"],
      minify: "esbuild",
      // Enable advanced minification options
      esbuild: {
        drop: ["console", "debugger"],
        legalComments: "none",
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
        // Additional esbuild optimizations
        treeShaking: true,
        ignoreAnnotations: false,
        keepNames: false,
      },
    }),
  },

  // Optimization configuration
  optimizeDeps: {
    include: ["svelte"],
    exclude: ["@testing-library/svelte", "@testing-library/jest-dom"],
    // Force optimization of commonly used dependencies
    force: mode === "production",
    // Enable esbuild for dependency optimization
    esbuildOptions: {
      target: "esnext",
      supported: {
        "top-level-await": true,
      },
    },
  },

  // Test configuration for Vitest
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}", "tests/unit/**/*.{test,spec}.{js,ts}"],
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.config.js",
        "**/*.config.ts",
        ".svelte-kit/**",
        "src/app.html",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      include: ["src/**/*.{js,ts,svelte}"],
    },
    // Configure for Svelte 5 compatibility
    globals: true,
  },

  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
}));
