# Logo for MCP Hub (Cursor / IDE)

Place **`rs4it-logo.webp`** in this folder so the Hub can serve it at `GET /logo`.

When the Hub runs over HTTP, Cursor (and other MCP clients that support it) can display this logo next to the server name in the Tools & MCP list, similar to the Figma plugin.

- Default path: `assets/rs4it-logo.webp` (relative to the project root when starting the server).
- Custom path: set **`MCP_LOGO_PATH`** to the full path of your logo file.

Recommended: square image, e.g. 48×48 or 96×96 px, WebP or PNG.
