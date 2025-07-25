---
inclusion: fileMatch
fileMatchPattern: '**/*.{css,svelte}'
---

# Styling Guidelines

## CSS Architecture

### Global Styles
- Use `src/app.css` for global styles and Tailwind imports
- Import global CSS in the root layout (`+layout.svelte`)
- Define CSS custom properties for consistent theming

### CSS Custom Properties Pattern
```css
:root {
  --primary-600: #2563eb;
  --accent-600: #dc2626;
  --success-600: #16a34a;
  --warning-600: #d97706;
  --text-primary: var(--neutral-900);
  --text-secondary: var(--neutral-800);
  --text-muted: var(--neutral-700);
  --background: #ffffff;
  --surface: var(--neutral-50);
  --surface-elevated: #ffffff;
}
```

### Dark Mode Support
- Use CSS custom properties that change based on `prefers-color-scheme`
- Implement class-based dark mode with Tailwind's `dark:` prefix
- Ensure all custom properties have dark mode variants

## Tailwind CSS Patterns

### Utility-First Approach
- Prefer Tailwind utility classes over custom CSS
- Use responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) for mobile-first design
- Combine utilities for complex layouts: `flex flex-col items-center justify-center`

### Custom Utility Classes
- Create custom utilities in `app.css` for frequently used patterns
- Use semantic naming: `.text-primary`, `.bg-surface`, `.text-accent`
- Use CSS custom properties for consistent theming across light/dark modes
- Avoid `!important` declarations unless absolutely necessary
- Keep custom utilities minimal and focused on reusable patterns

### Component Styling
- Use Tailwind classes directly in Svelte components
- Avoid `<style>` blocks unless absolutely necessary
- Group related classes logically: layout, spacing, colors, typography

## Responsive Design

### Mobile-First Approach
- Start with mobile styles, then add larger breakpoint styles
- Use Tailwind's responsive prefixes: `text-lg md:text-xl`
- Test on multiple viewport sizes during development

### Common Responsive Patterns
```svelte
<!-- Responsive text sizing -->
<h1 class="text-4xl md:text-6xl font-bold">

<!-- Responsive spacing -->
<div class="px-4 py-8 md:px-8 md:py-12">

<!-- Responsive layout -->
<div class="flex flex-col md:flex-row items-center">
```

## Accessibility

### Focus States
- Always define custom focus styles: `outline: 2px solid var(--primary-blue)`
- Use `outline-offset` for better visual separation
- Test keyboard navigation on all interactive elements

### Color Contrast
- Ensure WCAG AA compliance for all text/background combinations
- Use CSS custom properties to maintain consistent contrast ratios
- Test with both light and dark themes

### Semantic HTML
- Use proper heading hierarchy (h1, h2, h3...)
- Include ARIA labels where needed
- Ensure interactive elements are keyboard accessible

## Animation and Transitions

### Performance-First Animations
- Use CSS transforms and opacity for smooth animations
- Prefer `transform` over changing layout properties
- Keep animations under 300ms for responsiveness

### Common Animation Patterns
```css
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Fitness Theme Colors

### Primary Palette
- **Primary Blue**: `#3b82f6` - Main brand color, buttons, links
- **Accent Red**: `#ef4444` - Alerts, important actions, energy
- **Success Green**: `#10b981` - Success states, progress, achievements

### Usage Guidelines
- Use primary blue for main navigation and primary actions
- Use accent red sparingly for high-priority alerts or energy-related content
- Use success green for positive feedback and progress indicators
- Maintain sufficient contrast ratios in both light and dark themes