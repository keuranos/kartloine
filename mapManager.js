// Map Manager Module with Layered Marker System
const MapManager = {
    map: null,
    clusterLayer: null,          // Bottom layer: generic circle markers (clustered)
    specialLayer: null,           // Middle layer: flag markers for sides
    entityLayer: null,            // Top layer: system/unit markers (not clustered)
    eventMarkers: {},
    selectionLine: null,
    selectedEventId: null,

    init: function() {
        this.map = L.map('map').setView([49.0, 32.0], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Create three layers in order (bottom to top)
        // 1. Cluster layer for generic events
        this.clusterLayer = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            disableClusteringAtZoom: 11  // Disable clustering at high zoom
        });

        // 2. Special layer for flags
        this.specialLayer = L.layerGroup();

        // 3. Entity layer for systems and units
        this.entityLayer = L.layerGroup();

        // Add layers to map in order
        this.map.addLayer(this.clusterLayer);
        this.map.addLayer(this.specialLayer);
        this.map.addLayer(this.entityLayer);

        // Update line on map move/zoom
        this.map.on('move', () => this.updateSelectionLine());
        this.map.on('zoom', () => this.updateSelectionLine());

        console.log('✅ Map layers initialized: cluster, special, entity');
    },

    // Create entity marker icon (systems/units with emoji)
    createEntityIcon: function(match, isViewed) {
        const sideClass = match.side === 'ua' ? 'ent-ua' : match.side === 'ru' ? 'ent-ru' : 'ent-unk';
        const sizeClass = match.group === 'system' ? 'system-icon' : 'unit-icon';
        const filter = isViewed ? 'filter: grayscale(100%); opacity: 0.6;' : '';

        return L.divIcon({
            html: `<div class="entity-icon ${sizeClass} ${sideClass}" style="${filter}">${match.icon}</div>`,
            className: 'entity-marker',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    },

    // Create flag marker icon
    createFlagIcon: function(side, isViewed) {
        const flagClass = side === 'ua' ? 'flag-ua' : 'flag-ru';
        const filter = isViewed ? 'filter: grayscale(100%); opacity: 0.6;' : '';

        return L.divIcon({
            html: `<div class="flag-marker ${flagClass}" style="${filter}"></div>`,
            className: 'flag-marker-icon',
            iconSize: [20, 14],
            iconAnchor: [10, 7]
        });
    },

    // Create generic circle marker (for events with no entity match)
    createCircleMarker: function(latLng, side, isViewed) {
        const colors = {
            russian: isViewed ? '#999' : '#e74c3c',
            ukrainian: isViewed ? '#999' : '#4facfe',
            default: isViewed ? '#999' : '#27ae60'
        };

        const color = colors[side] || colors.default;

        return L.circleMarker(latLng, {
            radius: 6,
            fillColor: color,
            color: 'white',
            weight: 2,
            opacity: 1,
            fillOpacity: isViewed ? 0.4 : 0.8
        });
    },

    // Legacy marker icon function (for backward compatibility)
    getMarkerIcon: function(weaponType, side, isViewed) {
        const colors = {
            russian: isViewed ? '#999' : '#e74c3c',
            ukrainian: isViewed ? '#999' : '#4facfe',
            default: isViewed ? '#999' : '#27ae60'
        };

        const icons = {
            drone: '✈️', shahed: '🛩️', strike: '💥', missile: '🚀',
            combat: '⚔️', patriot: '🛡️', artillery: '🎯',
            iskander: '🚀', tank: '🚜', default: '📍'
        };

        const color = colors[side] || colors.default;
        const icon = icons[weaponType] || icons.default;
        const borderColor = isViewed ? '#666' : 'white';
        const filter = isViewed ? 'grayscale(100%)' : 'none';

        return L.divIcon({
            html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 3px solid ${borderColor}; box-shadow: 0 2px 10px rgba(0,0,0,0.3); filter: ${filter};">${icon}</div>`,
            className: 'custom-marker',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
    },

    render: function(events, onMarkerClick, state) {
        // Clear all layers
        this.clusterLayer.clearLayers();
        this.specialLayer.clearLayers();
        this.entityLayer.clearLayers();
        this.eventMarkers = {};

        // Clear selection line
        if (this.selectionLine) {
            this.map.removeLayer(this.selectionLine);
            this.selectionLine = null;
            const sidePanel = document.getElementById('sidePanel');
            if (sidePanel) {
                sidePanel.classList.remove('has-connection');
            }
        }

        let entityCount = 0;
        let flagCount = 0;
        let genericCount = 0;

        events.forEach(event => {
            if (!event.event_lat || !event.event_lng) return;

            const latLng = [event.event_lat, event.event_lng];
            const match = event.__match;
            const side = DataProcessor.detectSide(event);
            const isViewed = state.viewedEvents.has(event.event_id);

            let marker;

            // Route marker to appropriate layer based on entity match
            if (match && match.group === 'system') {
                // System marker → entityLayer
                marker = L.marker(latLng, {
                    icon: this.createEntityIcon(match, isViewed),
                    zIndexOffset: 1000  // Always on top
                });
                this.entityLayer.addLayer(marker);
                entityCount++;

            } else if (match && match.group === 'unit') {
                // Unit marker → entityLayer
                marker = L.marker(latLng, {
                    icon: this.createEntityIcon(match, isViewed),
                    zIndexOffset: 900  // Below systems
                });
                this.entityLayer.addLayer(marker);
                entityCount++;

            } else if (match && match.group === 'flag' && match.side !== 'unk') {
                // Flag marker → specialLayer
                marker = L.marker(latLng, {
                    icon: this.createFlagIcon(match.side, isViewed),
                    zIndexOffset: 800  // Below entities
                });
                this.specialLayer.addLayer(marker);
                flagCount++;

            } else {
                // Generic circle marker → clusterLayer
                marker = this.createCircleMarker(latLng, side, isViewed);
                this.clusterLayer.addLayer(marker);
                genericCount++;
            }

            // Attach click handler
            marker.on('click', () => onMarkerClick(event, L.latLng(latLng)));

            // Store reference
            this.eventMarkers[event.event_id] = marker;
        });

        console.log('📍 Markers rendered:');
        console.log(`  - Entity markers: ${entityCount}`);
        console.log(`  - Flag markers: ${flagCount}`);
        console.log(`  - Generic markers: ${genericCount}`);
        console.log(`  - Total: ${Object.keys(this.eventMarkers).length}`);
    },

    drawSelectionLine: function(markerLatLng) {
        if (this.selectionLine) {
            this.map.removeLayer(this.selectionLine);
        }

        // Calculate the actual screen position of the dot
        // The dot is at: left: calc(100vw - 360px), top: 50vh
        const viewportWidth = window.innerWidth;
        const dotScreenX = viewportWidth - 360; // Left edge of side panel

        // Convert screen position to map coordinates
        const viewportHeight = window.innerHeight;
        const dotScreenY = viewportHeight / 2; // 50vh

        // Get the map's pixel origin
        const dotLatLng = this.map.containerPointToLatLng([
            dotScreenX - this.map.getContainer().getBoundingClientRect().left,
            dotScreenY - this.map.getContainer().getBoundingClientRect().top
        ]);

        this.selectionLine = L.polyline([markerLatLng, dotLatLng], {
            color: '#667eea',
            weight: 4,
            dashArray: '10, 5',
            opacity: 0.9
        }).addTo(this.map);

        // Add connection point class to side panel
        const sidePanel = document.getElementById('sidePanel');
        if (sidePanel) {
            sidePanel.classList.add('has-connection');
        }
    },

    updateSelectionLine: function() {
        if (this.selectedEventId && this.eventMarkers[this.selectedEventId]) {
            const marker = this.eventMarkers[this.selectedEventId];
            this.drawSelectionLine(marker.getLatLng());
        }
    },

    setSelectedEvent: function(eventId) {
        this.selectedEventId = eventId;
    },

    updateMarkerIcon: function(eventId, weaponType, side, isViewed) {
        const marker = this.eventMarkers[eventId];
        if (marker) {
            // Check if it's an entity marker that needs special handling
            const event = App.state.allEvents.find(e => e.event_id === eventId);
            if (event && event.__match) {
                const match = event.__match;
                if (match.group === 'system' || match.group === 'unit') {
                    marker.setIcon(this.createEntityIcon(match, isViewed));
                    return;
                } else if (match.group === 'flag') {
                    marker.setIcon(this.createFlagIcon(match.side, isViewed));
                    return;
                }
            }

            // Fallback to legacy icon
            marker.setIcon(this.getMarkerIcon(weaponType, side, isViewed));
        }
    }
};
