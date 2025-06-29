import { OverlayLinkedList } from '../map-overlay/overlay-linked-list.js';
export class MapComponent extends HTMLElement {
    constructor() {
        super();
        this.mapImageSrc = '';
        // Original dimensions (will be set from image)
        this.originalWidth = 0;
        this.originalHeight = 0;
        // Zoom and pan state variables
        this.zoomScale = 2;
        this.zoomShowLabels = 8;
        this.minZoom = 1;
        this.maxZoom = 60;
        this.isPanning = false;
        this.isZooming = false;
        this.startX = 0;
        this.startY = 0;
        this.panX = 0;
        this.panY = 0;
        // Momentum and friction variables
        this.velocityX = 0;
        this.velocityY = 0;
        this.lastMoveTime = 0;
        this.lastMoveX = 0;
        this.lastMoveY = 0;
        this.momentumAnimationId = 0;
        this.friction = 0.92; // Friction coefficient (0-1, closer to 1 = less friction)
        this.minVelocity = 0.05; // Minimum velocity before stopping momentum
        // Velocity buffer for better momentum calculation
        this.velocityBuffer = [];
        this.maxVelocityBufferSize = 5; // Keep last 5 movements
        this.velocityBufferTimeWindow = 100; // Only consider movements within last 100ms
        // Centering animation variables
        this.centerAnimationId = 0;
        this.isCentering = false;
        this.centerStartTime = 0;
        this.centerDuration = 800; // Animation duration in milliseconds
        this.centerStartPanX = 0;
        this.centerStartPanY = 0;
        this.centerStartZoom = 0;
        this.centerTargetPanX = 0;
        this.centerTargetPanY = 0;
        this.centerTargetZoom = 0;
        // Two linked lists as required by the issue
        this.visibleOverlays = new OverlayLinkedList();
        this.hiddenOverlays = new OverlayLinkedList();
        // Currently highlighted overlay (only one at a time)
        this.highlightedOverlay = null;
        // Touch variables for mobile support
        this.initialPinchDistance = 0;
        this.lastPinchCenter = { x: 0, y: 0 };
        // Create shadow DOM
        this.shadow = this.attachShadow({ mode: 'open' });
        // Create styles
        const style = document.createElement('style');
        style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      }

      canvas {
        display: block;
        width: 100%;
        height: 100%;
        cursor: default;
        touch-action: none;
      }

      canvas.panning {
        cursor: grabbing;
      }

      canvas.zooming-in {
        cursor: zoom-in;
      }

