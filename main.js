// Main Application Module
const App = {
    // Application state
    state: {
        allEvents: [],
        filteredEvents: [],
        dailyReports: [],
        currentReport: null,
        warCrimeFilter: 'all',
        selectedEventId: null,
        modalSelections: {
            events: new Set(),
            locations: new Set(),
            entities: new Set()
        },
        viewedEvents: new Set(),
        favorites: new Set(),
        dateRange: null,
        timelineInterval: null
    },

    // Initialize application
    init: async function() {
        console.log('🚀 Initializing OSINT Dashboard...');

        // Load entity definitions first
        console.log('📥 Loading entity definitions...');
        await EntityManager.load();

        // Load saved data
        const storage = StorageManager.load();
        this.state.viewedEvents = storage.viewedEvents;
        this.state.favorites = storage.favorites;

        // Initialize components
        MapManager.init();

        // Setup event listeners
        this.setupEventListeners();

        // Load events
        this.loadEvents();

        // Note: handleUrlParams will be called after events are loaded
    },

    setupEventListeners: function() {
        // Search toggle
        document.getElementById('searchToggleBtn').addEventListener('click', () => {
            document.getElementById('bottomSearchPanel').classList.toggle('open');
        });

        // Search tabs
        document.getElementById('locationSearchTab').addEventListener('click', () => {
            document.getElementById('locationSearchTab').classList.add('active');
            document.getElementById('eventSearchTab').classList.remove('active');
            document.getElementById('locationSearchSection').style.display = 'block';
            document.getElementById('eventSearchSection').style.display = 'none';
        });

        document.getElementById('eventSearchTab').addEventListener('click', () => {
            document.getElementById('eventSearchTab').classList.add('active');
            document.getElementById('locationSearchTab').classList.remove('active');
            document.getElementById('eventSearchSection').style.display = 'block';
            document.getElementById('locationSearchSection').style.display = 'none';
        });

        // Location search
        document.getElementById('searchLocationBtn').addEventListener('click', () => {
            this.searchLocation();
        });

        // Allow Enter key in location search
        document.getElementById('locationSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchLocation();
            }
        });

        // Feed toggle
        document.getElementById('feedToggleBtn').addEventListener('click', () => {
            const panel = document.getElementById('feedPanel');
            const btn = document.getElementById('feedToggleBtn');
            const mainContainer = document.querySelector('.main-container');

            panel.classList.toggle('closed');
            btn.classList.toggle('feed-active');

            // Adjust main container when feed closes
            if (panel.classList.contains('closed')) {
                mainContainer.classList.add('feed-closed');
            } else {
                mainContainer.classList.remove('feed-closed');
            }

            // Update map size and redraw selection line after transition
            setTimeout(() => {
                if (MapManager.map) {
                    MapManager.map.invalidateSize();
                    MapManager.updateSelectionLine();
                }
            }, 350); // Wait for CSS transition to complete
        });

        // Feed close button
        document.getElementById('feedCloseBtn').addEventListener('click', () => {
            const panel = document.getElementById('feedPanel');
            const btn = document.getElementById('feedToggleBtn');
            const mainContainer = document.querySelector('.main-container');

            panel.classList.add('closed');
            btn.classList.remove('feed-active');
            mainContainer.classList.add('feed-closed');

            // Update map size and redraw selection line after transition
            setTimeout(() => {
                if (MapManager.map) {
                    MapManager.map.invalidateSize();
                    MapManager.updateSelectionLine();
                }
            }, 350); // Wait for CSS transition to complete
        });


        // Apply filters
        document.getElementById('applyFiltersBtn').addEventListener('click', () => {
            this.applyFilters();
            document.getElementById('bottomSearchPanel').classList.remove('open');
        });

        // Reset filters
        document.getElementById('resetFiltersBtn').addEventListener('click', () => {
            this.resetAllFilters();
        });

        // File upload
        document.getElementById('csvFileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        // War crime filter radio buttons
        document.querySelectorAll('input[name="wcFilter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.warCrimeFilter = e.target.value;
                this.applyFilters();
                closeModal('warCrimesModal');
            });
        });

        // Legend toggle
        document.getElementById('legendToggleBtn').addEventListener('click', () => {
            const legendPanel = document.getElementById('legendPanel');
            const btn = document.getElementById('legendToggleBtn');
            legendPanel.classList.toggle('show');
            btn.classList.toggle('active');
        });

        // Legend close button
        document.getElementById('legendCloseBtn').addEventListener('click', () => {
            const legendPanel = document.getElementById('legendPanel');
            const btn = document.getElementById('legendToggleBtn');
            legendPanel.classList.remove('show');
            btn.classList.remove('active');
        });

        // Modal search inputs
        document.getElementById('eventsModalSearch').addEventListener('input', () => {
            UIManager.filterModalItems('events');
        });
        document.getElementById('locationsModalSearch').addEventListener('input', () => {
            UIManager.filterModalItems('locations');
        });
        document.getElementById('entitiesModalSearch').addEventListener('input', () => {
            UIManager.filterModalItems('entities');
        });

        // Manual time range button - NEW DD/MM/YYYY format
        const applyManualRangeBtn = document.getElementById('applyManualRangeBtn');
        if (applyManualRangeBtn) {
            applyManualRangeBtn.addEventListener('click', () => {
                this.applyManualDateRange();
            });
        }

        // Auto-format date inputs as DD/MM/YYYY
        const manualStartDate = document.getElementById('manualStartDate');
        const manualEndDate = document.getElementById('manualEndDate');

        if (manualStartDate) {
            manualStartDate.addEventListener('input', (e) => {
                e.target.value = this.formatDateInput(e.target.value);
            });
        }

        if (manualEndDate) {
            manualEndDate.addEventListener('input', (e) => {
                e.target.value = this.formatDateInput(e.target.value);
            });
        }

        // Timeline toggle button
        const timelineToggleBtn = document.getElementById('timelineToggleBtn');
        if (timelineToggleBtn) {
            timelineToggleBtn.addEventListener('click', () => {
                const container = document.getElementById('timeSliderContainer');
                const mapContainer = document.querySelector('.map-container');
                const sidePanel = document.querySelector('.side-panel');
                const btn = document.getElementById('timelineToggleBtn');
                const isVisible = container.style.display !== 'none' && !container.classList.contains('collapsed');

                if (isVisible) {
                    // Hide timeline
                    container.classList.add('collapsed');
                    container.style.display = 'none'; // Clear inline style so CSS class takes effect
                    mapContainer.classList.add('timeline-hidden');
                    sidePanel.classList.add('timeline-hidden');
                    btn.classList.remove('active');
                } else {
                    // Show timeline
                    container.classList.remove('collapsed');
                    container.style.display = 'flex';
                    mapContainer.classList.remove('timeline-hidden');
                    sidePanel.classList.remove('timeline-hidden');
                    btn.classList.add('active');
                }

                // Update map size after transition
                setTimeout(() => {
                    if (MapManager.map) {
                        MapManager.map.invalidateSize();
                        MapManager.updateSelectionLine();
                    }
                }, 350);
            });
        }
    },

    formatDateInput: function(value) {
        // Remove non-numeric characters
        let cleaned = value.replace(/\D/g, '');
        
        // Add slashes automatically
        if (cleaned.length >= 2) {
            cleaned = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
        }
        if (cleaned.length >= 5) {
            cleaned = cleaned.substring(0, 5) + '/' + cleaned.substring(5, 9);
        }
        
        return cleaned;
    },

    applyManualDateRange: function() {
        const startInput = document.getElementById('manualStartDate').value;
        const endInput = document.getElementById('manualEndDate').value;
        
        if (!startInput || !endInput) {
            alert('Please enter both start and end dates (DD/MM/YYYY)');
            return;
        }
        
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const startParts = startInput.split('/');
        const endParts = endInput.split('/');
        
        if (startParts.length !== 3 || endParts.length !== 3) {
            alert('Invalid date format. Please use DD/MM/YYYY');
            return;
        }
        
        const startDate = `${startParts[2]}-${startParts[1].padStart(2, '0')}-${startParts[0].padStart(2, '0')}`;
        const endDate = `${endParts[2]}-${endParts[1].padStart(2, '0')}-${endParts[0].padStart(2, '0')}`;
        
        // Validate dates
        if (startDate > endDate) {
            alert('Start date must be before end date!');
            return;
        }
        
        // Apply filter
        document.getElementById('startDate').value = startDate;
        document.getElementById('endDate').value = endDate;
        
        this.applyFilters();
        
        alert(`Date range set to: ${startInput} → ${endInput}`);
    },

    loadEvents: function() {
        console.log('📂 Loading events from CSV...');
        document.getElementById('stats').innerHTML = `
            <div style="background: #667eea; color: white; padding: 20px; border-radius: 10px; width: 100%;">
                <strong>⏳ Loading data... (Large file, please wait)</strong>
            </div>
        `;

        Papa.parse('tapahtumat.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            worker: false, // Disable worker for better error reporting
            complete: (results) => {
                console.log('📊 CSV parsing complete. Rows:', results.data.length);
                console.log('📊 Errors:', results.errors.length);

                if (results.errors.length > 0) {
                    console.warn('⚠️ CSV parsing warnings:', results.errors.slice(0, 5));
                }

                if (results.data && results.data.length > 0) {
                    console.log('🔄 Processing events...');
                    document.getElementById('stats').innerHTML = `
                        <div style="background: #667eea; color: white; padding: 20px; border-radius: 10px; width: 100%;">
                            <strong>⏳ Processing ${results.data.length} events...</strong>
                        </div>
                    `;

                    // Process in chunks to avoid blocking UI
                    setTimeout(() => {
                        try {
                            this.state.allEvents = this.processEvents(results.data);
                            this.state.filteredEvents = this.state.allEvents;
                            console.log('✅ Events processed:', this.state.allEvents.length);

                            // Precompute entity matches for all events
                            if (EntityManager.isLoaded) {
                                EntityManager.precomputeMatches(this.state.allEvents);

                                // Initialize entity filters UI
                                EntityFilters.init(this.state.allEvents);
                            } else {
                                console.warn('⚠️ EntityManager not loaded, skipping entity matching');
                            }

                            this.initTimeSlider();
                            this.render();
                            this.loadDailyReports();
                            console.log('✅ Rendering complete!');

                            // Now handle URL parameters for shared links (after events are loaded)
                            setTimeout(() => this.handleUrlParams(), 500);
                        } catch (error) {
                            console.error('❌ Error processing events:', error);
                            this.showError('Failed to process events: ' + error.message);
                        }
                    }, 100);
                } else {
                    this.showError('CSV file is empty or invalid');
                }
            },
            error: (error) => {
                console.error('❌ CSV error:', error);
                this.showError('Failed to load CSV: ' + error.message);
            }
        });
    },

    processEvents: function(data) {
        return data.map((row, index) => {
            const event = { ...row };

            // Ensure event has an ID - use message_url or generate simple numeric ID
            if (!event.event_id || event.event_id === '') {
                // Use message_url as unique ID (extract last part after /)
                if (event.message_url && event.message_url.includes('/')) {
                    const parts = event.message_url.split('/');
                    event.event_id = 'msg_' + parts[parts.length - 1];
                }
                // Fallback to simple index-based ID
                else {
                    event.event_id = 'event_' + String(index).padStart(6, '0');
                }
            }

            // Detect and handle timestamps
            if (event.message_date) {
                // Check if message_date contains time (HH:MM:SS)
                if (event.message_date.includes(' ')) {
                    // Already has timestamp, keep as is
                    event.__hasTimestamp = true;
                } else {
                    // Only has date, add midnight time for sorting
                    event.__hasTimestamp = false;
                }
            }

            // War crime detection
            event.__wcResult = WarCrimeDetector.computeWarCrime(event);

            // Parse coordinates
            if (event.event_lat) event.event_lat = parseFloat(event.event_lat);
            if (event.event_lng) event.event_lng = parseFloat(event.event_lng);

            return event;
        });
    },

    initTimeSlider: function() {
        // Get all dates and sort them
        const dates = [...new Set(this.state.allEvents.map(e => e.event_date).filter(d => d))].sort();

        if (dates.length === 0) return;

        this.state.dateRange = {
            min: dates[0],
            max: dates[dates.length - 1],
            current: dates[dates.length - 1],
            allDates: dates
        };

        // Show time slider container but keep it collapsed initially
        const container = document.getElementById('timeSliderContainer');
        container.style.display = 'none';
        container.classList.add('collapsed');

        // Mark map and side panel as timeline-hidden initially
        document.querySelector('.map-container').classList.add('timeline-hidden');
        document.querySelector('.side-panel').classList.add('timeline-hidden');

        // Update display
        document.getElementById('timeSliderStartDate').textContent = this.state.dateRange.min;
        document.getElementById('timeSliderEndDate').textContent = this.state.dateRange.current;
        
        // Setup slider
        const slider = document.getElementById('timeSlider');
        slider.max = dates.length - 1;
        slider.value = dates.length - 1;
        
        slider.addEventListener('input', (e) => {
            const index = parseInt(e.target.value);
            this.state.dateRange.current = dates[index];
            document.getElementById('timeSliderEndDate').textContent = dates[index];
            this.applyTimeFilter();
        });
        
        // Play button
        document.getElementById('playBtn').addEventListener('click', () => {
            this.playTimeline();
        });
        
        // Pause button
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseTimeline();
        });
        
        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetTimeline();
        });
    },

    playTimeline: function() {
        const dates = this.state.dateRange.allDates;
        const slider = document.getElementById('timeSlider');
        let currentIndex = parseInt(slider.value);
        
        // Show pause, hide play
        document.getElementById('playBtn').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'inline-block';
        
        this.state.timelineInterval = setInterval(() => {
            currentIndex++;
            if (currentIndex >= dates.length) {
                currentIndex = 0; // Loop back to start
            }
            
            slider.value = currentIndex;
            this.state.dateRange.current = dates[currentIndex];
            document.getElementById('timeSliderEndDate').textContent = dates[currentIndex];
            this.applyTimeFilter();
        }, 500); // 500ms per step
    },

    pauseTimeline: function() {
        if (this.state.timelineInterval) {
            clearInterval(this.state.timelineInterval);
            this.state.timelineInterval = null;
        }
        
        // Show play, hide pause
        document.getElementById('playBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').style.display = 'none';
    },

    resetTimeline: function() {
        this.pauseTimeline();
        
        const dates = this.state.dateRange.allDates;
        const slider = document.getElementById('timeSlider');
        
        slider.value = dates.length - 1;
        this.state.dateRange.current = dates[dates.length - 1];
        document.getElementById('timeSliderEndDate').textContent = dates[dates.length - 1];
        
        this.applyTimeFilter();
    },

    applyTimeFilter: function() {
        // Filter events based on time slider
        this.state.filteredEvents = this.state.allEvents.filter(event => {
            return event.event_date <= this.state.dateRange.current;
        });
        
        this.render();
    },


    loadDailyReports: function() {
        console.log('📊 Loading daily reports from raportit.csv...');
        
        Papa.parse('raportit.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    console.log('✅ Loaded', results.data.length, 'daily reports');
                    
                    // Parse reports
                    this.state.dailyReports = results.data.map(row => {
                        // Extract date from report_date (format: 2025-10-22 12:30:48)
                        let date = 'Unknown';
                        if (row.report_date) {
                            date = row.report_date.split(' ')[0]; // Get just the date part
                        }
                        
                        return {
                            date: date,
                            content: row.report_text || 'No content available',
                            eventIds: [] // Daily reports don't link to specific events
                        };
                    });

                    console.log('✅ Parsed daily reports:', this.state.dailyReports.length);

                    // Update stats to show correct report count
                    UIManager.updateStats(this.state.filteredEvents, this.state);

                    // Check for report parameter in URL and auto-open if present
                    console.log('🔗 About to check for report URL parameter...');
                    try {
                        if (typeof UIManager.checkReportUrlParameter === 'function') {
                            UIManager.checkReportUrlParameter();
                        } else {
                            console.error('❌ UIManager.checkReportUrlParameter is not a function!');
                        }
                    } catch (error) {
                        console.error('❌ Error calling checkReportUrlParameter:', error);
                    }
                } else {
                    console.warn('⚠️ No daily reports found in raportit.csv');
                    this.state.dailyReports = [];
                }
            },
            error: (error) => {
                console.error('❌ Failed to load raportit.csv:', error);
                this.state.dailyReports = [];
            }
        });
    },

    render: function() {
        console.log('🎨 Rendering UI with', this.state.filteredEvents.length, 'events');
        
        // Update stats
        UIManager.updateStats(this.state.filteredEvents, this.state);
        
        // Update map
        MapManager.render(this.state.filteredEvents, (event, latLng) => {
            this.onMarkerClick(event, latLng);
        }, this.state);
        
        // Update feed
        UIManager.populateFeed(this.state.filteredEvents);
        
        // Mark viewed events as gray
        this.state.viewedEvents.forEach(eventId => {
            const event = this.state.allEvents.find(e => e.event_id === eventId);
            if (event) {
                const marker = MapManager.eventMarkers[event.event_id];
                if (marker) {
                    const weaponType = DataProcessor.getWeaponType(event);
                    const side = DataProcessor.detectSide(event);
                    MapManager.updateMarkerIcon(event.event_id, weaponType, side, true);
                }
            }
        });
    },

    onMarkerClick: function(event, latLng) {
        this.state.selectedEventId = event.event_id;
        this.state.viewedEvents.add(event.event_id);
        StorageManager.save(this.state.viewedEvents, this.state.favorites);
        
        // Update marker icon to gray
        const weaponType = DataProcessor.getWeaponType(event);
        const side = DataProcessor.detectSide(event);
        MapManager.updateMarkerIcon(event.event_id, weaponType, side, true);
        
        UIManager.showEventDetail(event, this.state);
        UIManager.updateFeedActiveItem(event.event_id);
        MapManager.setSelectedEvent(event.event_id);
        
        // Draw line from marker to side panel
        if (latLng) {
            MapManager.drawSelectionLine(latLng);
        }
        
        // Update URL and meta tags (include current zoom level)
        const currentZoom = MapManager.map.getZoom();
        const url = `?event=${event.event_id}&zoom=${currentZoom}`;
        window.history.pushState(null, '', url);
        this.updateMetaTags(event);
    },

    searchLocation: async function() {
        const query = document.getElementById('locationSearchInput').value.trim();
        const resultsContainer = document.getElementById('locationSearchResults');

        if (!query) {
            resultsContainer.innerHTML = '<p style="color: #999; padding: 10px;">Please enter a location to search</p>';
            return;
        }

        resultsContainer.innerHTML = '<p style="color: #667eea; padding: 10px;">🔍 Searching...</p>';

        try {
            // Use Nominatim (OpenStreetMap) geocoding API
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, {
                headers: {
                    'User-Agent': 'OSINT-Event-Database'
                }
            });

            if (!response.ok) throw new Error('Search failed');

            const results = await response.json();

            if (results.length === 0) {
                resultsContainer.innerHTML = '<p style="color: #999; padding: 10px;">No results found. Try a different location.</p>';
                return;
            }

            // Automatically center on first result
            const firstResult = results[0];
            this.centerMapOn(firstResult.lat, firstResult.lon, firstResult.display_name);

            // Display results
            let html = '';
            results.forEach((result, index) => {
                html += `
                    <div class="search-result-item ${index === 0 ? 'selected' : ''}" onclick="App.centerMapOn(${result.lat}, ${result.lon}, '${result.display_name.replace(/'/g, "\\'")}')">
                        <div class="search-result-name">${result.display_name}</div>
                        <div class="search-result-details">📍 ${result.lat}, ${result.lon}</div>
                    </div>
                `;
            });

            resultsContainer.innerHTML = html;

        } catch (error) {
            console.error('Location search error:', error);
            resultsContainer.innerHTML = '<p style="color: #ff4444; padding: 10px;">❌ Search failed. Please try again.</p>';
        }
    },

    centerMapOn: function(lat, lon, name) {
        if (MapManager.map) {
            MapManager.map.setView([lat, lon], 12);
            console.log(`📍 Centered map on: ${name}`);

            // Close search panel
            document.getElementById('bottomSearchPanel').classList.remove('open');

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
            notification.textContent = `📍 ${name}`;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => document.body.removeChild(notification), 300);
            }, 3000);
        }
    },

    applyFilters: function() {
        // Show loading indicator for large datasets
        if (this.state.allEvents.length > 500 && typeof PerformanceOptimizer !== 'undefined') {
            PerformanceOptimizer.showLoading('Applying filters...');
        }

        // Use setTimeout to allow UI to update before heavy processing
        setTimeout(() => {
            const searchTerm = document.getElementById('searchInput').value;
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            // Start with all events
            let filtered = this.state.allEvents;

            // Apply boolean search first if search term exists
            if (searchTerm && searchTerm.trim()) {
                filtered = SearchEnhancer.performBooleanSearch(searchTerm, filtered);
            }

            // Apply other filters
            this.state.filteredEvents = filtered.filter(event => {
                if (startDate && event.event_date < startDate) return false;
                if (endDate && event.event_date > endDate) return false;

                // War crime filter
                if (this.state.warCrimeFilter === 'likely' && (!event.__wcResult || event.__wcResult.tag !== 'pos')) return false;
                if (this.state.warCrimeFilter === 'strong' && (!event.__wcResult || event.__wcResult.score < 4)) return false;

                // Entity filters (systems & units)
                if (EntityManager.isLoaded && !EntityFilters.passesEntityFilters(event)) return false;

                // Modal selections
                const ms = this.state.modalSelections;
                if (ms.events.size > 0 && !ms.events.has(event.event_id)) return false;
                if (ms.locations.size > 0 && !ms.locations.has(event.event_location)) return false;
                if (ms.entities.size > 0) {
                    if (!event.osint_entities) return false;
                    const entities = event.osint_entities.split(',').map(ent => ent.trim());
                    if (!entities.some(entity => ms.entities.has(entity))) return false;
                }

                return true;
            });

            // Check for large result sets
            if (typeof PerformanceOptimizer !== 'undefined') {
                PerformanceOptimizer.checkLargeResultSet(this.state.filteredEvents.length);
            }

            this.render();

            // Hide loading indicator
            if (typeof PerformanceOptimizer !== 'undefined') {
                PerformanceOptimizer.hideLoading();
            }
        }, 10);
    },

    resetAllFilters: function() {
        const totalEvents = this.state.allEvents.length;
        if (confirm(`🔄 Reset all filters and show all ${totalEvents} events?`)) {
            // Clear input fields
            document.getElementById('searchInput').value = '';
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';

            // Reset modal selections
            this.state.modalSelections = {
                events: new Set(),
                locations: new Set(),
                entities: new Set()
            };

            // Reset war crime filter
            this.state.warCrimeFilter = 'all';
            document.getElementById('wc-all').checked = true;

            // Reset entity filters
            if (EntityManager.isLoaded) {
                EntityFilters.clearAllSystems();
                EntityFilters.clearAllUnits();
            }

            // Reset filtered events
            this.state.filteredEvents = this.state.allEvents;
            this.render();
            
            // Clear side panel
            const panel = document.getElementById('sidePanel');
            panel.classList.add('empty');
            panel.classList.remove('has-connection');
            panel.innerHTML = `
                <div>
                    <div style="font-size: 48px; margin-bottom: 20px;">📍</div>
                    <div>Click on any marker to view event details</div>
                </div>
            `;
            
            // Clear selection line
            if (MapManager.selectionLine) {
                MapManager.map.removeLayer(MapManager.selectionLine);
                MapManager.selectionLine = null;
            }
            
            this.state.selectedEventId = null;
            MapManager.selectedEventId = null;
        }
    },

    handleUrlParams: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        const zoomParam = urlParams.get('zoom');
        const latParam = urlParams.get('lat');
        const lngParam = urlParams.get('lng');
        const systemsParam = urlParams.get('systems');
        const unitsParam = urlParams.get('units');
        const wcFilterParam = urlParams.get('wcFilter');
        const favoritesParam = urlParams.get('favorites');

        // Apply filter preferences from URL
        if (systemsParam && EntityManager.isLoaded) {
            const systems = systemsParam.split(',');
            systems.forEach(s => EntityFilters.selectedSystems.add(s));
            console.log('🔧 Loaded systems filter:', systems.length, 'systems');
        }

        if (unitsParam && EntityManager.isLoaded) {
            const units = unitsParam.split(',');
            units.forEach(u => EntityFilters.selectedUnits.add(u));
            console.log('🔧 Loaded units filter:', units.length, 'units');
        }

        if (wcFilterParam) {
            this.state.warCrimeFilter = wcFilterParam;
            console.log('🔧 Loaded war crime filter:', wcFilterParam);
        }

        // Apply filters if any were loaded
        if (systemsParam || unitsParam || wcFilterParam) {
            this.applyFilters();
        }

        // Set map view from URL
        if (latParam && lngParam && zoomParam) {
            const lat = parseFloat(latParam);
            const lng = parseFloat(lngParam);
            const zoom = parseInt(zoomParam, 10);
            setTimeout(() => {
                MapManager.map.setView([lat, lng], zoom);
                console.log('🗺️ Set map view from URL:', lat, lng, 'zoom', zoom);
            }, 500);
        }

        // Parse zoom level (default to 12 if not provided)
        const targetZoom = zoomParam ? parseInt(zoomParam, 10) : 12;

        if (favoritesParam) {
            const favIds = favoritesParam.split(',');
            favIds.forEach(id => this.state.favorites.add(id));
            StorageManager.save(this.state.viewedEvents, this.state.favorites);
        }

        if (eventId) {
            console.log('🔗 Opening shared link for event:', eventId, 'with zoom:', targetZoom);

            setTimeout(() => {
                const event = this.state.allEvents.find(e => e.event_id === eventId);

                if (!event) {
                    console.error('❌ Event not found in allEvents:', eventId);
                    alert('Event not found. The event may have been removed or the link is invalid.');
                    return;
                }

                if (!event.event_lat || !event.event_lng) {
                    console.error('❌ Event has no coordinates:', eventId);
                    alert('This event has no location data and cannot be displayed on the map.');
                    return;
                }

                console.log('✅ Event found:', event.event_name);

                // Update meta tags for link preview
                this.updateMetaTags(event);

                // Ensure event is in filtered events
                const wasFiltered = !this.state.filteredEvents.includes(event);
                if (wasFiltered) {
                    console.log('📍 Event was filtered out, adding to filtered events');
                    this.state.filteredEvents.push(event);

                    // Re-render to create the marker
                    MapManager.render(this.state.filteredEvents, (e, latLng) => {
                        this.onMarkerClick(e, latLng);
                    }, this.state);
                    UIManager.populateFeed(this.state.filteredEvents);

                    // Wait for render to complete before accessing marker
                    setTimeout(() => this.openSharedEvent(event, eventId, targetZoom), 100);
                } else {
                    console.log('✅ Event already in filtered events');
                    this.openSharedEvent(event, eventId, targetZoom);
                }
            }, 1000);
        }
    },

    openSharedEvent: function(event, eventId, targetZoom) {
        // Default to zoom 12 if not provided
        const zoom = targetZoom || 12;
        console.log('📍 Opening shared event on map:', event.event_name, 'at zoom level', zoom);

        // Get marker (should exist now)
        const marker = MapManager.eventMarkers[eventId];

        if (!marker) {
            console.error('❌ Marker not found for event:', eventId);
            console.log('Available markers:', Object.keys(MapManager.eventMarkers).length);
            alert('Unable to display event on map. Please try refreshing the page.');
            return;
        }

        console.log('✅ Marker found, opening event');

        // Get lat/lng - handle both regular markers and circle markers
        const latLng = marker.getLatLng ? marker.getLatLng() : L.latLng(event.event_lat, event.event_lng);

        // Center map on marker with animation at the specified zoom level
        MapManager.map.setView(latLng, zoom, {
            animate: true,
            duration: 1
        });

        // Small delay before triggering click to ensure map has centered
        setTimeout(() => {
            // Trigger marker click - this will:
            // 1. Show event details
            // 2. Draw the line automatically
            // 3. Update feed active item
            this.onMarkerClick(event, latLng);
            console.log('✅ Shared event opened successfully at zoom', zoom);
        }, 300);
    },

    updateMetaTags: function(event) {
        // Update page title
        document.title = `${event.event_name || 'Event'} - OSINT Database`;

        // Get SHORT description - prioritize the short_description field from CSV
        let shortDescription = '';

        // First, check if there's a dedicated short_description field in the CSV
        if (event.short_description && event.short_description.trim()) {
            shortDescription = event.short_description.trim();
        }
        // Second, try to extract from multimodal analysis
        else if (event.multimodal_analysis) {
            const analysis = DataProcessor.parseMultimodalAnalysis(event.multimodal_analysis);

            // Look for "Short Description:" section
            if (event.multimodal_analysis.includes('Short Description:')) {
                const match = event.multimodal_analysis.match(/Short Description:\s*\*?\*?(.+?)(?:\n|$)/i);
                if (match && match[1]) {
                    shortDescription = match[1].trim().replace(/^\*+|\*+$/g, '');
                }
            }
            // Fallback to summary
            else if (analysis.summary) {
                // Extract first meaningful sentence
                const sentences = analysis.summary.split(/[.!?]\s+/);
                shortDescription = sentences[0] || analysis.summary.substring(0, 200);
            }
        }

        // Fallback to event_description or translated_text
        if (!shortDescription) {
            shortDescription = event.event_description || event.translated_text || event.message_text || 'View this OSINT event on the interactive map';
        }

        // Clean up the description
        shortDescription = shortDescription.replace(/^\*+|\*+$/g, '').trim();

        // Trim to 200 characters for WhatsApp/social media previews
        if (shortDescription.length > 200) {
            shortDescription = shortDescription.substring(0, 197).trim() + '...';
        }

        // Update Open Graph tags
        const ogTitle = document.getElementById('og-title');
        const ogDesc = document.getElementById('og-description');
        const ogUrl = document.getElementById('og-url');

        if (ogTitle) ogTitle.setAttribute('content', `${event.event_name || 'Event'} - ${event.event_location || 'Location Unknown'}`);
        if (ogDesc) ogDesc.setAttribute('content', shortDescription);
        if (ogUrl) ogUrl.setAttribute('content', window.location.href);

        // Update Twitter Card tags
        const twitterTitle = document.getElementById('twitter-title');
        const twitterDesc = document.getElementById('twitter-description');

        if (twitterTitle) twitterTitle.setAttribute('content', `${event.event_name || 'Event'} - ${event.event_location || 'Location Unknown'}`);
        if (twitterDesc) twitterDesc.setAttribute('content', shortDescription);

        console.log('✅ Meta tags updated for social sharing:', shortDescription.substring(0, 50) + '...');
    },

    handleFileUpload: function(event) {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const csv = e.target.result;
                Papa.parse(csv, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.data && results.data.length > 0) {
                            this.state.allEvents = this.processEvents(results.data);
                            this.state.filteredEvents = this.state.allEvents;
                            this.render();
                            document.getElementById('fileUploadUI').style.display = 'none';
                        } else {
                            this.showError('CSV file is empty or invalid');
                        }
                    }
                });
            };
            reader.readAsText(file);
        } else {
            alert('Please select a valid CSV file');
        }
    },

    showError: function(message) {
        document.getElementById('stats').innerHTML = `
            <div style="background: #e74c3c; color: white; padding: 20px; border-radius: 10px; width: 100%;">
                <strong>⚠️ Error:</strong> ${message}
                <br><br>
                Please upload the tapahtumat.csv file below.
            </div>
        `;
        document.getElementById('fileUploadUI').style.display = 'block';
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    UIManager.initDarkMode();
});
