// Map Manager Module
const MapManager = {
    map: null,
    markersLayer: null,
    eventMarkers: {},
    selectionLine: null,
    selectedEventId: null,

    init: function() {
        this.map = L.map('map').setView([49.0, 32.0], 6);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        this.markersLayer = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        
        this.map.addLayer(this.markersLayer);
        
        // Update line on map move/zoom
        this.map.on('move', () => this.updateSelectionLine());
        this.map.on('zoom', () => this.updateSelectionLine());
    },

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
        this.markersLayer.clearLayers();
        this.eventMarkers = {};
        
        if (this.selectionLine) {
            this.map.removeLayer(this.selectionLine);
            this.selectionLine = null;
            // Remove connection indicator
            const sidePanel = document.getElementById('sidePanel');
            if (sidePanel) {
                sidePanel.classList.remove('has-connection');
            }
        }
        
        events.forEach(event => {
            if (event.event_lat && event.event_lng) {
                const weaponType = DataProcessor.getWeaponType(event);
                const side = DataProcessor.detectSide(event);
                const isViewed = state.viewedEvents.has(event.event_id);
                
                const marker = L.marker([event.event_lat, event.event_lng], {
                    icon: this.getMarkerIcon(weaponType, side, isViewed)
                });
                
                marker.on('click', () => onMarkerClick(event, marker.getLatLng()));
                this.markersLayer.addLayer(marker);
                this.eventMarkers[event.event_id] = marker;
            }
        });
    },

    drawSelectionLine: function(markerLatLng) {
        if (this.selectionLine) {
            this.map.removeLayer(this.selectionLine);
        }

        // Calculate the connection point at the center of viewport
        const mapBounds = this.map.getBounds();
        const mapCenter = this.map.getCenter();

        // Get the right edge of the map (left edge of side panel)
        const rightEdge = mapBounds.getEast();

        // Use viewport center latitude for the endpoint
        const endPoint = [mapCenter.lat, rightEdge];

        this.selectionLine = L.polyline([markerLatLng, endPoint], {
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
            marker.setIcon(this.getMarkerIcon(weaponType, side, isViewed));
        }
    }
};