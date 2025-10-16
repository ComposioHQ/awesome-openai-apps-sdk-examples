# QR Code Generator

A powerful QR code generator for the OpenAI Apps SDK that supports multiple data types including URLs, text, WiFi credentials, and contact information (vCard).

## Features

- 📱 Generate QR codes for URLs, text, emails, phone numbers, and SMS
- 🔐 Create WiFi QR codes that can be scanned to connect
- 👤 Generate vCard QR codes for contact information
- 🎨 Customizable colors and sizes
- ⚡ High-quality output with adjustable error correction
- 🖼️ Returns base64-encoded PNG images

## Installation

```bash
cd typescript/qr-code-generator
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

### 1. `generate_qr_code`

Generate a QR code from various data types.

**Parameters:**
- `data` (string, required): The data to encode
- `type` (string, optional): Type of data - "url", "text", "email", "phone", "sms", or "wifi" (default: "text")
- `options` (object, optional):
  - `errorCorrectionLevel`: "L", "M", "Q", or "H" (default: "M")
  - `width`: Width in pixels (default: 300)
  - `margin`: Margin size (default: 4)
  - `color.dark`: Dark color hex code (default: "#000000")
  - `color.light`: Light color hex code (default: "#FFFFFF")

**Example:**
```json
{
  "data": "https://openai.com",
  "type": "url",
  "options": {
    "width": 400,
    "errorCorrectionLevel": "H",
    "color": {
      "dark": "#1a1a1a",
      "light": "#ffffff"
    }
  }
}
```

### 2. `generate_wifi_qr`

Generate a WiFi QR code that can be scanned to connect to a network.

**Parameters:**
- `ssid` (string, required): WiFi network name
- `password` (string, required): WiFi password
- `security` (string, optional): "WPA", "WEP", or "nopass" (default: "WPA")
- `hidden` (boolean, optional): Is the network hidden? (default: false)
- `options` (object, optional): Same as above

**Example:**
```json
{
  "ssid": "MyHomeNetwork",
  "password": "super_secure_password",
  "security": "WPA",
  "hidden": false
}
```

### 3. `generate_vcard_qr`

Generate a vCard QR code for contact information.

**Parameters:**
- `name` (string, required): Full name
- `phone` (string, optional): Phone number
- `email` (string, optional): Email address
- `organization` (string, optional): Company/Organization
- `url` (string, optional): Website URL
- `options` (object, optional): QR code options

**Example:**
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "organization": "OpenAI",
  "url": "https://example.com"
}
```

## Testing in ChatGPT

1. Build the server: `npm run build`
2. Start the server: `npm start`
3. In ChatGPT, go to Settings → Connectors → Add Local Connector
4. Configure the connector:
   - Name: "QR Code Generator"
   - Command: `node /path/to/qr-code-generator/dist/server/index.js`
5. Test with prompts like:
   - "Generate a QR code for https://openai.com"
   - "Create a WiFi QR code for my network named 'MyWiFi' with password 'test123'"
   - "Make a QR code with my contact info: John Doe, john@example.com"

## Use Cases

- **URL Sharing**: Quickly share website links in physical spaces
- **WiFi Guest Access**: Generate QR codes for guest WiFi networks
- **Contact Cards**: Create digital business cards
- **Event Registration**: Generate QR codes for event check-in
- **Product Information**: Link physical products to digital content
- **Payment Links**: Share payment URLs easily

## Error Correction Levels

- **L (Low)**: ~7% error correction - smallest QR code
- **M (Medium)**: ~15% error correction - balanced (default)
- **Q (Quartile)**: ~25% error correction - good for printing
- **H (High)**: ~30% error correction - best for damaged/dirty environments

## Troubleshooting

**Issue**: Server won't start
- Make sure you've run `npm install` and `npm run build`
- Check that Node.js version is 18 or higher

**Issue**: QR code won't scan
- Try increasing the error correction level to "H"
- Increase the width for better resolution
- Ensure sufficient margin around the QR code

**Issue**: Colors not working
- Use hex color codes including the # symbol
- Ensure sufficient contrast between dark and light colors

## License

MIT