      canvas.zooming-out {
        cursor: zoom-out;
      }
    `;
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        // Append elements to shadow DOM
        this.shadow.appendChild(style);
        this.shadow.appendChild(this.canvas);
        // Create map image
        this.mapImage = new Image();
        this.mapImage.onload = () => {
            this.originalWidth = this.mapImage.naturalWidth;
            this.originalHeight = this.mapImage.naturalHeight;
            this.resizeCanvas();
            this.drawMap();
        };
        this.mapImage.onerror = () => {
            console.error('Failed to load map image');
        };
        // Bind event handlers
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }
    connectedCallback() {
        // Add event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('wheel', this.handleWheel);
        this.canvas.addEventListener('touchstart', this.handleTouchStart);
        this.canvas.addEventListener('touchmove', this.handleTouchMove);
        this.canvas.addEventListener('touchend', this.handleTouchEnd);
        // Set up resize observer
        const resizeObserver = new ResizeObserver(() => {
            this.resizeCanvas();
        });
        resizeObserver.observe(this);
        this.resizeCanvas();
    }
    disconnectedCallback() {
        // Remove event listeners
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('wheel', this.handleWheel);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }
    /**
     * Set the map background image
     * @param imageSrc The source URL of the map image
     */
    setMapImage(imageSrc) {
        this.mapImageSrc = imageSrc;
        this.mapImage.src = imageSrc;
    }
    /**
     * Add an overlay to the map (initially visible)
     * @param overlay The overlay data
     */
    addOverlay(overlay) {
        this.visibleOverlays.append(overlay);
        this.drawMap();
    }
    /**
     * Remove an overlay from the map
     * @param overlayId The ID of the overlay to remove
     */
    removeOverlay(overlayId) {
        const visibleOverlay = this.visibleOverlays.remove(overlayId);
        const hiddenOverlay = this.hiddenOverlays.remove(overlayId);
        if (visibleOverlay || hiddenOverlay) {
            // If the removed overlay was highlighted, clear the highlight
            if (this.highlightedOverlay && this.highlightedOverlay.getId() === overlayId) {
                this.highlightedOverlay = null;
            }
            this.drawMap();
        }
    }
    /**
     * Make all overlays visible (move from hidden to visible list)
     */
    showAllOverlays() {
        const hiddenArray = this.hiddenOverlays.toArray();
        this.hiddenOverlays.clear();
        hiddenArray.forEach(overlay => {
            this.visibleOverlays.append(overlay);
        });
        this.drawMap();
        this.dispatchOverlayVisibilityEvent();
    }
    /**
     * Hide all overlays (move from visible to hidden list)
     */
    hideAllOverlays() {
        this.highlightedOverlay = null;
        const visibleArray = this.visibleOverlays.toArray();
        this.visibleOverlays.clear();
        visibleArray.forEach(overlay => {
            this.hiddenOverlays.append(overlay);
        });
        // Clear highlight since all overlays are hidden
        this.highlightedOverlay = null;
        this.drawMap();
        this.dispatchOverlayVisibilityEvent();
    }
    /**
     * Show overlays that match the specified criteria
     * @param filterFunction Function that returns true for overlays to show
     */
    showOverlaysByCriteria(filterFunction) {
        const hiddenArray = this.hiddenOverlays.toArray();
        const overlaysToShow = [];
        hiddenArray.forEach(overlay => {
            if (filterFunction(overlay)) {
                overlaysToShow.push(overlay);
            }
        });
        overlaysToShow.forEach(overlay => {
            this.hiddenOverlays.remove(overlay.getId());
            this.visibleOverlays.append(overlay);
        });
        if (overlaysToShow.length > 0) {
            this.drawMap();
            this.dispatchOverlayVisibilityEvent();
        }
    }
    /**
     * Hide overlays that match the specified criteria
     * @param filterFunction Function that returns true for overlays to hide
     */
    hideOverlaysByCriteria(filterFunction) {
        const visibleArray = this.visibleOverlays.toArray();
        const overlaysToHide = [];
        visibleArray.forEach(overlay => {
            if (filterFunction(overlay)) {
                overlaysToHide.push(overlay);
            }
        });
        overlaysToHide.forEach(overlay => {
            this.visibleOverlays.remove(overlay.getId());
            this.hiddenOverlays.append(overlay);
            // Clear highlight if this overlay was highlighted
            if (this.highlightedOverlay && this.highlightedOverlay.getId() === overlay.getId()) {
                this.highlightedOverlay = null;
            }
        });
        if (overlaysToHide.length > 0) {
            this.drawMap();
            this.dispatchOverlayVisibilityEvent();
        }
    }
    /**
     * Filter overlays by category
     * @param category The category to show (null to show all)
     */
    filterByCategory(category) {
        if (category === null) {
            this.showAllOverlays();
            return;
        }
        // Hide all overlays first
        this.hideAllOverlays();
        // Show overlays matching the category
        this.showOverlaysByCriteria(overlay => overlay.getCategory() === category);
    }
    /**
     * Filter overlays by open state
     * @param isOpen True to show only open overlays, false for closed, null for all
     */
    filterByOpenState(isOpen) {
        if (isOpen === null) {
            this.showAllOverlays();
            return;
        }
        // Hide all overlays first
        this.hideAllOverlays();
        // Show overlays matching the open state
        this.showOverlaysByCriteria(overlay => overlay.isOpenState() === isOpen);
    }
    /**
     * Search overlays by name or description
     * @param searchTerm The search term
     */
    searchOverlays(searchTerm) {
        if (!searchTerm.trim()) {
            this.showAllOverlays();
            return;
        }
        const term = searchTerm.toLowerCase();
        // Hide all overlays first
        this.hideAllOverlays();
        // Show overlays matching the search term
        this.showOverlaysByCriteria(overlay => overlay.getName().toLowerCase().includes(term) ||
            overlay.getDescription().toLowerCase().includes(term));
    }
    /**
     * Get all overlays (both visible and hidden)
     */
    getAllOverlays() {
        return [...this.visibleOverlays.toArray(), ...this.hiddenOverlays.toArray()];
    }
    /**
     * Get visible overlays
     */
    getVisibleOverlays() {
        return this.visibleOverlays.toArray();
    }
    /**
     * Get hidden overlays
     */
    getHiddenOverlays() {
        return this.hiddenOverlays.toArray();
    }
    /**
     * Reset the map view to default position and zoom
     */
    resetView() {
        this.zoomScale = 2;
        this.panX = 0;
        this.panY = 0;
        this.drawMap();
    }
    /**
     * Handle mouse down events
     */
    handleMouseDown(event) {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        // Calculate display parameters for overlay hit detection
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        // Check if an overlay was clicked
        const clickedOverlay = this.getOverlayAtPoint(x, y, centerX, centerY, this.panX, this.panY, this.zoomScale, this.originalWidth, this.originalHeight);
        if (clickedOverlay) {
            this.selectOverlay(clickedOverlay);
        }
        else {
            // Stop any existing momentum and centering animation
            this.stopMomentum();
            this.stopCenterAnimation();
            // Start panning
            this.isPanning = true;
            this.startX = event.clientX;
            this.startY = event.clientY;
            this.lastMoveX = event.clientX;
            this.lastMoveY = event.clientY;
            this.lastMoveTime = performance.now();
            // Clear velocity buffer and start tracking
            this.clearVelocityBuffer();
            this.addToVelocityBuffer(event.clientX, event.clientY, this.lastMoveTime);
            this.canvas.classList.add('panning');
        }
    }
    /**
     * Handle mouse move events
     */
    handleMouseMove(event) {
        if (this.isPanning) {
            event.preventDefault();
            const currentTime = performance.now();
            const dx = event.clientX - this.startX;
            const dy = event.clientY - this.startY;
            this.panX += dx / this.zoomScale;
            this.panY += dy / this.zoomScale;
            // Add current position to velocity buffer
            this.addToVelocityBuffer(event.clientX, event.clientY, currentTime);
            this.startX = event.clientX;
            this.startY = event.clientY;
            this.lastMoveX = event.clientX;
            this.lastMoveY = event.clientY;
            this.lastMoveTime = currentTime;
            this.drawMap();
        }
    }
    /**
     * Handle mouse up events
     */
    handleMouseUp() {
        this.isPanning = false;
        this.canvas.classList.remove('panning');
        // Calculate final velocity from buffer before starting momentum
        this.calculateVelocityFromBuffer();
        this.startMomentum();
    }
    /**
     * Handle wheel events for zooming
     */
    handleWheel(event) {
        event.preventDefault();
        // Stop any momentum and centering animation when zooming
        this.stopMomentum();
        this.stopCenterAnimation();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomScale * zoomFactor));
        if (newZoom !== this.zoomScale) {
            // Zoom towards mouse position
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const offsetX = (mouseX - centerX) / this.zoomScale;
            const offsetY = (mouseY - centerY) / this.zoomScale;
            this.zoomScale = newZoom;
            this.panX -= offsetX * (zoomFactor - 1);
            this.panY -= offsetY * (zoomFactor - 1);
            this.drawMap();
        }
    }
    /**
     * Handle touch start events
     */
    handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            // Single touch - check for overlay click or start panning
            const touch = event.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            // Calculate display parameters for overlay hit detection
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const clickedOverlay = this.getOverlayAtPoint(x, y, centerX, centerY, this.panX, this.panY, this.zoomScale, this.originalWidth, this.originalHeight);
            if (clickedOverlay) {
                this.selectOverlay(clickedOverlay);
            }
            else {
                // Stop any existing momentum and centering animation
                this.stopMomentum();
                this.stopCenterAnimation();
                this.isPanning = true;
                this.startX = touch.clientX;
                this.startY = touch.clientY;
                this.lastMoveX = touch.clientX;
                this.lastMoveY = touch.clientY;
                this.lastMoveTime = performance.now();
                // Clear velocity buffer and start tracking
                this.clearVelocityBuffer();
                this.addToVelocityBuffer(touch.clientX, touch.clientY, this.lastMoveTime);
            }
        }
        else if (event.touches.length === 2) {
            // Two touches - start pinch zoom
            // Stop any existing momentum and centering animation
            this.stopMomentum();
            this.stopCenterAnimation();
            this.isPanning = false;
            this.initialPinchDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
            this.lastPinchCenter = this.getTouchCenter(event.touches[0], event.touches[1]);
        }
    }
    /**
     * Handle touch move events
     */
    handleTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1 && this.isPanning) {
            // Single touch panning
            const touch = event.touches[0];
            const currentTime = performance.now();
            const dx = touch.clientX - this.startX;
            const dy = touch.clientY - this.startY;
            this.panX += dx / this.zoomScale;
            this.panY += dy / this.zoomScale;
            // Add current position to velocity buffer
            this.addToVelocityBuffer(touch.clientX, touch.clientY, currentTime);
            this.startX = touch.clientX;
            this.startY = touch.clientY;
            this.lastMoveX = touch.clientX;
            this.lastMoveY = touch.clientY;
            this.lastMoveTime = currentTime;
            this.drawMap();
        }
        else if (event.touches.length === 2) {
            // Two touch pinch zoom
            const currentDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
            const currentCenter = this.getTouchCenter(event.touches[0], event.touches[1]);
            if (this.initialPinchDistance > 0) {
                const zoomFactor = currentDistance / this.initialPinchDistance;
                const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomScale * zoomFactor));
                if (newZoom !== this.zoomScale) {
                    this.zoomScale = newZoom;
                    this.drawMap();
                }
                this.initialPinchDistance = currentDistance;
            }
            this.lastPinchCenter = currentCenter;
        }
    }
    /**
     * Handle touch end events
     */
    handleTouchEnd(event) {
        if (event.touches.length === 0) {
            this.isPanning = false;
            this.initialPinchDistance = 0;
            // Calculate final velocity from buffer before starting momentum
            this.calculateVelocityFromBuffer();
            this.startMomentum();
        }
    }
    /**
     * Calculate velocity from the velocity buffer
     */
    calculateVelocityFromBuffer() {
        const currentTime = performance.now();
        // Remove old entries from buffer
        this.velocityBuffer = this.velocityBuffer.filter(entry => currentTime - entry.time <= this.velocityBufferTimeWindow);
        if (this.velocityBuffer.length < 2) {
            // Not enough data points, keep current velocity or set to zero
            return;
        }
        // Calculate average velocity from recent movements
        let totalVelX = 0;
        let totalVelY = 0;
        let validSamples = 0;
        for (let i = 1; i < this.velocityBuffer.length; i++) {
            const current = this.velocityBuffer[i];
            const previous = this.velocityBuffer[i - 1];
            const timeDelta = current.time - previous.time;
            if (timeDelta > 0) {
                const velX = (current.x - previous.x) / timeDelta;
                const velY = (current.y - previous.y) / timeDelta;
                totalVelX += velX;
                totalVelY += velY;
                validSamples++;
            }
        }
        if (validSamples > 0) {
            this.velocityX = totalVelX / validSamples;
            this.velocityY = totalVelY / validSamples;
        }
    }
    /**
     * Add movement to velocity buffer
     */
    addToVelocityBuffer(x, y, time) {
        this.velocityBuffer.push({ x, y, time });
        // Keep buffer size manageable
        if (this.velocityBuffer.length > this.maxVelocityBufferSize) {
            this.velocityBuffer.shift();
        }
    }
    /**
     * Clear velocity buffer
     */
    clearVelocityBuffer() {
        this.velocityBuffer = [];
        this.velocityX = 0;
        this.velocityY = 0;
    }
    /**
     * Start momentum animation after panning ends
     */
    startMomentum() {
        // Cancel any existing momentum animation
        if (this.momentumAnimationId) {
            cancelAnimationFrame(this.momentumAnimationId);
        }
        // Only start momentum if there's significant velocity
        const totalVelocity = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (totalVelocity > this.minVelocity) {
            this.animateMomentum();
        }
    }
    /**
     * Animate momentum with friction
     */
    animateMomentum() {
        // Apply friction to velocity
        this.velocityX *= this.friction;
        this.velocityY *= this.friction;
        // Update pan position
        this.panX += this.velocityX / this.zoomScale;
        this.panY += this.velocityY / this.zoomScale;
        // Redraw the map
        this.drawMap();
        // Check if velocity is still significant enough to continue
        const totalVelocity = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (totalVelocity > this.minVelocity) {
            this.momentumAnimationId = requestAnimationFrame(() => this.animateMomentum());
        }
        else {
            // Stop momentum animation
            this.velocityX = 0;
            this.velocityY = 0;
            this.momentumAnimationId = 0;
        }
    }
    /**
     * Stop momentum animation
     */
    stopMomentum() {
        if (this.momentumAnimationId) {
            cancelAnimationFrame(this.momentumAnimationId);
            this.momentumAnimationId = 0;
        }
        this.velocityX = 0;
        this.velocityY = 0;
    }
    /**
     * Easing function for smooth animation (ease-out cubic)
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    /**
     * Start centering animation
     */
    startCenterAnimation(targetPanX, targetPanY, targetZoom) {
        // Stop any existing animations
        this.stopMomentum();
        this.stopCenterAnimation();
        // Set up animation parameters
        this.isCentering = true;
        this.centerStartTime = performance.now();
        this.centerStartPanX = this.panX;
        this.centerStartPanY = this.panY;
        this.centerStartZoom = this.zoomScale;
        this.centerTargetPanX = targetPanX;
        this.centerTargetPanY = targetPanY;
        this.centerTargetZoom = targetZoom !== undefined ? targetZoom : this.zoomScale;
        // Start the animation
        this.animateCenter();
    }
    /**
     * Animate centering with smooth easing
     */
    animateCenter() {
        const currentTime = performance.now();
        const elapsed = currentTime - this.centerStartTime;
        const progress = Math.min(elapsed / this.centerDuration, 1);
        // Apply easing function
        const easedProgress = this.easeOutCubic(progress);
        // Interpolate between start and target values
        this.panX = this.centerStartPanX + (this.centerTargetPanX - this.centerStartPanX) * easedProgress;
        this.panY = this.centerStartPanY + (this.centerTargetPanY - this.centerStartPanY) * easedProgress;
        this.zoomScale = this.centerStartZoom + (this.centerTargetZoom - this.centerStartZoom) * easedProgress;
        // Redraw the map
        this.drawMap();
        // Continue animation if not complete
        if (progress < 1) {
            this.centerAnimationId = requestAnimationFrame(() => this.animateCenter());
        }
        else {
            // Animation complete
            this.stopCenterAnimation();
        }
    }
    /**
     * Stop centering animation
     */
    stopCenterAnimation() {
        if (this.centerAnimationId) {
            cancelAnimationFrame(this.centerAnimationId);
            this.centerAnimationId = 0;
        }
        this.isCentering = false;
    }
    /**
     * Get the distance between two touches
     */
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Get the center point between two touches
     */
    getTouchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }
    /**
     * Get overlay at a specific point
     */
    getOverlayAtPoint(x, y, centerX, centerY, panX, panY, zoomScale, mapWidth, mapHeight) {
        // Check visible overlays in reverse order (last drawn = top)
        const visibleArray = this.visibleOverlays.toArray().reverse();
        for (const overlay of visibleArray) {
            if (overlay.containsPoint(x, y, centerX, centerY, panX, panY, zoomScale, mapWidth, mapHeight, overlay === this.highlightedOverlay)) {
                return overlay;
            }
        }
        return null;
    }
    /**
     * Select an overlay (highlight it and move to end of visible list)
     */
    selectOverlay(overlay) {
        // Clear previous highlight
        // Set new highlight
        this.highlightedOverlay = overlay;
        // Move to end of visible list (so it's drawn last/on top)
        this.visibleOverlays.moveToEnd(overlay.getId());
        // Dispatch overlay click event
        this.dispatchEvent(new CustomEvent('overlay-selected', {
            bubbles: true,
            composed: true,
            detail: { overlay: overlay }
        }));
        this.drawMap();
    }
    deselectOverlay() {
        this.highlightedOverlay = null;
    }
    /**
     * Resize the canvas to match the container
     */
    resizeCanvas() {
        const rect = this.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(dpr, dpr);
        this.drawMap();
    }
    /**
     * Public method to trigger a map redraw
     */
    redraw() {
        this.drawMap();
    }
    /**
     * Center the map to specific coordinates with optional zoom
     * @param x - X coordinate in map space (percentage 0-1)
     * @param y - Y coordinate in map space (percentage 0-1)
     * @param zoom - Optional zoom level to apply
     */
    centerTo(x, y, zoom) {
        // Prepare target zoom level
        let targetZoom;
        if (zoom === -1) {
            // Special case: if zoom is -1, use zoomShowLabels if current zoom is greater than zoomShowLabels
            targetZoom = this.zoomScale < this.zoomShowLabels ? this.zoomShowLabels + 1 : this.zoomScale;
        }
        else if (zoom == -2) {
            if (this.isMobile()) {
                // Special case: if zoom is -2, use zoomShowLabels if current zoom is greater than zoomShowLabels and on mobile
                targetZoom = this.zoomScale < this.zoomShowLabels ? this.zoomShowLabels + 1 : this.zoomScale;
            }
            else {
                targetZoom = this.zoomScale;
            }
        }
        else {
            targetZoom = zoom !== undefined ? Math.max(this.minZoom, Math.min(this.maxZoom, zoom)) : this.zoomScale;
        }
        // Get canvas dimensions
        const rect = this.getBoundingClientRect();
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;
        // Detect if mobile (simple detection based on screen width and touch capability)
        const isMobile = this.isMobile();
        // Calculate target position based on device type
        let targetScreenX;
        let targetScreenY;
        if (isMobile) {
            // Mobile: center overlay within top 40% of screen
            targetScreenX = canvasWidth / 2;
            targetScreenY = canvasHeight * 0.2; // 20% from top (within top 40%)
        }
        else {
            // Desktop: ensure icon is at least 50px from edges
            const detailPanelWidth = 400; // Subtract 400 for width of detail panel
            const padding = 160;
            const edgeBuffer = 25;
            const marginLeft = padding;
            const marginRight = padding + detailPanelWidth;
            const marginTop = padding;
            const marginBottom = padding;
            // Calculate current screen position of the coordinates using target zoom
            const currentScreenX = canvasWidth / 2 + (x - 0.5) * this.originalWidth * targetZoom + this.panX * targetZoom;
            const currentScreenY = canvasHeight / 2 + (y - 0.5) * this.originalHeight * targetZoom + this.panY * targetZoom;
            // Check if already within acceptable bounds (only if zoom isn't changing)
            if ((zoom === undefined) && (currentScreenX >= marginLeft) && (currentScreenX <= canvasWidth - marginRight) &&
                (currentScreenY >= marginTop) && (currentScreenY <= canvasHeight - marginBottom)) {
                // Already within bounds, no animation needed
                return;
            }
            // Calculate target position ensuring minimum margin
            targetScreenX = Math.max(marginLeft, Math.min(canvasWidth - marginRight, currentScreenX));
            targetScreenY = Math.max(marginTop, Math.min(canvasHeight - marginBottom, currentScreenY));
            // If the target would be at the edge, center it instead
            if (targetScreenX === marginLeft) {
                targetScreenX = marginLeft + edgeBuffer;
            }
            if (targetScreenX === canvasWidth - marginRight) {
                targetScreenX = canvasWidth - marginRight - edgeBuffer;
            }
            if (targetScreenY === marginTop) {
                targetScreenY = marginTop + edgeBuffer;
            }
            if (targetScreenY === canvasHeight - marginBottom) {
                targetScreenY = canvasHeight - marginBottom - edgeBuffer;
            }
        }
        // Convert map coordinates (0-1) to map pixel coordinates
        const mapPixelX = x * this.originalWidth;
        const mapPixelY = y * this.originalHeight;
        // Calculate required pan to position the coordinates at the target screen position
        // Screen position = canvasCenter + (mapPixel - mapCenter + pan) * zoom
        // Solving for pan: pan = (targetScreen - canvasCenter) / zoom - (mapPixel - mapCenter)
        const mapCenterX = this.originalWidth / 2;
        const mapCenterY = this.originalHeight / 2;
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;
        const targetPanX = (targetScreenX - canvasCenterX) / targetZoom - (mapPixelX - mapCenterX);
        const targetPanY = (targetScreenY - canvasCenterY) / targetZoom - (mapPixelY - mapCenterY);
        // Start smooth animation to the target position
        this.startCenterAnimation(targetPanX, targetPanY, targetZoom);
    }
    /**
     * Draw the map and all visible overlays
     */
    drawMap() {
        if (!this.ctx || !this.mapImage.complete)
            return;
        const rect = this.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        // Calculate map position and size
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const mapWidth = this.originalWidth * this.zoomScale;
        const mapHeight = this.originalHeight * this.zoomScale;
        const mapX = centerX - mapWidth / 2 + this.panX * this.zoomScale;
        const mapY = centerY - mapHeight / 2 + this.panY * this.zoomScale;
        const showLabels = this.zoomScale >= this.zoomShowLabels;
        // Draw the map image
        this.ctx.drawImage(this.mapImage, mapX, mapY, mapWidth, mapHeight);
        // Draw all visible overlays
        this.visibleOverlays.forEach(overlay => {
            overlay.render(this.ctx, centerX, centerY, this.panX, this.panY, this.zoomScale, showLabels, this.originalWidth, this.originalHeight, 1, this.zoomScale >= this.zoomShowLabels, overlay === this.highlightedOverlay);
        });
    }
    /**
     * Dispatch overlay visibility change event
     */
    dispatchOverlayVisibilityEvent() {
        this.dispatchEvent(new CustomEvent('overlay-visibility-changed', {
            bubbles: true,
            composed: true,
            detail: {
                visibleCount: this.visibleOverlays.getSize(),
                hiddenCount: this.hiddenOverlays.getSize(),
                totalCount: this.visibleOverlays.getSize() + this.hiddenOverlays.getSize()
            }
        }));
    }
    isMobile() {
        return window.innerWidth <= 768 || ('ontouchstart' in window);
    }
}
// Register the custom element
customElements.define('map-component', MapComponent);
