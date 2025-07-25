# Project Structure

## Root Directory Organization
```
/
├── .kiro/                 # Kiro IDE configuration
│   ├── specs/            # Feature specifications
│   └── steering/         # Development guidelines
├── app/                  # Application code
│   └── web/             # Frontend web application
└── README.md            # Project documentation
```

## Documentation
- Keep documentation concise

## Frontend Web Application Structure
```
app/web/
├── src/
│   ├── lib/
│   │   └── components/   # Reusable Svelte components
│   └── routes/          # SvelteKit file-based routing
├── static/              # Static assets (images, fonts, etc.)
├── tests/
│   ├── unit/           # Unit tests for components and utilities
│   └── e2e/            # End-to-end tests with Playwright
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── svelte.config.js    # SvelteKit configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── postcss.config.js   # PostCSS configuration
```

## File Naming Conventions
- **Components**: PascalCase (e.g., `WorkoutCard.svelte`)
- **Routes**: lowercase with hyphens (e.g., `workout-history/`)
- **Utilities**: camelCase (e.g., `formatDate.js`)
- **Tests**: match source file with `.test.js` suffix
- **Types**: PascalCase with `.d.ts` extension

## Import Organization
- Group imports: external libraries first, then internal modules
- Use relative imports for local components
- Prefer named exports over default exports for utilities