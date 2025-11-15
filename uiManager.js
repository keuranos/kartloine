// UI Manager Module
const UIManager = {
    // Track which analysis sections are pinned open
    openAnalysisSections: new Set(),

    // Format date to Finnish format (dd. monthname yyyy)
    formatDateFinnish: function(dateString) {
        if (!dateString || dateString === 'N/A') return dateString;

        const finnishMonths = [
            'tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu',
            'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu'
        ];

        // Handle yyyy-mm-dd format
        const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const [, year, month, day] = match;
            const monthIndex = parseInt(month, 10) - 1;
            const monthName = finnishMonths[monthIndex];
            return `${parseInt(day, 10)}. ${monthName} ${year}`;
        }

        return dateString; // Return as-is if format not recognized
    },

    showEventDetail: function(event, state) {
        const analysis = DataProcessor.parseMultimodalAnalysis(event.multimodal_analysis);
        const isFavorite = state.favorites.has(event.event_id);
        const wcResult = event.__wcResult || { tag: null, score: 0 };

        let html = `
            <div class="event-detail">
                <div class="event-detail-header">
                    <div class="event-date">
                        ${this.formatDateFinnish(event.event_date) || 'N/A'}
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

        // Add analysis sections with pinned state
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

        // Restore pinned sections after rendering
        this.restorePinnedSections(event.event_id);
    },

    createAnalysisSection: function(type, eventId, title, content) {
        const isPinned = this.openAnalysisSections.has(type);
        const showClass = isPinned ? 'show' : '';
        const arrow = isPinned ? '▲' : '▼';

        return `
            <div class="analysis-section">
                <div class="analysis-toggle" onclick="UIManager.toggleAnalysis(this, '${type}', '${eventId}')">
                    <span>${title}</span>
                    <span>${arrow}</span>
                </div>
                <div id="${type}-${eventId}" class="analysis-content ${showClass}">${DataProcessor.formatAnalysisText(content)}</div>
            </div>
        `;
    },

    restorePinnedSections: function(eventId) {
        // Apply pinned state to all sections
        this.openAnalysisSections.forEach(type => {
            const contentId = `${type}-${eventId}`;
            const content = document.getElementById(contentId);
            if (content) {
                content.classList.add('show');
            }
        });
    },

    toggleAnalysis: function(element, type, eventId) {
        const contentId = `${type}-${eventId}`;
        const content = document.getElementById(contentId);
        const arrow = element.querySelector('span:last-child');

        content.classList.toggle('show');
        const isOpen = content.classList.contains('show');
        arrow.textContent = isOpen ? '▲' : '▼';

        // Update pinned state
        if (isOpen) {
            this.openAnalysisSections.add(type);
            console.log('📌 Pinned section:', type);
        } else {
            this.openAnalysisSections.delete(type);
            console.log('📍 Unpinned section:', type);
        }
    },

    shareEvent: function(eventId) {
        if (!eventId || eventId === 'undefined') {
            console.error('Cannot share event: invalid event ID');
            alert('Unable to share this event. Event ID is missing.');
            return;
        }

        // Get current map zoom level
        const currentZoom = MapManager.map.getZoom();
        const url = `${window.location.origin}${window.location.pathname}?event=${eventId}&zoom=${currentZoom}`;

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

        // Count systems and units
        const systemsCount = filteredEvents.filter(e => e.__match && e.__match.group === 'system').length;
        const unitsCount = filteredEvents.filter(e => e.__match && e.__match.group === 'unit').length;

        // Count only valid daily reports (exclude incomplete ones)
        const errorText = "I'm ready to compile the daily OSINT report, but I need the actual analysis results of the Telegram";
        const dailyReports = state.dailyReports.filter(r => !r.content || !r.content.includes(errorText)).length;
        const favoritesCount = state.favorites.size;

        // Save audio player state before updating
        const audioPlayer = document.getElementById('timelinePodcast');
        let audioState = null;
        if (audioPlayer) {
            audioState = {
                currentTime: audioPlayer.currentTime,
                paused: audioPlayer.paused,
                volume: audioPlayer.volume
            };
        }

        const statsHtml = `
            <div class="stat-card total" onclick="UIManager.openModal('events')">
                <div class="label">EVENTS</div>
                <div class="value">${totalEvents}</div>
            </div>
            <div class="stat-card locations" onclick="UIManager.openModal('locations')">
                <div class="label">LOCATIONS</div>
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
            <div class="stat-card stat-card-systems" onclick="EntityFilters.openSystemsModal()">
                <div class="label">SYSTEMS</div>
                <div class="value">${systemsCount}</div>
            </div>
            <div class="stat-card stat-card-units" onclick="EntityFilters.openUnitsModal()">
                <div class="label">UNITS</div>
                <div class="value">${unitsCount}</div>
            </div>
            <div class="stat-card reports" onclick="UIManager.openModal('reports')">
                <div class="label">DAILY REPORTS</div>
                <div class="value">${dailyReports}</div>
            </div>
            <div class="podcast-player-inline">
                <div class="podcast-label-inline">📻 Timeline Podcast</div>
                <audio id="timelinePodcast" controls preload="metadata">
                    <source src="podcast.m4a" type="audio/mp4">
                </audio>
            </div>
            <div class="stat-card favorites" onclick="UIManager.openModal('favorites')">
                <div class="label">FAVORITES</div>
                <div class="value">${favoritesCount}</div>
            </div>
        `;

        document.getElementById('stats').innerHTML = statsHtml;

        // Restore audio player state after updating
        if (audioState) {
            const newAudioPlayer = document.getElementById('timelinePodcast');
            if (newAudioPlayer) {
                newAudioPlayer.currentTime = audioState.currentTime;
                newAudioPlayer.volume = audioState.volume;
                if (!audioState.paused) {
                    // Use a promise to handle autoplay restrictions
                    newAudioPlayer.play().catch(err => {
                        console.log('Audio autoplay prevented:', err);
                    });
                }
            }
        }

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
                    <small>${this.formatDateFinnish(event.event_date) || 'No date'} - ${event.event_location || 'Unknown'}</small>
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
        const select = document.getElementById('reportDateSelect');

        // Group reports by date, filtering out incomplete reports
        const reportsByDate = new Map();
        const errorText = "I'm ready to compile the daily OSINT report, but I need the actual analysis results of the Telegram";

        App.state.dailyReports.forEach(report => {
            // Skip reports that contain the error message
            if (report.content && report.content.includes(errorText)) {
                return;
            }

            const date = report.date;
            if (!reportsByDate.has(date)) {
                reportsByDate.set(date, []);
            }
            reportsByDate.get(date).push(report);
        });

        // Sort dates (newest first)
        const sortedDates = [...reportsByDate.keys()].sort().reverse();

        // Populate dropdown
        select.innerHTML = '<option value="">-- Select a date --</option>' +
            sortedDates.map(date => {
                const reports = reportsByDate.get(date);
                return `<option value="${date}">📅 ${this.formatDateFinnish(date)} (${reports.length} report${reports.length > 1 ? 's' : ''})</option>`;
            }).join('');

        // Reset content and hide Show on Map button and Share button
        document.getElementById('reportContent').style.display = 'none';
        const showEventsBtn = document.getElementById('showEventsBtn');
        if (showEventsBtn) showEventsBtn.style.display = 'none';
        const shareReportBtn = document.getElementById('shareReportBtn');
        if (shareReportBtn) shareReportBtn.style.display = 'none';

        modal.style.display = 'block';
    },

    showDailyReport: function(date) {
        // Handle empty selection
        if (!date) {
            document.getElementById('reportContent').style.display = 'none';
            const showEventsBtn = document.getElementById('showEventsBtn');
            if (showEventsBtn) showEventsBtn.style.display = 'none';
            const shareReportBtn = document.getElementById('shareReportBtn');
            if (shareReportBtn) shareReportBtn.style.display = 'none';
            return;
        }

        const reports = App.state.dailyReports.filter(r => r.date === date);
        if (reports.length === 0) {
            alert('No report found for this date');
            return;
        }

        const report = reports[0];

        // Check if this is an incomplete report
        const errorText = "I'm ready to compile the daily OSINT report, but I need the actual analysis results of the Telegram";
        if (report.content && report.content.includes(errorText)) {
            alert('This report is incomplete and cannot be displayed');
            return;
        }

        App.state.currentReport = report;
        App.state.currentReport.date = date; // Store the date for filtering

        // Show the "Show on Map" button and "Share Report" button
        const showEventsBtn = document.getElementById('showEventsBtn');
        if (showEventsBtn) showEventsBtn.style.display = 'inline-block';
        const shareReportBtn = document.getElementById('shareReportBtn');
        if (shareReportBtn) shareReportBtn.style.display = 'inline-block';

        const content = document.getElementById('reportContent');
        content.style.display = 'block';

        // Format the report text with beautiful modern styling
        let formattedContent = report.content || 'No content available';

        // Step 1: Convert markdown headings with emoji support
        formattedContent = formattedContent
            .replace(/^#\s+(.+)$/gm, '<h1 class="report-h1">$1</h1>')
            .replace(/^##\s+(.+)$/gm, '<h2 class="report-h2">$1</h2>')
            .replace(/^###\s+(.+)$/gm, '<h3 class="report-h3">$1</h3>')
            .replace(/^####\s+(.+)$/gm, '<h4 class="report-h4">$1</h4>');

        // Step 2: Convert markdown tables to styled HTML tables
        const tableRegex = /\|(.+)\|\n\|[\-:\s\|]+\|\n((?:\|.+\|\n?)+)/g;
        formattedContent = formattedContent.replace(tableRegex, (match, header, rows) => {
            const headers = header.split('|').filter(h => h.trim()).map(h => `<th>${h.trim()}</th>`).join('');
            const rowsHtml = rows.trim().split('\n').map(row => {
                const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
                return `<tr>${cells}</tr>`;
            }).join('');
            return `<table class="report-table"><thead><tr>${headers}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
        });

        // Step 3: Convert markdown lists (numbered and bullet)
        formattedContent = formattedContent
            .replace(/^\d+\.\s+(.+)$/gm, '<li class="report-list-item">$1</li>')
            .replace(/^[\*\-]\s+(.+)$/gm, '<li class="report-list-item">$1</li>');

        // Wrap consecutive list items in <ol> or <ul>
        formattedContent = formattedContent.replace(/(<li class="report-list-item">.+?<\/li>\n?)+/g, (match) => {
            return `<ul class="report-list">${match}</ul>`;
        });

        // Step 4: Convert bold, italic, and bold+italic
        formattedContent = formattedContent
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Step 5: Handle section dividers
        formattedContent = formattedContent.replace(/^---$/gm, '<hr class="report-divider">');

        // Step 6: Convert paragraphs (double line breaks)
        formattedContent = formattedContent
            .replace(/\n\n/g, '</p><p class="report-paragraph">')
            .replace(/\n/g, '<br>');

        // Wrap content in paragraph tags
        formattedContent = `<p class="report-paragraph">${formattedContent}</p>`;

        // Clean up empty paragraphs
        formattedContent = formattedContent.replace(/<p class="report-paragraph"><\/p>/g, '');

        content.innerHTML = `
            <div class="report-container">
                <div class="report-header">
                    <h2 class="report-title">📅 Daily Report: ${this.formatDateFinnish(date)}</h2>
                </div>
                <div class="report-content-wrapper">
                    ${formattedContent}
                </div>
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
                        <small>${this.formatDateFinnish(event.event_date) || 'No date'} - ${event.event_location || 'Unknown'}</small>
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

    openFilterPreferencesModal: function() {
        const modal = document.getElementById('filterPreferencesModal');
        modal.style.display = 'block';

        // Get current map state
        const center = MapManager.map.getCenter();
        const zoom = MapManager.map.getZoom();

        // Build shareable URL with current filters and map view
        const params = new URLSearchParams();
        params.set('lat', center.lat.toFixed(6));
        params.set('lng', center.lng.toFixed(6));
        params.set('zoom', zoom);

        // Add active filters
        if (EntityFilters.selectedSystems.size > 0) {
            params.set('systems', Array.from(EntityFilters.selectedSystems).join(','));
        }
        if (EntityFilters.selectedUnits.size > 0) {
            params.set('units', Array.from(EntityFilters.selectedUnits).join(','));
        }
        if (App.state.warCrimeFilter !== 'all') {
            params.set('wcFilter', App.state.warCrimeFilter);
        }

        const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        document.getElementById('filterShareUrl').value = shareUrl;
    },

    openAboutModal: function() {
        const modal = document.getElementById('aboutModal');
        modal.style.display = 'block';
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

            // Format date to Finnish format and keep time if available
            let displayDate = messageDate;
            if (messageDate && messageDate !== 'N/A') {
                if (messageDate.includes(' ')) {
                    // Has time component (yyyy-mm-dd HH:MM:SS)
                    const [date, time] = messageDate.split(' ');
                    const formattedDate = this.formatDateFinnish(date);
                    const [hours, minutes] = time.split(':');
                    displayDate = `${formattedDate} ${hours}:${minutes}`;
                } else {
                    // Date only
                    displayDate = this.formatDateFinnish(messageDate);
                }
            }

            // Truncate for preview
            const isTruncated = messageText.length > 200;
            const previewText = isTruncated ? messageText.substring(0, 200) + '...' : messageText;

            return `
            <div class="feed-item" id="feed-${event.event_id}">
                <div class="feed-item-date">
                    📅 ${displayDate}
                </div>
                <div class="feed-item-title">
                    ${event.event_name || 'Unnamed Event'}
                </div>
                <div class="feed-item-description">
                    <span class="feed-text-preview" id="preview-${event.event_id}">${previewText}</span>
                    <span class="feed-text-full" id="full-${event.event_id}" style="display: none;">${messageText}</span>
                    ${isTruncated ? `
                        <button class="feed-expand-btn" onclick="UIManager.toggleFeedText('${event.event_id}'); event.stopPropagation();">
                            <span id="expand-icon-${event.event_id}">▼</span> <span id="expand-text-${event.event_id}">More</span>
                        </button>
                    ` : ''}
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

    toggleFeedText: function(eventId) {
        const preview = document.getElementById(`preview-${eventId}`);
        const full = document.getElementById(`full-${eventId}`);
        const icon = document.getElementById(`expand-icon-${eventId}`);
        const text = document.getElementById(`expand-text-${eventId}`);

        if (preview && full && icon && text) {
            const isExpanded = full.style.display !== 'none';

            if (isExpanded) {
                // Collapse
                preview.style.display = 'inline';
                full.style.display = 'none';
                icon.textContent = '▼';
                text.textContent = 'More';
            } else {
                // Expand
                preview.style.display = 'none';
                full.style.display = 'inline';
                icon.textContent = '▲';
                text.textContent = 'Less';
            }
        }
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
        // Remove active class and flash animation from all items
        document.querySelectorAll('.feed-item').forEach(item => {
            item.classList.remove('active', 'flash');
        });

        const feedItem = document.getElementById(`feed-${eventId}`);
        if (feedItem) {
            // Add active class
            feedItem.classList.add('active');

            // Scroll to active item
            feedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Add flash animation after a short delay (so scroll completes first)
            setTimeout(() => {
                feedItem.classList.add('flash');

                // Remove flash class after animation completes
                setTimeout(() => {
                    feedItem.classList.remove('flash');
                }, 1500); // Match animation duration
            }, 500); // Wait for scroll to mostly complete
        }
    },

    toggleDarkMode: function() {
        const body = document.body;
        const btn = document.getElementById('darkModeToggleBtn');

        if (body.classList.contains('dark-mode')) {
            // Switch to light mode
            body.classList.remove('dark-mode');
            btn.innerHTML = '<span style="font-size: 18px;">🌙</span>';
            localStorage.setItem('darkMode', 'false');
        } else {
            // Switch to dark mode
            body.classList.add('dark-mode');
            btn.innerHTML = '<span style="font-size: 18px;">☀️</span>';
            localStorage.setItem('darkMode', 'true');
        }
    },

    initDarkMode: function() {
        // Check localStorage for dark mode preference
        const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
        const btn = document.getElementById('darkModeToggleBtn');

        if (darkModeEnabled) {
            document.body.classList.add('dark-mode');
            if (btn) btn.innerHTML = '<span style="font-size: 18px;">☀️</span>';
        }
    },

    openVideoModal: function() {
        const modal = document.getElementById('videoModal');
        const video = document.getElementById('videoPlayer');
        modal.style.display = 'block';
        // Reset video to beginning
        video.currentTime = 0;
    },

    closeVideoModal: function() {
        const modal = document.getElementById('videoModal');
        const video = document.getElementById('videoPlayer');
        video.pause();
        modal.style.display = 'none';
    },

    shareReport: function() {
        if (!App.state.currentReport || !App.state.currentReport.date) {
            alert('No report is currently open');
            return;
        }

        const reportDate = App.state.currentReport.date;
        const url = `${window.location.origin}${window.location.pathname}?report=${reportDate}`;

        // Try to copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                alert('✅ Report link copied to clipboard!\n\n' + url);
            }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback: show the URL in a prompt
                prompt('Copy this link:', url);
            });
        } else {
            // Fallback for browsers without clipboard API
            prompt('Copy this link:', url);
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
    if (App.state.currentReport && App.state.currentReport.date) {
        const reportDate = App.state.currentReport.date;
        console.log('📅 Filtering events for date:', reportDate);

        // Filter events by the report date
        App.state.filteredEvents = App.state.allEvents.filter(e => {
            // Match events with event_date equal to report date
            // Also match message_date in case event_date is not set
            return e.event_date === reportDate ||
                   (e.message_date && e.message_date.startsWith(reportDate));
        });

        console.log('✅ Found', App.state.filteredEvents.length, 'events for', reportDate);

        if (App.state.filteredEvents.length === 0) {
            alert(`No events found for ${reportDate}`);
            return;
        }

        App.render();
        UIManager.closeModal('reportsModal');
    } else {
        alert('No report date available');
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
