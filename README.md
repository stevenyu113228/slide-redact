# SlideRedact

A PowerPoint Office Add-in that **destructively** blurs, pixelates, or redacts sensitive areas of images directly in your slides.

Unlike overlaying shapes or using PowerPoint's built-in effects (which are non-destructive and easily removable), SlideRedact overwrites the actual pixel data — the original content cannot be recovered.

## Quick Start

**Requirements:** macOS with Microsoft Office **16.105** or later.

Run this in Terminal, then restart PowerPoint:

```bash
mkdir -p ~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef && curl -sL https://slide-redact.stevenyu.tw/manifest.xml -o ~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/slide-redact.xml
```

A **SlideRedact** button will appear in the **Home** tab of the ribbon. No server, no Node.js needed.

To uninstall, simply remove the file:

```bash
rm ~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/slide-redact.xml
```

## Features

- **Pixelate** — mosaic-style block averaging, configurable block size (4–50px)
- **Solid color mask** — fill regions with an opaque color for maximum security
- **Full-image or region-based** — draw rectangles on specific areas, or apply to the entire image
- **Live preview** — see the effect in real-time as you draw
- **Zoom & pan** — Cmd+scroll or +/- buttons for precision work
- **Undo/Redo** — Cmd+Z / Cmd+Shift+Z
- **Secure Export** — removes orphaned original images from the .pptx file (see [Why Secure Export?](#why-secure-export))

## Usage

1. Open a presentation with images in PowerPoint
2. Click **SlideRedact** in the ribbon to open the taskpane
3. Click **Refresh** to load images from the current slide
4. Click on an image to open the editor (opens in a large dialog window)
5. Choose a mode: **Pixelate** or **Solid Color**
6. Draw rectangles over sensitive areas
7. Click **Apply** — the blurred image replaces the original shape on the slide

### Keyboard Shortcuts (in editor)

| Shortcut | Action |
|----------|--------|
| `Cmd + Z` | Undo |
| `Cmd + Shift + Z` | Redo |
| `Delete` / `Backspace` | Remove last region |
| `Cmd + scroll` | Zoom in/out |
| `Cmd + +` / `Cmd + -` | Zoom in/out |
| `Cmd + 0` | Reset zoom |

## Why Secure Export?

A `.pptx` file is actually a ZIP archive. When you replace an image shape via the Office API, the **original image file may remain** inside `ppt/media/` as an orphaned file. Anyone can:

1. Rename `.pptx` to `.zip`
2. Open it
3. Find the unblurred original in `ppt/media/`

**Secure Export** fixes this:

1. Save your presentation normally (`Cmd + S`)
2. Go to the **Secure Export** tab in the taskpane
3. Select or drag-drop the saved `.pptx` file
4. A cleaned copy is downloaded with orphaned originals removed

The cleaned file is safe to share — no original images can be recovered.

## Development

### Setup

```bash
git clone https://github.com/pptx-blur/slide-redact.git
cd slide-redact
npm install
npx office-addin-dev-certs install
```

### Dev server

```bash
npm run dev
```

Runs at `https://localhost:3000`. For local development, update the URLs in `manifest.xml` back to `https://localhost:3000` and sideload it:

```bash
cp manifest.xml ~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/slide-redact.xml
```

### Build

```bash
npm run build
```

Output goes to `dist/`. Deployed automatically to GitHub Pages on push to `main`.

### Project Structure

```
slide-redact/
├── manifest.xml              # Office Add-in manifest (production URLs)
├── index.html                # Taskpane entry point
├── editor.html               # Dialog editor entry point
├── public/
│   ├── manifest.xml          # Served at production URL for quick install
│   └── CNAME                 # GitHub Pages custom domain
├── src/
│   ├── main.tsx              # Taskpane React entry
│   ├── editor-main.tsx       # Dialog React entry
│   ├── App.tsx               # App wrapper
│   ├── taskpane/
│   │   ├── TaskpaneApp.tsx   # Main taskpane UI
│   │   ├── ImageList.tsx     # Slide image thumbnails
│   │   ├── ImageEditor.tsx   # Inline editor (fallback)
│   │   ├── DialogEditor.tsx  # Large pop-out editor
│   │   ├── RegionSelector.tsx# Rectangle drawing overlay
│   │   ├── BlurControls.tsx  # Mode, block size, color controls
│   │   └── SecureExport.tsx  # Orphan cleanup UI
│   ├── core/
│   │   ├── office-api.ts     # Office.js API wrappers
│   │   ├── image-processor.ts# Canvas pixel manipulation
│   │   ├── secure-export.ts  # JSZip orphan removal
│   │   └── media-cleaner.ts  # .rels scanning & cleanup
│   ├── hooks/
│   │   ├── useOfficeContext.ts
│   │   ├── useSlideImages.ts
│   │   ├── useRegions.ts
│   │   └── useCanvasRenderer.ts
│   ├── types/
│   │   ├── office.ts
│   │   └── editor.ts
│   └── utils/
│       ├── image-loader.ts
│       └── file-helpers.ts
└── assets/
    ├── icon-16.png
    ├── icon-32.png
    └── icon-80.png
```

## License

MIT
