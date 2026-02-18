# MCP Projects

A Model Context Protocol (MCP) server for managing and tracking local software projects.

## Capabilities

### Tools

- `scan_projects`: Scans a directory for projects (supports Git, Node.js, Python, etc.).
  - **Security:** Validates that the path is within allowed roots (default: user home).
- `list_projects`: Lists tracked projects.
  - **Breaking Change (v1.1):** Now requires pagination.
  - Arguments: `limit` (default 20), `offset` (default 0).
- `analyze_project_activity`: Analyzes Git history and file modifications.
- `get_project_health`: Checks Git sync status.
- `get_engagement_report`: Reports most active and dormant projects.

### Resources

- `projects://summary`: Returns a JSON summary of total projects and active projects in the last 7 days.

## Development

This server implements **MCP Best Practices**:
- **Stdio Transport**: Logs to `stderr`, protocol on `stdout`.
- **Agent-Centric Errors**: Returns actionable advice on failures.
- **Pagination**: Large lists are paginated to preserve context window.
- **Security**: Path validation prevents directory traversal.
