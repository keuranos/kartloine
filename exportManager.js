// Export Manager Module
// Handles data export, filter presets, and shareable links

const ExportManager = {
    /**
     * Export filtered events to CSV file
     */
    exportToCSV: function() {
        const events = App.state.filteredEvents;

        if (events.length === 0) {
            alert('No events to export. Please adjust your filters.');
            return;
        }

        // Confirm export
        const confirmed = confirm(`📊 Export ${events.length} filtered events to CSV?\n\nThis will download a CSV file with all event data.`);
        if (!confirmed) return;

        console.log('📥 Exporting', events.length, 'events to CSV...');

        // Define CSV columns
        const columns = [
            'event_id',
            'event_date',
            'event_name',
            'event_location',
            'event_lat',
            'event_lng',
            'event_description',
            'message_text',
            'translated_text',
            'message_url',
            'message_date',
            'channel_name',
            'osint_entities',
            'multimodal_analysis',
            'war_crime_score'
        ];

        // Create CSV header
        let csv = columns.join(',') + '\n';

        // Add data rows
        events.forEach(event => {
            const row = columns.map(col => {
                let value = '';

                if (col === 'war_crime_score') {
                    value = event.__wcResult && event.__wcResult.tag === 'pos'
                        ? event.__wcResult.score
                        : 0;
                } else {
                    value = event[col] || '';
                }

                // Escape CSV special characters
                value = String(value).replace(/"/g, '""'); // Escape quotes

                // Wrap in quotes if contains comma, newline, or quote
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    value = `"${value}"`;
                }

                return value;
            });

            csv += row.join(',') + '\n';
        });

        // Create blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        // Generate filename with date and count
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `osint_events_${timestamp}_${events.length}_events.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ CSV export complete:', filename);
        alert(`✅ Exported ${events.length} events to:\n${filename}`);
    },

    /**
     * Generate shareable URL with all current filters
     */
    generateShareableLink: function() {
        const params = new URLSearchParams();

        // Map position and zoom
        if (MapManager.map) {
            const center = MapManager.map.getCenter();
            const zoom = MapManager.map.getZoom();
            params.set('lat', center.lat.toFixed(6));
            params.set('lng', center.lng.toFixed(6));
            params.set('zoom', zoom);
        }

        // Date filters
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        // Search filter
        const searchTerm = document.getElementById('searchInput').value;
        if (searchTerm) params.set('search', searchTerm);

        // War crime filter
        if (App.state.warCrimeFilter !== 'all') {
            params.set('wcFilter', App.state.warCrimeFilter);
        }

        // Entity filters (systems and units)
        if (EntityFilters.selectedSystems.size > 0) {
            params.set('systems', Array.from(EntityFilters.selectedSystems).join(','));
        }
        if (EntityFilters.selectedUnits.size > 0) {
            params.set('units', Array.from(EntityFilters.selectedUnits).join(','));
        }

        // Modal selections (events, locations, entities)
        if (App.state.modalSelections.events.size > 0) {
            params.set('events', Array.from(App.state.modalSelections.events).join(','));
        }
        if (App.state.modalSelections.locations.size > 0) {
            params.set('locations', Array.from(App.state.modalSelections.locations).join(','));
        }

        // Build URL
        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

        // Update the filter preferences modal input
        const input = document.getElementById('filterShareUrl');
        if (input) {
            input.value = url;
        }

        return url;
    },

    /**
     * Save current filter configuration as a preset
     */
    saveFilterPreset: function() {
        const presetName = prompt('Enter a name for this filter preset:');

        if (!presetName || presetName.trim() === '') {
            return;
        }

        const preset = {
            name: presetName.trim(),
            timestamp: new Date().toISOString(),
            filters: {
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                search: document.getElementById('searchInput').value,
                warCrimeFilter: App.state.warCrimeFilter,
                systems: Array.from(EntityFilters.selectedSystems),
                units: Array.from(EntityFilters.selectedUnits),
                events: Array.from(App.state.modalSelections.events),
                locations: Array.from(App.state.modalSelections.locations)
            }
        };

        // Load existing presets
        const presets = this.loadFilterPresets();

        // Check for duplicate names
        const existingIndex = presets.findIndex(p => p.name === preset.name);
        if (existingIndex >= 0) {
            const overwrite = confirm(`A preset named "${preset.name}" already exists. Overwrite it?`);
            if (!overwrite) return;
            presets[existingIndex] = preset;
        } else {
            presets.push(preset);
        }

        // Save to localStorage
        localStorage.setItem('filterPresets', JSON.stringify(presets));

        console.log('✅ Filter preset saved:', preset.name);
        alert(`✅ Filter preset "${preset.name}" saved!`);

        // Refresh the presets list if modal is open
        this.updatePresetsUI();
    },

    /**
     * Load filter presets from localStorage
     */
    loadFilterPresets: function() {
        try {
            const presetsJson = localStorage.getItem('filterPresets');
            return presetsJson ? JSON.parse(presetsJson) : [];
        } catch (error) {
            console.error('Failed to load filter presets:', error);
            return [];
        }
    },

    /**
     * Apply a saved filter preset
     */
    applyFilterPreset: function(presetName) {
        const presets = this.loadFilterPresets();
        const preset = presets.find(p => p.name === presetName);

        if (!preset) {
            alert('Preset not found!');
            return;
        }

        console.log('📋 Applying filter preset:', presetName);

        // Apply filters
        document.getElementById('startDate').value = preset.filters.startDate || '';
        document.getElementById('endDate').value = preset.filters.endDate || '';
        document.getElementById('searchInput').value = preset.filters.search || '';

        // War crime filter
        App.state.warCrimeFilter = preset.filters.warCrimeFilter || 'all';
        const wcRadio = document.getElementById(`wc-${App.state.warCrimeFilter}`);
        if (wcRadio) wcRadio.checked = true;

        // Entity filters
        EntityFilters.selectedSystems.clear();
        EntityFilters.selectedUnits.clear();
        preset.filters.systems.forEach(s => EntityFilters.selectedSystems.add(s));
        preset.filters.units.forEach(u => EntityFilters.selectedUnits.add(u));

        // Modal selections
        App.state.modalSelections.events = new Set(preset.filters.events);
        App.state.modalSelections.locations = new Set(preset.filters.locations);

        // Apply filters
        App.applyFilters();

        alert(`✅ Applied filter preset: "${presetName}"`);
    },

    /**
     * Delete a filter preset
     */
    deleteFilterPreset: function(presetName) {
        const confirmed = confirm(`Delete filter preset "${presetName}"?`);
        if (!confirmed) return;

        let presets = this.loadFilterPresets();
        presets = presets.filter(p => p.name !== presetName);

        localStorage.setItem('filterPresets', JSON.stringify(presets));

        console.log('🗑️ Filter preset deleted:', presetName);
        this.updatePresetsUI();
    },

    /**
     * Update the presets list UI
     */
    updatePresetsUI: function() {
        const container = document.getElementById('presetsListContainer');
        if (!container) return;

        const presets = this.loadFilterPresets();

        if (presets.length === 0) {
            container.innerHTML = '<div style="padding: 20px; color: #999; text-align: center;">No saved presets yet</div>';
            return;
        }

        let html = '<div class="presets-list">';

        presets.forEach(preset => {
            const date = new Date(preset.timestamp).toLocaleDateString('fi-FI');
            const filterCount = [
                preset.filters.startDate ? 1 : 0,
                preset.filters.endDate ? 1 : 0,
                preset.filters.search ? 1 : 0,
                preset.filters.warCrimeFilter !== 'all' ? 1 : 0,
                preset.filters.systems.length,
                preset.filters.units.length,
                preset.filters.events.length,
                preset.filters.locations.length
            ].reduce((a, b) => a + b, 0);

            html += `
                <div class="preset-item">
                    <div class="preset-info">
                        <div class="preset-name">${preset.name}</div>
                        <div class="preset-meta">${date} • ${filterCount} filter(s)</div>
                    </div>
                    <div class="preset-actions">
                        <button class="preset-btn preset-btn-apply" onclick="ExportManager.applyFilterPreset('${preset.name.replace(/'/g, "\\'")}')">
                            Apply
                        </button>
                        <button class="preset-btn preset-btn-delete" onclick="ExportManager.deleteFilterPreset('${preset.name.replace(/'/g, "\\'")}')">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    /**
     * Open the export & presets modal
     */
    openExportModal: function() {
        const modal = document.getElementById('exportModal');
        modal.style.display = 'block';

        // Generate shareable link
        this.generateShareableLink();

        // Update presets list
        this.updatePresetsUI();
    }
};
