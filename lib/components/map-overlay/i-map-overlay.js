export class IMapOverlay {
    constructor() {
        // Core properties
        this.id = '';
        this.name = '';
        this.description = '';
        this.category = '';
        this.subCategory = '';
        this.isOpen = false;
        this.color = '#333333';
        this.icon = '';
        this.coordinates = { left: 0, top: 0 };
        // Display parameters
        this.ctx = null;
        this.panX = 0;
        this.panY = 0;
        this.zoomScale = 1;
    }
    // Getters
    getId() {
        return this.id;
    }
    getName() {
        return this.name;
    }
    getDescription() {
        return this.description;
    }
    getCategory() {
        return this.category;
    }
    getSubCategory() {
        return this.subCategory;
    }
    getColor() {
        return this.color;
    }
    getIcon() {
        return this.icon;
    }
    getCoordinates() {
        return { ...this.coordinates };
    }
    isOpenState() {
        return this.isOpen;
    }
    setOpenState(isOpen) {
        this.isOpen = isOpen;
    }
    setCoordinates(coordinates) {
        this.coordinates = { ...coordinates };
    }
    /**
     * Get the screen coordinates of the overlay
     * @param centerX The center X coordinate
     * @param centerY The center Y coordinate
     * @param panX The X pan offset
     * @param panY The Y pan offset
     * @param zoomScale The zoom scale
     * @param mapWidth The original map width
     * @param mapHeight The original map height
     * @returns The screen X and Y coordinates
     */
    getScreenCoordinates(centerX, centerY, panX, panY, zoomScale, mapWidth, mapHeight) {
        // Convert percentage coordinates to pixel coordinates relative to map dimensions
        // coordinates.left and coordinates.top are percentages (0-100) of map width/height
        const mapPixelX = (this.coordinates.left / 100) * mapWidth;
        const mapPixelY = (this.coordinates.top / 100) * mapHeight;
        // Convert map pixel coordinates to screen coordinates considering zoom and pan
        // The map is centered and scaled, so we need to account for the map's position on screen
        const mapScreenX = centerX - (mapWidth * zoomScale) / 2 + panX * zoomScale;
        const mapScreenY = centerY - (mapHeight * zoomScale) / 2 + panY * zoomScale;
        const screenX = mapScreenX + mapPixelX * zoomScale;
        const screenY = mapScreenY + mapPixelY * zoomScale;
        return { x: screenX, y: screenY };
    }
}
