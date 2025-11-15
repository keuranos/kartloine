// Hyperlink Processor Module
// Adds interactive hyperlinks to text content for sources, entities, and locations

const HyperlinkProcessor = {
    // Known Telegram sources mapping
    telegramSources: {
        'Rybar': 'https://t.me/rybar',
        'MAKS23_NAFO': 'https://t.me/MAKS23_NAFO',
        'Deepstate': 'https://t.me/DeepStateUA',
        'Deep State': 'https://t.me/DeepStateUA',
        'DeepState': 'https://t.me/DeepStateUA',
        'Nexta': 'https://t.me/nexta_live',
        'OSINTtechnical': 'https://t.me/OSINTtechnical',
        'OSINT technical': 'https://t.me/OSINTtechnical',
        'WarMonitor': 'https://t.me/WarMonitors',
        'War Monitor': 'https://t.me/WarMonitors',
        'Crimean Wind': 'https://t.me/CrimeanWind',
        'CrimeanWind': 'https://t.me/CrimeanWind',
        'Ukraine Now': 'https://t.me/UkraineNow',
        'UkraineNow': 'https://t.me/UkraineNow',
        'IntelSlava': 'https://t.me/intelslava',
        'Intel Slava': 'https://t.me/intelslava',
        'Military Land': 'https://t.me/military_corner',
        'MilitaryLand': 'https://t.me/military_corner',
        'Topaz': 'https://t.me/topaz_eic',
        'Donbass Devushka': 'https://t.me/donbassdevushka'
    },

    /**
     * Process text and add hyperlinks for daily reports
     * @param {string} text - The text to process
     * @param {string} reportDate - The date of the report (YYYY-MM-DD format)
     * @returns {string} - HTML with hyperlinks
     */
    processDailyReportText: function(text, reportDate) {
        if (!text) return text;

        let processed = text;

        // 1. Add source hyperlinks (must be first to avoid conflicts)
        processed = this.addSourceLinks(processed);

        // 2. Add entity hyperlinks for daily report context (day + entity filter)
        processed = this.addEntityLinks(processed, 'dailyReport', reportDate);

        // 3. Add location hyperlinks
        processed = this.addLocationLinks(processed);

        return processed;
    },

    /**
     * Process text and add hyperlinks for event detail pane
     * @param {string} text - The text to process
     * @returns {string} - HTML with hyperlinks
     */
    processEventDetailText: function(text) {
        if (!text) return text;

        let processed = text;

        // 1. Add source hyperlinks
        processed = this.addSourceLinks(processed);

        // 2. Add entity hyperlinks for event detail context (global entity filter)
        processed = this.addEntityLinks(processed, 'eventDetail', null);

        // 3. Add location hyperlinks
        processed = this.addLocationLinks(processed);

        return processed;
    },

    /**
     * Add hyperlinks for Telegram source mentions
     */
    addSourceLinks: function(text) {
        let processed = text;

        // Sort sources by length (longest first) to avoid partial matches
        const sources = Object.keys(this.telegramSources).sort((a, b) => b.length - a.length);

        sources.forEach(source => {
            const url = this.telegramSources[source];
            // Create regex that matches the source with word boundaries
            // Use case-insensitive matching
            const regex = new RegExp(`\\b(${this.escapeRegex(source)})\\b`, 'gi');
            processed = processed.replace(regex, (match) => {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-link" title="Open ${match} on Telegram">${match}</a>`;
            });
        });

        return processed;
    },

    /**
     * Add hyperlinks for military systems and units
     */
    addEntityLinks: function(text, context, reportDate) {
        if (!EntityManager.isLoaded) {
            console.warn('EntityManager not loaded, skipping entity links');
            return text;
        }

        let processed = text;
        const entities = [];

        // Collect all systems and units - only use entity names, not complex patterns
        Object.entries(EntityManager.SYSTEMS || {}).forEach(([name, pattern]) => {
            entities.push({ name, type: 'system' });
        });
        Object.entries(EntityManager.UNITS || {}).forEach(([name, pattern]) => {
            entities.push({ name, type: 'unit' });
        });

        // Sort by length (longest first) to avoid partial matches
        entities.sort((a, b) => b.name.length - a.name.length);

        entities.forEach(entity => {
            try {
                // Use only the entity name for matching (case-insensitive)
                // Escape special regex characters in the entity name
                const escapedName = this.escapeRegex(entity.name);
                const regex = new RegExp(`\\b(${escapedName})\\b`, 'gi');

                processed = processed.replace(regex, (match) => {
                    const clickHandler = context === 'dailyReport'
                        ? `HyperlinkProcessor.handleDailyReportEntityClick('${this.escapeHtml(entity.name)}', '${entity.type}', '${reportDate}')`
                        : `HyperlinkProcessor.handleEventDetailEntityClick('${this.escapeHtml(entity.name)}', '${entity.type}')`;

                    return `<a href="#" onclick="${clickHandler}; return false;" class="entity-link entity-${entity.type}" title="Filter by ${entity.name}">${match}</a>`;
                });
            } catch (e) {
                console.warn('Failed to process entity:', entity.name, e);
            }
        });

        return processed;
    },

    /**
     * Add hyperlinks for location/place mentions
     * Detects capitalized place names and makes them clickable
     */
    addLocationLinks: function(text) {
        // Common Ukrainian/Russian place names and patterns
        const knownPlaces = [
            'Kyiv', 'Kiev', 'Kharkiv', 'Kharkov', 'Mariupol', 'Donetsk', 'Luhansk', 'Lugansk',
            'Dnipro', 'Dnipropetrovsk', 'Zaporizhzhia', 'Odesa', 'Odessa', 'Lviv', 'Kherson',
            'Mykolaiv', 'Crimea', 'Sevastopol', 'Simferopol', 'Bakhmut', 'Artyomovsk',
            'Avdiivka', 'Vuhledar', 'Kreminna', 'Siversk', 'Sloviansk', 'Kramatorsk',
            'Melitopol', 'Berdyansk', 'Enerhodar', 'Kupyansk', 'Izyum', 'Belgorod',
            'Rostov', 'Kursk', 'Bryansk', 'Voronezh', 'Moscow', 'Moskva'
        ];

        let processed = text;

        knownPlaces.forEach(place => {
            const regex = new RegExp(`\\b(${this.escapeRegex(place)})\\b`, 'gi');
            processed = processed.replace(regex, (match) => {
                return `<a href="#" onclick="HyperlinkProcessor.handleLocationClick('${this.escapeHtml(match)}'); return false;" class="location-link" title="Show ${match} on map">${match}</a>`;
            });
        });

        return processed;
    },

    /**
     * Handle click on entity in daily report context
     * Filters to specific day + entity
     */
    handleDailyReportEntityClick: function(entityName, entityType, reportDate) {
        console.log('📅 Daily report entity clicked:', entityName, entityType, reportDate);

        // Close the reports modal
        UIManager.closeModal('reports');

        // Filter events by date
        const dateStr = reportDate; // Already in YYYY-MM-DD format
        document.getElementById('startDate').value = dateStr;
        document.getElementById('endDate').value = dateStr;

        // Activate entity filter
        if (entityType === 'system') {
            EntityFilters.selectedSystems.clear();
            EntityFilters.selectedSystems.add(entityName);
        } else if (entityType === 'unit') {
            EntityFilters.selectedUnits.clear();
            EntityFilters.selectedUnits.add(entityName);
        }

        // Apply filters
        App.applyFilters();

        // Show notification
        alert(`🔍 Showing ${entityName} events from ${UIManager.formatDateFinnish(reportDate)}`);
    },

    /**
     * Handle click on entity in event detail context
     * Filters to entity globally (respecting other filters)
     */
    handleEventDetailEntityClick: function(entityName, entityType) {
        console.log('🔍 Event detail entity clicked:', entityName, entityType);

        // Activate entity filter
        if (entityType === 'system') {
            EntityFilters.selectedSystems.add(entityName);
        } else if (entityType === 'unit') {
            EntityFilters.selectedUnits.add(entityName);
        }

        // Apply filters
        App.applyFilters();

        // Show notification
        alert(`🔍 Filter added: ${entityName}\n\nShowing all events with this ${entityType}.`);
    },

    /**
     * Handle click on location
     * Centers map on the location
     */
    handleLocationClick: async function(locationName) {
        console.log('📍 Location clicked:', locationName);

        try {
            // Use Nominatim (OpenStreetMap) geocoding API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'OSINT-Event-Database'
                    }
                }
            );

            if (!response.ok) throw new Error('Geocoding failed');

            const results = await response.json();

            if (results.length === 0) {
                alert(`📍 Location "${locationName}" not found. Try searching manually.`);
                return;
            }

            const result = results[0];

            // Center map on location
            if (MapManager.map) {
                MapManager.map.setView([result.lat, result.lon], 10, {
                    animate: true,
                    duration: 1
                });

                // Show notification
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    z-index: 10000;
                    animation: fadeIn 0.3s ease-in;
                `;
                notification.textContent = `📍 Centered on ${locationName}`;
                document.body.appendChild(notification);

                setTimeout(() => {
                    notification.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => document.body.removeChild(notification), 300);
                }, 3000);
            }
        } catch (error) {
            console.error('Location geocoding error:', error);
            alert(`❌ Failed to find location "${locationName}". Please try searching manually.`);
        }
    },

    /**
     * Escape regex special characters
     */
    escapeRegex: function(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml: function(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }
};
