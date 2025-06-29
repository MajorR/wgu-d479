import { MapComponent } from '../components/map/map-component.js';
import { OverlayYamlManager } from '../utils/overlay-yaml-manager-browser.js';
import { SVGManager } from '../utils/svg-manager.js';
import { YamlMapOverlay}  from "../components/map-overlay/yaml-map-overlay.js";
import { OverlayInfoPanel } from '../components/overlay-info-panel/overlay-info-panel.js';

/**
 * FullscreenMapManager - Manages all components on the fullscreen interactive map page
 *
 * This class coordinates the map-component, overlay filter, overlay-info-panel components,
 * and handles the map and overlay icon SVGs through the SVG manager.
 * It uses OverlayYamlManager to establish overlays from YAML data files.
 */
export class FullscreenMapManager {
  private mapComponent: MapComponent | null = null;
  private overlayInfoPanel: OverlayInfoPanel | null = null; // New OverlayInfoPanel component
  private overlayYamlManager: OverlayYamlManager;
  private svgManager: SVGManager;
  private overlays: YamlMapOverlay[] = [];
  private selectedOverlay: YamlMapOverlay | null = null;

  constructor() {
    this.overlayYamlManager = new OverlayYamlManager('../data');
    this.svgManager = new SVGManager();
  }

  /**
   * Initialize the fullscreen map manager
   * @param mapComponentId The ID of the map component element
   * @param overlayFilterId The ID of the overlay filter element
   * @param mapImageSrc The source URL for the map image
   */
  async initialize(
    mapComponentId: string,
    mapImageSrc: string
  ): Promise<void> {
    try {
      // Get component references
      this.mapComponent = document.getElementById(mapComponentId) as MapComponent;

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
    } catch (error) {
      console.error('Error initializing FullscreenMapManager:', error);
      throw error;
    }
  }

  /**
   * Load overlays from YAML data and add them to the map
   */
  private async loadOverlaysFromYaml(): Promise<void> {
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
        this.mapComponent!.addOverlay(overlay);
        this.overlays.push(overlay);
      } catch (error) {
        console.error(`Error creating overlay for ${overlayData.id}:`, error);
      }
    }

    console.log(`Loaded ${this.overlays.length} overlays from YAML data`);
  }

  /**
   * Set up event listeners for component interactions
   */
  private setupEventListeners(): void {
    // Listen for overlay selection events from the map
    this.mapComponent!.addEventListener('overlay-selected', (event: any) => {
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
  public applyFilter(filterCriteria: any): void {
    if (!this.mapComponent) return;

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
    } else if (filterCriteria.category) {
      // Handle single category filtering
      this.mapComponent.filterByCategory(filterCriteria.category);
    } else if (filterCriteria.isOpen !== undefined) {
      // Handle open status filtering
      this.mapComponent.filterByOpenState(filterCriteria.isOpen);
    } else if (filterCriteria.searchTerm) {
      // Handle search term filtering
      this.mapComponent.searchOverlays(filterCriteria.searchTerm);
    } else {
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
  private selectOverlay(overlay: YamlMapOverlay): void {
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
  private deselectOverlay(): void {
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
  private handleKeyboardEvents(event: KeyboardEvent): void {
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
  public showAllOverlays(): void {
    if (this.mapComponent) {
      this.mapComponent.showAllOverlays();
    }
  }

  /**
   * Hide all overlays
   */
  public hideAllOverlays(): void {
    if (this.mapComponent) {
      this.mapComponent.hideAllOverlays();
    }
  }

  /**
   * Search overlays by term
   * @param searchTerm The search term
   */
  public searchOverlays(searchTerm: string): void {
    this.applyFilter({ searchTerm });
  }

  /**
   * Filter overlays by category
   * @param category The category to filter by
   */
  public filterByCategory(category: string): void {
    this.applyFilter({ category });
  }

  /**
   * Filter overlays by open status
   * @param isOpen Whether to show only open places
   */
  public filterByOpenStatus(isOpen: boolean): void {
    this.applyFilter({ isOpen });
  }

  /**
   * Get all overlays
   * @returns Array of all overlays
   */
  public getAllOverlays(): YamlMapOverlay[] {
    return [...this.overlays];
  }

  /**
   * Get visible overlays
   * @returns Array of visible overlays
   */
  public getVisibleOverlays(): YamlMapOverlay[] {
    if (this.mapComponent) {
      return this.mapComponent.getVisibleOverlays() as YamlMapOverlay[];
    }
    return [];
  }

  /**
   * Get overlay by ID
   * @param id The overlay ID
   * @returns The overlay or null if not found
   */
  public getOverlayById(id: string): YamlMapOverlay | null {
    return this.overlays.find(o => o.getId() === id) || null;
  }

  /**
   * Get the currently selected overlay
   * @returns The selected overlay or null
   */
  public getSelectedOverlay(): YamlMapOverlay | null {
    return this.selectedOverlay;
  }


  /**
   * Close info panel (public method for external access)
   */
  public closeInfoPanel(): void {
    this.deselectOverlay();
  }

  /**
   * Reset view (public method for external access)
   */
  public resetView(): void {
    if (this.mapComponent && this.mapComponent.resetView) {
      this.mapComponent.resetView();
    }
  }

  /**
   * Get overlay statistics
   * @returns Statistics object
   */
  public getStatistics(): any {
    const categories = new Map<string, number>();
    const subcategories = new Map<string, number>();
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
  public destroy(): void {
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
