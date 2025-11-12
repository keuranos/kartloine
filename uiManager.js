// UI Manager Module
const UIManager = {
    showEventDetail: function(event, state) {
        const analysis = DataProcessor.parseMultimodalAnalysis(event.multimodal_analysis);
        const isFavorite = state.favorites.has(event.event_id);
        const wcResult = event.__wcResult || { tag: null, score: 0 };
        
        let html = `
            <div class="event-detail">
                <div class="event-detail-header">
                    <div class="event-date">
                        ${event.event_date || 'N/A'}
                        ${wcResult.tag === 'pos' ? `<span class="wc-badge">⚠️ WC Score: ${wcResult.score}</span>` : ''}
                    </div>
                    <div class="event-title">${event.event_name || 'Unnamed Event'}</div>
                    <div class="event-location">📍 ${event.event_location || 'Unknown location'}</div>
                </div>
                <div class="event-description">${event.event_description || 'No description available'}</div>
                <div class="event-actions">
                    ${event.message_url ? `<button class="event-btn secondary" onclick="window.open('${event.message_url}', '_blank')">📱 Source</button>` : ''}
                    <button class="event-btn primary" onclick="UIManager.shareEvent('${event.event_id}')">🔗 Share</button>
                    <button class="event-btn favorite ${isFavorite ? 'active' : ''}" onclick="UIManager.toggleFavorite('${event.event_id}')">
                        ${isFavorite ? '⭐ Favorited' : '☆ Favorite'}
                    </button>
                </div>
        `;
        
        // Add analysis sections
        if (analysis.summary) {
            html += this.createAnalysisSection('summary', event.event_id, '📊 Multimodal Summary', analysis.summary);
        }
        if (analysis.osint) {
            html += this.createAnalysisSection('osint', event.event_id, '🔍 OSINT Analysis', analysis.osint);
        }
        if (analysis.political) {
            html += this.createAnalysisSection('political', event.event_id, '🏛️ Political Analysis', analysis.political);
        }
        if (analysis.topics) {
            html += this.createAnalysisSection('topics', event.event_id, '📑 Topic Modeling', analysis.topics);
        }
        if (analysis.entities) {
            html += this.createAnalysisSection('entities', event.event_id, '👥 Named Entities', analysis.entities);
        }
        if (analysis.sentiment) {
            html += this.createAnalysisSection('sentiment', event.event_id, '😊 Sentiment Analysis', analysis.sentiment);
        }
        
        html += `</div>`;
        
        const panel = document.getElementById('sidePanel');
        panel.classList.remove('empty');
        panel.innerHTML = html;
    },

    createAnalysisSection: function(type, eventId, title, content) {
        return `
            <div class="analysis-section">
                <div class="analysis-toggle" onclick="UIManager.toggleAnalysis(this, '${type}-${eventId}')">
                    <span>${title}</span>
                    <span>▼</span>
                </div>
                <div id="${type}-${eventId}" class="analysis-content">${DataProcessor.formatAnalysisText(content)}</div>
            </div>
        `;
    },

    toggleAnalysis: function(element, id) {
        const content = document.getElementById(id);
        const arrow = element.querySelector('span:last-child');
        content.classList.toggle('show');
        arrow.textContent = content.classList.contains('show') ? '▲' : '▼';
    },

    shareEvent: function(eventId) {
        if (!eventId || eventId === 'undefined') {
            console.error('Cannot share event: invalid event ID');
            alert('Unable to share this event. Event ID is missing.');
            return;
        }

        const url = `${window.location.origin}${window.location.pathname}?event=${eventId}`;

        // Try to copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                alert('✅ Link copied to clipboard!\n\n' + url);
            }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback: show the URL in a prompt
                prompt('Copy this link:', url);
            });
        } else {
            // Fallback for browsers without clipboard API
            prompt('Copy this link:', url);
        }
    },

    toggleFavorite: function(eventId) {
        if (App.state.favorites.has(eventId)) {
            App.state.favorites.delete(eventId);
        } else {
            App.state.favorites.add(eventId);
        }
        StorageManager.save(App.state.viewedEvents, App.state.favorites);
        App.render();
        
        // Refresh side panel if this event is displayed
        if (App.state.selectedEventId === eventId) {
            const event = App.state.allEvents.find(e => e.event_id === eventId);
            if (event) this.showEventDetail(event, App.state);
        }
    },

    updateStats: function(filteredEvents, state) {
        const locations = new Set(filteredEvents.map(e => e.event_location)).size;
        const entities = new Set();
        filteredEvents.forEach(e => {
            if (e.osint_entities) {
                e.osint_entities.split(',').forEach(ent => entities.add(ent.trim()));
            }
        });
        
        const totalEvents = state.allEvents.length;
        const warCrimes = filteredEvents.filter(e => e.__wcResult && e.__wcResult.tag === 'pos').length;
        const dailyReports = state.dailyReports.length;
        const favoritesCount = state.favorites.size;
        
        const statsHtml = `
            <div class="stat-card total" onclick="UIManager.openModal('events')">
                <div class="label">TOTAL EVENTS</div>
                <div class="value">${totalEvents}</div>
            </div>
            <div class="stat-card locations" onclick="UIManager.openModal('locations')">
                <div class="label">UNIQUE LOCATIONS</div>
                <div class="value">${locations}</div>
            </div>
            <div class="stat-card entities" onclick="UIManager.openModal('entities')">
                <div class="label">ENTITIES TRACKED</div>
                <div class="value">${entities.size}</div>
            </div>
            <div class="stat-card war-crimes" onclick="UIManager.openModal('warCrimes')">
                <div class="label">WAR CRIMES</div>
                <div class="value">${warCrimes}</div>
            </div>
            <div class="stat-card reports" onclick="UIManager.openModal('reports')">
                <div class="label">DAILY REPORTS</div>
                <div class="value">${dailyReports}</div>
            </div>
            <div class="stat-card favorites" onclick="UIManager.openModal('favorites')">
                <div class="label">FAVORITES</div>
                <div class="value">${favoritesCount}</div>
            </div>
            <div class="stat-card network" onclick="UIManager.openModal('network')">
                <div class="label">NETWORK GRAPH</div>
                <div class="value">🕸️</div>
            </div>
            <div class="stat-card reset" onclick="App.resetAllFilters()">
                <div class="label">RESET ALL</div>
                <div class="value">🔄</div>
            </div>
        `;
        
        document.getElementById('stats').innerHTML = statsHtml;
        
        // Date range display removed - now integrated into timeline controls
    },


    filterWarCrimes: function() {
        // Cycle through: all → likely → strong → all
        if (App.state.warCrimeFilter === 'all') {
            App.state.warCrimeFilter = 'likely';
            alert('⚠️ War Crimes: Showing likely incidents only\n\nEvents with WC Score ≥ 2');
        } else if (App.state.warCrimeFilter === 'likely') {
            App.state.warCrimeFilter = 'strong';
            alert('⚠️ War Crimes: Showing strong indicators only\n\nEvents with WC Score ≥ 4');
        } else {
            App.state.warCrimeFilter = 'all';
            alert('⚠️ War Crimes: Showing all events');
        }
        
        // Update radio buttons
        document.getElementById(`wc-${App.state.warCrimeFilter}`).checked = true;
        
        App.applyFilters();
    },

    // Modal functions
    openModal: function(type) {
        // If already filtered, reset it first
        if (App.state.modalSelections[type] && App.state.modalSelections[type].size > 0) {
            if (confirm(`Reset ${type} filter and show all?`)) {
                App.state.modalSelections[type].clear();
                App.applyFilters();
            }
            return;
        }

        if (type === 'reports') {
            this.openReportsModal();
            return;
        }
        
        if (type === 'favorites') {
            this.openFavoritesModal();
            return;
        }
        
        if (type === 'network') {
            this.openNetworkModal();
            return;
        }

        // Prepare modal data
        if (type === 'events') {
            this.prepareEventsModal();
        } else if (type === 'locations') {
            this.prepareLocationsModal();
        } else if (type === 'entities') {
            this.prepareEntitiesModal();
        } else if (type === 'warCrimes') {
            document.getElementById('warCrimesModal').style.display = 'block';
            return;
        }
        
        document.getElementById(type + 'Modal').style.display = 'block';
    },

    closeModal: function(modalId) {
        document.getElementById(modalId).style.display = 'none';
    },

    prepareEventsModal: function() {
        const events = App.state.allEvents;
        const modalList = document.getElementById('eventsModalList');
        
        modalList.innerHTML = events.map(event => `
            <div class="modal-item">
                <input type="checkbox" id="event-${event.event_id}" value="${event.event_id}">
                <label class="modal-item-label" for="event-${event.event_id}">
                    <strong>${event.event_name || 'Unnamed'}</strong><br>
                    <small>${event.event_date || 'No date'} - ${event.event_location || 'Unknown'}</small>
                </label>
            </div>
        `).join('');
        
        // Add event listeners
        modalList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    App.state.modalSelections.events.add(cb.value);
                } else {
                    App.state.modalSelections.events.delete(cb.value);
                }
                this.updateModalSelectionCount('events');
            });
        });
        
        this.updateModalSelectionCount('events');
    },

    prepareLocationsModal: function() {
        const locations = [...new Set(App.state.allEvents.map(e => e.event_location))].filter(Boolean).sort();
        const modalList = document.getElementById('locationsModalList');
        
        modalList.innerHTML = locations.map(location => {
            const count = App.state.allEvents.filter(e => e.event_location === location).length;
            return `
                <div class="modal-item">
                    <input type="checkbox" id="location-${location}" value="${location}">
                    <label class="modal-item-label" for="location-${location}">
                        <strong>${location}</strong><br>
                        <small>${count} events</small>
                    </label>
                </div>
            `;
        }).join('');
        
        modalList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    App.state.modalSelections.locations.add(cb.value);
                } else {
                    App.state.modalSelections.locations.delete(cb.value);
                }
                this.updateModalSelectionCount('locations');
            });
        });
        
        this.updateModalSelectionCount('locations');
    },

    prepareEntitiesModal: function() {
        const entitiesMap = new Map();
        App.state.allEvents.forEach(event => {
            if (event.osint_entities) {
                event.osint_entities.split(',').forEach(entity => {
                    const trimmed = entity.trim();
                    entitiesMap.set(trimmed, (entitiesMap.get(trimmed) || 0) + 1);
                });
            }
        });
        
        const entities = [...entitiesMap.entries()].sort((a, b) => b[1] - a[1]);
        const modalList = document.getElementById('entitiesModalList');
        
        modalList.innerHTML = entities.map(([entity, count]) => `
            <div class="modal-item">
                <input type="checkbox" id="entity-${entity}" value="${entity}">
                <label class="modal-item-label" for="entity-${entity}">
                    <strong>${entity}</strong><br>
                    <small>${count} events</small>
                </label>
            </div>
        `).join('');
        
        modalList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    App.state.modalSelections.entities.add(cb.value);
                } else {
                    App.state.modalSelections.entities.delete(cb.value);
                }
                this.updateModalSelectionCount('entities');
            });
        });
        
        this.updateModalSelectionCount('entities');
    },

    updateModalSelectionCount: function(type) {
        const count = App.state.modalSelections[type].size;
        const el = document.getElementById(`${type}SelectionCount`);
        if (el) {
            el.textContent = `${count} ${type} selected`;
        }
    },

    filterModalItems: function(type) {
        const searchTerm = document.getElementById(`${type}ModalSearch`).value.toLowerCase();
        const items = document.querySelectorAll(`#${type}ModalList .modal-item`);
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
        });
    },

    openReportsModal: function() {
        const modal = document.getElementById('reportsModal');
        const dayList = document.getElementById('reportsDayList');
        
        // Group reports by date
        const reportsByDate = new Map();
        App.state.dailyReports.forEach(report => {
            const date = report.date;
            if (!reportsByDate.has(date)) {
                reportsByDate.set(date, []);
            }
            reportsByDate.get(date).push(report);
        });
        
        // Sort dates (newest first)
        const sortedDates = [...reportsByDate.keys()].sort().reverse();
        
        dayList.innerHTML = sortedDates.map(date => {
            const reports = reportsByDate.get(date);
            return `
                <div class="day-item" onclick="UIManager.showDailyReport('${date}')">
                    <strong>📅 ${date}</strong>
                    <small>${reports.length} report(s)</small>
                </div>
            `;
        }).join('');
        
        modal.style.display = 'block';
    },

    showDailyReport: function(date) {
        const reports = App.state.dailyReports.filter(r => r.date === date);
        if (reports.length === 0) {
            alert('No report found for this date');
            return;
        }
        
        const report = reports[0];
        App.state.currentReport = report;
        
        document.getElementById('reportsDayList').style.display = 'none';
        document.getElementById('reportsActions').style.display = 'flex';
        
        const content = document.getElementById('reportContent');
        content.style.display = 'block';
        
        // Format the report text (preserve line breaks and basic formatting)
        let formattedContent = report.content || 'No content available';
        
        // Convert markdown-style formatting to HTML
        formattedContent = formattedContent
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>') // Bold + italic
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.+?)\*/g, '<em>$1</em>') // Italic
            .replace(/\n\n/g, '</p><p>') // Paragraphs
            .replace(/\n/g, '<br>') // Line breaks
            .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>') // Headers level 3
            .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>') // Headers level 2
            .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>'); // Headers level 1
        
        content.innerHTML = `
            <h3 style="color: #667eea; margin-bottom: 15px;">📅 Daily Report: ${date}</h3>
            <div class="report-text" style="
                line-height: 1.6;
                color: #333;
                max-height: 600px;
                overflow-y: auto;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 8px;
            ">
                <p>${formattedContent}</p>
            </div>
        `;
    },

    openFavoritesModal: function() {
        const modal = document.getElementById('favoritesModal');
        const list = document.getElementById('favoritesList');
        
        const favorites = App.state.allEvents.filter(e => App.state.favorites.has(e.event_id));
        
        if (favorites.length === 0) {
            list.innerHTML = '<div class="feed-empty"><div>No favorites yet</div></div>';
        } else {
            list.innerHTML = favorites.map(event => `
                <div class="modal-item" onclick="UIManager.showEventFromFavorites('${event.event_id}')">
                    <div class="modal-item-label">
                        <strong>${event.event_name || 'Unnamed'}</strong><br>
                        <small>${event.event_date || 'No date'} - ${event.event_location || 'Unknown'}</small>
                    </div>
                </div>
            `).join('');
        }
        
        modal.style.display = 'block';
    },

    showEventFromFavorites: function(eventId) {
        this.closeModal('favoritesModal');
        const event = App.state.allEvents.find(e => e.event_id === eventId);
        if (event) {
            const marker = MapManager.eventMarkers[eventId];
            if (marker) {
                App.onMarkerClick(event, marker.getLatLng());
                MapManager.map.setView(marker.getLatLng(), 12);
            }
        }
    },

    openNetworkModal: function() {
        const modal = document.getElementById('networkModal');
        modal.style.display = 'block';
        
        // Build network data
        const nodes = new Set();
        const edges = [];
        
        App.state.filteredEvents.forEach(event => {
            if (event.osint_entities) {
                const entities = event.osint_entities.split(',').map(e => e.trim());
                entities.forEach(entity => nodes.add(entity));
                
                // Create edges between entities in the same event
                for (let i = 0; i < entities.length; i++) {
                    for (let j = i + 1; j < entities.length; j++) {
                        edges.push({ from: entities[i], to: entities[j] });
                    }
                }
            }
        });
        
        const networkData = {
            nodes: [...nodes].map(id => ({ id, label: id })),
            edges: edges
        };
        
        const container = document.getElementById('networkGraph');
        new vis.Network(container, networkData, {
            nodes: { shape: 'dot', size: 20 },
            edges: { color: '#667eea' },
            physics: { stabilization: true }
        });
    },

    populateFeed: function(events) {
        console.log('populateFeed called with', events ? events.length : 0, 'events');
        
        const feedContent = document.getElementById('feedContent');
        
        if (!feedContent) {
            console.error('Feed content element not found!');
            return;
        }
        
        if (!events || events.length === 0) {
            console.log('No events to display in feed');
            feedContent.innerHTML = `
                <div class="feed-empty">
                    <div style="font-size: 48px; margin-bottom: 20px;">📱</div>
                    <div>No events to display</div>
                    <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">Try adjusting your filters</div>
                </div>
            `;
            return;
        }
        
        // Sort events by message_date or event_date (newest first)
        const sortedEvents = [...events].sort((a, b) => {
            const dateA = a.message_date || a.event_date || '';
            const dateB = b.message_date || b.event_date || '';
            return dateB.localeCompare(dateA);
        });
        
        console.log('Rendering', sortedEvents.length, 'events in feed');
        
        feedContent.innerHTML = sortedEvents.map(event => {
            // Use translated_text (English) instead of message_text
            const messageText = event.translated_text || event.event_description || event.message_text || 'No message text available';
            const messageDate = event.message_date || event.event_date || 'N/A';
            
            // Format time if available (HH:MM:SS)
            let displayDate = messageDate;
            if (messageDate && messageDate.includes(' ')) {
                // Has time component
                const [date, time] = messageDate.split(' ');
                const [hours, minutes] = time.split(':');
                displayDate = `${date} ${hours}:${minutes}`;
            }
            
            return `
            <div class="feed-item" id="feed-${event.event_id}">
                <div class="feed-item-date">
                    📅 ${displayDate}
                </div>
                <div class="feed-item-title">
                    ${event.event_name || 'Unnamed Event'}
                </div>
                <div class="feed-item-description">
                    ${messageText.substring(0, 200)}${messageText.length > 200 ? '...' : ''}
                </div>
                <div class="feed-item-location">
                    📍 ${event.event_location || 'Unknown location'}
                </div>
                <div class="feed-item-buttons">
                    <button class="feed-btn-map" onclick="UIManager.showOnMap('${event.event_id}'); event.stopPropagation();">
                        🗺️ Show on Map
                    </button>
                    ${event.message_url ? `
                        <a href="${event.message_url}" target="_blank" onclick="event.stopPropagation();" class="feed-btn-telegram">
                            🔗 View on Telegram
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
        }).join('');
        
        console.log('Feed populated successfully');
    },

    showOnMap: function(eventId) {
        console.log('🗺️ showOnMap called with eventId:', eventId);

        // Find event in filtered or all events
        let event = App.state.filteredEvents.find(e => e.event_id === eventId);
        if (!event) {
            console.log('Event not in filtered, searching all events...');
            event = App.state.allEvents.find(e => e.event_id === eventId);
        }

        if (!event) {
            console.error('❌ Event not found:', eventId);
            alert('Event not found. The event ID may be invalid.');
            return;
        }

        console.log('✅ Event found:', event.event_name);

        // Check if event has coordinates
        if (!event.event_lat || !event.event_lng) {
            console.error('❌ Event has no coordinates');
            alert('This event has no location data.');
            return;
        }

        console.log('📍 Event coordinates:', event.event_lat, event.event_lng);

        // Update feed UI
        document.querySelectorAll('.feed-item').forEach(item => {
            item.classList.remove('active');
        });
        const feedItem = document.getElementById(`feed-${eventId}`);
        if (feedItem) {
            feedItem.classList.add('active');
            console.log('✅ Feed item highlighted');
        }

        // Get marker - if not found, we need to ensure event is added to filtered
        let marker = MapManager.eventMarkers[eventId];
        if (!marker) {
            console.log('⚠️ Marker not found, event may be filtered out. Adding to filtered events...');

            // Temporarily add event to filtered events if not already there
            if (!App.state.filteredEvents.includes(event)) {
                App.state.filteredEvents.push(event);
                // Re-render map to create the marker
                MapManager.render(App.state.filteredEvents, (e, latLng) => {
                    App.onMarkerClick(e, latLng);
                }, App.state);
            }

            // Try to get marker again
            marker = MapManager.eventMarkers[eventId];
            if (!marker) {
                console.error('❌ Failed to create marker for event');
                alert('Unable to show event on map. Please try again.');
                return;
            }
        }

        console.log('✅ Marker found, centering map...');
        const latLng = marker.getLatLng();

        // Center map with animation
        MapManager.map.setView(latLng, 12, {
            animate: true,
            duration: 1
        });

        console.log('✅ Triggering marker click...');
        // Trigger marker click which draws line and shows details
        App.onMarkerClick(event, latLng);

        console.log('✅ showOnMap complete!');
    },

    onFeedItemClick: function(eventId) {
        // This is now handled by showOnMap button
        // Keep for backward compatibility
        this.showOnMap(eventId);
    },

    updateFeedActiveItem: function(eventId) {
        document.querySelectorAll('.feed-item').forEach(item => {
            item.classList.remove('active');
        });
        const feedItem = document.getElementById(`feed-${eventId}`);
        if (feedItem) {
            feedItem.classList.add('active');
            // Scroll to active item
            feedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
};

// Export global functions that HTML needs
window.closeModal = (id) => UIManager.closeModal(id);
window.clearModalSelection = (type) => {
    App.state.modalSelections[type].clear();
    document.querySelectorAll(`#${type}ModalList input[type="checkbox"]`).forEach(cb => cb.checked = false);
    UIManager.updateModalSelectionCount(type);
};
window.applyModalFilter = (type) => {
    UIManager.closeModal(type + 'Modal');
    App.applyFilters();
};
window.backToReportsList = () => {
    document.getElementById('reportsDayList').style.display = 'block';
    document.getElementById('reportContent').style.display = 'none';
    document.getElementById('reportsActions').style.display = 'none';
};
window.showReportEvents = () => {
    if (App.state.currentReport && App.state.currentReport.eventIds) {
        App.state.filteredEvents = App.state.allEvents.filter(e => 
            App.state.currentReport.eventIds.includes(e.event_id)
        );
        App.render();
        UIManager.closeModal('reportsModal');
    }
};
window.clearFavorites = () => {
    if (confirm('Clear all favorites?')) {
        App.state.favorites.clear();
        StorageManager.save(App.state.viewedEvents, App.state.favorites);
        App.render();
        UIManager.closeModal('favoritesModal');
    }
};
window.shareFavorites = () => {
    const favIds = [...App.state.favorites].join(',');
    const url = window.location.origin + window.location.pathname + '?favorites=' + favIds;
    navigator.clipboard.writeText(url).then(() => {
        alert('Favorites link copied to clipboard!');
    });
};
window.showFavoritesOnMap = () => {
    App.state.filteredEvents = App.state.allEvents.filter(e => App.state.favorites.has(e.event_id));
    App.render();
    UIManager.closeModal('favoritesModal');
};
