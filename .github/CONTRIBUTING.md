# Contributing to @querri/embed

Thanks for your interest in contributing! This guide will help you get started.

## Getting started

1. Fork and clone the repository
2. Install dependencies:
   ```sh
   npm install
   ```
3. Build the project:
   ```sh
   npm run build
   ```
4. Run tests:
   ```sh
   npm test
   ```

## Project structure

```
src/
  core/       Core SDK (vanilla JS, zero dependencies)
  react/      React component wrapper
  vue/        Vue component wrapper
  svelte/     Svelte component wrapper
  angular/    Angular component wrapper
  server/     Server SDK and framework integrations
```

- **Build**: [tsup](https://tsup.egoist.dev/) bundles the library
- **Tests**: [Vitest](https://vitest.dev/) runs the test suite
- **Types**: TypeScript strict mode with `npm run typecheck`

## Submitting changes

1. Create a branch from `main`
2. Make your changes with clear, descriptive commits
3. Ensure CI passes: `npm run typecheck && npm run build && npm test`
4. Open a pull request against `main`

## Reporting bugs

Please use the [bug report template](https://github.com/Querri-inc/querri-embed/issues/new?template=bug_report.md) when filing issues.

## Code of conduct

Be respectful and constructive. We're building something together — treat others the way you'd like to be treated.
