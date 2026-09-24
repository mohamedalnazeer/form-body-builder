---
name: security
description: Review frontend, asset-loading, and build changes for common security risks.
---

# Security

Keep the browser app safe while respecting its client-side architecture.

- Treat URL, query, local-storage, form, and imported asset data as untrusted.
- Avoid unsafe HTML injection, dynamic code execution, exposed secrets, and permissive cross-origin assumptions.
- Validate configuration at boundaries and fail explicitly rather than silently falling back.
- Do not commit credentials, generated private data, or unnecessary build artifacts.
- For security-sensitive changes, inspect the complete data flow and add a regression test where practical.

