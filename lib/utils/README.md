# SVG Manager

A TypeScript utility for managing SVG icons in web applications.

## Features

- **Lazy Loading**: SVGs are only fetched when requested
- **Caching**: Both original and colored SVGs are cached for improved performance
- **Recoloring**: Easily create colored versions of SVGs
- **Image Conversion**: Convert SVGs to Image objects for use in canvas rendering

## Usage

### Basic Usage

```typescript
import { SVGManager } from './utils/svg-manager';

// Create a new instance
const svgManager = new SVGManager();

// Get an original SVG
svgManager.getSVG('icon-name')
  .then(svgContent => {
    // Use the SVG content
    console.log(svgContent);
  })
  .catch(error => {
    console.error('Error loading SVG:', error);
  });

// Get a colored version of an SVG
svgManager.getColoredSVG('icon-name', '#ff0000')
  .then(coloredSvg => {
    // Use the colored SVG content
    console.log(coloredSvg);
  })
  .catch(error => {
    console.error('Error creating colored SVG:', error);
  });

// Get an SVG as an Image object (for canvas rendering)
svgManager.getImage('icon-name', '#00ff00')
  .then(image => {
    // Use the image
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
  })
  .catch(error => {
    console.error('Error creating image from SVG:', error);
  });
```

### Using with async/await

```typescript
async function loadIcons() {
  try {
    const svgManager = new SVGManager();

    // Get original SVG
    const originalSvg = await svgManager.getSVG('icon-name');

    // Get colored SVG
    const redSvg = await svgManager.getColoredSVG('icon-name', '#ff0000');

    // Get SVG as image
    const greenImage = await svgManager.getImage('icon-name', '#00ff00');

    // Use the SVGs and image...
  } catch (error) {
    console.error('Error loading icons:', error);
  }
}
```

### Clearing the Cache

```typescript
// Clear both the SVG dictionary and image cache
svgManager.clear();
```

## API Reference

### Constructor

```typescript
constructor(basePath?: string)
```

- `basePath` (optional): Custom base path for SVG files. Defaults to '/img/solid'.

### Methods

#### getSVG

```typescript
async getSVG(name: string): Promise<string>
```

Gets an SVG by name. If the SVG is not in the dictionary, it will be fetched from the server.

- `name`: The name of the SVG (without extension)
- Returns: Promise that resolves to the SVG content as a string

#### getColoredSVG

```typescript
async getColoredSVG(name: string, color: string): Promise<string>
```

Gets a colored version of an SVG. If the original SVG is not in the dictionary, it will be fetched first.

- `name`: The name of the SVG (without extension)
- `color`: The color to apply (CSS color string)
- Returns: Promise that resolves to the colored SVG content as a string

#### getImage

```typescript
async getImage(name: string, color?: string): Promise<HTMLImageElement>
```

Gets an SVG as an Image object. If the SVG is not in the dictionary, it will be fetched first.

- `name`: The name of the SVG (without extension)
- `color` (optional): The color to apply (CSS color string)
- Returns: Promise that resolves to an HTMLImageElement

#### clear

```typescript
clear(): void
```

Clears the SVG dictionary and image cache.

## Testing

Two test files are included:

1. `svg-manager.test.ts`: A TypeScript test file that demonstrates basic usage
2. `test-svg-manager.html`: An HTML test page with a UI for testing various features

To run the HTML test page, open it in a web browser and click the test buttons.

## Implementation Details

- SVGs are stored in a dictionary with the SVG name as the key
- Colored SVGs are stored with a key of `${name}-${color}`
- SVGs are fetched from the server only when requested (lazy loading)
- Recoloring is done by replacing fill attributes in the SVG content
- Image objects are also cached for improved performance
