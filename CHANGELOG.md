# Changelog

All notable changes to this project will be documented in this file.

## [1.0.7-beta11] - 2025-01-08

### Fixed
- **TypeScript Module Resolution**: Fixed TypeScript import errors for subpath imports in UMI and other frameworks
  - Added root-level `.d.ts` and `.js` files for all modules to support proper TypeScript module resolution
  - Now `import { createAsyncController } from 'great-async/asyncController'` works correctly in TypeScript
  - Improved compatibility with different bundlers and TypeScript configurations

### Added
- Root-level module files for better TypeScript support:
  - `asyncController.js` and `asyncController.d.ts`
  - `useAsyncFunction.js` and `useAsyncFunction.d.ts`
  - Similar files for all other modules

## [1.0.7-beta10] - 2025-01-08

### Added
- **Enhanced Import Compatibility**: Added support for direct dist imports to improve compatibility with different bundlers and frameworks (especially UMI/Webpack)
  - `great-async/dist/asyncController` (direct dist access)
  - `great-async/dist/useAsyncFunction` (direct dist access)
  - Similar patterns for all other modules (`LRU`, `SharedLoadingStateManager`, etc.)

### Fixed
- Fixed import issues in UMI framework and other bundlers that expect specific path formats
- Improved module resolution compatibility across different build tools

### Documentation
- Updated README with examples of all supported import methods
- Added subpath import section with comprehensive examples

## [1.0.7-beta9] - Previous Release

### Features
- Framework-agnostic async operation management
- Smart caching with TTL and LRU strategies
- Stale-while-revalidate (SWR) pattern
- Advanced debouncing with parameter/function dimensions
- Promise debouncing (latest request wins)
- Single mode to prevent duplicate requests
- Configurable retry logic
- React hooks with shared loading states
- TypeScript support with full type safety
- Comprehensive test coverage (88% code coverage, 83 tests)
