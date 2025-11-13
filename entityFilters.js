// Entity Filters UI and Logic Module
const EntityFilters = {
    selectedSystems: new Set(),
    selectedUnits: new Set(),

    // Initialize the filter UI
    init(events) {
        this.buildSystemsFilter(events);
        this.buildUnitsFilter(events);
        this.setupSearchHandlers();
    },

    // Build Systems filter UI with tags
    buildSystemsFilter(events) {
        const container = document.getElementById('systemsTagsContainer');
        if (!container) return;

        const { systemCounts } = EntityManager.getCounts(events);
        const systemKeys = Object.keys(EntityManager.SYSTEMS).sort();

        container.innerHTML = '';

        let visibleCount = 0;
        systemKeys.forEach(key => {
            const count = systemCounts[key] || 0;

            // Skip entities with 0 events
            if (count === 0) return;

            visibleCount++;
            const tag = document.createElement('button');
            tag.className = 'filter-tag';
            tag.setAttribute('data-system', key);

            const icon = EntityManager.systemIcons[key] || '⚔️';
            tag.innerHTML = `${icon} ${key} <span class="count">${count}</span>`;

            tag.onclick = () => {
                if (this.selectedSystems.has(key)) {
                    this.selectedSystems.delete(key);
                    tag.classList.remove('active');
                } else {
                    this.selectedSystems.add(key);
                    tag.classList.add('active');
                }
            };

            // If already selected, mark as active
            if (this.selectedSystems.has(key)) {
                tag.classList.add('active');
            }

            container.appendChild(tag);
        });

        console.log('✅ Systems filter UI built with', visibleCount, 'systems (with events)');
    },

    // Build Units filter UI with tags
    buildUnitsFilter(events) {
        const container = document.getElementById('unitsTagsContainer');
        if (!container) return;

        const { unitCounts } = EntityManager.getCounts(events);
        const unitKeys = Object.keys(EntityManager.UNITS).sort();

        container.innerHTML = '';

        let visibleCount = 0;
        unitKeys.forEach(key => {
            const count = unitCounts[key] || 0;

            // Skip entities with 0 events
            if (count === 0) return;

            visibleCount++;
            const tag = document.createElement('button');
            tag.className = 'filter-tag';
            tag.setAttribute('data-unit', key);

            tag.innerHTML = `🪖 ${key} <span class="count">${count}</span>`;

            tag.onclick = () => {
                if (this.selectedUnits.has(key)) {
                    this.selectedUnits.delete(key);
                    tag.classList.remove('active');
                } else {
                    this.selectedUnits.add(key);
                    tag.classList.add('active');
                }
            };

            // If already selected, mark as active
            if (this.selectedUnits.has(key)) {
                tag.classList.add('active');
            }

            container.appendChild(tag);
        });

        console.log('✅ Units filter UI built with', visibleCount, 'units (with events)');
    },

    // Setup search box handlers for filtering tags
    setupSearchHandlers() {
        const systemsSearch = document.getElementById('systemsFilterSearch');
        const unitsSearch = document.getElementById('unitsFilterSearch');

        if (systemsSearch) {
            systemsSearch.addEventListener('input', (e) => {
                this.filterTags('systemsTagsContainer', e.target.value);
            });
        }

        if (unitsSearch) {
            unitsSearch.addEventListener('input', (e) => {
                this.filterTags('unitsTagsContainer', e.target.value);
            });
        }
    },

    // Filter tags by search term
    filterTags(containerId, searchTerm) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const tags = container.querySelectorAll('.filter-tag');
        const term = searchTerm.toLowerCase();

        tags.forEach(tag => {
            const text = tag.textContent.toLowerCase();
            tag.style.display = text.includes(term) ? '' : 'none';
        });
    },

    // Select all systems
    selectAllSystems() {
        Object.keys(EntityManager.SYSTEMS).forEach(key => {
            this.selectedSystems.add(key);
        });

        const tags = document.querySelectorAll('#systemsTagsContainer .filter-tag');
        tags.forEach(tag => tag.classList.add('active'));
    },

    // Clear all systems
    clearAllSystems() {
        this.selectedSystems.clear();

        const tags = document.querySelectorAll('#systemsTagsContainer .filter-tag');
        tags.forEach(tag => tag.classList.remove('active'));
    },

    // Select all units
    selectAllUnits() {
        Object.keys(EntityManager.UNITS).forEach(key => {
            this.selectedUnits.add(key);
        });

        const tags = document.querySelectorAll('#unitsTagsContainer .filter-tag');
        tags.forEach(tag => tag.classList.add('active'));
    },

    // Clear all units
    clearAllUnits() {
        this.selectedUnits.clear();

        const tags = document.querySelectorAll('#unitsTagsContainer .filter-tag');
        tags.forEach(tag => tag.classList.remove('active'));
    },

    // Apply systems filter
    applySystemsFilter() {
        console.log('🔧 Applying systems filter:', Array.from(this.selectedSystems));
        UIManager.closeModal('systemsModal');
        App.applyFilters();
    },

    // Apply units filter
    applyUnitsFilter() {
        console.log('🔧 Applying units filter:', Array.from(this.selectedUnits));
        UIManager.closeModal('unitsModal');
        App.applyFilters();
    },

    // Check if event passes entity filters
    passesEntityFilters(event) {
        const match = event.__match;

        // If no filters are active, pass all events
        if (this.selectedSystems.size === 0 && this.selectedUnits.size === 0) {
            return true;
        }

        if (!match || !match.key) {
            // Event has no entity match
            // If filters are active, exclude events without matches
            return false;
        }

        // Check if matches selected systems
        if (this.selectedSystems.size > 0 && match.group === 'system') {
            return this.selectedSystems.has(match.key);
        }

        // Check if matches selected units
        if (this.selectedUnits.size > 0 && match.group === 'unit') {
            return this.selectedUnits.has(match.key);
        }

        // If only systems filter is active and this is a unit (or vice versa), exclude
        if (this.selectedSystems.size > 0 && this.selectedUnits.size === 0) {
            return match.group === 'system' && this.selectedSystems.has(match.key);
        }

        if (this.selectedUnits.size > 0 && this.selectedSystems.size === 0) {
            return match.group === 'unit' && this.selectedUnits.has(match.key);
        }

        // Both filters active: event must match at least one
        if (match.group === 'system' && this.selectedSystems.has(match.key)) {
            return true;
        }
        if (match.group === 'unit' && this.selectedUnits.has(match.key)) {
            return true;
        }

        return false;
    },

    // Open systems modal
    openSystemsModal() {
        // Rebuild UI to refresh counts
        this.buildSystemsFilter(App.state.allEvents);
        document.getElementById('systemsModal').style.display = 'block';
    },

    // Open units modal
    openUnitsModal() {
        // Rebuild UI to refresh counts
        this.buildUnitsFilter(App.state.allEvents);
        document.getElementById('unitsModal').style.display = 'block';
    },

    // Get active filter count
    getActiveFilterCount() {
        return this.selectedSystems.size + this.selectedUnits.size;
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EntityFilters = EntityFilters;
}
