# Changelog

All notable changes to this project will be documented in this file.

## [1.0.6] - 2026-09-04

### Added
- Modular architecture: extracted `utils/` (safe shell execution, input validation, structured logging, constants) and `config/` (env + config-file based configuration)
- Test suite (Jest + ts-jest, ESM) covering shell execution, validation, and security scenarios
- GitHub Actions CI workflow (build + tests on Linux/macOS/Windows, security audit)

### Security
- Safe command execution via `spawn` with argument arrays (no shell interpolation)
- Zip-bomb protection when scanning JARs (entry count and uncompressed size limits)
- Validation of cached class index before use (rejects corrupted/malicious index files)
- Stricter project path validation: reject raw `..` traversal segments and null bytes
- Null-byte rejection in JAR and file path validation
- Log injection prevention via output sanitization
- Fixed all known `npm audit` vulnerabilities (transitive: hono, fast-uri, minimatch, brace-expansion, ajv)

### Changed
- Minimum Node.js version raised to 20 (matches commander 14 requirement; `engines` now declares it)
- Dependency upgrades: MCP SDK 1.25 → 1.30, yauzl 3.2 → 3.4, TypeScript 5.9, Jest 29 → 30
- Removed unused `archiver` dependency

### Fixed
- Tests now fail CI on failure (removed `continue-on-error` masking)

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
