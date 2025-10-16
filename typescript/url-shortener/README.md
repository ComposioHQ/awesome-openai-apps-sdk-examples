# URL Shortener

A full-featured URL shortening service for the OpenAI Apps SDK with analytics, custom aliases, expiration, tagging, and link management.

## Features

- 🔗 Shorten long URLs to compact short codes
- 🎯 Custom aliases for branded links
- ⏰ Optional link expiration
- 🏷️ Tag-based organization
- 📊 Click tracking and analytics
- 📝 Link descriptions
- 🔍 Search and filter links by tags
- 📈 View top-performing links
- 💾 Persistent storage

## Installation

```bash
cd typescript/url-shortener
npm install
```

## Build

```bash
npm run build
```

## Run Server

```bash
npm start
# Or for development with auto-reload:
npm run dev
```

## Available Tools

### 1. `create_short_url`

Create a shortened URL with optional customization.

**Parameters:**
- `url` (string, required): The URL to shorten (must include http:// or https://)
- `custom_alias` (string, optional): Custom short code (letters, numbers, -, _)
- `expires_in_days` (number, optional): Days until link expires
- `tags` (array, optional): Tags for organizing links
- `description` (string, optional): Link description

**Example:**
```json
{
  "url": "https://www.example.com/very/long/url/with/many/parameters?foo=bar&baz=qux",
  "custom_alias": "my-link",
  "expires_in_days": 30,
  "tags": ["marketing", "campaign"],
  "description": "Marketing campaign landing page"
}
```

**Output:**
```
✓ URL shortened successfully!

Original URL: https://www.example.com/very/long/url...
Short Code: my-link
Short URL: https://short.link/my-link
Expires: 2024-02-15
Tags: marketing, campaign
Description: Marketing campaign landing page
```

### 2. `get_link_stats`

Get detailed statistics for a shortened URL.

**Parameters:**
- `short_code` (string, required): The short code to get stats for

**Example:**
```json
{
  "short_code": "my-link"
}
```

**Output:**
```
Link Statistics
==================================================

Short Code: my-link
Original URL: https://www.example.com/...
Created: 1/15/2024, 10:30:00 AM
Expires: 2/15/2024, 10:30:00 AM
Total Clicks: 42
Description: Marketing campaign landing page
Tags: marketing, campaign

Recent Clicks:
  1. 1/16/2024, 3:45:00 PM
  2. 1/16/2024, 2:30:00 PM
  3. 1/16/2024, 11:20:00 AM
```

### 3. `list_links`

List all shortened URLs with filtering and sorting.

**Parameters:**
- `tag` (string, optional): Filter by tag
- `limit` (number, optional): Max links to return (default: 20)
- `sort_by` (string, optional): Sort order - "created", "clicks", or "alphabetical" (default: "created")

**Example:**
```json
{
  "tag": "marketing",
  "limit": 10,
  "sort_by": "clicks"
}
```

**Output:**
```
Shortened URLs (tag: marketing)
==================================================

1. campaign-2024
   URL: https://example.com/campaign
   Clicks: 156
   Tags: marketing, campaign
   Description: Main campaign page

2. promo-offer
   URL: https://example.com/special-offer
   Clicks: 89
   Tags: marketing, promo

Total: 2 link(s)
```

### 4. `delete_link`

Delete a shortened URL.

**Parameters:**
- `short_code` (string, required): The short code to delete

**Example:**
```json
{
  "short_code": "old-link"
}
```

### 5. `update_link`

Update a link's tags or description.

**Parameters:**
- `short_code` (string, required): The short code to update
- `tags` (array, optional): New tags (replaces existing)
- `description` (string, optional): New description

**Example:**
```json
{
  "short_code": "my-link",
  "tags": ["marketing", "campaign", "2024"],
  "description": "Updated campaign page"
}
```

### 6. `get_analytics`

Get analytics summary for all links or by tag.

**Parameters:**
- `tag` (string, optional): Filter by tag

**Example:**
```json
{
  "tag": "marketing"
}
```

**Output:**
```
Analytics Summary (tag: marketing)
==================================================

Total Links: 15
Total Clicks: 1,247
Average Clicks per Link: 83.13
Unique Tags: 8

Top 5 Links:
  1. campaign-main - 342 clicks
     https://example.com/campaign
  2. promo-2024 - 215 clicks
     https://example.com/promo
```

## Testing in ChatGPT

1. Build the server: `npm run build`
2. Start the server: `npm start`
3. In ChatGPT, go to Settings → Connectors → Add Local Connector
4. Configure the connector:
   - Name: "URL Shortener"
   - Command: `node /path/to/url-shortener/dist/server/index.js`
5. Test with prompts like:
   - "Shorten this URL: https://example.com/very-long-url"
   - "Create a short link for https://github.com with alias 'gh'"
   - "Show me stats for short code 'gh'"
   - "List all my marketing links"
   - "What are my top performing links?"

## Use Cases

### Marketing & Campaigns
- Create branded short links for campaigns
- Track campaign performance with click analytics
- Organize links by campaign tags
- Set expiration dates for time-limited offers

### Social Media
- Share clean, short URLs on Twitter, Instagram
- Track which platforms drive the most traffic
- Create memorable, brandable links
- Organize links by platform or content type

### QR Codes
- Generate short URLs for QR codes
- Update destination without changing QR code
- Track QR code scans
- Set expiration for temporary promotions

### Link Management
- Organize links with tags and descriptions
- Search and filter links easily
- Archive old campaigns
- Export link analytics

### Team Collaboration
- Share organized link libraries
- Tag links by project or department
- Track team link performance
- Manage link lifecycle

## Data Storage

Links are stored in `data/links.json` with the following structure:

```json
[
  {
    "id": "unique-id",
    "originalUrl": "https://example.com/long-url",
    "shortCode": "abc123",
    "customAlias": "my-link",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2024-02-15T10:30:00.000Z",
    "clicks": 42,
    "clickDetails": [],
    "tags": ["marketing", "campaign"],
    "description": "Campaign landing page"
  }
]
```

## Short Code Generation

- Random codes: 8-character nanoid (URL-safe)
- Custom aliases: Letters, numbers, hyphens, underscores only
- Collision detection prevents duplicate codes
- Case-sensitive codes

## Analytics Features

- Total clicks per link
- Click timestamps
- Recent click history
- Top-performing links
- Tag-based analytics
- Average clicks per link

## Link Expiration

- Set expiration in days when creating
- Expired links are marked in stats
- Expired links remain in database (can be deleted manually)
- No automatic cleanup (preserves analytics)

## Best Practices

### URL Validation
- Always include protocol (http:// or https://)
- Validate URLs before shortening
- Test shortened links after creation

### Custom Aliases
- Keep aliases short and memorable
- Use hyphens for readability (my-link not mylink)
- Avoid special characters
- Check availability before creation

### Tagging Strategy
- Use consistent tag names
- Create tag hierarchies (marketing/email, marketing/social)
- Don't over-tag (2-4 tags per link)
- Use descriptive tags

### Link Management
- Add descriptions for future reference
- Set expiration for temporary campaigns
- Regular cleanup of old links
- Archive instead of delete for records

## Troubleshooting

**Issue**: "Invalid URL" error
- Ensure URL includes http:// or https://
- Check for typos in URL
- Test URL in browser first

**Issue**: "Custom alias already exists"
- Choose a different alias
- Check existing links with `list_links`
- Use random generation instead

**Issue**: Links not persisting
- Check write permissions on data/ directory
- Verify data/links.json exists and is valid JSON
- Check disk space

**Issue**: Can't find short code
- Verify correct short code (case-sensitive)
- Use `list_links` to see all codes
- Check if link was deleted

## Performance

- In-memory operations for fast access
- Efficient persistence to JSON file
- Suitable for thousands of links
- O(1) lookup by short code
- O(n log n) sorting for analytics

## Future Enhancements

Potential features to add:
- Link editing (change destination URL)
- Bulk operations
- Import/export CSV
- Click analytics dashboard
- Geographic tracking
- QR code generation integration
- Custom domain support
- API rate limiting
- Link previews

## License

MIT

