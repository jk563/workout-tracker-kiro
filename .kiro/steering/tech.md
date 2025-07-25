# Technology Stack

## Frontend Framework
- **Svelte 5** with **SvelteKit 2** - Modern reactive framework with file-based routing
- **Vite 7** - Fast build tool and development server

## Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **@tailwindcss/typography** - Typography plugin for rich text content
- **PostCSS** with **Autoprefixer** - CSS processing and vendor prefixes

## Testing
- **Vitest 3** - Fast unit testing framework with coverage support
- **@testing-library/svelte** - Testing utilities for Svelte components
- **@testing-library/jest-dom** - Extended matchers for DOM testing
- **Playwright** - End-to-end testing framework with multi-browser support
- **jsdom** - DOM implementation for testing
- **@vitest/coverage-v8** - V8 coverage provider for comprehensive test coverage

## Code Quality
- **ESLint 9** with **@typescript-eslint** - JavaScript/TypeScript linting
- **eslint-plugin-svelte** - Svelte-specific linting rules
- **Prettier 3** with **prettier-plugin-svelte** - Code formatting

## Development Standards
- Use **ES modules** (type: "module" in package.json)
- Target **Node.js 20+** for development environment
- Follow **component-based architecture** with Svelte
- Use **utility-first CSS** approach with Tailwind
- Write **tests alongside components** in dedicated test directories

## Configuration Patterns
- **Development server**: Port 5173 with HMR on port 5174
- **Build target**: ESNext with esbuild minification
- **Source maps**: Enabled for debugging in production builds
- **Custom theme**: Fitness-focused color palette (primary: blue, accent: red, success: green)
- **Typography**: Inter font family as primary sans-serif
- **Dark mode**: Class-based dark mode support enabled
- **Test environment**: jsdom with coverage reporting (text, json, html)
- **E2E testing**: Playwright on port 4173 with Chrome, Firefox, and Mobile Chrome (target browsers)
- **PostCSS**: Use `@tailwindcss/postcss` plugin for Tailwind CSS 4 compatibility
