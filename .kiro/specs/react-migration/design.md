# Design Document

## Overview

This design outlines the migration strategy from the existing Svelte 5 + SvelteKit 2 application to React 19 with Vite 7. The migration will preserve all existing functionality while modernizing the technology stack. The approach focuses on maintaining the current user experience, design system, and deployment infrastructure while leveraging React's ecosystem and latest features.

The current application is a simple fitness tracker landing page with dark mode support, responsive design, and comprehensive accessibility features. The React version will replicate this functionality using modern React patterns and maintain compatibility with the existing S3 + CloudFront hosting setup.

## Architecture

### Technology Stack Migration

**Current Stack:**
- Svelte 5 with SvelteKit 2
- Vite 7 (build tool)
- Tailwind CSS 4
- Vitest 3 + @testing-library/svelte
- Playwright (E2E testing)

**Target Stack:**
- React 19 (latest version)
- Vite 7 (maintained as build tool)
- React Router v6 (client-side routing)
- Tailwind CSS 4 (maintained)
- Vitest 3 + @testing-library/react
- Playwright (E2E testing, maintained)

### Application Structure

The React application will follow a component-based architecture similar to the current Svelte structure:

```
app/web/
├── src/
│   ├── components/          # React components
│   │   ├── Layout.jsx      # Main layout component
│   │   └── LandingPage.jsx # Landing page component
│   ├── hooks/              # Custom React hooks
│   │   └── useTheme.js     # Dark mode theme hook
│   ├── styles/             # CSS and styling
│   │   └── index.css       # Global styles (migrated from app.css)
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main App component with routing
│   └── main.jsx            # Application entry point
├── public/                 # Static assets (replaces static/)
│   ├── favicon.png
│   └── robots.txt
├── index.html              # HTML template (replaces app.html)
├── package.json            # Updated dependencies
├── vite.config.js          # Updated Vite config for React
└── tests/                  # Test files (structure maintained)
    ├── unit/               # React component tests
    └── e2e/                # Playwright tests (minimal changes)
```

### Routing Strategy

The current SvelteKit file-based routing will be replaced with React Router v6:

**Current Routes:**
- `/` - Landing page (`+page.svelte`)
- `/api/health` - API endpoint (will be removed or moved to backend)

**Target Routes:**
- `/` - Landing page (React component)
- Future routes will be added as React Router routes

## Components and Interfaces

### Core Components

#### 1. App Component (`src/App.jsx`)
- Main application component
- Handles React Router setup
- Provides global context providers (theme, etc.)
- Replaces SvelteKit's app structure

#### 2. Layout Component (`src/components/Layout.jsx`)
- Equivalent to `+layout.svelte`
- Handles global styling imports
- Manages dark mode theme logic
- Provides skip link for accessibility
- Contains main content wrapper

#### 3. LandingPage Component (`src/components/LandingPage.jsx`)
- Equivalent to `+page.svelte`
- Displays main heading and welcome content
- Implements responsive design
- Maintains accessibility attributes

#### 4. useTheme Hook (`src/hooks/useTheme.js`)
- Custom React hook for theme management
- Handles localStorage persistence
- Manages system preference detection
- Provides theme toggle functionality

### Component Interfaces

```typescript
// Theme Hook Interface
interface UseThemeReturn {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  isDark: boolean;
}

// Layout Component Props
interface LayoutProps {
  children: React.ReactNode;
}

// LandingPage Component Props
interface LandingPageProps {
  // No props needed for initial implementation
}
```

## Data Models

### Theme Management

The theme system will maintain the same functionality as the current Svelte implementation:

```javascript
// Theme state management
const themeStates = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// Theme detection logic
const detectSystemTheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Theme persistence
const saveTheme = (theme) => {
  localStorage.setItem('theme', theme);
};

const loadTheme = () => {
  return localStorage.getItem('theme') || 'system';
};
```

### CSS Custom Properties

The existing CSS custom properties system will be maintained exactly as-is to preserve the design system:

- Color variables (primary, accent, success, warning, neutral)
- Spacing scale variables
- Typography scale variables
- Dark mode variable overrides
- Responsive breakpoint handling

## Error Handling

### Component Error Boundaries

React Error Boundaries will be implemented to handle component errors gracefully:

```javascript
// ErrorBoundary component for catching React errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}
```

