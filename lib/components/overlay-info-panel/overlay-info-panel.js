export class OverlayInfoPanel {
    constructor(svgManager) {
        this.isVisible = false;
        this.selectedOverlay = null;
        this.isMobile = false;
        this.isExpanded = false;
        this.startY = 0;
        this.currentY = 0;
        this.startX = 0;
        this.currentX = 0;
        this.isDragging = false;
        this.isTabSwiping = false;
        this.container = this.createPanelElement();
        this.setupEventListeners();
        this.checkMobileView();
        document.body.appendChild(this.container);
        this.svgManager = svgManager;
    }
    createPanelElement() {
        const panel = document.createElement('div');
        panel.className = 'overlay-info-panel';
        panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-handle"></div>
        <button class="panel-close-btn" aria-label="Close panel">×</button>
      </div>
      <div class="panel-content">
        <div class="panel-scroll-container">
          <!-- Content will be dynamically populated -->
        </div>
      </div>
    `;
        return panel;
    }
    setupEventListeners() {
        // Close button
        const closeBtn = this.container.querySelector('.panel-close-btn');
        closeBtn?.addEventListener('click', () => this.hide());
        // Mobile swipe handling
        const handle = this.container.querySelector('.panel-handle');
        const content = this.container.querySelector('.panel-content');
        // Touch events for mobile swipe
        [handle, content].forEach(element => {
            element?.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            element?.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            element?.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        });
        // Mouse events for desktop drag (optional)
        [handle, content].forEach(element => {
            element?.addEventListener('mousedown', this.handleMouseDown.bind(this));
            element?.addEventListener('mousemove', this.handleMouseMove.bind(this));
            element?.addEventListener('mouseup', this.handleMouseUp.bind(this));
        });
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        // Resize events
        window.addEventListener('resize', this.checkMobileView.bind(this));
    }
    handleTouchStart(e) {
        if (!this.isMobile)
            return;
        this.isDragging = true;
        this.startY = e.touches[0].clientY;
        this.currentY = this.startY;
        this.startX = e.touches[0].clientX;
        this.currentX = this.startX;
        // Check if touch started within a tab content area
        const target = e.target;
        const tabContent = target.closest('.tab-content');
        this.isTabSwiping = tabContent !== null;
    }
    handleTouchMove(e) {
        if (!this.isMobile || !this.isDragging)
            return;
        this.currentY = e.touches[0].clientY;
        this.currentX = e.touches[0].clientX;
        const deltaY = this.currentY - this.startY;
        const deltaX = this.currentX - this.startX;
        // Get the scroll container to check scroll position
        const scrollContainer = this.container.querySelector('.panel-scroll-container');
        const isAtTop = scrollContainer ? scrollContainer.scrollTop === 0 : true;
        // If we're in tab swiping mode and horizontal movement is greater than vertical
        if (this.isTabSwiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            e.preventDefault();
            // Don't perform vertical panel movement when horizontally swiping tabs
            return;
        }
        // Check if we should handle panel shrinking when expanded and at top of scroll
        const shouldHandlePanelMovement = !this.isTabSwiping ||
            (this.isExpanded && isAtTop && deltaY > 0) ||
            Math.abs(deltaY) > Math.abs(deltaX);
        // Only prevent default for vertical movements to allow horizontal tab swiping
        // But allow scrolling when panel is expanded and not at top
        if (shouldHandlePanelMovement) {
            e.preventDefault();
        }
        // Handle vertical panel movement
        if (shouldHandlePanelMovement) {
            if (deltaY > 0) { // Swiping down
                // If expanded and at top, allow panel shrinking
                if (this.isExpanded && isAtTop) {
                    const maxTranslate = window.innerHeight * 0.4;
                    const translateY = Math.min(deltaY, maxTranslate);
                    this.container.style.transform = `translateY(${translateY}px)`;
                }
                else if (!this.isExpanded) {
                    // Normal panel hiding behavior when not expanded
                    const maxTranslate = window.innerHeight * 0.6;
                    const translateY = Math.min(deltaY, maxTranslate);
                    this.container.style.transform = `translateY(${translateY}px)`;
                }
            }
            else if (deltaY < 0 && !this.isExpanded) { // Swiping up when not expanded
                const translateY = Math.max(deltaY, -window.innerHeight * 0.4);
                this.container.style.transform = `translateY(${translateY}px)`;
            }
        }
    }
    handleTouchEnd(e) {
        if (!this.isMobile || !this.isDragging)
            return;
        this.isDragging = false;
        const deltaY = this.currentY - this.startY;
        const deltaX = this.currentX - this.startX;
        const threshold = 50; // Minimum swipe distance
        // Get the scroll container to check scroll position
        const scrollContainer = this.container.querySelector('.panel-scroll-container');
        const isAtTop = scrollContainer ? scrollContainer.scrollTop === 0 : true;
        // Handle horizontal tab swiping
        if (this.isTabSwiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
            if (deltaX > 0) {
                // Swiped right - go to previous tab
                this.switchToPreviousTab();
            }
            else {
                // Swiped left - go to next tab
                this.switchToNextTab();
            }
            this.isTabSwiping = false;
            return;
        }
        // Handle vertical panel movement
        if (deltaY > threshold) {
            // Swiped down - handle based on panel state and scroll position
            if (this.isExpanded && isAtTop) {
                // If expanded and at top of scroll, collapse to partial
                this.collapseToPartial();
            }
            else if (this.isExpanded && !isAtTop) {
                // If expanded but not at top, don't collapse (let normal scrolling happen)
                this.container.style.transform = '';
            }
            else if (!this.isExpanded) {
                // If not expanded, hide the panel
                this.hide();
            }
        }
        else if (deltaY < -threshold && !this.isExpanded) {
            // Swiped up - expand
            this.expandToFull();
        }
        else {
            // Reset position
            this.container.style.transform = '';
        }
        this.isTabSwiping = false;
    }
    handleMouseDown(e) {
        // Similar to touch start but for desktop
        if (this.isMobile)
            return;
        // Desktop drag functionality can be added here if needed
    }
    handleMouseMove(e) {
        // Desktop drag move
    }
    handleMouseUp(e) {
        // Desktop drag end
    }
    handleKeyDown(e) {
        if (e.key === 'Escape' && this.isVisible) {
            this.hide();
        }
    }
    checkMobileView() {
        const wasMobile = this.isMobile;
        const hadEnoughVerticalSpace = this.hasEnoughVerticalSpace();
        this.isMobile = window.innerWidth <= 768;
        this.container.classList.toggle('mobile', this.isMobile);
        this.container.classList.toggle('desktop', !this.isMobile);
        // If the layout conditions changed and we have a selected overlay, repopulate content
        const hasEnoughVerticalSpaceNow = this.hasEnoughVerticalSpace();
        if (this.selectedOverlay && (wasMobile !== this.isMobile || hadEnoughVerticalSpace !== hasEnoughVerticalSpaceNow)) {
            this.populateContent(this.selectedOverlay);
        }
    }
    hasEnoughVerticalSpace() {
        // Check if we're on desktop and have enough vertical space
        // Consider sufficient space as having at least 600px of height
        return !this.isMobile && window.innerHeight >= 600;
    }
    expandToFull() {
        if (!this.isMobile)
            return;
        this.isExpanded = true;
        this.container.classList.add('expanded');
        this.container.style.transform = '';
    }
    collapseToPartial() {
        if (!this.isMobile)
            return;
        this.isExpanded = false;
        this.container.classList.remove('expanded');
        this.container.style.transform = '';
    }
    show(overlay) {
        this.selectedOverlay = overlay;
        this.isVisible = true;
        this.isExpanded = false;
        this.populateContent(overlay);
        this.container.classList.add('visible');
        if (this.isMobile) {
            this.container.classList.remove('expanded');
        }
    }
    hide() {
        this.isVisible = false;
        this.isExpanded = false;
        this.selectedOverlay = null;
        this.container.classList.remove('visible', 'expanded');
        this.container.style.transform = '';
        // Dispatch close event
        this.container.dispatchEvent(new CustomEvent('panel-closed'));
    }
    populateContent(overlay) {
        const summary = overlay.getSummary();
        const additionalData = overlay.getAdditionalData();
        const scrollContainer = this.container.querySelector('.panel-scroll-container');
        if (!scrollContainer)
            return;
        let content = this.generateBasicInfo(summary, additionalData);
        // Create main tabs (Overview and Hours)
        content += this.generateMainTabs(summary, additionalData);
        scrollContainer.innerHTML = content;
        // Setup tab functionality
        this.setupTabFunctionality();
    }
    generateBasicInfo(summary, additionalData) {
        const openStatus = summary.isOpen ? 'Open' : 'Closed';
        const openClass = summary.isOpen ? 'open' : 'closed';
        // Start with default pin icon, will be replaced when actual icon loads
        const defaultIconHtml = `<div class="overlay-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`;
        const basicInfoHtml = `
      <div class="basic-info">
        <div class="header-section">
          ${defaultIconHtml}
          <div class="title-section">
            <h2 class="overlay-title">${summary.name || 'Unknown'}</h2>
            <div class="overlay-meta">
              <span class="category">${summary.category || ''}</span>
              ${summary.subCategory ? `<span class="subcategory">${summary.subCategory}</span>` : ''}
              <span class="status ${openClass}">${openStatus}</span>
            </div>
          </div>
        </div>

        ${summary.description ? `<p class="description">${summary.description}</p>` : ''}
      </div>
    `;
        // Load the actual icon asynchronously
        this.loadOverlayIcon(summary);
        return basicInfoHtml;
    }
    generateMainTabs(summary, additionalData) {
        const showSeparateHoursTab = !this.hasEnoughVerticalSpace();
        let tabsHtml = '<div class="main-tabs-section"><div class="tab-container">';
        // Tab headers
        tabsHtml += '<div class="tab-headers">';
        tabsHtml += '<button class="tab-header active" data-tab="overview">Overview</button>';
        // Only show Hours tab if we don't have enough vertical space on desktop
        if (showSeparateHoursTab) {
            tabsHtml += '<button class="tab-header" data-tab="hours">Hours</button>';
        }
        // Add more-info tabs if available
        if (additionalData.moreInfo && Array.isArray(additionalData.moreInfo)) {
            const moreInfoTabs = this.organizeMoreInfoBySource(additionalData.moreInfo);
            Object.keys(moreInfoTabs).forEach((source) => {
                const tabLabel = this.getTabLabel(source);
                tabsHtml += `<button class="tab-header" data-tab="${source}">${tabLabel}</button>`;
            });
        }
        tabsHtml += '</div>';
        // Tab content
        tabsHtml += '<div class="tab-contents">';
        // Overview tab
        tabsHtml += '<div class="tab-content active" data-tab="overview">';
        tabsHtml += this.generateOverviewContent(summary, additionalData);
        tabsHtml += '</div>';
        // Hours tab - only show if we don't have enough vertical space
        if (showSeparateHoursTab) {
            tabsHtml += '<div class="tab-content" data-tab="hours">';
            tabsHtml += this.generateOperatingTimes(additionalData.operatingTimes);
            tabsHtml += '</div>';
        }
        // More-info tabs
        if (additionalData.moreInfo && Array.isArray(additionalData.moreInfo)) {
            const moreInfoTabs = this.organizeMoreInfoBySource(additionalData.moreInfo);
            Object.entries(moreInfoTabs).forEach(([source, items]) => {
                tabsHtml += `<div class="tab-content" data-tab="${source}">`;
                tabsHtml += this.generateTabContent(source, items);
                tabsHtml += '</div>';
            });
        }
        tabsHtml += '</div>';
        tabsHtml += '</div></div>';
        return tabsHtml;
    }
    generateOverviewContent(summary, additionalData) {
        const includeOperatingHours = this.hasEnoughVerticalSpace();
        return `
      <div class="overview-content">
        ${additionalData.details ? `<div class="details-section"><p class="details">${additionalData.details}</p></div>` : ''}

        <div class="contact-info">
          <h3>Contact Information</h3>
          ${summary.address ? `<div class="info-item"><strong>Address:</strong> ${summary.address}</div>` : ''}
          ${summary.phone ? `<div class="info-item"><strong>Phone:</strong> <a href="tel:${summary.phone}">${summary.phone}</a></div>` : ''}
          ${summary.website ? `<div class="info-item"><strong>Website:</strong> <a href="${summary.website}" target="_blank" rel="noopener">${summary.website}</a></div>` : ''}
          ${summary.pricing ? `<div class="info-item"><strong>Pricing:</strong> ${summary.pricing}</div>` : ''}
        </div>

        ${includeOperatingHours ? this.generateOperatingTimes(additionalData.operatingTimes) : ''}
      </div>
    `;
    }
    generateOperatingTimes(operatingTimes) {
        if (!operatingTimes)
            return '';
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        let timesHtml = '<div class="operating-times"><h3>Operating Hours</h3><div class="times-grid">';
        days.forEach((day, index) => {
            const dayData = operatingTimes[day];
            let timeText = 'Closed';
            if (dayData && dayData['open-this-day']) {
                if (dayData.is24hour) {
                    timeText = '24 Hours';
                }
                else if (dayData.open && dayData.close) {
                    timeText = `${dayData.open} - ${dayData.close}`;
                }
                else {
                    timeText = 'Open';
                }
            }
            timesHtml += `<div class="time-row"><span class="day">${dayLabels[index]}</span><span class="time">${timeText}</span></div>`;
        });
        timesHtml += '</div></div>';
        return timesHtml;
    }
    organizeMoreInfoBySource(moreInfo) {
        const tabs = {};
        moreInfo.forEach(item => {
            const source = item.source || 'general';
            if (!tabs[source]) {
                tabs[source] = [];
            }
            tabs[source].push(item);
        });
        return tabs;
    }
    getTabLabel(source) {
        const labelMap = {
            'place-features': 'Features',
            'movies': 'Movies',
            'theaters-movies': 'Movies',
            'events': 'Events',
            'general': 'Information'
        };
        return labelMap[source] || source.charAt(0).toUpperCase() + source.slice(1);
    }
    generateTabContent(source, items) {
        if (source === 'movies' || source === 'theaters-movies') {
            return this.generateMoviesContent(items);
        }
        let content = '';
        items.forEach(item => {
            if (item.type === 'item-list') {
                content += this.generateItemList(item);
            }
        });
        return content;
    }
    generateMoviesContent(items) {
        let content = '<div class="movies-content">';
        items.forEach(item => {
            // Handle resolved movie items from theaters-movies.yaml
            if (item.resolvedItems && Array.isArray(item.resolvedItems)) {
                // Create a map of original items by ID for showings lookup
                const showingsMap = new Map();
                if (item.items && Array.isArray(item.items)) {
                    item.items.forEach((originalItem) => {
                        // Handle UUID-based structure where the UUID is the key and showings is nested
                        if (typeof originalItem === 'object') {
                            Object.keys(originalItem).forEach(key => {
                                // Check if this key looks like a UUID
                                if (key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                                    const movieData = originalItem[key];
                                    if (movieData && movieData.showings) {
                                        showingsMap.set(key, movieData.showings);
                                    }
                                }
                            });
                        }
                        // Fallback for old structure
                        else if (originalItem.id && originalItem.showings) {
                            showingsMap.set(originalItem.id, originalItem.showings);
                        }
                    });
                }
                item.resolvedItems.forEach((movie) => {
                    // Get showings for this movie from the original overlay data
                    const showings = showingsMap.get(movie.id) || [];
                    // Convert showings to showtimes format
                    const showtimes = showings.map((showing) => ({
                        day: showing.day,
                        times: showing.times || []
                    }));
                    content += `
            <div class="movie-item">
              <h4 class="movie-title">${movie.title || 'Unknown Movie'}</h4>
              ${movie.overview ? `<p class="movie-description">${movie.overview}</p>` : ''}
              ${movie.genre ? `<div class="movie-genre">Genre: ${movie.genre}</div>` : ''}
              ${movie.rating ? `<div class="movie-rating">Rating: ${movie.rating}</div>` : ''}
              ${movie.runtime ? `<div class="movie-duration">Runtime: ${movie.runtime}</div>` : ''}
              ${movie.director ? `<div class="movie-director">Director: ${movie.director}</div>` : ''}
              ${this.generateShowTimes(showtimes)}
            </div>
          `;
                });
            }
            // Fallback to original format for backward compatibility
            else if (item.movies && Array.isArray(item.movies)) {
                item.movies.forEach((movie) => {
                    content += `
            <div class="movie-item">
              <h4 class="movie-title">${movie.title || 'Unknown Movie'}</h4>
              ${movie.description ? `<p class="movie-description">${movie.description}</p>` : ''}
              ${movie.rating ? `<div class="movie-rating">Rating: ${movie.rating}</div>` : ''}
              ${movie.duration ? `<div class="movie-duration">Duration: ${movie.duration}</div>` : ''}
              ${this.generateShowTimes(movie.showtimes)}
            </div>
          `;
                });
            }
        });
        content += '</div>';
        return content;
    }
    generateShowTimes(showtimes) {
        if (!showtimes || !Array.isArray(showtimes))
            return '';
        let content = '<div class="showtimes"><h5>Show Times</h5>';
        showtimes.forEach(showtime => {
            const dayLabel = this.getDayLabel(showtime.day);
            content += `
        <div class="showtime-day">
          <strong>${dayLabel}</strong>
          <div class="times">
            ${showtime.times ? showtime.times.map((time) => {
                const isPastTime = this.isShowtimePast(showtime.day, time);
                const timeClass = isPastTime ? 'time-slot past-time' : 'time-slot';
                return `<span class="${timeClass}">${time}</span>`;
            }).join('') : ''}
          </div>
        </div>
      `;
        });
        content += '</div>';
        return content;
    }
    getDayLabel(day) {
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + day);
        if (day === 0)
            return 'Today';
        if (day === 1)
            return 'Tomorrow';
        return targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    isShowtimePast(day, timeString) {
        // Only check for past times on day 0 (today)
        if (day !== 0)
            return false;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // Parse the time string (e.g., "2:30 PM", "10:00 AM")
        const timeParts = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!timeParts)
            return false;
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        const ampm = timeParts[3].toUpperCase();
        // Convert to 24-hour format
        if (ampm === 'PM' && hours !== 12) {
            hours += 12;
        }
        else if (ampm === 'AM' && hours === 12) {
            hours = 0;
        }
        // Create the showtime date
        const showtimeDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
        // Return true if the showtime is in the past
        return now > showtimeDate;
    }
    generateItemList(item) {
        if (!item.items || !Array.isArray(item.items))
            return '';
        const lookup = item.lookup || 'items';
        const lookupLabel = lookup.charAt(0).toUpperCase() + lookup.slice(1);
        let content = `<div class="item-list"><h4>${lookupLabel}</h4><ul>`;
        item.items.forEach((listItem) => {
            content += `<li>${listItem}</li>`;
        });
        content += '</ul></div>';
        return content;
    }
    setupTabFunctionality() {
        const tabHeaders = this.container.querySelectorAll('.tab-header');
        const tabContents = this.container.querySelectorAll('.tab-content');
        tabHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const tabId = header.getAttribute('data-tab');
                // Remove active class from all headers and contents
                tabHeaders.forEach(h => h.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                // Add active class to clicked header and corresponding content
                header.classList.add('active');
                const targetContent = this.container.querySelector(`.tab-content[data-tab="${tabId}"]`);
                targetContent?.classList.add('active');
            });
        });
    }
    switchToNextTab() {
        const tabHeaders = this.container.querySelectorAll('.tab-header');
        const currentActiveHeader = this.container.querySelector('.tab-header.active');
        if (!currentActiveHeader || tabHeaders.length <= 1)
            return;
        // Find current tab index
        let currentIndex = -1;
        tabHeaders.forEach((header, index) => {
            if (header === currentActiveHeader) {
                currentIndex = index;
            }
        });
        // Calculate next tab index (wrap around to first tab if at the end)
        const nextIndex = (currentIndex + 1) % tabHeaders.length;
        const nextHeader = tabHeaders[nextIndex];
        // Trigger click on next tab
        nextHeader.click();
    }
    switchToPreviousTab() {
        const tabHeaders = this.container.querySelectorAll('.tab-header');
        const currentActiveHeader = this.container.querySelector('.tab-header.active');
        if (!currentActiveHeader || tabHeaders.length <= 1)
            return;
        // Find current tab index
        let currentIndex = -1;
        tabHeaders.forEach((header, index) => {
            if (header === currentActiveHeader) {
                currentIndex = index;
            }
        });
        // Calculate previous tab index (wrap around to last tab if at the beginning)
        const prevIndex = currentIndex === 0 ? tabHeaders.length - 1 : currentIndex - 1;
        const prevHeader = tabHeaders[prevIndex];
        // Trigger click on previous tab
        prevHeader.click();
    }
    /**
     * Load the overlay icon asynchronously and replace the default icon
     * @param summary The overlay summary containing iconSrc and color
     */
    async loadOverlayIcon(summary) {
        if (!summary.iconSrc || !this.container) {
            return;
        }
        try {
            // Get the colored SVG from the svgManager
            const coloredSvg = await this.svgManager.getColoredSVG(summary.iconSrc, summary.color || '#000000');
            // Find the overlay icon element in the current panel
            const iconElement = this.container.querySelector('.overlay-icon');
            if (iconElement) {
                // Replace the default icon with the loaded SVG
                // Ensure the SVG maintains proper sizing
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(coloredSvg, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;
                // Set consistent sizing attributes
                svgElement.setAttribute('width', '24');
                svgElement.setAttribute('height', '24');
                svgElement.style.maxWidth = '24px';
                svgElement.style.maxHeight = '24px';
                // Replace the content
                iconElement.innerHTML = svgElement.outerHTML;
            }
        }
        catch (error) {
            console.warn('Failed to load overlay icon:', error);
            // Keep the default pin icon if loading fails
        }
    }
    getCategoryIcon(category) {
        // Return appropriate icon based on category
        // This could be enhanced to use actual icon files
        const iconMap = {
            'hotels': '🏨',
            'dining': '🍽️',
            'attractions': '⭐',
            'shopping': '🛍️',
            'transportation': '🚗',
            'services': '⚙️',
            'entertainment': '🎬'
        };
        return iconMap[category.toLowerCase()] || '📍';
    }
    destroy() {
        this.container.remove();
    }
}
