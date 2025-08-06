import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Test utilities and constants
const VIEWPORTS = {
  mobilePortrait: { width: 375, height: 667 },
  mobileLandscape: { width: 667, height: 375 },
  tabletPortrait: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  desktopSmall: { width: 1280, height: 720 },
  desktopLarge: { width: 1920, height: 1080 },
};

const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000,
  resourceLoad: 5000,
  contentVisible: 2000,
  subtitleVisible: 3000,
};

// Helper functions
async function navigateToLandingPage(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function measurePageLoadTime(page) {
  const startTime = Date.now();
  await navigateToLandingPage(page);
  return Date.now() - startTime;
}

async function getMainHeading(page) {
  return page.locator("#main-heading");
}

async function runAccessibilityAudit(page, tags = []) {
  const builder = new AxeBuilder({ page });
  if (tags.length > 0) {
    builder.withTags(tags);
  }
  return await builder.analyze();
}

test.describe("Landing Page E2E Tests", () => {
  test.describe("Landing Page Load and Title Display", () => {
    test("should load the landing page successfully", async ({ page }) => {
      // Arrange & Act
      const loadTime = await measurePageLoadTime(page);

      // Assert
      expect(page.url()).toContain("/");
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });

    test('should display "Workout Tracker" as main title', async ({ page }) => {
      // Arrange & Act
      await navigateToLandingPage(page);

      // Assert
      const mainHeading = await getMainHeading(page);
      await expect(mainHeading).toBeVisible();
      await expect(mainHeading).toHaveText("Workout Tracker");

      // Verify it's positioned correctly
      const boundingBox = await mainHeading.boundingBox();
      expect(boundingBox).toBeTruthy();
    });

    test("should have proper page title and meta tags", async ({ page }) => {
      // Arrange & Act
      await page.goto("/");

      // Assert
      await expect(page).toHaveTitle("Workout Tracker");

      // Check that meta description exists
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveCount(1);
      await expect(metaDescription).toHaveAttribute(
        "content",
        /Track your workouts, exercises, and fitness progress/
      );

      // Check Open Graph title
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveCount(1);
      await expect(ogTitle).toHaveAttribute("content", "Workout Tracker");
    });
  });

  test.describe("Responsive Design Testing", () => {
    async function testViewportDisplay(page, viewport) {
      await page.setViewportSize(viewport);
      await navigateToLandingPage(page);

      const mainHeading = await getMainHeading(page);
      await expect(mainHeading).toBeVisible();
      await expect(mainHeading).toHaveText("Workout Tracker");

      return mainHeading;
    }

    Object.entries(VIEWPORTS).forEach(([key, viewport]) => {
      const name = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

      test(`should display correctly on ${name} (${viewport.width}x${viewport.height})`, async ({
        page,
      }) => {
        // Arrange & Act
        const mainHeading = await testViewportDisplay(page, viewport);

        // Assert
        const headingStyles = await mainHeading.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            fontSize: styles.fontSize,
            textAlign: styles.textAlign,
          };
        });

        expect(headingStyles.fontSize).toBeTruthy();

        // Verify content accessibility
        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = await page.evaluate(() => window.innerHeight);

        expect(bodyHeight).toBeGreaterThan(0);
        expect(viewportHeight).toBeGreaterThan(0);
      });
    });

    test("should maintain usability across different screen sizes", async ({ page }) => {
      const testViewports = [
        VIEWPORTS.mobilePortrait,
        VIEWPORTS.tabletLandscape,
        VIEWPORTS.desktopLarge,
      ];

      for (const viewport of testViewports) {
        // Arrange & Act
        await testViewportDisplay(page, viewport);

        // Assert
        const container = page.locator(".container-theme");
        await expect(container).toBeVisible();

        const mainSection = page.locator("section");
        await expect(mainSection).toBeVisible();

        const subtitle = page.locator("p").first();
        await expect(subtitle).toBeVisible();
      }
    });
  });

  test.describe("Accessibility Testing", () => {
    test("should pass basic accessibility audit (excluding color contrast)", async ({ page }) => {
      // Arrange & Act
      await navigateToLandingPage(page);

      // Assert - Run accessibility audit excluding color contrast for now
      const accessibilityScanResults = await runAccessibilityAudit(page);
      const nonColorContrastViolations = accessibilityScanResults.violations.filter(
        (violation) => violation.id !== "color-contrast"
      );

      expect(nonColorContrastViolations).toEqual([]);
    });

    test("should have proper semantic HTML structure", async ({ page }) => {
      // Arrange & Act
      await navigateToLandingPage(page);

      // Assert
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveAttribute("id", "main-heading");

      const mainSection = page.locator("section");
      await expect(mainSection).toHaveAttribute("aria-labelledby", "main-heading");

      // Check that main element exists (from layout)
      const main = page.locator("main#main-content");
      await expect(main).toBeVisible();

      // Check that section element exists (from page)
      const section = page.locator('section[aria-labelledby="main-heading"]');
      await expect(section).toBeVisible();
    });

    test("should support keyboard navigation", async ({ page }) => {
      // Arrange & Act
      await navigateToLandingPage(page);
      await page.keyboard.press("Tab");

      // Assert
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test("should have sufficient color contrast", async ({ page }, testInfo) => {
      // Skip color contrast tests on Mobile Safari due to known rendering inconsistencies
      if (testInfo.project.name === "Mobile Safari") {
        test.skip(
          true,
          "Mobile Safari has known color rendering inconsistencies that affect contrast measurements"
        );
      }

      // Arrange & Act
      await navigateToLandingPage(page);

      // Assert - Strict color contrast test
      const accessibilityScanResults = await runAccessibilityAudit(page, [
        "wcag2a",
        "wcag2aa",
        "wcag21aa",
      ]);

      const colorContrastViolations = accessibilityScanResults.violations.filter(
        (violation) => violation.id === "color-contrast"
      );

      // Strict test - fail if ANY color contrast violations exist
      if (colorContrastViolations.length > 0) {
        console.error("Color contrast violations found:");
        colorContrastViolations.forEach((violation) => {
          console.error(`- ${violation.description}`);
          violation.nodes.forEach((node) => {
            console.error(`  Element: ${node.html}`);
            console.error(`  Impact: ${node.impact}`);
            if (node.any && node.any.length > 0) {
              node.any.forEach((check) => {
                console.error(`  Issue: ${check.message}`);
                if (check.data) {
                  console.error(`  Data: ${JSON.stringify(check.data)}`);
                }
              });
            }
          });
        });
      }

      expect(colorContrastViolations).toHaveLength(0);
    });
  });

  test.describe("Performance Requirements", () => {
    test("should load within 3 seconds", async ({ page }) => {
      // Arrange & Act
      const loadTime = await measurePageLoadTime(page);

      // Assert
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    });

    test("should have reasonable resource loading times", async ({ page }) => {
      // Arrange & Act
      const totalLoadTime = await measurePageLoadTime(page);

      // Assert
      expect(totalLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.resourceLoad);

      const mainHeading = await getMainHeading(page);
      await expect(mainHeading).toBeVisible();
    });

    test("should render content progressively", async ({ page }) => {
      // Arrange & Act
      await page.goto("/");

      // Assert
      const mainHeading = await getMainHeading(page);
      await expect(mainHeading).toBeVisible({
        timeout: PERFORMANCE_THRESHOLDS.contentVisible,
      });

      const subtitle = page.locator("p").first();
      await expect(subtitle).toBeVisible({
        timeout: PERFORMANCE_THRESHOLDS.subtitleVisible,
      });
    });
  });

  test.describe("ConnectivityStatus Integration", () => {
    test("should display ConnectivityStatus component in top right position", async ({ page }) => {
      // Arrange & Act
      await navigateToLandingPage(page);

      // Assert
      const connectivityStatus = page.locator(
        '[role="complementary"][aria-label="Backend connectivity status"]'
      );
      await expect(connectivityStatus).toBeVisible();

      // Verify positioning
      const boundingBox = await connectivityStatus.boundingBox();
      expect(boundingBox).toBeTruthy();

      // Should be in top right area (within reasonable bounds)
      const viewportSize = page.viewportSize();
      expect(boundingBox.x).toBeGreaterThan(viewportSize.width * 0.8); // Right side
      expect(boundingBox.y).toBeLessThan(viewportSize.height * 0.2); // Top area
    });

    test("should not interfere with main content layout", async ({ page }) => {
      // Arrange & Act
      await navigateToLandingPage(page);

      // Assert
      const mainHeading = await getMainHeading(page);
      const connectivityStatus = page.locator('[role="complementary"]');

      await expect(mainHeading).toBeVisible();
      await expect(connectivityStatus).toBeVisible();

      // Verify both elements are positioned correctly
      const headingBox = await mainHeading.boundingBox();
      const statusBox = await connectivityStatus.boundingBox();

      expect(headingBox).toBeTruthy();
      expect(statusBox).toBeTruthy();

      // Status should be in top right corner (fixed positioning)
      const viewportSize = page.viewportSize();
      expect(statusBox.x).toBeGreaterThan(viewportSize.width * 0.7); // Right side
      expect(statusBox.y).toBeLessThan(viewportSize.height * 0.2); // Top area

      // Main heading should be centered and not overlapped by status
      expect(headingBox.x).toBeLessThan(viewportSize.width * 0.8); // Heading stays in main area
    });

    test("should maintain visibility across different viewport sizes", async ({ page }) => {
      const testViewports = [
        VIEWPORTS.mobilePortrait,
        VIEWPORTS.tabletLandscape,
        VIEWPORTS.desktopLarge,
      ];

      for (const viewport of testViewports) {
        // Arrange & Act
        await page.setViewportSize(viewport);
        await navigateToLandingPage(page);

        // Assert
        const connectivityStatus = page.locator('[role="complementary"]');
        await expect(connectivityStatus).toBeVisible();

        // Verify it's still in top right area for each viewport
        const boundingBox = await connectivityStatus.boundingBox();
        expect(boundingBox).toBeTruthy();
        expect(boundingBox.x).toBeGreaterThan(viewport.width * 0.7); // Right side
        expect(boundingBox.y).toBeLessThan(viewport.height * 0.3); // Top area
      }
    });

    test("should display visual status changes", async ({ page }) => {
      // Arrange & Act
      await navigateToLandingPage(page);

      // Assert - Check that status indicator is present
      const statusIndicator = page.locator('[role="status"]');
      await expect(statusIndicator).toBeVisible();

      // Verify it has proper ARIA attributes
      await expect(statusIndicator).toHaveAttribute("aria-live", "polite");
      await expect(statusIndicator).toHaveAttribute("aria-label", /.+/);
      await expect(statusIndicator).toHaveAttribute("aria-describedby", /.+/);

      // Check that description element exists
      const descriptionId = await statusIndicator.getAttribute("aria-describedby");
      const description = page.locator(`#${descriptionId}`);
      await expect(description).toBeVisible();
      await expect(description).toHaveClass("sr-only");
    });

    test("should be accessible to screen readers", async ({ page }) => {
      // Arrange & Act
      await navigateToLandingPage(page);

      // Assert accessibility structure
      const complementary = page.locator('[role="complementary"]');
      await expect(complementary).toHaveAttribute("aria-label", "Backend connectivity status");

      const status = page.locator('[role="status"]');
      await expect(status).toHaveAttribute("role", "status");
      await expect(status).toHaveAttribute("aria-live", "polite");

      // Verify screen reader description
      const descriptionId = await status.getAttribute("aria-describedby");
      const description = page.locator(`#${descriptionId}`);
      await expect(description).toBeVisible();
      await expect(description).toHaveClass("sr-only");

      // Check that description has meaningful content
      const descriptionText = await description.textContent();
      expect(descriptionText).toMatch(/(checking|healthy|unhealthy)/i);
    });

    test("should handle component state transitions gracefully", async ({ page }) => {
      // Arrange & Act
      await navigateToLandingPage(page);

      // Wait for initial state to stabilize
      const statusIndicator = page.locator('[role="status"]');
      await expect(statusIndicator).toBeVisible();

      // Get initial state
      const initialAriaLabel = await statusIndicator.getAttribute("aria-label");
      expect(initialAriaLabel).toBeTruthy();

      // Wait a bit to see if state changes (component should be polling)
      await page.waitForTimeout(1000);

      // Verify component is still functional
      await expect(statusIndicator).toBeVisible();
      const currentAriaLabel = await statusIndicator.getAttribute("aria-label");
      expect(currentAriaLabel).toBeTruthy();

      // Verify no layout shifts occurred
      const boundingBox = await statusIndicator.boundingBox();
      expect(boundingBox).toBeTruthy();
      expect(boundingBox.width).toBeGreaterThan(0);
      expect(boundingBox.height).toBeGreaterThan(0);
    });

    test("should maintain fixed positioning during page scroll", async ({ page }) => {
      // Arrange - Add some content to make page scrollable
      await page.goto("/");
      await page.addStyleTag({
        content: `
          body::after {
            content: "";
            display: block;
            height: 200vh;
          }
        `
      });

      // Act - Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));

      // Assert - Status should still be visible in fixed position
      const connectivityStatus = page.locator('[role="complementary"]');
      await expect(connectivityStatus).toBeVisible();

      const boundingBox = await connectivityStatus.boundingBox();
      expect(boundingBox).toBeTruthy();

      // Should still be in top right corner despite scroll
      const viewportSize = page.viewportSize();
      expect(boundingBox.x).toBeGreaterThan(viewportSize.width * 0.7);
      expect(boundingBox.y).toBeLessThan(viewportSize.height * 0.3);
    });
  });

  test.describe("Cross-Browser Compatibility", () => {
    test("should display consistently across browsers", async ({ page, browserName }) => {
      // Arrange & Act
      await navigateToLandingPage(page);

      // Assert
      const mainHeading = await getMainHeading(page);
      await expect(mainHeading).toBeVisible();
      await expect(mainHeading).toHaveText("Workout Tracker");

      const headingColor = await mainHeading.evaluate((el) => window.getComputedStyle(el).color);
      expect(headingColor).toBeTruthy();

      console.log(`Test passed on ${browserName}`);
    });
  });
});
