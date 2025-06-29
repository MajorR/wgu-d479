import { IMapOverlay } from './i-map-overlay.js';
/**
 * YamlMapOverlay - A map overlay class that works with YAML data from OverlayYamlManager
 * This class extends IMapOverlay and is specifically designed to handle the data structure
 * from the YAML files in the data folder.
 */
export class YamlMapOverlay extends IMapOverlay {
    constructor(svgManager) {
        super();
        this.additionalData = {};
        this.iconLoading = false;
        this.iconDir = '/img/solid';
        this.iconColor = 'white'; // Fixed color for all YamlMapOverlay icons
        this.svgManager = svgManager;
    }
    /**
     * Initialize the overlay with YAML data
     * @param data The overlay data from YAML files
     */
    initialize(data) {
        this.id = data.id || '';
        this.name = data.name || '';
        this.description = data.description || '';
        // Handle subcategory - could be a string or object from YAML processing
        if (typeof data.subcategory === 'object') {
            this.subCategory = data.subcategory.name || '';
            this.icon = data.subcategory.icon || undefined;
        }
        //this.subCategory = typeof data.subcategory === 'object' ? data.subcategory.name : data.subcategory || '';
        // Handle category - could be a string or object from YAML processing
        if (typeof data.category === 'object') {
            this.category = data.category.name || '';
            // Set color based on category or use default
            this.color = data.category.color || 'black';
            if (!this.icon)
                this.icon = data.category.icon || this.getDefaultIcon();
        }
        //this.category = typeof data.category === 'object' ? data.category.name : data.category || '';
        // Determine if the place is currently open based on operating times
        this.isOpen = this.calculateOpenStatus(data['operating-times']);
        // Coordinates are percentages in YAML data
        this.coordinates = data.coordinates || { left: 0, top: 0 };
        // Load icon after all properties are set
        if (this.icon) {
            this.loadIcon();
        }
        // Store additional YAML-specific data
        this.additionalData = {
            address: data.address,
            details: data.details,
            image: data.image,
            website: data.website,
            phone: data.phone,
            pricing: data.pricing,
            labelPlacement: data['label-placement'] || 'left',
            moreInfo: data['more-info'],
            operatingTimes: data['operating-times'],
        };
        if (this.category === 'Movie Theaters') {
            console.log(this.additionalData.moreInfo);
        }
    }
    /**
     * Load the icon asynchronously - called once during initialization
     */
    loadIcon() {
        if (this.iconLoading || this.cachedIcon) {
            return; // Already loading or loaded
        }
        this.iconLoading = true;
        this.cachedIconSrc = `${this.iconDir}/${this.icon}.svg`; // Consistent path construction
        // Use SVGManager with color-based key (SVGManager handles the caching)
        this.svgManager.getImage(this.cachedIconSrc, this.iconColor)
            .then(iconImage => {
            this.cachedIcon = iconImage;
            this.iconLoading = false;
            // Note: No redraw trigger needed since this happens during initialization
        })
            .catch(error => {
            console.warn(`Failed to load icon ${this.cachedIconSrc}:`, error);
            this.iconLoading = false;
        });
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
    render(ctx, centerX, centerY, panX, panY, zoomScale, zoomShowLabels, mapWidth, mapHeight, opacity = 1, showText = false, isHighlighted = false) {
        const { x: screenX, y: screenY } = this.getScreenCoordinates(centerX, centerY, panX, panY, zoomScale, mapWidth, mapHeight);
        // Save the current context state
        ctx.save();
        // Apply opacity
        ctx.globalAlpha = opacity;
        // Determine rendering parameters based on highlight state
        const radius = isHighlighted ? 18 : 12;
        const strokeStyle = this.color;
        const lineWidth = isHighlighted ? 3 : 2;
        // Apply shadow if highlighted
        if (isHighlighted) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        // Draw the circle background
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        // Draw the border
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        // Add a subtle inner circle for open/closed status
        // if (this.isOpen) {
        //   ctx.beginPath();
        //   ctx.arc(screenX, screenY, radius - 3, 0, Math.PI * 2);
        //   ctx.strokeStyle = '#4CAF50'; // Green for open
        //   ctx.lineWidth = 2;
        //   ctx.stroke();
        // }
        // Reset shadow after drawing the border
        if (isHighlighted) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        // Draw icon if available
        if (this.icon) {
            this.renderIcon(ctx, screenX, screenY, radius, isHighlighted);
        }
        else {
            // Fallback: draw first letter of name
            this.renderFallbackIcon(ctx, screenX, screenY, radius);
        }
        // Draw text if needed
        if (showText || zoomShowLabels || isHighlighted) {
            this.renderText(ctx, screenX, screenY, radius, isHighlighted);
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
    containsPoint(x, y, centerX, centerY, panX, panY, zoomScale, mapWidth, mapHeight, isHighlighted) {
        const { x: screenX, y: screenY } = this.getScreenCoordinates(centerX, centerY, panX, panY, zoomScale, mapWidth, mapHeight);
        const radius = isHighlighted ? 18 : 12;
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
    matchesFilter(filterCriteria) {
        if (!filterCriteria)
            return true;
        // Handle new OR/AND filter expressions
        if (filterCriteria.filterExpression) {
            return this.evaluateFilterExpression(filterCriteria.filterExpression);
        }
        // Handle multiple categories with OR logic (backward compatibility enhancement)
        if (filterCriteria.categories && Array.isArray(filterCriteria.categories)) {
            if (filterCriteria.categories.length === 0) {
                return false; // No categories selected means hide all
            }
            if (!filterCriteria.categories.includes(this.category)) {
                return false; // Overlay category not in active categories
            }
        }
        // Legacy single category filter (backward compatibility)
        if (filterCriteria.category && this.category !== filterCriteria.category) {
            return false;
        }
        // Subcategory filter
        if (filterCriteria.subCategory && this.subCategory !== filterCriteria.subCategory) {
            return false;
        }
        // Open status filter
        if (filterCriteria.isOpen !== undefined && this.isOpen !== filterCriteria.isOpen) {
            return false;
        }
        // Search term filter
        if (filterCriteria.searchTerm) {
            const searchTerm = filterCriteria.searchTerm.toLowerCase();
            const searchableText = [
                this.name,
                this.description,
                this.category,
                this.subCategory,
                this.additionalData.address
            ].join(' ').toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        // Pricing filter
        if (filterCriteria.pricing && this.additionalData.pricing !== filterCriteria.pricing) {
            return false;
        }
        return true;
    }
    /**
     * Parse and evaluate complex filter expressions with OR/AND logic
     * @param expression The filter expression string (e.g., "category=hotels OR category=restaurants")
     * @returns True if overlay matches the expression, false otherwise
     */
    evaluateFilterExpression(expression) {
        if (!expression || expression.trim() === '')
            return true;
        try {
            const parsedFilter = this.parseFilterExpression(expression);
            return this.evaluateFilter(parsedFilter);
        }
        catch (error) {
            console.error('Filter parsing error:', error);
            return false;
        }
    }
    /**
     * Parse filter expression into a tree structure
     * @param expression The filter expression string
     * @returns Parsed filter tree
     */
    parseFilterExpression(expression) {
        if (!expression || expression.trim() === '')
            return null;
        // Handle parentheses by finding the innermost ones first
        const parenMatch = expression.match(/\([^()]+\)/);
        if (parenMatch) {
            const innerExpression = parenMatch[0].slice(1, -1); // Remove parentheses
            const innerResult = this.parseFilterExpression(innerExpression);
            const newExpression = expression.replace(parenMatch[0], `__TEMP_${Math.random()}__`);
            const outerResult = this.parseFilterExpression(newExpression);
            // Replace the temp placeholder with the inner result
            return this.replaceTempPlaceholder(outerResult, innerResult);
        }
        // Split by OR first (lower precedence)
        const orParts = expression.split(/\s+OR\s+/i);
        if (orParts.length > 1) {
            // Handle OR logic
            return {
                type: 'OR',
                conditions: orParts.map(part => this.parseFilterExpression(part.trim()))
            };
        }
        // Split by AND (higher precedence)
        const andParts = expression.split(/\s+AND\s+/i);
        if (andParts.length > 1) {
            // Handle AND logic
            return {
                type: 'AND',
                conditions: andParts.map(part => this.parseFilterExpression(part.trim()))
            };
        }
        // Parse individual condition (key=value)
        const match = expression.match(/^(\w+)\s*=\s*(.+)$/);
        if (match) {
            return {
                type: 'CONDITION',
                key: match[1],
                value: match[2]
            };
        }
        // Check for temp placeholder
        if (expression.startsWith('__TEMP_')) {
            return { type: 'PLACEHOLDER', value: expression };
        }
        throw new Error(`Invalid filter expression: ${expression}`);
    }
    /**
     * Replace temporary placeholders with actual filter nodes
     * @param node The filter node that may contain placeholders
     * @param replacement The replacement node
     * @returns Updated filter node
     */
    replaceTempPlaceholder(node, replacement) {
        if (!node)
            return node;
        if (node.type === 'PLACEHOLDER') {
            return replacement;
        }
        if (node.conditions) {
            node.conditions = node.conditions.map((condition) => this.replaceTempPlaceholder(condition, replacement));
        }
        return node;
    }
    /**
     * Evaluate a parsed filter tree against this overlay
     * @param filterNode The parsed filter tree node
     * @returns True if overlay matches the filter, false otherwise
     */
    evaluateFilter(filterNode) {
        if (!filterNode)
            return true;
        switch (filterNode.type) {
            case 'OR':
                return filterNode.conditions.some((condition) => this.evaluateFilter(condition));
            case 'AND':
                return filterNode.conditions.every((condition) => this.evaluateFilter(condition));
            case 'CONDITION':
                return this.evaluateCondition(filterNode.key, filterNode.value);
            default:
                return false;
        }
    }
    /**
     * Evaluate a single condition against this overlay
     * @param key The condition key (e.g., 'category', 'isOpen')
     * @param value The condition value
     * @returns True if condition matches, false otherwise
     */
    evaluateCondition(key, value) {
        switch (key.toLowerCase()) {
            case 'category':
                return this.category === value;
            case 'subcategory':
                return this.subCategory === value;
            case 'isopen':
                return this.isOpen === (value.toLowerCase() === 'true');
            case 'name':
                return this.name.toLowerCase().includes(value.toLowerCase());
            case 'id':
                return this.id === value;
            default:
                return false;
        }
    }
    /**
     * Simplified icon rendering - no async loading, just draw cached icon
     * @param ctx The canvas context
     * @param x The X coordinate
     * @param y The Y coordinate
     * @param radius The radius of the overlay
     */
    renderIcon(ctx, x, y, radius, isHighlighted) {
        const iconSize = radius * 1.2;
        // Simply draw the cached icon if available
        if (this.cachedIcon) {
            ctx.drawImage(this.cachedIcon, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
            return;
        }
        // If icon isn't loaded yet (shouldn't happen after initialization), ensure it's loading and show fallback
        if (!this.iconLoading) {
            this.loadIcon();
        }
        // Draw fallback while icon is loading
        this.renderFallbackIcon(ctx, x, y, radius);
    }
    /**
     * Render fallback icon (first letter of name)
     * @param ctx The canvas context
     * @param x The X coordinate
     * @param y The Y coordinate
     * @param radius The radius of the overlay
     */
    renderFallbackIcon(ctx, x, y, radius) {
        const fontSize = radius * 0.8;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const letter = this.name.charAt(0).toUpperCase() || this.category.charAt(0).toUpperCase() || '?';
        ctx.fillText(letter, x, y);
    }
    /**
     * Render text label
     * @param ctx The canvas context
     * @param x The X coordinate
     * @param y The Y coordinate
     * @param radius The radius of the overlay
     */
    renderText(ctx, x, y, radius, isHighlighted) {
        const labelPlacement = this.additionalData.labelPlacement || 'left';
        let textX = x;
        let textY = y;
        // Set font for text measurement
        ctx.font = isHighlighted ? '12px Arial' : '12px Arial';
        // Break text into lines if too long (max 3 lines)
        const maxWidth = 120; // Maximum width for a single line
        const lines = this.wrapText(ctx, this.name, maxWidth, 3);
        const lineHeight = 16;
        const totalTextHeight = lines.length * lineHeight;
        // Calculate background dimensions
        const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const padding = 4;
        const backgroundWidth = maxLineWidth + padding * 2;
        const backgroundHeight = totalTextHeight + padding * 2;
        // Adjust text position based on label placement
        switch (labelPlacement) {
            case 'above':
                textY = y - radius - backgroundHeight;
                break;
            case 'below':
                textY = y + (radius * 2) + padding;
                break;
            case 'left':
                textX = x - radius - maxLineWidth / 2 - padding * 2;
                textY = y - (totalTextHeight / 2) + (lineHeight / 2);
                break;
            case 'right':
                textX = x + radius + (backgroundWidth / 2) + padding;
                textY = y - (totalTextHeight / 2) + (lineHeight / 2);
                break;
            default:
                textY = y + radius + 15 - (totalTextHeight / 2) + (lineHeight / 2);
        }
        // Draw text background
        ctx.fillStyle = isHighlighted ? this.color : 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(textX - backgroundWidth / 2, textY - lineHeight / 2 - padding, backgroundWidth, backgroundHeight);
        // Draw text border
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(textX - backgroundWidth / 2, textY - lineHeight / 2 - padding, backgroundWidth, backgroundHeight);
        // Draw text lines
        ctx.fillStyle = isHighlighted ? 'white' : this.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        lines.forEach((line, index) => {
            const lineY = textY + (index * lineHeight);
            ctx.fillText(line, textX, lineY);
        });
    }
    /**
     * Wrap text into multiple lines
     * @param ctx The canvas context
     * @param text The text to wrap
     * @param maxWidth Maximum width per line
     * @param maxLines Maximum number of lines
     * @returns Array of text lines
     */
    wrapText(ctx, text, maxWidth, maxLines) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = words[i];
                // Stop if we've reached the maximum number of lines
                if (lines.length >= maxLines) {
                    // If there are more words, add ellipsis to the last line
                    if (i < words.length - 1) {
                        const lastLine = lines[lines.length - 1];
                        const ellipsisTest = lastLine + '...';
                        if (ctx.measureText(ellipsisTest).width <= maxWidth) {
                            lines[lines.length - 1] = ellipsisTest;
                        }
                        else {
                            // Try to fit ellipsis by removing words from the last line
                            const lastLineWords = lastLine.split(' ');
                            for (let j = lastLineWords.length - 1; j >= 0; j--) {
                                const truncatedLine = lastLineWords.slice(0, j).join(' ') + '...';
                                if (ctx.measureText(truncatedLine).width <= maxWidth) {
                                    lines[lines.length - 1] = truncatedLine;
                                    break;
                                }
                            }
                        }
                    }
                    break;
                }
            }
            else {
                currentLine = testLine;
            }
        }
        // Add the last line if it exists and we haven't exceeded max lines
        if (currentLine && lines.length < maxLines) {
            lines.push(currentLine);
        }
        return lines;
    }
    /**
     * Calculate if the place is currently open based on operating times
     * @param operatingTimes The operating times object from YAML
     * @returns True if open, false if closed
     */
    calculateOpenStatus(operatingTimes) {
        if (!operatingTimes)
            return false;
        const now = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = dayNames[now.getDay()];
        const todayHours = operatingTimes[currentDay];
        if (!todayHours || !todayHours['open-this-day']) {
            return false;
        }
        // If it's 24 hour, it's always open
        if (todayHours.is24hour) {
            return true;
        }
        if (todayHours.open && todayHours.close) {
            const openTime = new Date(todayHours.open);
            const closeTime = new Date(todayHours.close);
            const nowTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
            return nowTime >= openTime && nowTime <= closeTime;
        }
        // For now, return true if open today (could be enhanced with actual time checking)
        return true;
    }
    /**
     * Get default icon based on category
     * @returns The default icon name
     */
    getDefaultIcon() {
        const iconMap = {
            'hotels': 'bed',
            'dining': 'utensils',
            'attractions': 'star',
            'shopping': 'shopping-bag',
            'transportation': 'car',
            'services': 'cog',
            'entertainment': 'film'
        };
        return iconMap[this.category.toLowerCase()] || 'map-pin';
    }
    /**
     * Get additional data specific to YAML overlays
     * @returns The additional data object
     */
    getAdditionalData() {
        return { ...this.additionalData };
    }
    /**
     * Get a summary of the overlay for display
     * @returns Summary object
     */
    getSummary() {
        return {
            id: this.id,
            name: this.name,
            icon: this.icon,
            color: this.color,
            iconSrc: this.cachedIconSrc,
            description: this.description,
            category: this.category,
            subCategory: this.subCategory,
            isOpen: this.isOpen,
            address: this.additionalData.address,
            phone: this.additionalData.phone,
            website: this.additionalData.website,
            pricing: this.additionalData.pricing
        };
    }
}
