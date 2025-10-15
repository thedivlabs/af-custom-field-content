# Custom Field Content Block Plugin

A WordPress block plugin that displays Advanced Custom Fields (ACF) content inside posts and pages, with support for raw
HTML, date formatting, and basic styling options.

> **Note:** This plugin was built as a portfolio project. It installs and runs correctly, but its main purpose is to
> demonstrate modern WordPress block development practices.

### Techniques & Patterns

This project demonstrates modern WordPress block development practices, including:

- **Block-based architecture**  
  A single custom block (`wpbs/acf-field-content`) that can be reused across templates and layouts.

- **ACF integration**  
  Pulls values from ACF fields exposed to the REST API. Supports trusted HTML, plain text, numbers, and dates.

- **Style variations**  
  Block styles (`default`, `date`) control how the field value is rendered. More styles (e.g., number, link) can be
  added in the future.

- **Inspector controls**  
  Provides controls for selecting the field, choosing the HTML wrapper element, and (if style = `date`) formatting the
  date output.

- **Dynamic block registration**  
  All compiled blocks are auto-registered in PHP by scanning the `/blocks` directory, eliminating manual block setup.

## Features

- **ACF Field Output** — Displays the value of any ACF field in the editor and frontend.
- **Trusted HTML** — Renders WYSIWYG/textarea HTML as-is without escaping.
- **Date Formatting** — When set to "Date" style, outputs formatted dates using WordPress’s date API.
- **HTML Tag Choice** — Choose the wrapper element (div, span, etc.).

## Requirements

- WordPress 6.5+
- Advanced Custom Fields Pro 5.11+ (or ACF 6+)
- PHP 8.0+
- Node.js 18+ (for development builds)

## Installation

### Option 1: Install the prebuilt release (recommended)

1. Download the latest release ZIP from the **Releases** page.
    - https://github.com/thedivlabs/af-custom-field-content/releases
2. In your WordPress admin, go to **Plugins → Add New → Upload Plugin**.
3. Upload the ZIP and activate the plugin.

### Option 2: Build from source (for developers)

1. Clone this repository into any working directory:
   ```bash
   git clone https://github.com/thedivlabs/af-custom-field-content.git
   cd custom-field-content
   ```
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Copy the compiled plugin folder (`custom-field-content/custom-field-content`) into your WordPress
   `wp-content/plugins/` directory.
4. Activate **Custom Field Content** from the WordPress admin.

## Usage

1. Add a **Custom Field Content** block to a post or page.
2. Use the inspector to select the ACF field you want to display.
3. Choose the HTML tag for the wrapper (div, span, etc.).
4. If the block style is set to **Date**, configure the date format.
5. Publish/update your post — the block will output the ACF field’s value.

## Development

- Source code lives in `/src/blocks/`.
- Compiled assets are written to `/custom-field-content/blocks/` and registered automatically.
- Run dev mode:
  ```bash
  npm run start
  ```

## Roadmap

Planned improvements and future features include:

- **Additional styles** — Add support for numbers, links, and conditional rendering.
- **Prefix/suffix controls** — Allow custom text before/after field values (e.g., currency symbols, units).
- **Image support** — Add support for image fields.

## License

GPL-2.0-or-later.