### Theme System Error Handling

The theme hook will include error handling for localStorage access and media query failures:

```javascript
const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    try {
      return loadTheme();
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
      return 'system';
    }
  });

  // Error handling for media query listeners
  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        if (theme === 'system') {
          updateDocumentTheme(e.matches ? 'dark' : 'light');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch (error) {
      console.warn('Failed to set up media query listener:', error);
    }
  }, [theme]);
};
```

## Testing Strategy

### Unit Testing Migration

**Current Testing Setup:**
- Vitest 3 with @testing-library/svelte
- jsdom environment
- Custom setup file for mocks

**Target Testing Setup:**
- Vitest 3 with @testing-library/react
- jsdom environment (maintained)
- Updated setup file for React-specific mocks

### Test Migration Strategy

1. **Component Tests**: Convert Svelte component tests to React component tests
   - Update imports from `@testing-library/svelte` to `@testing-library/react`
   - Maintain the same test scenarios and assertions
   - Update component rendering syntax

2. **Hook Tests**: Add tests for custom React hooks
   - Test `useTheme` hook functionality
   - Test localStorage integration
   - Test media query handling

3. **E2E Tests**: Minimal changes required
   - Playwright tests will remain largely unchanged
   - Same user interactions and assertions
   - Same accessibility testing approach

### Test Configuration Updates

```javascript
// Updated Vite config for React testing
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        'build/',
        'src/main.jsx', // Entry point
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    globals: true,
  },
});
```

### Testing Patterns

**React Component Testing Pattern:**
```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LandingPage from '../components/LandingPage';

describe('LandingPage Component', () => {
  it('should render the main heading with correct text', () => {
    // Arrange & Act
    render(<LandingPage />);

    // Assert
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Workout Tracker');
  });
});
```

**Hook Testing Pattern:**
```javascript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTheme } from '../hooks/useTheme';

describe('useTheme Hook', () => {
  it('should initialize with system theme by default', () => {
    // Arrange & Act
    const { result } = renderHook(() => useTheme());

    // Assert
    expect(result.current.theme).toBe('system');
  });
});
```

## Build and Deployment Configuration

### Vite Configuration Updates

The Vite configuration will be updated to support React while maintaining the same build optimizations:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Support for React 19 features
      jsxRuntime: 'automatic',
    }),
    // Maintain existing production plugins
    ...(mode === 'production' ? [
      compression({ algorithm: 'gzip' }),
      compression({ algorithm: 'brotliCompress' }),
      visualizer({ filename: 'build/stats.html' }),
    ] : []),
  ],
  
  // Maintain existing build configuration
  build: {
    target: 'esnext',
    outDir: 'build', // Same as current Svelte build
    sourcemap: true,
    rollupOptions: {
      output: {
        // Maintain same chunk splitting strategy
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            return 'vendor';
          }
          if (id.includes('src/components')) return 'components';
          if (id.includes('src/hooks')) return 'hooks';
        },
      },
    },
  },
  
  // Maintain same development server config
  server: {
    port: 5173,
    host: true,
    open: false,
  },
}));
```

### HTML Template Migration

The `app.html` file will be converted to `index.html` with React-specific placeholders:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- Maintain all existing meta tags -->
    <meta name="description" content="Track your workouts, exercises, and fitness progress..." />
    <!-- ... other meta tags ... -->
    <link rel="icon" href="/favicon.png" />
  </head>
  <body data-preload-data="hover" class="antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### Package.json Updates

The package.json will be updated with React dependencies while maintaining the same script structure:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build && npm run build:clean",
    "build:clean": "rm -rf build/server && echo 'Cleaned server-side build artifacts'",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "eslint-plugin-react": "^7.37.2",
    "eslint-plugin-react-hooks": "^5.0.0",
    // ... maintain other existing devDependencies
  }
}
```

### Deployment Compatibility

The React build output will be fully compatible with the existing deployment infrastructure:

1. **Build Output**: Static files in `build/` directory (same as current)
2. **File Structure**: HTML, CSS, JS assets organized for CloudFront
3. **Deployment Script**: No changes required to `deploy-frontend.sh`
4. **Infrastructure**: No changes required to Terraform configuration

The React application will generate the same static file structure expected by the S3 + CloudFront setup, ensuring seamless deployment to the existing infrastructure.