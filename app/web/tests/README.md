# Testing Setup

This directory contains the testing configuration and test files for the Workout Tracker web application.

## Testing Framework

### Unit Testing - Vitest

- **Framework**: Vitest 3.x with Svelte component support
- **Testing Library**: @testing-library/svelte for component testing
- **Environment**: jsdom for DOM simulation
- **Coverage**: v8 coverage provider with text, JSON, and HTML reports

### End-to-End Testing - Playwright

- **Framework**: Playwright with multi-browser support
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Configuration**: Automatic server startup and teardown
- **Reports**: HTML reports with screenshots and videos on failure

## Directory Structure

```
tests/
├── unit/           # Unit tests for components and utilities
├── e2e/            # End-to-end tests for user flows
├── setup.js        # Global test setup and configuration
└── README.md       # This file
```

## Running Tests

### Unit Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Test Configuration

### Vitest Configuration

- Located in `vite.config.js` under the `test` section
- Includes test file patterns, environment setup, and coverage configuration
- Uses `tests/setup.js` for global test setup

### Playwright Configuration

- Located in `playwright.config.js`
- Configured for multiple browsers and mobile viewports
- Automatic server startup on port 4173
- HTML reporting with failure screenshots and videos

## Writing Tests

### Unit Tests

```javascript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import Component from "$lib/components/Component.svelte";

describe("Component", () => {
  it("should render correctly", () => {
    render(Component, { props: { title: "Test" } });
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

### E2E Tests

```javascript
import { test, expect } from "@playwright/test";

test("should load the application", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Workout Tracker/);
});
```

## Coverage Reports

Coverage reports are generated in the following formats:

- **Text**: Console output during test runs
- **JSON**: `coverage/coverage-final.json`
- **HTML**: `coverage/index.html` (viewable in browser)

## Best Practices

1. **Unit Tests**: Test individual components and utilities in isolation
2. **E2E Tests**: Test complete user workflows and critical paths
3. **Test Organization**: Group related tests using `describe` blocks
4. **Assertions**: Use descriptive assertions that clearly indicate expected behavior
5. **Test Data**: Use realistic test data that represents actual usage
6. **Cleanup**: Ensure tests don't leave side effects that affect other tests
