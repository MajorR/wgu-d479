import { OverlayYamlManager } from '../utils/overlay-yaml-manager-browser.js';
import { SVGManager } from '../utils/svg-manager.js';
import { YamlMapOverlay } from "../components/map-overlay/yaml-map-overlay.js";
import { OverlayInfoPanel } from '../components/overlay-info-panel/overlay-info-panel.js';
/**
 * FullscreenMapManager - Manages all components on the fullscreen interactive map page
 *
 * This class coordinates the map-component, overlay filter, overlay-info-panel components,
 * and handles the map and overlay icon SVGs through the SVG manager.
 * It uses OverlayYamlManager to establish overlays from YAML data files.
 */
export class FullscreenMapManager {
    constructor() {
        this.mapComponent = null;
        this.overlayInfoPanel = null; // New OverlayInfoPanel component
        this.overlays = [];
        this.selectedOverlay = null;
        this.overlayYamlManager = new OverlayYamlManager('../data');
        this.svgManager = new SVGManager();
    }
    /**
     * Initialize the fullscreen map manager
     * @param mapComponentId The ID of the map component element
     * @param overlayFilterId The ID of the overlay filter element
     * @param mapImageSrc The source URL for the map image
     */
    async initialize(mapComponentId, mapImageSrc) {
        try {
            // Get component references
            this.mapComponent = document.getElementById(mapComponentId);
            // Create new overlay info panel
            this.overlayInfoPanel = new OverlayInfoPanel(this.svgManager);
            if (!this.mapComponent) {
                throw new Error(`Map component with ID '${mapComponentId}' not found`);
            }
            // Wait for YAML data to load
            await this.overlayYamlManager.initialized;
            // Set up the map
            this.mapComponent.setMapImage(mapImageSrc);
            // Load overlays from YAML data
            await this.loadOverlaysFromYaml();
            // Set up event listeners
            this.setupEventListeners();
            console.log('FullscreenMapManager initialized successfully');
        }
        catch (error) {
            console.error('Error initializing FullscreenMapManager:', error);
            throw error;
        }
    }
    /**
     * Load overlays from YAML data and add them to the map
     */
    async loadOverlaysFromYaml() {
        const yamlOverlays = this.overlayYamlManager.getMapOverlays();
        if (!yamlOverlays || !Array.isArray(yamlOverlays)) {
            console.warn('No overlay data found in YAML files');
            return;
        }
        // Create YamlMapOverlay instances for each overlay in the data
        for (const overlayData of yamlOverlays) {
            try {
                const overlay = new YamlMapOverlay(this.svgManager);
                overlay.initialize(overlayData);
                // Add overlay to map component (MapComponent manages visibility with linked lists)
                this.mapComponent.addOverlay(overlay);
                this.overlays.push(overlay);
            }
            catch (error) {
                console.error(`Error creating overlay for ${overlayData.id}:`, error);
            }
        }
        console.log(`Loaded ${this.overlays.length} overlays from YAML data`);
    }
    /**
     * Set up event listeners for component interactions
     */
    setupEventListeners() {
        // Listen for overlay selection events from the map
        this.mapComponent.addEventListener('overlay-selected', (event) => {
            const overlay = event.detail.overlay;
            if (overlay) {
                this.selectOverlay(overlay);
            }
        });
        // Note: Info panel close events are handled through other mechanisms
        // The panel can be closed via keyboard events (Escape key) or direct method calls
        // Listen for keyboard events
        document.addEventListener('keydown', (event) => {
            this.handleKeyboardEvents(event);
        });
    }
    /**
     * Apply filter criteria to overlays
     * @param filterCriteria The filter criteria object
     */
    applyFilter(filterCriteria) {
        if (!this.mapComponent)
            return;
        // Handle different types of filter criteria
        if (filterCriteria.type === 'category' && filterCriteria.categories) {
            // Handle category-based filtering with multiple categories
            const enabledCategories = filterCriteria.categories;
            // First hide all overlays to ensure clean state
            this.mapComponent.hideAllOverlays();
            // Then show only overlays matching the enabled categories
            this.mapComponent.showOverlaysByCriteria((overlay) => {
                const overlayCategory = overlay.getCategory();
                return enabledCategories.includes(overlayCategory);
            });
        }
        else if (filterCriteria.category) {
            // Handle single category filtering
            this.mapComponent.filterByCategory(filterCriteria.category);
        }
        else if (filterCriteria.isOpen !== undefined) {
            // Handle open status filtering
            this.mapComponent.filterByOpenState(filterCriteria.isOpen);
        }
        else if (filterCriteria.searchTerm) {
            // Handle search term filtering
            this.mapComponent.searchOverlays(filterCriteria.searchTerm);
        }
        else {
            // Fallback: use MapComponent's filtering methods for custom criteria
            this.mapComponent.showOverlaysByCriteria((overlay) => {
                return overlay.matchesFilter && overlay.matchesFilter(filterCriteria);
            });
        }
    }
    /**
     * Select an overlay and show its information
     * @param overlay The overlay to select
     */
    selectOverlay(overlay) {
        // Prevent circular calls - don't re-select if already selected
        if (this.selectedOverlay === overlay) {
            return;
        }
        // Select new overlay
        this.selectedOverlay = overlay;
        // Show overlay information in the info panel
        if (this.overlayInfoPanel) {
            this.overlayInfoPanel.show(overlay);
        }
        // Center the map on the selected overlay
        if (this.mapComponent) {
            // Get overlay coordinates (percentages 0-100) and convert to 0-1 range
            const coordinates = overlay.getCoordinates();
            const x = coordinates.left / 100;
            const y = coordinates.top / 100;
            // Center the map to the overlay coordinates
            this.mapComponent.centerTo(x, y, -2);
            // Select the overlay on the map component
            this.mapComponent.selectOverlay(overlay);
            this.mapComponent.redraw();
        }
    }
    /**
     * Deselect the currently selected overlay
     */
    deselectOverlay() {
        if (this.selectedOverlay) {
            this.selectedOverlay = null;
            // Hide info panel
            if (this.overlayInfoPanel) {
                this.overlayInfoPanel.hide();
            }
            // Trigger map redraw
            if (this.mapComponent && this.mapComponent.redraw) {
                this.mapComponent.deselectOverlay();
                this.mapComponent.redraw();
            }
        }
    }
    /**
     * Handle keyboard events for map navigation and overlay interaction
     * @param event The keyboard event
     */
    handleKeyboardEvents(event) {
        switch (event.key) {
            case 'Escape':
                // Close info panel and deselect overlay
                this.deselectOverlay();
                break;
            case 'r':
            case 'R':
                // Reset map view
                if (this.mapComponent && this.mapComponent.resetView) {
                    this.mapComponent.resetView();
                }
                break;
            case 'a':
            case 'A':
                // Show all overlays
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.showAllOverlays();
                }
                break;
            case 'h':
            case 'H':
                // Hide all overlays
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.hideAllOverlays();
                }
                break;
        }
    }
    /**
     * Show all overlays
     */
    showAllOverlays() {
        if (this.mapComponent) {
            this.mapComponent.showAllOverlays();
        }
    }
    /**
     * Hide all overlays
     */
    hideAllOverlays() {
        if (this.mapComponent) {
            this.mapComponent.hideAllOverlays();
        }
    }
    /**
     * Search overlays by term
     * @param searchTerm The search term
     */
    searchOverlays(searchTerm) {
        this.applyFilter({ searchTerm });
    }
    /**
     * Filter overlays by category
     * @param category The category to filter by
     */
    filterByCategory(category) {
        this.applyFilter({ category });
    }
    /**
     * Filter overlays by open status
     * @param isOpen Whether to show only open places
     */
    filterByOpenStatus(isOpen) {
        this.applyFilter({ isOpen });
    }
    /**
     * Get all overlays
     * @returns Array of all overlays
     */
    getAllOverlays() {
        return [...this.overlays];
    }
    /**
     * Get visible overlays
     * @returns Array of visible overlays
     */
    getVisibleOverlays() {
        if (this.mapComponent) {
            return this.mapComponent.getVisibleOverlays();
        }
        return [];
    }
    /**
     * Get overlay by ID
     * @param id The overlay ID
     * @returns The overlay or null if not found
     */
    getOverlayById(id) {
        return this.overlays.find(o => o.getId() === id) || null;
    }
    /**
     * Get the currently selected overlay
     * @returns The selected overlay or null
     */
    getSelectedOverlay() {
        return this.selectedOverlay;
    }
    /**
     * Close info panel (public method for external access)
     */
    closeInfoPanel() {
        this.deselectOverlay();
    }
    /**
     * Reset view (public method for external access)
     */
    resetView() {
        if (this.mapComponent && this.mapComponent.resetView) {
            this.mapComponent.resetView();
        }
    }
    /**
     * Get overlay statistics
     * @returns Statistics object
     */
    getStatistics() {
        const categories = new Map();
        const subcategories = new Map();
        let openCount = 0;
        const allOverlays = this.overlays;
        const visibleCount = this.mapComponent ? this.mapComponent.getVisibleOverlays().length : 0;
        const totalCount = allOverlays.length;
        allOverlays.forEach(overlay => {
            // Count categories
            const category = overlay.getCategory();
            if (category) {
                categories.set(category, (categories.get(category) || 0) + 1);
            }
            // Count subcategories
            const subcategory = overlay.getSubCategory();
            if (subcategory) {
                subcategories.set(subcategory, (subcategories.get(subcategory) || 0) + 1);
            }
            // Count open places
            if (overlay.isOpenState()) {
                openCount++;
            }
        });
        return {
            total: totalCount,
            visible: visibleCount,
            hidden: totalCount - visibleCount,
            open: openCount,
            closed: totalCount - openCount,
            categories: Object.fromEntries(categories),
            subcategories: Object.fromEntries(subcategories)
        };
    }
    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboardEvents);
        // Clear overlays from map component
        this.overlays.forEach(overlay => {
            if (this.mapComponent) {
                this.mapComponent.removeOverlay(overlay.getId());
            }
        });
        this.overlays = [];
        // Clear SVG manager cache
        this.svgManager.clear();
        // Destroy overlay info panel
        if (this.overlayInfoPanel) {
            this.overlayInfoPanel.destroy();
        }
        // Reset references
        this.overlayInfoPanel = null;
        this.selectedOverlay = null;
    }
}
