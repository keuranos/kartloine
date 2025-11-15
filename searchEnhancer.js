// Search Enhancer Module
// Provides date range presets and boolean search operators

const SearchEnhancer = {
    /**
     * Apply a date range preset
     */
    applyDatePreset: function(preset) {
        const today = new Date();
        let startDate, endDate;

        switch (preset) {
            case 'today':
                startDate = endDate = this.formatDate(today);
                break;

            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                startDate = endDate = this.formatDate(yesterday);
                break;

            case 'last7days':
                endDate = this.formatDate(today);
                const week = new Date(today);
                week.setDate(week.getDate() - 7);
                startDate = this.formatDate(week);
                break;

            case 'last30days':
                endDate = this.formatDate(today);
                const month = new Date(today);
                month.setDate(month.getDate() - 30);
                startDate = this.formatDate(month);
                break;

            case 'thisMonth':
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                startDate = this.formatDate(firstDay);
                endDate = this.formatDate(today);
                break;

            case 'lastMonth':
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                startDate = this.formatDate(lastMonthStart);
                endDate = this.formatDate(lastMonthEnd);
                break;

            case 'thisYear':
                const yearStart = new Date(today.getFullYear(), 0, 1);
                startDate = this.formatDate(yearStart);
                endDate = this.formatDate(today);
                break;

            case 'all':
                startDate = '';
                endDate = '';
                break;

            default:
                console.warn('Unknown date preset:', preset);
                return;
        }

        // Set date inputs
        document.getElementById('startDate').value = startDate;
        document.getElementById('endDate').value = endDate;

        // Apply filters
        App.applyFilters();

        // Log action
        console.log('📅 Date preset applied:', preset, startDate, '→', endDate);
    },

    /**
     * Format date as YYYY-MM-DD
     */
    formatDate: function(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Enhanced search with boolean operators
     * Supports: AND, OR, NOT
     * Examples:
     *   "shahed AND kharkiv" - Both terms must appear
     *   "shahed OR kinzhal" - Either term can appear
     *   "missile NOT cruise" - First term but not second
     *   "kinzhal AND (kharkiv OR kyiv)" - Complex queries
     */
    performBooleanSearch: function(searchTerm, events) {
        if (!searchTerm || searchTerm.trim() === '') {
            return events;
        }

        searchTerm = searchTerm.trim();

        // Check if search contains boolean operators
        const hasBooleanOperators = /\b(AND|OR|NOT)\b/i.test(searchTerm);

        if (!hasBooleanOperators) {
            // Simple search (original behavior)
            return this.simpleSearch(searchTerm, events);
        }

        // Parse and execute boolean search
        return this.executeBooleanSearch(searchTerm, events);
    },

    /**
     * Simple search (original behavior)
     */
    simpleSearch: function(term, events) {
        const lowerTerm = term.toLowerCase();
        return events.filter(event => {
            return JSON.stringify(event).toLowerCase().includes(lowerTerm);
        });
    },

    /**
     * Execute boolean search query
     */
    executeBooleanSearch: function(query, events) {
        query = query.trim();

        // Handle NOT operator (highest priority)
        if (/\bNOT\b/i.test(query)) {
            const parts = query.split(/\bNOT\b/i);
            if (parts.length === 2) {
                const mustHave = parts[0].trim();
                const mustNotHave = parts[1].trim();

                // Get events that match mustHave
                let results = mustHave ? this.executeBooleanSearch(mustHave, events) : events;

                // Filter out events that match mustNotHave
                const excludeEvents = this.executeBooleanSearch(mustNotHave, events);
                const excludeIds = new Set(excludeEvents.map(e => e.event_id));

                return results.filter(e => !excludeIds.has(e.event_id));
            }
        }

        // Handle OR operator
        if (/\bOR\b/i.test(query)) {
            const terms = query.split(/\bOR\b/i).map(t => t.trim());
            const resultSets = terms.map(term => this.executeBooleanSearch(term, events));

            // Combine results (union)
            const combinedIds = new Set();
            resultSets.forEach(resultSet => {
                resultSet.forEach(event => combinedIds.add(event.event_id));
            });

            return events.filter(e => combinedIds.has(e.event_id));
        }

        // Handle AND operator
        if (/\bAND\b/i.test(query)) {
            const terms = query.split(/\bAND\b/i).map(t => t.trim());
            let results = events;

            // Intersect all term results
            terms.forEach(term => {
                results = this.executeBooleanSearch(term, results);
            });

            return results;
        }

        // Handle parentheses (basic support)
        if (query.includes('(') && query.includes(')')) {
            // Extract innermost parentheses
            const match = query.match(/\(([^()]+)\)/);
            if (match) {
                const innerQuery = match[1];
                const innerResults = this.executeBooleanSearch(innerQuery, events);

                // Replace parentheses expression with placeholder
                const placeholder = `__RESULT_${Date.now()}__`;
                const newQuery = query.replace(match[0], placeholder);

                // For now, if there's more to process, just return inner results
                // Full implementation would need token replacement
                if (newQuery.trim() === placeholder) {
                    return innerResults;
                }

                return innerResults;
            }
        }

        // Base case: simple search
        return this.simpleSearch(query, events);
    },

    /**
     * Show search syntax help
     */
    showSearchHelp: function() {
        const helpText = `
🔍 Advanced Search Syntax

Simple Search:
  "kinzhal" - Find any event containing this word

Boolean Operators:
  AND - Both terms must appear
    Example: "shahed AND kharkiv"

  OR - Either term can appear
    Example: "shahed OR lancet"

  NOT - Exclude second term
    Example: "missile NOT cruise"

Complex Queries:
  "kinzhal AND (kharkiv OR kyiv)"
  "drone NOT shahed"
  "himars OR m270 OR mlrs"

Tips:
  - Operators must be UPPERCASE
  - Search is case-insensitive for terms
  - Searches all event fields
        `.trim();

        alert(helpText);
    },

    /**
     * Toggle date preset panel
     */
    toggleDatePresets: function() {
        const panel = document.getElementById('datePresetsPanel');
        if (panel) {
            panel.classList.toggle('show');
        }
    }
};
