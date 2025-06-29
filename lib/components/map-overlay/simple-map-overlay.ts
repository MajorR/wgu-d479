import { IMapOverlay } from './i-map-overlay.js';

export class SimpleMapOverlay extends IMapOverlay {
  // Additional properties specific to SimpleMapOverlay
  protected visible: boolean = true;
  protected highlighted: boolean = false;

  /**
   * Initialize the overlay with data
   * @param data The overlay data
   */
  initialize(data: any): void {
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.category = data.category || '';
    this.subCategory = data.sub_category || data.subCategory || '';
    this.isOpen = data.isOpen || false;
    this.color = data.color || this.getCategoryColor();
    this.icon = data.icon || '';
    this.coordinates = data.coordinates || { left: 0, top: 0 };
    this.visible = data.visible !== undefined ? data.visible : true;
  }

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
  render(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    panX: number,
    panY: number,
    zoomScale: number,
    zoomShowLabels: boolean,
    mapWidth: number,
    mapHeight: number,
    opacity: number = 1,
    showText: boolean = false,
    isHighlighted: boolean = false
  ): void {
    if (!this.visible) return;

    this.highlighted = isHighlighted;
    const { x: screenX, y: screenY } = this.getScreenCoordinates(centerX, centerY, panX, panY, zoomScale, mapWidth, mapHeight);

    // Save the current context state
    ctx.save();

    // Apply opacity
    ctx.globalAlpha = opacity;

    // Determine rendering parameters based on highlight state
    const radius = isHighlighted ? 16 : 10;
    const strokeStyle = isHighlighted ? this.getCategoryColor() : 'white';
    const lineWidth = isHighlighted ? 2 : 1.5;

    // Apply shadow if highlighted
    if (isHighlighted) {
      ctx.shadowColor = this.getCategoryColor();
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Draw the circle background
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fillStyle = this.getCategoryColor();
    ctx.fill();

    // Draw the border
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Reset shadow after drawing the border
    if (isHighlighted) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Draw icon if available
    if (this.icon) {
      this.renderIcon(ctx, screenX, screenY, radius);
    } else {
      // Fallback: draw first letter of category
      this.renderFallbackIcon(ctx, screenX, screenY, radius);
    }

    // Draw text if needed
    if (showText || zoomShowLabels) {
      this.renderText(ctx, screenX, screenY, radius);
    }

    // Restore the context state
    ctx.restore();
  }

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
  containsPoint(
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    panX: number,
    panY: number,
    zoomScale: number,
    mapWidth: number,
    mapHeight: number
  ): boolean {
    const { x: screenX, y: screenY } = this.getScreenCoordinates(centerX, centerY, panX, panY, zoomScale, mapWidth, mapHeight);
    const radius = this.highlighted ? 16 : 10;

    // Calculate distance from point to center of overlay
    const distance = Math.sqrt(Math.pow(x - screenX, 2) + Math.pow(y - screenY, 2));

    // Check if distance is less than radius
    return distance <= radius;
  }

  /**
   * Filter handler - determines if overlay should be visible based on criteria
   * @param filterCriteria The filter criteria object
   * @returns True if overlay matches criteria, false otherwise
   */
  matchesFilter(filterCriteria: any): boolean {
    if (!filterCriteria) return true;

    // Category filter
    if (filterCriteria.category && filterCriteria.category !== this.category) {
      return false;
    }

    // Sub-category filter
    if (filterCriteria.subCategory && filterCriteria.subCategory !== this.subCategory) {
      return false;
    }

    // Open state filter
    if (filterCriteria.isOpen !== undefined && filterCriteria.isOpen !== this.isOpen) {
      return false;
    }

    // Name search filter
    if (filterCriteria.nameSearch) {
      const searchTerm = filterCriteria.nameSearch.toLowerCase();
      if (!this.name.toLowerCase().includes(searchTerm) &&
          !this.description.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Custom filter function
    if (filterCriteria.customFilter && typeof filterCriteria.customFilter === 'function') {
      return filterCriteria.customFilter(this);
    }

    return true;
  }

  /**
   * Render icon for the overlay
   * @param ctx The canvas context
   * @param x The X coordinate
   * @param y The Y coordinate
   * @param radius The radius of the overlay circle
   */
  private renderIcon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    // This would load and render the actual icon
    // For now, we'll use the fallback
    this.renderFallbackIcon(ctx, x, y, radius);
  }

  /**
   * Render fallback icon (first letter of category)
   * @param ctx The canvas context
   * @param x The X coordinate
   * @param y The Y coordinate
   * @param radius The radius of the overlay circle
   */
  private renderFallbackIcon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    ctx.font = `${Math.floor(radius * 0.8)}px Arial`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add text shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Draw the first letter of the category
    const letter = this.category.charAt(0).toUpperCase() || 'P';
    ctx.fillText(letter, x, y);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Render text for the overlay
   * @param ctx The canvas context
   * @param x The X coordinate
   * @param y The Y coordinate
   * @param radius The radius of the overlay circle
   */
  private renderText(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    // Set text properties
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Add text background for better readability
    const textMetrics = ctx.measureText(this.name);
    const textWidth = textMetrics.width;
    const textHeight = 14;
    const padding = 4;

    // Draw text background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(
      x - textWidth / 2 - padding,
      y + radius + 5 - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // Draw text
    ctx.fillStyle = 'black';
    ctx.fillText(this.name, x, y + radius + 5);
  }

  /**
   * Get additional properties specific to SimpleMapOverlay
   */
  getOpenStatus(): string {
    return this.isOpen ? 'Open' : 'Closed';
  }

  /**
   * Toggle the open state
   */
  toggleOpenState(): void {
    this.isOpen = !this.isOpen;
  }

  /**
   * Get a summary of the overlay for display
   */
  getSummary(): string {
    return `${this.name} (${this.category}${this.subCategory ? ` - ${this.subCategory}` : ''}) - ${this.getOpenStatus()}`;
  }

  /**
   * Get the category color for this overlay
   * @returns The color string for the category
   */
  getCategoryColor(): string {
    // Default category colors - this could be enhanced to use a category color mapping
    const categoryColors: { [key: string]: string } = {
      'hotels': '#849DE3',
      'eats': '#FF965E',
      'recreation': '#00B73F',
      'sites': '#00B73F',
      'schools': '#649FB2',
      'hospitals': '#FF757C',
      'stores': '#0098F5',
      'transport': '#00C1FF',
      'theaters': '#9C27B0',
      'beaches': '#00BCD4',
      'parks': '#4CAF50',
      'services': '#7D9EB3',
      'tours': '#FF5722'
    };

    return categoryColors[this.category] || this.color || '#333333';
  }
}
