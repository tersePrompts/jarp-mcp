# Changelog

All notable changes to this project will be documented in this file.

## [1.0.4] - 2025-01-28

### Fixed
- Close zipfile handles to prevent resource leaks
- Fixed potential file locking conflicts with IDEs on Windows
- Removed unused GitHub Pages workflow that was causing CI failures

### Technical Details
- Added explicit `zipfile.close()` in all exit paths for DependencyScanner
- Added explicit `zipfile.close()` in all exit paths for DecompilerService
- Files are now properly closed after reading, preventing handle accumulation

## [1.0.3] - 2025-01-26

### Fixed
- Updated homepage to point to GitHub README instead of GitHub Pages

## [1.0.2] - 2025-01-24

### Changed
- Documentation updates

## [1.0.1] - 2025-01-20

### Fixed
- Initial release fixes

## [1.0.0] - 2025-01-15

### Added
- Initial release of JARP-MCP
- MCP server for decompiling Java classes from Maven/Gradle dependencies
- Bundled CFR 0.152 decompiler
- Zero-setup installation via npx
