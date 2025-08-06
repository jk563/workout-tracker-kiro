# Technology Stack

## Frontend Framework
- **React 19** - Modern component-based UI library with latest features
- **React Router DOM 6** - Client-side routing for single-page applications
- **Vite 7** - Fast build tool and development server

## Backend Framework
- **Go 1.22.2** - High-performance backend language
- **AWS Lambda** - Serverless compute platform
- **AWS Lambda Go Runtime** - Native Go support for Lambda functions
- **Zerolog** - Structured JSON logging library

## Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **@tailwindcss/typography** - Typography plugin for rich text content
- **PostCSS** with **Autoprefixer** - CSS processing and vendor prefixes
- **CSSnano** - CSS minification for production builds

## Testing
- **Vitest 3** - Fast unit testing framework with coverage support
- **@testing-library/react** - Testing utilities for React components
- **@testing-library/user-event** - User interaction testing utilities
- **@testing-library/jest-dom** - Extended matchers for DOM testing
- **Playwright** - End-to-end testing framework with multi-browser support
- **@axe-core/playwright** - Accessibility testing integration
- **jsdom** - DOM implementation for testing
- **@vitest/coverage-v8** - V8 coverage provider for comprehensive test coverage

## Code Quality
- **ESLint 9** with **@typescript-eslint** - JavaScript/TypeScript linting
- **eslint-plugin-react** - React-specific linting rules
- **eslint-plugin-react-hooks** - React Hooks linting rules
- **Prettier 3** - Code formatting
- **Husky** - Git hooks for code quality enforcement
- **lint-staged** - Run linters on staged files

## Development Standards
- Use **ES modules** (type: "module" in package.json)
- Target **Node.js 20+** for development environment
- Follow **component-based architecture** with React
- Use **utility-first CSS** approach with Tailwind
- Write **tests alongside components** in dedicated test directories
- Use **structured logging** with JSON format for backend services

## Configuration Patterns
- **Development server**: Port 5173 with HMR
- **Build target**: ESNext with Vite optimization
- **Source maps**: Enabled for debugging in production builds
- **Custom theme**: Fitness-focused color palette (primary: blue, accent: red, success: green)
- **Typography**: Inter font family as primary sans-serif
- **Dark mode**: Class-based dark mode support enabled
- **Test environment**: jsdom with coverage reporting (text, json, html)
- **E2E testing**: Playwright with Chrome, Firefox, and Mobile Chrome (target browsers)
- **PostCSS**: Use `@tailwindcss/postcss` plugin for Tailwind CSS 4 compatibility
- **Performance**: Bundle analysis and compression enabled for production builds
