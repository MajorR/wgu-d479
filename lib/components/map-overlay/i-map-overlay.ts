export abstract class IMapOverlay {
  // Core properties
  protected id: string = '';
  protected name: string = '';
  protected description: string = '';
  protected category: string = '';
  protected subCategory: string = '';
  protected isOpen: boolean = false;
  protected color: string = '#333333';
  protected icon: string = '';
  protected coordinates: { left: number, top: number } = { left: 0, top: 0 };

  // Display parameters
  protected ctx: CanvasRenderingContext2D | null = null;
  protected panX: number = 0;
  protected panY: number = 0;
  protected zoomScale: number = 1;

  /**
   * Initialize the overlay with data
   * @param data The overlay data
   */
  abstract initialize(data: any): void;

  /**
   * Render the overlay on the canvas
   * @param ctx The canvas context
   * @param centerX The center X coordinate
   * @param centerY The center Y coordinate
   * @param panX The X pan offset
   * @param panY The Y pan offset
   * @param zoomScale The zoom scale
   * @param zoomShowLabels Whether to show labels at the current zoom level
   * @param mapWidth The original map width
   * @param mapHeight The original map height
   * @param opacity The opacity to render with
   * @param showText Whether to show text
   * @param isHighlighted Whether the overlay is highlighted
   */
  abstract render(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    panX: number,
    panY: number,
    zoomScale: number,
    zoomShowLabels: boolean,
    mapWidth: number,
    mapHeight: number,
    opacity?: number,
    showText?: boolean,
    isHighlighted?: boolean
  ): void;

  /**
   * Check if a point is inside the overlay (hit detection)
   * @param x The X coordinate
   * @param y The Y coordinate
   * @param centerX The center X coordinate
   * @param centerY The center Y coordinate
   * @param panX The X pan offset
   * @param panY The Y pan offset
   * @param zoomScale The zoom scale
   * @param mapWidth The original map width
   * @param mapHeight The original map height
   * @returns True if the point is inside the overlay, false otherwise
   */
  abstract containsPoint(
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    panX: number,
    panY: number,
    zoomScale: number,
    mapWidth: number,
    mapHeight: number,
    isHighlighted: boolean
  ): boolean;

  /**
   * Filter handler - determines if overlay should be visible based on criteria
   * @param filterCriteria The filter criteria object
   * @returns True if overlay matches criteria, false otherwise
   */
  abstract matchesFilter(filterCriteria: any): boolean;

  // Getters
  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getCategory(): string {
    return this.category;
  }

  getSubCategory(): string {
    return this.subCategory;
  }

  getColor(): string {
    return this.color;
  }

  getIcon(): string {
    return this.icon;
  }

  getCoordinates(): { left: number, top: number } {
    return { ...this.coordinates };
  }

  isOpenState(): boolean {
    return this.isOpen;
  }

  setOpenState(isOpen: boolean): void {
    this.isOpen = isOpen;
  }

  setCoordinates(coordinates: { left: number, top: number }): void {
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
  getScreenCoordinates(centerX: number, centerY: number, panX: number, panY: number, zoomScale: number, mapWidth: number, mapHeight: number): { x: number, y: number } {
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
