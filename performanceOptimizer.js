// Performance Optimizer Module
// Utilities for improving app performance

const PerformanceOptimizer = {
    searchDebounceTimer: null,
    lastRenderHash: null,
    virtualScroll: {
        itemHeight: 150, // Approximate height of feed item
        buffer: 10, // Extra items to render above/below viewport
        currentStart: 0,
        currentEnd: 50
    },

    /**
     * Debounced search - wait for user to stop typing before filtering
     */
    debounceSearch: function(delay = 300) {
        // Clear existing timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        // Set new timer
        this.searchDebounceTimer = setTimeout(() => {
            console.log('🔍 Applying debounced search...');
            App.applyFilters();
        }, delay);
    },

    /**
     * Setup debounced search on search input
     */
    setupDebouncedSearch: function() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        // Remove any existing event listener
        const newInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newInput, searchInput);

        // Add debounced input listener
        newInput.addEventListener('input', () => {
            this.debounceSearch(300);
        });

        console.log('✅ Debounced search enabled');
    },

    /**
     * Check if render is necessary (avoid re-rendering same data)
     */
    shouldRender: function(events) {
        // Create hash of current events
        const hash = events.length + '_' + (events[0]?.event_id || '') + '_' + (events[events.length - 1]?.event_id || '');

        if (hash === this.lastRenderHash) {
            console.log('⏭️ Skipping render - no changes detected');
            return false;
        }

        this.lastRenderHash = hash;
        return true;
    },

    /**
     * Initialize virtual scrolling for feed
     */
    initVirtualScroll: function() {
        const feedList = document.getElementById('feedList');
        if (!feedList) return;

        // Add scroll listener
        feedList.addEventListener('scroll', () => {
            this.updateVirtualScroll();
        });

        console.log('✅ Virtual scrolling enabled for feed');
    },

    /**
     * Update virtual scroll window based on scroll position
     */
    updateVirtualScroll: function() {
        const feedList = document.getElementById('feedList');
        if (!feedList) return;

        const scrollTop = feedList.scrollTop;
        const viewportHeight = feedList.clientHeight;

        // Calculate which items should be visible
        const startIndex = Math.max(0, Math.floor(scrollTop / this.virtualScroll.itemHeight) - this.virtualScroll.buffer);
        const endIndex = Math.min(
            App.state.filteredEvents.length,
            Math.ceil((scrollTop + viewportHeight) / this.virtualScroll.itemHeight) + this.virtualScroll.buffer
        );

        // Only update if range changed significantly
        if (Math.abs(startIndex - this.virtualScroll.currentStart) > 5 ||
            Math.abs(endIndex - this.virtualScroll.currentEnd) > 5) {
            this.virtualScroll.currentStart = startIndex;
            this.virtualScroll.currentEnd = endIndex;

            // Re-render feed with new range
            this.renderVirtualFeed();
        }
    },

    /**
     * Render only visible portion of feed
     */
    renderVirtualFeed: function() {
        const events = App.state.filteredEvents;
        const start = this.virtualScroll.currentStart;
        const end = this.virtualScroll.currentEnd;

        // Get visible events
        const visibleEvents = events.slice(start, end);

        // Calculate spacer heights
        const topSpacer = start * this.virtualScroll.itemHeight;
        const bottomSpacer = (events.length - end) * this.virtualScroll.itemHeight;

        // Build HTML with spacers
        let html = `<div style="height: ${topSpacer}px;"></div>`;

        visibleEvents.forEach((event, idx) => {
            const globalIndex = start + idx;
            const isViewed = App.state.viewedEvents.has(event.event_id);
            const isFavorite = App.state.favorites.has(event.event_id);
            const isActive = App.state.selectedEventId === event.event_id;

            html += UIManager.createFeedItemHTML(event, globalIndex, isViewed, isFavorite, isActive);
        });

        html += `<div style="height: ${bottomSpacer}px;"></div>`;

        // Update feed list
        const feedList = document.getElementById('feedList');
        if (feedList) {
            feedList.innerHTML = html;
        }

        console.log(`📊 Virtual render: ${start}-${end} of ${events.length} events`);
    },

    /**
     * Progressive marker loading - load markers in chunks
     */
    progressiveMarkerLoad: function(events, onMarkerClick, state, chunkSize = 500) {
        console.log(`🔄 Starting progressive marker loading for ${events.length} events...`);

        // Clear existing markers
        MapManager.clearMarkers();

        // Process in chunks
        let currentChunk = 0;
        const totalChunks = Math.ceil(events.length / chunkSize);

        const loadChunk = () => {
            const start = currentChunk * chunkSize;
            const end = Math.min((currentChunk + 1) * chunkSize, events.length);
            const chunk = events.slice(start, end);

            console.log(`  Loading chunk ${currentChunk + 1}/${totalChunks} (${chunk.length} markers)`);

            // Render this chunk
            chunk.forEach(event => {
                MapManager.addSingleMarker(event, onMarkerClick, state);
            });

            currentChunk++;

            // Continue to next chunk
            if (currentChunk < totalChunks) {
                // Use requestAnimationFrame for smooth loading
                requestAnimationFrame(loadChunk);
            } else {
                console.log('✅ Progressive marker loading complete');
                // Update marker cluster after all chunks loaded
                if (MapManager.markerCluster) {
                    MapManager.markerCluster.refreshClusters();
                }
            }
        };

        // Start loading
        loadChunk();
    },

    /**
     * Throttle function execution
     */
    throttle: function(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                return func.apply(this, args);
            }
        };
    },

    /**
     * Show loading indicator
     */
    showLoading: function(message = 'Loading...') {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.textContent = message;
            indicator.style.display = 'block';
        }
    },

    /**
     * Hide loading indicator
     */
    hideLoading: function() {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    },

    /**
     * Check if result set is large and warn user
     */
    checkLargeResultSet: function(count) {
        if (count > 1000) {
            console.warn(`⚠️ Large result set: ${count} events. Performance may be impacted.`);
            return true;
        }
        return false;
    },

    /**
     * Initialize all performance optimizations
     */
    init: function() {
        console.log('⚡ Initializing performance optimizations...');

        // Setup debounced search
        this.setupDebouncedSearch();

        // Setup virtual scrolling (optional, can be enabled later)
        // this.initVirtualScroll();

        console.log('✅ Performance optimizations ready');
    }
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Delay initialization to ensure all other modules are loaded
    setTimeout(() => {
        PerformanceOptimizer.init();
    }, 1000);
});
