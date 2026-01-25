# Publishing Guide

## Publishing to npm

### 1. Prerequisites

Ensure you have:
- [ ] Registered an account on npm, e.g., `https://registry.npmjs.org`
- [ ] Logged in to npm: `npm login --registry https://registry.npmjs.org`
- [ ] Updated repository URL in package.json
- [ ] Updated GitHub links in README.md
- [ ] Confirmed local registry consistency. Use `npm config get registry` to check and `npm config set registry https://registry.npmjs.org` to set

### 2. Publishing Steps

#### First-time Publishing

```bash
# 1. Build project
npm run build

# 2. Test package contents
npm pack --dry-run

# 3. Publish to npm
npm publish
```

#### Version Updates

```bash
# Update patch version (1.0.0 -> 1.0.1)
npm run version:patch

# Update minor version (1.0.0 -> 1.1.0)
npm run version:minor

# Update major version (1.0.0 -> 2.0.0)
npm run version:major

# Publish
npm run publish:npm
```

#### Publishing Test Versions

```bash
# Publish beta version
npm run publish:beta
```

### 3. Verify Publishing

After publishing, you can verify:

```bash
# Global installation test
npm install -g java-class-analyzer-mcp-server

# Test commands
java-class-analyzer-mcp --help
java-class-analyzer-mcp config -o test-config.json
```

### 4. User Installation and Usage

Users can install via the following methods:

```bash
# Global installation
npm install -g java-class-analyzer-mcp-server

# Local installation
npm install java-class-analyzer-mcp-server
```

### 5. Important Notes

- Ensure `npm run build` is run before each publish
- Check `.npmignore` file to ensure only necessary content is published
- Git tags are automatically created after version updates
- Ensure all tests pass before publishing
- Check if generated configuration files are correct

### 6. Troubleshooting

If publishing fails:
1. Check if package name is already taken
2. Ensure version number is unique
3. Check npm login status
4. Verify package.json configuration
