export declare class MapOverlay {
    protected id: string;
    protected category: string;
    protected subCategory: string;
    protected name: string;
    protected description: string;
    protected coordinates: { left: number; top: number };
    protected isOpen: boolean;
    protected visible: boolean;
    protected highlighted: boolean;
    protected color: string;
    protected icon: string;
    protected ctx: CanvasRenderingContext2D | null;
    protected centerX: number;
    protected centerY: number;
    protected panX: number;
    protected panY: number;
    protected zoomScale: number;
    protected zoomShowLabels: boolean;

    constructor();

    /**
     * Initialize the overlay with data
     * @param data The overlay data
     */
    initialize(data: any): void;

    /**
     * Set the canvas context
     * @param ctx The canvas context
     */
    setContext(ctx: CanvasRenderingContext2D): void;

    /**
     * Set display parameters for rendering
     * @param centerX The center X coordinate
     * @param centerY The center Y coordinate
     * @param panX The X pan offset
     * @param panY The Y pan offset
     * @param zoomScale The zoom scale
     * @param zoomShowLabels Whether to show labels at the current zoom level
     */
    setDisplayParams(centerX: number, centerY: number, panX: number, panY: number, zoomScale: number, zoomShowLabels: boolean): void;

    /**
     * Get the overlay ID
     * @returns The overlay ID
     */
    getId(): string;

    /**
     * Get the overlay category
     * @returns The overlay category
     */
    getCategory(): string;

    /**
     * Get the overlay subcategory
     * @returns The overlay subcategory
     */
    getSubCategory(): string;

    /**
     * Check if the overlay is open
     * @returns True if the overlay is open, false otherwise
     */
    isOpenState(): boolean;

    /**
     * Set the open state of the overlay
     * @param isOpen Whether the overlay is open
     */
    setOpenState(isOpen: boolean): void;

    /**
     * Check if the overlay is visible
     * @returns True if the overlay is visible, false otherwise
     */
    isVisible(): boolean;

    /**
     * Set the visibility of the overlay
     * @param visible Whether the overlay is visible
     */
    setVisible(visible: boolean): void;

    /**
     * Set the highlighted state of the overlay
     * @param highlighted Whether the overlay is highlighted
     */
    setHighlighted(highlighted: boolean): void;

    /**
     * Check if the overlay is highlighted
     * @returns True if the overlay is highlighted, false otherwise
     */
    isHighlighted(): boolean;

    /**
     * Get the screen coordinates of the overlay
     * @returns The screen X and Y coordinates
     */
    getScreenCoordinates(): { x: number; y: number };

    /**
     * Check if a point is inside the overlay (hit detection)
     * @param x The X coordinate
     * @param y The Y coordinate
     * @returns True if the point is inside the overlay, false otherwise
     */
    containsPoint(x: number, y: number): boolean;

    /**
     * Filter handler - determines if overlay should be visible based on criteria
     * @param filterCriteria The filter criteria object
     * @returns True if overlay matches criteria, false otherwise
     */
    matchesFilter(filterCriteria: any): boolean;

    /**
     * Get the overlay name
     * @returns The overlay name
     */
    getName(): string;

    /**
     * Get the overlay description
     * @returns The overlay description
     */
    getDescription(): string;

    /**
     * Get the overlay coordinates
     * @returns The overlay coordinates
     */
    getCoordinates(): { left: number; top: number };

    /**
     * Set the overlay coordinates
     * @param coordinates The new coordinates
     */
    setCoordinates(coordinates: { left: number; top: number }): void;

    /**
     * Toggle the open state of the overlay
     */
    toggleOpenState(): void;

    /**
     * Get a summary of the overlay
     * @returns A summary string
     */
    getSummary(): string;

    /**
     * Render the overlay on the canvas
     * @param ctx The canvas context
     * @param opacity The opacity to render with
     * @param showText Whether to show text
     * @param isHighlighted Whether the overlay is highlighted
     */
    render(ctx: CanvasRenderingContext2D, opacity?: number, showText?: boolean, isHighlighted?: boolean): void;

    /**
     * Render text for the overlay
     * @param ctx The canvas context
     * @param x The X coordinate
     * @param y The Y coordinate
     * @param radius The radius of the overlay circle
     */
    renderText(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void;

    /**
     * Get the overlay color
     * @returns The overlay color
     */
    getColor(): string;

    /**
     * Get the overlay icon
     * @returns The overlay icon
     */
    getIcon(): string;

    /**
     * Get the color for the overlay category
     * @returns The color as a string
     */
    getCategoryColor(): string;
}
