/**
 * SVGManager - A class for managing SVG icons
 *
 * This class provides a centralized way to load, cache, and recolor SVG icons.
 * It implements lazy loading, meaning SVGs are only fetched when requested.
 * Original SVGs are stored in the dictionary, and colored versions are created on demand.
 */
export class SVGManager {
    constructor() {
        // Dictionary to store SVGs (both original and colored versions)
        this.svgDictionary = new Map();
        // Dictionary to store rendered images
        this.imageCache = new Map();
    }
    addSVG(id, svg) {
        this.svgDictionary.set(id, svg);
    }
    /**
     * Get an SVG by name
     * @param path The path of the SVG (without extension)
     * @returns Promise that resolves to the SVG content
     */
    async getSVG(path) {
        // Check if the SVG is already in the dictionary
        if (this.svgDictionary.has(path)) {
            return this.svgDictionary.get(path);
        }
        // If not, fetch it
        try {
            // When accessed from tests directory, we need to go up one level to reach project root
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load SVG: ${path}`);
            }
            const svgContent = await response.text();
            // Store in dictionary
            this.svgDictionary.set(path, svgContent);
            return svgContent;
        }
        catch (error) {
            console.error(`Error loading SVG ${path}:`, error);
            throw error;
        }
    }
    /**
     * Get a colored version of an SVG
     * @param path The name of the SVG (without extension)
     * @param color The color to apply (CSS color string)
     * @returns Promise that resolves to the colored SVG content
     */
    async getColoredSVG(path, color) {
        const colorKey = `${path}${color}`;
        // Check if the colored version is already in the dictionary
        if (this.svgDictionary.has(colorKey)) {
            return this.svgDictionary.get(colorKey);
        }
        // Get the original SVG first (this will fetch it if needed)
        const originalSvg = await this.getSVG(path);
        // Create colored version
        // First, remove any existing fill attributes
        let coloredSvg = originalSvg.replace(/fill="[^"]*"/g, '');
        // Then, add fill attribute to the svg tag to ensure all elements inherit the color
        coloredSvg = coloredSvg.replace(/<svg/, `<svg fill="${color}"`);
        // Store the colored version in the dictionary
        this.svgDictionary.set(colorKey, coloredSvg);
        return coloredSvg;
    }
    /**
     * Get an SVG as an Image object
     * @param path The name of the SVG (without extension)
     * @param color Optional color to apply
     * @returns Promise that resolves to an Image object
     */
    async getImage(path, color) {
        const key = color ? `${path}-${color}` : path;
        // Check if the image is already in the cache
        if (this.imageCache.has(key)) {
            return this.imageCache.get(key);
        }
        // Get the SVG content (colored or original)
        const svgContent = color
            ? await this.getColoredSVG(path, color)
            : await this.getSVG(path);
        // Create a data URL
        const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
        // Create and return an image
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Store in cache
                this.imageCache.set(key, img);
                resolve(img);
            };
            img.onerror = () => {
                reject(new Error(`Failed to create image from SVG: ${path}`));
            };
            img.src = svgUrl;
        });
    }
    /**
     * Clear the SVG dictionary and image cache
     */
    clear() {
        this.svgDictionary.clear();
        this.imageCache.clear();
    }
}
