import { SVGManager } from '../../utils/svg-manager.js';

export class MapOverlayToggle extends HTMLElement {
  constructor() {
    super();
    this.svgManager = new SVGManager();
    this.categoriesData = null;
    this.overlaysData = null;
    this.categoryStates = new Map(); // Track enabled/disabled state for each category and subcategory
    this.longPressTimer = null;
    this.longPressDelay = 500; // 500ms for long press
    this.currentSubcategoryPanel = null;
  }

  async connectedCallback() {
    await this.loadTemplate();
    await this.loadData();
    this.setupEventListeners();
    this.render();
  }

  async loadTemplate() {
    try {
      const response = await fetch('./lib/components/map-overlay-toggle/map-overlay-toggle.html');
      const html = await response.text();
      this.innerHTML = html;
    } catch (error) {
      console.error('Error loading template:', error);
      this.innerHTML = '<div class="map-overlay-toggle-container"><div class="category-grid"></div></div>';
    }
  }

  async loadData() {
    try {
      // Load categories data
      const categoriesResponse = await fetch('./data/map-overlays-categories.yaml');
      const categoriesYaml = await categoriesResponse.text();
      this.categoriesData = jsyaml.load(categoriesYaml);

      // Load overlays data
      const overlaysResponse = await fetch('./data/map-overlays.yaml');
      const overlaysYaml = await overlaysResponse.text();
      this.overlaysData = jsyaml.load(overlaysYaml);

      // Initialize category states
      this.initializeCategoryStates();
    } catch (error) {
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
  }

  async render() {
    const categoryGrid = this.querySelector('.category-grid');
    if (!categoryGrid || !this.categoriesData) return;

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
    if (categoryState.enabled) {
      button.classList.add('active');
    }

    // Check if partially filtered
    if (this.isPartiallyFiltered(categoryKey)) {
      button.classList.add('partially-filtered');
    }

    // Create icon
    const iconContainer = document.createElement('div');
    iconContainer.className = 'category-icon';

    try {
      const iconSvg = await this.svgManager.getSVG(`./img/solid/${categoryData.icon}.svg`);
      iconContainer.innerHTML = iconSvg;
    } catch (error) {
      console.warn(`Could not load icon for ${categoryData.icon}:`, error);
      iconContainer.innerHTML = '<div style="width: 24px; height: 24px; background: #ccc;"></div>';
    }

    // Create name
    const nameElement = document.createElement('div');
    nameElement.className = 'category-name';
    nameElement.textContent = categoryData.name;

    // Create overlay count
    const countElement = document.createElement('div');
    countElement.className = 'overlay-count';
    countElement.textContent = this.getEnabledOverlayCount(categoryKey);

    // Create filter indicator if partially filtered
    if (this.isPartiallyFiltered(categoryKey)) {
      const filterIndicator = document.createElement('div');
      filterIndicator.className = 'filter-indicator';

      try {
        const filterIconSvg = await this.svgManager.getSVG('./img/solid/filter.svg');
        filterIndicator.innerHTML = `<div class="filter-icon">${filterIconSvg}</div>`;
      } catch (error) {
        filterIndicator.innerHTML = '<div class="filter-icon">⚡</div>';
      }

      button.appendChild(filterIndicator);
    }

    button.appendChild(iconContainer);
    button.appendChild(nameElement);
    button.appendChild(countElement);

    // Add event listeners
    this.addButtonEventListeners(button, categoryKey, categoryData);

    return button;
  }

  addButtonEventListeners(button, categoryKey, categoryData) {
    let isLongPress = false;

    // Mouse events
    button.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button
        isLongPress = false;
        this.longPressTimer = setTimeout(() => {
          isLongPress = true;
          this.showSubcategoryPanel(categoryKey, categoryData, button);
        }, this.longPressDelay);
      }
    });

    button.addEventListener('mouseup', (e) => {
      if (e.button === 0) { // Left mouse button
        clearTimeout(this.longPressTimer);
        if (!isLongPress) {
          this.toggleCategory(categoryKey);
        }
      }
    });

    button.addEventListener('mouseleave', () => {
      clearTimeout(this.longPressTimer);
    });

    // Right click
    button.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showSubcategoryPanel(categoryKey, categoryData, button);
    });

    // Touch events for mobile
    button.addEventListener('touchstart', (e) => {
      isLongPress = false;
      this.longPressTimer = setTimeout(() => {
        isLongPress = true;
        this.showSubcategoryPanel(categoryKey, categoryData, button);
      }, this.longPressDelay);
    });

    button.addEventListener('touchend', (e) => {
      clearTimeout(this.longPressTimer);
      if (!isLongPress) {
        this.toggleCategory(categoryKey);
      }
    });
  }

  toggleCategory(categoryKey) {
    const categoryState = this.categoryStates.get(categoryKey);
    categoryState.enabled = !categoryState.enabled;

    // Toggle all subcategories to match the main category
    for (const [subKey] of categoryState.subcategories) {
      categoryState.subcategories.set(subKey, categoryState.enabled);
    }

    this.updateCategoryButton(categoryKey);
    this.dispatchOverlayChangeEvent();
  }

  async showSubcategoryPanel(categoryKey, categoryData, button) {
    this.hideSubcategoryPanel();

    const panel = this.querySelector('.subcategory-panel');
    const title = panel.querySelector('.subcategory-title');
    const grid = panel.querySelector('.subcategory-grid');
    const closeBtn = panel.querySelector('.close-subcategory-btn');

    title.textContent = categoryData.name;
    grid.innerHTML = '';

    // Create subcategory buttons
    if (categoryData.subcategories) {
      for (const [subKey, subData] of Object.entries(categoryData.subcategories)) {
        const subButton = await this.createSubcategoryButton(categoryKey, subKey, subData);
        grid.appendChild(subButton);
      }
    }

    // Position panel next to the button
    const buttonRect = button.getBoundingClientRect();
    const containerRect = this.getBoundingClientRect();

    panel.style.display = 'block';
    panel.style.top = `${buttonRect.top - containerRect.top}px`;

    // Close button event
    closeBtn.onclick = () => this.hideSubcategoryPanel();

    this.currentSubcategoryPanel = categoryKey;
  }

  async createSubcategoryButton(categoryKey, subKey, subData) {
    const button = document.createElement('div');
    button.className = 'subcategory-button';
    button.dataset.category = categoryKey;
    button.dataset.subcategory = subKey;

    const categoryState = this.categoryStates.get(categoryKey);
    if (categoryState.subcategories.get(subKey)) {
      button.classList.add('active');
    }

    // Create icon
    const iconContainer = document.createElement('div');
    iconContainer.className = 'subcategory-icon';

    const iconName = subData.icon || this.categoriesData[categoryKey].icon;
    try {
      const iconSvg = await this.svgManager.getSVG(`./img/solid/${iconName}.svg`);
      iconContainer.innerHTML = iconSvg;
    } catch (error) {
      console.warn(`Could not load icon for ${iconName}:`, error);
      iconContainer.innerHTML = '<div style="width: 18px; height: 18px; background: #ccc;"></div>';
    }

    // Create name
    const nameElement = document.createElement('div');
    nameElement.className = 'subcategory-name';
    nameElement.textContent = subData.name;

    // Create overlay count
    const countElement = document.createElement('div');
    countElement.className = 'overlay-count';
    countElement.textContent = this.getEnabledSubcategoryOverlayCount(categoryKey, subKey);

    button.appendChild(iconContainer);
    button.appendChild(nameElement);
    button.appendChild(countElement);

    // Add click event
    button.addEventListener('click', () => {
      this.toggleSubcategory(categoryKey, subKey);
    });

    return button;
  }

  toggleSubcategory(categoryKey, subKey) {
    const categoryState = this.categoryStates.get(categoryKey);
    const currentState = categoryState.subcategories.get(subKey);
    categoryState.subcategories.set(subKey, !currentState);

    // Update main category state based on subcategories
    const enabledSubcategories = Array.from(categoryState.subcategories.values()).filter(Boolean);
    const totalSubcategories = categoryState.subcategories.size;

    if (enabledSubcategories.length === 0) {
      categoryState.enabled = false;
    } else if (enabledSubcategories.length === totalSubcategories) {
      categoryState.enabled = true;
    } else {
      categoryState.enabled = true; // Partially enabled
    }

    this.updateCategoryButton(categoryKey);
    this.updateSubcategoryButton(categoryKey, subKey);
    this.dispatchOverlayChangeEvent();
  }

  hideSubcategoryPanel() {
    const panel = this.querySelector('.subcategory-panel');
    panel.style.display = 'none';
    this.currentSubcategoryPanel = null;
  }

  updateCategoryButton(categoryKey) {
    const button = this.querySelector(`[data-category="${categoryKey}"]`);
    if (!button) return;

    const categoryState = this.categoryStates.get(categoryKey);

    button.classList.toggle('active', categoryState.enabled);
    button.classList.toggle('partially-filtered', this.isPartiallyFiltered(categoryKey));

    // Update count
    const countElement = button.querySelector('.overlay-count');
    if (countElement) {
      countElement.textContent = this.getEnabledOverlayCount(categoryKey);
    }

    // Update filter indicator
    const existingIndicator = button.querySelector('.filter-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    if (this.isPartiallyFiltered(categoryKey)) {
      this.addFilterIndicator(button);
    }
  }

  updateSubcategoryButton(categoryKey, subKey) {
    const button = this.querySelector(`[data-category="${categoryKey}"][data-subcategory="${subKey}"]`);
    if (!button) return;

    const categoryState = this.categoryStates.get(categoryKey);
    const isEnabled = categoryState.subcategories.get(subKey);

    button.classList.toggle('active', isEnabled);

    // Update count
    const countElement = button.querySelector('.overlay-count');
    if (countElement) {
      countElement.textContent = this.getEnabledSubcategoryOverlayCount(categoryKey, subKey);
    }
  }

  async addFilterIndicator(button) {
    const filterIndicator = document.createElement('div');
    filterIndicator.className = 'filter-indicator';

    try {
      const filterIconSvg = await this.svgManager.getSVG('./img/solid/filter.svg');
      filterIndicator.innerHTML = `<div class="filter-icon">${filterIconSvg}</div>`;
    } catch (error) {
      filterIndicator.innerHTML = '<div class="filter-icon">⚡</div>';
    }

    button.appendChild(filterIndicator);
  }

  isPartiallyFiltered(categoryKey) {
    const categoryState = this.categoryStates.get(categoryKey);
    if (!categoryState || categoryState.subcategories.size === 0) return false;

    const enabledSubcategories = Array.from(categoryState.subcategories.values()).filter(Boolean);
    return enabledSubcategories.length > 0 && enabledSubcategories.length < categoryState.subcategories.size;
  }

  getEnabledOverlayCount(categoryKey) {
    if (!this.overlaysData || !this.overlaysData[categoryKey]) return 0;

    const categoryState = this.categoryStates.get(categoryKey);
    if (!categoryState.enabled) return 0;

    // If no subcategories or all enabled, return total count
    if (categoryState.subcategories.size === 0) {
      return this.overlaysData[categoryKey].length;
    }

    // Count overlays in enabled subcategories
    let count = 0;
    for (const overlay of this.overlaysData[categoryKey]) {
      const subcategory = overlay.subcategory || overlay.category;
      if (categoryState.subcategories.get(subcategory)) {
        count++;
      }
    }
    return count;
  }

  getEnabledSubcategoryOverlayCount(categoryKey, subKey) {
    if (!this.overlaysData || !this.overlaysData[categoryKey]) return 0;

    const categoryState = this.categoryStates.get(categoryKey);
    if (!categoryState.subcategories.get(subKey)) return 0;

    return this.overlaysData[categoryKey].filter(overlay => {
      const subcategory = overlay.subcategory || overlay.category;
      return subcategory === subKey;
    }).length;
  }

  dispatchOverlayChangeEvent() {
    const event = new CustomEvent('overlay-toggle-change', {
      detail: {
        categoryStates: this.categoryStates
      },
      bubbles: true
    });
    this.dispatchEvent(event);
  }

  // Public API methods
  getCategoryStates() {
    return this.categoryStates;
  }

  setCategoryState(categoryKey, enabled) {
    const categoryState = this.categoryStates.get(categoryKey);
    if (categoryState) {
      categoryState.enabled = enabled;
      for (const [subKey] of categoryState.subcategories) {
        categoryState.subcategories.set(subKey, enabled);
      }
      this.updateCategoryButton(categoryKey);
    }
  }

  setSubcategoryState(categoryKey, subKey, enabled) {
    const categoryState = this.categoryStates.get(categoryKey);
    if (categoryState && categoryState.subcategories.has(subKey)) {
      categoryState.subcategories.set(subKey, enabled);
      this.updateCategoryButton(categoryKey);
      this.updateSubcategoryButton(categoryKey, subKey);
    }
  }
}

// Register the custom element
customElements.define('map-overlay-toggle', MapOverlayToggle);
