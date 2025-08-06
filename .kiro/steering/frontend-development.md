# Development Workflow

## Getting Started
```bash
cd app/web
npm install
npm run dev
```

## Development Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Testing Workflow
- `npm test` - Run unit tests once
- `npm run test:watch` - Run tests in watch mode during development
- `npm run test:coverage` - Generate test coverage report
- `npm run test:e2e` - Run end-to-end tests (Chrome, Firefox, and Mobile Chrome)
- `npm run test:e2e:ui` - Run E2E tests with interactive UI

## Code Quality
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Auto-fix linting issues where possible
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is properly formatted

## Development Best Practices
- **Always read the README file** before making changes in a directory, if that file exists
- **Follow Test-Driven Development (TDD)**: Write tests first, then implement functionality
- **Run all tests before completing any task**: `npm test && npm run test:e2e`
- Use `npm run lint:fix && npm run format` to clean up code
- Write unit tests for components and utilities before implementation
- Add E2E tests for critical user flows during feature development
- Keep components small and focused on single responsibilities
- Use Tailwind utility classes instead of custom CSS when possible

## Application Structure Best Practices
- Import global CSS (`app.css`) in the root layout (`+layout.svelte`)
- Use CSS custom properties for consistent theming across light/dark modes
- Include comprehensive meta tags in `app.html` for SEO and social sharing
- Configure static assets in the `static/` directory for automatic handling
- Use semantic HTML structure with proper accessibility attributes

## Testing Best Practices
- **Test-Driven Development (TDD) Cycle**: Red (write failing test) → Green (make it pass) → Refactor
- Use `describe` blocks to group related tests logically
- Write descriptive test names that explain the expected behavior
- **Follow the 3-stage test pattern**: Arrange, Act, Assert - clearly mark each section with comments
- Test components in isolation using `@testing-library/svelte`
- Use `@testing-library/jest-dom` matchers for DOM assertions (e.g., `toBeInTheDocument()`)
- Mock external dependencies and API calls in unit tests
- Test user interactions and workflows in E2E tests
- Maintain test coverage above 80% for critical application code
- Use `tests/setup.js` for global test configuration and mocks
- **Always run full test suite before task completion**: Unit tests, E2E tests, and linting must all pass

### Test Structure Pattern
```javascript
it('should render component with correct props', () => {
  // Arrange
  const props = { title: 'Test Title', count: 5 };
  
  // Act
  render(Component, { props });
  
  // Assert
  expect(screen.getByText('Test Title')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
});
```

### Async Operations with Fake Timers Pattern
When testing services with retry logic, delays, or timeouts using `vi.useFakeTimers()`, coordinate promises properly to avoid unhandled rejections:

```javascript
it('should handle retries with exponential backoff', async () => {
  // Arrange
  mockFetch.mockRejectedValue(new Error('Network error'));
  
  // Act & Assert
  const promise = service.performOperation();
  
  // Coordinate timer advancement with promise resolution
  const advancePromise = (async () => {
    await vi.advanceTimersByTimeAsync(1000); // First retry
    await vi.advanceTimersByTimeAsync(2000); // Second retry
    await vi.advanceTimersByTimeAsync(4000); // Third retry
  })();

  // Wait for both operations to complete
  await Promise.all([
    expect(promise).rejects.toThrow('Network error'),
    advancePromise
  ]);
});
```

**Key Points:**
- Use `Promise.all()` to coordinate service promises with timer advancement
- Wrap timer advancement in an async function for proper sequencing
- This prevents unhandled promise rejections during retry operations

## Component Development
- **TDD Approach**: Write component tests first, then implement the component
- Create components in `src/lib/components/`
- Export components from `src/lib/index.js` for easy importing
- Write component tests alongside the component files
- Use TypeScript JSDoc comments for prop documentation
- Follow Svelte 5 patterns with runes and modern syntax
- **Task Completion Checklist**: All unit tests pass, E2E tests pass, linting passes, formatting applied

## Documentation Requirements
- README.md must only include:
  - Concise steps to plan and run terraform 