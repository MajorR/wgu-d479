import { SVGManager } from '../../utils/svg-manager.js';
export class MapOverlayToggleNew extends HTMLElement {
    constructor() {
        super();
        this.categoriesData = {};
        this.overlaysData = {};
        this.categoryStates = new Map();
        this.longPressTimer = null;
        this.longPressDelay = 500; // 500ms for long press
        this.currentSubcategoryPanel = null;
        this.isLongPress = false;
        this.svgManager = new SVGManager();
    }
    async connectedCallback() {
        await this.loadTemplate();
        await this.loadData();
        this.setupEventListeners();
        await this.render();
    }
    async loadTemplate() {
        try {
            const response = await fetch('/lib/components/map-overlay-toggle-new/map-overlay-toggle-new.html');
            const html = await response.text();
            this.innerHTML = html;
        }
        catch (error) {
            console.error('Error loading template:', error);
            this.innerHTML = `
        <div class="map-overlay-toggle-container">
          <div class="category-grid"></div>
          <div class="subcategory-panel" style="display: none;">
            <div class="subcategory-header">
              <h3 class="subcategory-title"></h3>
              <button class="close-subcategory-btn">&times;</button>
            </div>
            <div class="subcategory-grid"></div>
          </div>
        </div>
      `;
        }
    }
    async loadData() {
        try {
            // Load categories data
            const categoriesResponse = await fetch('/data/map-overlays-categories.yaml');
            const categoriesYaml = await categoriesResponse.text();
            this.categoriesData = window.jsyaml.load(categoriesYaml);
            // Load overlays data
            const overlaysResponse = await fetch('/data/map-overlays.yaml');
            const overlaysYaml = await overlaysResponse.text();
            this.overlaysData = window.jsyaml.load(overlaysYaml);
            // Initialize category states
            this.initializeCategoryStates();
        }
        catch (error) {
            console.error('Error loading data:', error);
        }
    }
    initializeCategoryStates() {
        for (const [categoryKey, categoryData] of Object.entries(this.categoriesData)) {
            const categoryState = {
                enabled: categoryData['default-view'] || false,
                subcategories: new Map()
            };
            // Initialize subcategory states
            if (categoryData.subcategories) {
                for (const [subKey, subData] of Object.entries(categoryData.subcategories)) {
                    categoryState.subcategories.set(subKey, categoryData['default-view'] || false);
                }
            }
            this.categoryStates.set(categoryKey, categoryState);
        }
    }
    setupEventListeners() {
        // Close subcategory panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.contains(e.target)) {
                this.hideSubcategoryPanel();
            }
        });
        // Handle escape key to close subcategory panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSubcategoryPanel();
            }
        });
    }
    async render() {
        const categoryGrid = this.querySelector('.category-grid');
        if (!categoryGrid || !this.categoriesData)
            return;
        categoryGrid.innerHTML = '';
        for (const [categoryKey, categoryData] of Object.entries(this.categoriesData)) {
            const button = await this.createCategoryButton(categoryKey, categoryData);
            categoryGrid.appendChild(button);
        }
    }
    async createCategoryButton(categoryKey, categoryData) {
        const button = document.createElement('div');
        button.className = 'category-button';
        button.dataset.category = categoryKey;
        const categoryState = this.categoryStates.get(categoryKey);
        if (categoryState?.enabled) {
            button.classList.add('active');
        }
        // Check if partially filtered
        if (this.isPartiallyFiltered(categoryKey)) {
            button.classList.add('partially-filtered');
        }
        // Create icon container
        const iconContainer = document.createElement('div');
        iconContainer.className = 'category-icon';
        try {
            const iconSvg = await this.svgManager.getSVG(`/img/solid/${categoryData.icon}.svg`);
            iconContainer.innerHTML = iconSvg;
        }
        catch (error) {
            console.error(`Error loading icon for ${categoryKey}:`, error);
            iconContainer.innerHTML = '<div style="width: 24px; height: 24px; background: #ccc;"></div>';
        }
        // Create category name
        const nameElement = document.createElement('div');
        nameElement.className = 'category-name';
        nameElement.textContent = categoryData.name;
        // Create overlay count badge
        const countBadge = document.createElement('div');
        countBadge.className = 'overlay-count';
        const enabledCount = this.getEnabledOverlayCount(categoryKey);
        countBadge.textContent = enabledCount.toString();
        if (enabledCount === 0) {
            countBadge.style.display = 'none';
        }
        // Create filter indicator
        const filterIndicator = document.createElement('div');
        filterIndicator.className = 'filter-indicator';
        if (this.isPartiallyFiltered(categoryKey)) {
            filterIndicator.classList.add('visible');
        }
        // Append elements
        button.appendChild(iconContainer);
        button.appendChild(nameElement);
        button.appendChild(countBadge);
        button.appendChild(filterIndicator);
        // Add event listeners
        this.addCategoryButtonEventListeners(button, categoryKey, categoryData);
        return button;
    }
    addCategoryButtonEventListeners(button, categoryKey, categoryData) {
        let touchStartTime = 0;
        // Mouse events
        button.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.isLongPress = false;
                this.longPressTimer = window.setTimeout(() => {
                    this.isLongPress = true;
                    this.showSubcategoryPanel(categoryKey, categoryData, button);
                }, this.longPressDelay);
            }
        });
        button.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Left click
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
                if (!this.isLongPress) {
                    this.toggleCategory(categoryKey);
                }
            }
        });
        button.addEventListener('mouseleave', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        });
        // Right click
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showSubcategoryPanel(categoryKey, categoryData, button);
        });
        // Touch events
        button.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            this.isLongPress = false;
            this.longPressTimer = window.setTimeout(() => {
                this.isLongPress = true;
                this.showSubcategoryPanel(categoryKey, categoryData, button);
            }, this.longPressDelay);
        });
        button.addEventListener('touchend', (e) => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            if (!this.isLongPress && Date.now() - touchStartTime < this.longPressDelay) {
                this.toggleCategory(categoryKey);
            }
        });
        button.addEventListener('touchcancel', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        });
    }
    toggleCategory(categoryKey) {
        const categoryState = this.categoryStates.get(categoryKey);
        if (!categoryState)
            return;
        categoryState.enabled = !categoryState.enabled;
        // Toggle all subcategories to match the main category state
        for (const [subKey, _] of categoryState.subcategories) {
            categoryState.subcategories.set(subKey, categoryState.enabled);
        }
        this.updateCategoryButton(categoryKey);
        this.dispatchOverlayChangeEvent();
    }
    async showSubcategoryPanel(categoryKey, categoryData, button) {
        const panel = this.querySelector('.subcategory-panel');
        if (!panel || !categoryData.subcategories)
            return;
        // Hide any existing panel
        this.hideSubcategoryPanel();
        // Set panel title
        const title = panel.querySelector('.subcategory-title');
        if (title) {
            title.textContent = categoryData.name;
        }
        // Create subcategory buttons
        const subcategoryGrid = panel.querySelector('.subcategory-grid');
        if (subcategoryGrid) {
            subcategoryGrid.innerHTML = '';
            for (const [subKey, subData] of Object.entries(categoryData.subcategories)) {
                const subButton = await this.createSubcategoryButton(categoryKey, subKey, subData);
                subcategoryGrid.appendChild(subButton);
            }
        }
        // Set up close button
        const closeBtn = panel.querySelector('.close-subcategory-btn');
        if (closeBtn) {
            closeBtn.onclick = () => this.hideSubcategoryPanel();
        }
        // Show panel
        panel.style.display = 'block';
        this.currentSubcategoryPanel = panel;
    }
    async createSubcategoryButton(categoryKey, subKey, subData) {
        const button = document.createElement('div');
        button.className = 'subcategory-button';
        button.dataset.category = categoryKey;
        button.dataset.subcategory = subKey;
        const categoryState = this.categoryStates.get(categoryKey);
        const isEnabled = categoryState?.subcategories.get(subKey) || false;
        if (isEnabled) {
            button.classList.add('active');
        }
        // Create icon
        const iconContainer = document.createElement('div');
        iconContainer.className = 'subcategory-icon';
        const iconName = subData.icon || this.categoriesData[categoryKey].icon;
        try {
            const iconSvg = await this.svgManager.getSVG(`/img/solid/${iconName}.svg`);
            iconContainer.innerHTML = iconSvg;
        }
        catch (error) {
            console.error(`Error loading subcategory icon for ${subKey}:`, error);
            iconContainer.innerHTML = '<div style="width: 16px; height: 16px; background: #ccc;"></div>';
        }
        // Create name
        const nameElement = document.createElement('div');
        nameElement.className = 'subcategory-name';
        nameElement.textContent = subData.name;
        // Create count badge
        const countBadge = document.createElement('div');
        countBadge.className = 'overlay-count';
        const enabledCount = this.getEnabledSubcategoryOverlayCount(categoryKey, subKey);
        countBadge.textContent = enabledCount.toString();
        if (enabledCount === 0) {
            countBadge.style.display = 'none';
        }
        // Append elements
        button.appendChild(iconContainer);
        button.appendChild(nameElement);
        button.appendChild(countBadge);
        // Add click listener
        button.addEventListener('click', () => {
            this.toggleSubcategory(categoryKey, subKey);
        });
        return button;
    }
    toggleSubcategory(categoryKey, subKey) {
        const categoryState = this.categoryStates.get(categoryKey);
        if (!categoryState)
            return;
        const currentState = categoryState.subcategories.get(subKey) || false;
        categoryState.subcategories.set(subKey, !currentState);
        // Update main category state based on subcategories
        const allSubcategoriesEnabled = Array.from(categoryState.subcategories.values()).every(state => state);
        const anySubcategoryEnabled = Array.from(categoryState.subcategories.values()).some(state => state);
        categoryState.enabled = allSubcategoriesEnabled || anySubcategoryEnabled;
        this.updateCategoryButton(categoryKey);
        this.updateSubcategoryButton(categoryKey, subKey);
        this.dispatchOverlayChangeEvent();
    }
    hideSubcategoryPanel() {
        const panel = this.querySelector('.subcategory-panel');
        if (panel) {
            panel.style.display = 'none';
        }
        this.currentSubcategoryPanel = null;
    }
    updateCategoryButton(categoryKey) {
        const button = this.querySelector(`[data-category="${categoryKey}"]`);
        if (!button)
            return;
        const categoryState = this.categoryStates.get(categoryKey);
        if (!categoryState)
            return;
        // Update active state
        if (categoryState.enabled) {
            button.classList.add('active');
        }
        else {
            button.classList.remove('active');
        }
        // Update partially filtered state
        if (this.isPartiallyFiltered(categoryKey)) {
            button.classList.add('partially-filtered');
        }
        else {
            button.classList.remove('partially-filtered');
        }
        // Update count badge
        const countBadge = button.querySelector('.overlay-count');
        if (countBadge) {
            const enabledCount = this.getEnabledOverlayCount(categoryKey);
            countBadge.textContent = enabledCount.toString();
            countBadge.style.display = enabledCount === 0 ? 'none' : 'flex';
        }
        // Update filter indicator
        const filterIndicator = button.querySelector('.filter-indicator');
        if (filterIndicator) {
            if (this.isPartiallyFiltered(categoryKey)) {
                filterIndicator.classList.add('visible');
            }
            else {
                filterIndicator.classList.remove('visible');
            }
        }
    }
    updateSubcategoryButton(categoryKey, subKey) {
        const button = this.querySelector(`[data-category="${categoryKey}"][data-subcategory="${subKey}"]`);
        if (!button)
            return;
        const categoryState = this.categoryStates.get(categoryKey);
        const isEnabled = categoryState?.subcategories.get(subKey) || false;
        if (isEnabled) {
            button.classList.add('active');
        }
        else {
            button.classList.remove('active');
        }
        // Update count badge
        const countBadge = button.querySelector('.overlay-count');
        if (countBadge) {
            const enabledCount = this.getEnabledSubcategoryOverlayCount(categoryKey, subKey);
            countBadge.textContent = enabledCount.toString();
            countBadge.style.display = enabledCount === 0 ? 'none' : 'block';
        }
    }
    isPartiallyFiltered(categoryKey) {
        const categoryState = this.categoryStates.get(categoryKey);
        if (!categoryState || !categoryState.subcategories.size)
            return false;
        const subcategoryStates = Array.from(categoryState.subcategories.values());
        const enabledCount = subcategoryStates.filter(state => state).length;
        return enabledCount > 0 && enabledCount < subcategoryStates.length;
    }
    getEnabledOverlayCount(categoryKey) {
        if (!this.overlaysData || !this.overlaysData[categoryKey])
            return 0;
        const categoryState = this.categoryStates.get(categoryKey);
        if (!categoryState)
            return 0;
        let count = 0;
        const overlays = this.overlaysData[categoryKey];
        for (const overlay of overlays) {
            const subcategory = overlay.subcategory || 'default';
            const isSubcategoryEnabled = categoryState.subcategories.get(subcategory);
            if (isSubcategoryEnabled) {
                count++;
            }
        }
        return count;
    }
    getEnabledSubcategoryOverlayCount(categoryKey, subKey) {
        if (!this.overlaysData || !this.overlaysData[categoryKey])
            return 0;
        const categoryState = this.categoryStates.get(categoryKey);
        if (!categoryState || !categoryState.subcategories.get(subKey))
            return 0;
        const overlays = this.overlaysData[categoryKey];
        return overlays.filter((overlay) => {
            const subcategory = overlay.subcategory || 'default';
            return subcategory === subKey;
        }).length;
    }
    dispatchOverlayChangeEvent() {
        const event = new CustomEvent('overlayToggleChange', {
            detail: {
                categoryStates: this.categoryStates,
                enabledOverlays: this.getEnabledOverlays()
            }
        });
        this.dispatchEvent(event);
    }
    getEnabledOverlays() {
        const enabledOverlays = [];
        for (const [categoryKey, categoryData] of Object.entries(this.overlaysData || {})) {
            const categoryState = this.categoryStates.get(categoryKey);
            if (!categoryState)
                continue;
            for (const overlay of categoryData) {
                const subcategory = overlay.subcategory || 'default';
                const isSubcategoryEnabled = categoryState.subcategories.get(subcategory);
                if (isSubcategoryEnabled) {
                    enabledOverlays.push({
                        ...overlay,
                        category: categoryKey,
                        subcategory: subcategory
                    });
                }
            }
        }
        return enabledOverlays;
    }
    // Public methods for external control
    getCategoryStates() {
        return this.categoryStates;
    }
    getEnabledOverlaysList() {
        return this.getEnabledOverlays();
    }
    setCategoryState(categoryKey, enabled) {
        const categoryState = this.categoryStates.get(categoryKey);
        if (!categoryState)
            return;
        categoryState.enabled = enabled;
        for (const [subKey, _] of categoryState.subcategories) {
            categoryState.subcategories.set(subKey, enabled);
        }
        this.updateCategoryButton(categoryKey);
        this.dispatchOverlayChangeEvent();
    }
    setSubcategoryState(categoryKey, subKey, enabled) {
        const categoryState = this.categoryStates.get(categoryKey);
        if (!categoryState)
            return;
        categoryState.subcategories.set(subKey, enabled);
        // Update main category state
        const anySubcategoryEnabled = Array.from(categoryState.subcategories.values()).some(state => state);
        categoryState.enabled = anySubcategoryEnabled;
        this.updateCategoryButton(categoryKey);
        this.dispatchOverlayChangeEvent();
    }
}
// Register the custom element
customElements.define('map-overlay-toggle-new', MapOverlayToggleNew);
