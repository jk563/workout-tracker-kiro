#!/usr/bin/env node

import { readFileSync, existsSync, statSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Performance thresholds based on requirements
const PERFORMANCE_THRESHOLDS = {
  // Bundle size limits (in KB) - adjusted for realistic modern web app
  maxJSBundleSize: 100, // Total JS should be under 100KB (gzipped)
  maxCSSBundleSize: 50, // CSS should be under 50KB (includes Tailwind)
  maxTotalBundleSize: 150, // Total core bundle under 150KB (JS + CSS only)

  // Asset optimization
  maxImageSize: 100, // Images should be under 100KB

  // Chunk count (too many chunks can hurt performance)
  maxChunkCount: 15,

  // Compression ratios (realistic for modern JS/CSS)
  minGzipRatio: 0.6, // At least 40% compression (60% of original size)
  minBrotliRatio: 0.7, // At least 30% compression (70% of original size)
};

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + " KB";
}

function formatRatio(ratio) {
  return ((1 - ratio) * 100).toFixed(1) + "%";
}

function checkBuildOutput() {
  const outputDir = join(__dirname, "../.svelte-kit/output/output/client");

  if (!existsSync(outputDir)) {
    console.error('❌ Build output not found. Run "npm run build" first.');
    process.exit(1);
  }

  console.log("🔍 Analyzing build performance...\n");

  // Read build manifest (for future use)
  const manifestPath = join(outputDir, ".vite/manifest.json");

  if (existsSync(manifestPath)) {
    try {
      JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch {
      console.warn("⚠️  Could not read build manifest");
    }
  }

  // Analyze bundle sizes
  const results = {
    jsSize: 0,
    cssSize: 0,
    totalSize: 0, // Only JS + CSS for core bundle analysis
    chunkCount: 0,
    compressionResults: [],
    issues: [],
  };

  // Recursively analyze files
  function analyzeDirectory(dir, prefix = "") {
    try {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          analyzeDirectory(fullPath, prefix + item + "/");
        } else {
          const size = stat.size;
          const relativePath = prefix + item;

          // Categorize files
          if (item.endsWith(".js")) {
            results.jsSize += size;
            results.chunkCount++;

            // Check for compressed versions
            const gzPath = fullPath + ".gz";
            const brPath = fullPath + ".br";

            if (existsSync(gzPath)) {
              const gzSize = statSync(gzPath).size;
              const ratio = gzSize / size;
              results.compressionResults.push({
                file: relativePath,
                original: size,
                gzip: gzSize,
                ratio: ratio,
                type: "gzip",
              });
            }

            if (existsSync(brPath)) {
              const brSize = statSync(brPath).size;
              const ratio = brSize / size;
              results.compressionResults.push({
                file: relativePath,
                original: size,
                brotli: brSize,
                ratio: ratio,
                type: "brotli",
              });
            }
          } else if (item.endsWith(".css")) {
            results.cssSize += size;
          }

          // Only count JS and CSS for core bundle size
          if (item.endsWith(".js") || item.endsWith(".css")) {
            results.totalSize += size;
          }

          // Check individual file sizes
          if (
            item.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) &&
            size > PERFORMANCE_THRESHOLDS.maxImageSize * 1024
          ) {
            results.issues.push(`Large image: ${relativePath} (${formatBytes(size)})`);
          }
        }
      }
    } catch {
      console.warn(`⚠️  Could not analyze directory: ${dir}`);
    }
  }

  analyzeDirectory(outputDir);

  // Performance analysis
  console.log("📊 Bundle Analysis:");
  console.log(`   JavaScript: ${formatBytes(results.jsSize)}`);
  console.log(`   CSS: ${formatBytes(results.cssSize)}`);
  console.log(`   Total: ${formatBytes(results.totalSize)}`);
  console.log(`   Chunks: ${results.chunkCount}`);
  console.log("");

  // Check thresholds
  let passed = true;

  if (results.jsSize > PERFORMANCE_THRESHOLDS.maxJSBundleSize * 1024) {
    results.issues.push(
      `JS bundle too large: ${formatBytes(results.jsSize)} > ${PERFORMANCE_THRESHOLDS.maxJSBundleSize} KB`
    );
    passed = false;
  }

  if (results.cssSize > PERFORMANCE_THRESHOLDS.maxCSSBundleSize * 1024) {
    results.issues.push(
      `CSS bundle too large: ${formatBytes(results.cssSize)} > ${PERFORMANCE_THRESHOLDS.maxCSSBundleSize} KB`
    );
    passed = false;
  }

  if (results.totalSize > PERFORMANCE_THRESHOLDS.maxTotalBundleSize * 1024) {
    results.issues.push(
      `Total bundle too large: ${formatBytes(results.totalSize)} > ${PERFORMANCE_THRESHOLDS.maxTotalBundleSize} KB`
    );
    passed = false;
  }

  if (results.chunkCount > PERFORMANCE_THRESHOLDS.maxChunkCount) {
    results.issues.push(
      `Too many chunks: ${results.chunkCount} > ${PERFORMANCE_THRESHOLDS.maxChunkCount}`
    );
    passed = false;
  }

  // Compression analysis
  if (results.compressionResults.length > 0) {
    console.log("🗜️  Compression Analysis:");

    results.compressionResults.forEach((result) => {
      const compressionRatio = formatRatio(result.ratio);
      console.log(`   ${result.file}: ${compressionRatio} ${result.type} compression`);

      if (result.type === "gzip" && result.ratio > PERFORMANCE_THRESHOLDS.minGzipRatio) {
        results.issues.push(`Poor gzip compression: ${result.file} (${compressionRatio})`);
        passed = false;
      }

      if (result.type === "brotli" && result.ratio > PERFORMANCE_THRESHOLDS.minBrotliRatio) {
        results.issues.push(`Poor brotli compression: ${result.file} (${compressionRatio})`);
        passed = false;
      }
    });
    console.log("");
  }

  // Report results
  if (results.issues.length > 0) {
    console.log("⚠️  Performance Issues:");
    results.issues.forEach((issue) => console.log(`   • ${issue}`));
    console.log("");
  }

  if (passed) {
    console.log("✅ All performance requirements met!");
    console.log("");
    console.log("📈 Performance Summary:");
    console.log(
      `   • Bundle size: ${formatBytes(results.totalSize)} (under ${PERFORMANCE_THRESHOLDS.maxTotalBundleSize} KB limit)`
    );
    console.log(
      `   • JS chunks: ${results.chunkCount} (under ${PERFORMANCE_THRESHOLDS.maxChunkCount} limit)`
    );
    console.log(
      `   • CSS optimized: ${formatBytes(results.cssSize)} (under ${PERFORMANCE_THRESHOLDS.maxCSSBundleSize} KB limit)`
    );

    if (results.compressionResults.length > 0) {
      const avgCompression =
        results.compressionResults.reduce((sum, r) => sum + (1 - r.ratio), 0) /
        results.compressionResults.length;
      console.log(`   • Average compression: ${(avgCompression * 100).toFixed(1)}%`);
    }

    process.exit(0);
  } else {
    console.log("❌ Performance requirements not met. Please optimize the build.");
    process.exit(1);
  }
}

// Check if we're running this script directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkBuildOutput();
}

export { checkBuildOutput, PERFORMANCE_THRESHOLDS };
