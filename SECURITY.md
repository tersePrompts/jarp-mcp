# Security Policy

## Supported Versions

Only the latest version of jarp-mcp receives security updates. Users are strongly encouraged to keep their installation up to date.

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **GitHub Security Advisory** (Preferred): Use the [GitHub Security Advisory](https://github.com/tersePrompts/jarp-mcp/security/advisories) feature to report vulnerabilities privately.

2. **Email**: Send details to [onebit@duck.com](mailto:onebit@duck.com).

### What to Include

Please include the following information in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Suggested mitigation (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Detailed Analysis**: Within 7 days
- **Patch Release**: As appropriate, based on severity

## Security Best Practices

### For Users

1. **Validate Input**: This tool includes input validation, but always review decompiled code before using it in production.

2. **License Compliance**: Decompiling code may violate license terms. Ensure you have the legal right to decompile and analyze the code.

3. **Sensitive Data**: Be aware that decompiled code may contain sensitive information (API keys, credentials, proprietary algorithms).

4. **Cache Management**: Regularly review and clean up cache files (`.mcp-decompile-cache/` and `.mcp-class-index.json`).

5. **Environment Isolation**: Consider running this tool in an isolated environment when analyzing untrusted dependencies.

### For Developers

1. **Input Validation**: All user inputs are validated before use:
   - Class names must match Java identifier patterns
   - File paths are checked for path traversal attempts
   - Shell commands use argument arrays (not string concatenation)

2. **No Shell Injection**: All command execution uses `spawn` with `shell: false` to prevent command injection.

3. **Resource Limits**: Built-in limits prevent resource exhaustion:
   - Maximum JAR file size: 100MB
   - Maximum cache size: 500MB
   - Maximum index file size: 50MB
   - Maximum batch operations: 100 classes

## Known Security Considerations

### Third-Party Dependencies

This tool uses the CFR decompiler (bundled in `lib/cfr-0.152.jar`). CFR is a well-established decompiler, but users should:

1. Verify the integrity of the bundled JAR:
   ```bash
   # After download, verify the JAR is not corrupted
   sha256sum lib/cfr-0.152.jar
   ```

2. Consider using your own CFR version via the `CFR_PATH` environment variable.

### Cache Files

Cache files may contain:
- Decompiled source code
- Class names from dependencies
- File paths

These files are not encrypted. Ensure proper file permissions on directories containing cache files.

### Network Access

This tool does not make network requests directly. However:
- Maven commands run by this tool may download dependencies
- Ensure your Maven repository settings are secure

## Security Audits

This codebase has undergone security audits focusing on:

- Command injection vulnerabilities
- Path traversal attacks
- Resource exhaustion
- Input validation
- Secure temporary file handling

## Security Updates

Security updates will be announced in:
- GitHub Releases
- CHANGELOG.md
- Commit messages tagged with `[security]`

## License and Legal

This tool is released under the Apache License 2.0. Decompiling software may have legal implications depending on:

- Your jurisdiction
- The license of the software being decompiled
- Your intended use of the decompiled code

**Always ensure you have the legal right to decompile and analyze software before using this tool.**

## Disclaimer

**THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.**

**THE CREATOR ASSUMES NO OWNERSHIP, RESPONSIBILITY, OR LIABILITY FOR:**

- Any issues, errors, or bugs arising from the use of this tool
- Any damages (direct, indirect, incidental, special, or consequential) caused by decompiling or analyzing third-party code
- Any legal consequences, claims, or actions resulting from use, misuse, or inability to use this software
- Any security vulnerabilities in dependencies (CFR decompiler) or third-party libraries
- Any violation of intellectual property rights, licenses, or terms of service
- Any loss of data, revenue, profits, or business opportunities
- Any misuse by third parties

**BY USING THIS SOFTWARE, YOU AGREED THAT:**

1. You assume all risks and responsibility for its use
2. The creator shall NOT be held liable for ANY claim, damages, or other liability
3. You will use this tool only for lawful purposes and in compliance with all applicable laws
4. You will indemnify and hold harmless the creator from any claims arising from your use

**USE AT YOUR OWN RISK. THE CREATOR IS NOT RESPONSIBLE FOR ANY HARM, LEGAL ISSUES, DAMAGES, OR CONSEQUENCES THAT MAY OCCUR.**
