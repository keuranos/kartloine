// Analytics Manager Module
// Generates charts and visualizations for the OSINT dashboard

const AnalyticsManager = {
    charts: {
        timeline: null,
        systems: null,
        units: null,
        locations: null,
        warCrimes: null,
        sentiments: null,
        topics: null
    },

    /**
     * Open the analytics modal and generate charts
     */
    openAnalyticsModal: function() {
        const modal = document.getElementById('analyticsModal');
        modal.style.display = 'block';

        // Generate all charts after modal is visible
        setTimeout(() => {
            this.generateAllCharts();
        }, 100);
    },

    /**
     * Generate all analytics charts
     */
    generateAllCharts: function() {
        console.log('📊 Generating analytics charts...');

        try {
            this.generateTimelineChart();
            this.generateTopSystemsChart();
            this.generateTopUnitsChart();
            this.generateTopLocationsChart();
            this.generateWarCrimesChart();
            this.generateSentimentsChart();
            this.generateTopicsChart();

            console.log('✅ All charts generated successfully');
        } catch (error) {
            console.error('❌ Error generating charts:', error);
            alert('Failed to generate analytics charts. Please try again.');
        }
    },

    /**
     * Generate Events Over Time chart (line chart)
     * Clicking a date point filters to show only that date's events
     */
    generateTimelineChart: function() {
        const events = App.state.filteredEvents;

        // Group events by date (only dates from November 15, 2025 onwards)
        const cutoffDate = '2025-11-15';
        const eventsByDate = {};
        events.forEach(event => {
            const date = event.event_date;
            if (date && date !== 'undefined' && date !== 'unknown' && date >= cutoffDate) {
                eventsByDate[date] = (eventsByDate[date] || 0) + 1;
            }
        });

        // Sort dates and prepare data
        const dates = Object.keys(eventsByDate).sort();
        const counts = dates.map(date => eventsByDate[date]);

        // Destroy existing chart if it exists
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        // Create chart
        const ctx = document.getElementById('timelineChart').getContext('2d');
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Events per Day',
                    data: counts,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 3,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return UIManager.formatDateFinnish(context[0].label);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 20
                        }
                    }
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const selectedDate = dates[index];

                        console.log('📅 Filtering to date:', selectedDate);

                        // Set both start and end date to the selected date
                        document.getElementById('startDate').value = selectedDate;
                        document.getElementById('endDate').value = selectedDate;

                        // Close analytics modal
                        closeModal('analyticsModal');

                        // Apply filters to show only this date's events
                        App.applyFilters();
                    }
                }
            }
        });
    },

    /**
     * Generate Top 10 Systems chart (horizontal bar chart)
     * Clicking a system activates that system filter
     */
    generateTopSystemsChart: function() {
        const events = App.state.filteredEvents;

        // Get counts from EntityManager (proper counting)
        const { systemCounts } = EntityManager.getCounts(events);

        // Filter out undefined/unknown and get top 10
        const sortedSystems = Object.entries(systemCounts)
            .filter(([key, count]) => key && key !== 'undefined' && key !== 'unknown')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const labels = sortedSystems.map(item => item[0]);
        const data = sortedSystems.map(item => item[1]);

        // Destroy existing chart if it exists
        if (this.charts.systems) {
            this.charts.systems.destroy();
        }

        // Create chart
        const ctx = document.getElementById('systemsChart').getContext('2d');
        this.charts.systems = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Events',
                    data: data,
                    backgroundColor: '#f093fb',
                    borderColor: '#f5576c',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `Events: ${context.parsed.x}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const selectedSystem = labels[index];

                        console.log('🔧 Filtering to system:', selectedSystem);

                        // Clear existing system filters and add this one
                        EntityFilters.selectedSystems.clear();
                        EntityFilters.selectedSystems.add(selectedSystem);

                        // Update UI to show filter is active
                        document.querySelectorAll('[data-system]').forEach(tag => {
                            tag.classList.remove('active');
                            if (tag.getAttribute('data-system') === selectedSystem) {
                                tag.classList.add('active');
                            }
                        });

                        // Close analytics modal
                        closeModal('analyticsModal');

                        // Apply filters
                        App.applyFilters();
                    }
                }
            }
        });
    },

    /**
     * Generate Top 10 Units chart (horizontal bar chart)
     * Clicking a unit activates that unit filter
     */
    generateTopUnitsChart: function() {
        const events = App.state.filteredEvents;

        // Get counts from EntityManager (proper counting)
        const { unitCounts } = EntityManager.getCounts(events);

        // Filter out undefined/unknown and get top 10
        const sortedUnits = Object.entries(unitCounts)
            .filter(([key, count]) => key && key !== 'undefined' && key !== 'unknown')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const labels = sortedUnits.map(item => item[0]);
        const data = sortedUnits.map(item => item[1]);

        // Destroy existing chart if it exists
        if (this.charts.units) {
            this.charts.units.destroy();
        }

        // Create chart
        const ctx = document.getElementById('unitsChart').getContext('2d');
        this.charts.units = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Events',
                    data: data,
                    backgroundColor: '#43e97b',
                    borderColor: '#38f9d7',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `Events: ${context.parsed.x}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const selectedUnit = labels[index];

                        console.log('⚔️ Filtering to unit:', selectedUnit);

                        // Clear existing unit filters and add this one
                        EntityFilters.selectedUnits.clear();
                        EntityFilters.selectedUnits.add(selectedUnit);

                        // Update UI to show filter is active
                        document.querySelectorAll('[data-unit]').forEach(tag => {
                            tag.classList.remove('active');
                            if (tag.getAttribute('data-unit') === selectedUnit) {
                                tag.classList.add('active');
                            }
                        });

                        // Close analytics modal
                        closeModal('analyticsModal');

                        // Apply filters
                        App.applyFilters();
                    }
                }
            }
        });
    },

    /**
     * Generate Top 10 Locations chart (horizontal bar chart)
     * Clicking a location centers the map on that location
     */
    generateTopLocationsChart: function() {
        const events = App.state.filteredEvents;

        // Count locations, filtering out undefined/unknown
        const locationCounts = {};
        events.forEach(event => {
            const location = event.event_location;
            if (location && location !== 'undefined' && location !== 'unknown' && location.toLowerCase() !== 'unknown') {
                locationCounts[location] = (locationCounts[location] || 0) + 1;
            }
        });

        // Get top 10 locations
        const sortedLocations = Object.entries(locationCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const labels = sortedLocations.map(item => item[0]);
        const data = sortedLocations.map(item => item[1]);

        // Destroy existing chart if it exists
        if (this.charts.locations) {
            this.charts.locations.destroy();
        }

        // Create chart
        const ctx = document.getElementById('locationsChart').getContext('2d');
        this.charts.locations = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Events',
                    data: data,
                    backgroundColor: '#667eea',
                    borderColor: '#764ba2',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `Events: ${context.parsed.x}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const selectedLocation = labels[index];

                        console.log('📍 Filtering to location:', selectedLocation);

                        // Add location to modal selections filter
                        App.state.modalSelections.locations.clear();
                        App.state.modalSelections.locations.add(selectedLocation);

                        // Close analytics modal
                        closeModal('analyticsModal');

                        // Apply filters to show only events from this location
                        App.applyFilters();

                        // Try to center map on the location if coordinates are available
                        const eventWithLocation = events.find(e =>
                            e.event_location === selectedLocation && e.lat && e.lon
                        );
                        if (eventWithLocation && MapManager.map) {
                            setTimeout(() => {
                                MapManager.map.setView(
                                    [eventWithLocation.lat, eventWithLocation.lon],
                                    10  // Zoom level
                                );
                            }, 100);
                        }
                    }
                }
            }
        });
    },

    /**
     * Generate War Crimes Distribution chart (doughnut chart)
     * Clicking a severity segment filters events by that war crime level
     */
    generateWarCrimesChart: function() {
        const events = App.state.filteredEvents;

        // Count by war crime score
        let noScore = 0;
        let lowScore = 0;  // 1-3
        let mediumScore = 0;  // 4-6
        let highScore = 0;  // 7-10

        events.forEach(event => {
            if (event.__wcResult && event.__wcResult.tag === 'pos') {
                const score = event.__wcResult.score;
                if (score >= 7) {
                    highScore++;
                } else if (score >= 4) {
                    mediumScore++;
                } else {
                    lowScore++;
                }
            } else {
                noScore++;
            }
        });

        // Log distribution for debugging
        console.log('📊 War Crimes Distribution:', {
            'No Indication': noScore,
            'Low (1-3)': lowScore,
            'Medium (4-6)': mediumScore,
            'High (7-10)': highScore,
            'Total': events.length
        });

        // Destroy existing chart if it exists
        if (this.charts.warCrimes) {
            this.charts.warCrimes.destroy();
        }

        // Create chart
        const ctx = document.getElementById('warCrimesChart').getContext('2d');
        this.charts.warCrimes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Indication', 'Low (1-3)', 'Medium (4-6)', 'High (7-10)'],
                datasets: [{
                    data: [noScore, lowScore, mediumScore, highScore],
                    backgroundColor: [
                        '#e0e0e0',  // Gray for no indication
                        '#ffeb3b',  // Yellow for low
                        '#ff9800',  // Orange for medium
                        '#f44336'   // Red for high
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const filterValues = ['no-indication', 'low', 'medium', 'high'];
                        const filterLabels = ['No Indication', 'Low (1-3)', 'Medium (4-6)', 'High (7-10)'];
                        const selectedFilter = filterValues[index];
                        const selectedLabel = filterLabels[index];

                        console.log('⚠️ Filtering to war crime level:', selectedLabel);

                        // Set the appropriate radio button
                        const radioButton = document.getElementById(`wc-${selectedFilter}`);
                        if (radioButton) {
                            radioButton.checked = true;
                            App.state.warCrimeFilter = selectedFilter;
                        }

                        // Close analytics modal
                        closeModal('analyticsModal');

                        // Apply filters
                        App.applyFilters();
                    }
                }
            }
        });
    },

    /**
     * Generate Sentiments Chart (horizontal bar chart)
     * Shows top 10 entities with positive sentiment (up) and negative sentiment (down)
     */
    generateSentimentsChart: function() {
        const events = App.state.filteredEvents;

        // Count positive and negative sentiments
        const positiveCounts = {};
        const negativeCounts = {};

        events.forEach(event => {
            // Parse positive sentiments
            if (event.positive_sentiments && event.positive_sentiments.trim()) {
                const positives = event.positive_sentiments.split(',').map(s => s.trim()).filter(s => s);
                positives.forEach(entity => {
                    positiveCounts[entity] = (positiveCounts[entity] || 0) + 1;
                });
            }

            // Parse negative sentiments
            if (event.negative_sentiments && event.negative_sentiments.trim()) {
                const negatives = event.negative_sentiments.split(',').map(s => s.trim()).filter(s => s);
                negatives.forEach(entity => {
                    negativeCounts[entity] = (negativeCounts[entity] || 0) + 1;
                });
            }
        });

        // Get top 10 of each
        const topPositive = Object.entries(positiveCounts)
            .filter(([key, count]) => key && key !== 'undefined')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const topNegative = Object.entries(negativeCounts)
            .filter(([key, count]) => key && key !== 'undefined')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Combine entities (if an entity appears in both, show both bars)
        const allEntities = new Set([...topPositive.map(e => e[0]), ...topNegative.map(e => e[0])]);

        // Create data structure
        const labels = [];
        const positiveData = [];
        const negativeData = [];

        allEntities.forEach(entity => {
            labels.push(entity);
            positiveData.push(positiveCounts[entity] || 0);
            negativeData.push(-(negativeCounts[entity] || 0)); // Negative values for down bars
        });

        // Sort by total absolute magnitude
        const combined = labels.map((label, i) => ({
            label,
            positive: positiveData[i],
            negative: negativeData[i],
            total: Math.abs(positiveData[i]) + Math.abs(negativeData[i])
        })).sort((a, b) => b.total - a.total).slice(0, 10);

        const finalLabels = combined.map(c => c.label);
        const finalPositive = combined.map(c => c.positive);
        const finalNegative = combined.map(c => c.negative);

        // Destroy existing chart
        if (this.charts.sentiments) {
            this.charts.sentiments.destroy();
        }

        // Create chart
        const ctx = document.getElementById('sentimentsChart').getContext('2d');
        this.charts.sentiments = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: finalLabels,
                datasets: [
                    {
                        label: 'Positive Sentiment',
                        data: finalPositive,
                        backgroundColor: '#4caf50',
                        borderColor: '#43a047',
                        borderWidth: 1
                    },
                    {
                        label: 'Negative Sentiment',
                        data: finalNegative,
                        backgroundColor: '#f44336',
                        borderColor: '#e53935',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = Math.abs(context.parsed.x);
                                const sentiment = context.dataset.label;
                                return `${sentiment}: ${value} events`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            callback: function(value) {
                                return Math.abs(value); // Show absolute values on axis
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * Generate Top Topics Chart (horizontal bar chart)
     * Shows top 10 most mentioned topics
     */
    generateTopicsChart: function() {
        const events = App.state.filteredEvents;

        // Count topics
        const topicCounts = {};

        events.forEach(event => {
            if (event.osint_topics && event.osint_topics.trim()) {
                const topics = event.osint_topics.split(',').map(t => t.trim()).filter(t => t);
                topics.forEach(topic => {
                    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                });
            }
        });

        // Get top 10
        const topTopics = Object.entries(topicCounts)
            .filter(([key, count]) => key && key !== 'undefined')
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const labels = topTopics.map(item => item[0]);
        const data = topTopics.map(item => item[1]);

        // Destroy existing chart
        if (this.charts.topics) {
            this.charts.topics.destroy();
        }

        // Create chart
        const ctx = document.getElementById('topicsChart').getContext('2d');
        this.charts.topics = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Events',
                    data: data,
                    backgroundColor: '#9c27b0',
                    borderColor: '#7b1fa2',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `Events: ${context.parsed.x}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    },

    /**
     * Destroy all charts (useful for cleanup)
     */
    destroyAllCharts: function() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
                this.charts[key] = null;
            }
        });
    },

    /**
     * Reset all filters and refresh analytics
     */
    resetFiltersAndRefresh: function() {
        console.log('🔄 Resetting all filters and refreshing analytics...');

        // Reset all filters using App.resetAllFilters
        // Clear search
        document.getElementById('searchInput').value = '';

        // Clear date filters
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';

        // Reset war crime filter
        const allRadio = document.getElementById('wc-all');
        if (allRadio) {
            allRadio.checked = true;
            App.state.warCrimeFilter = 'all';
        }

        // Clear entity filters
        if (typeof EntityFilters !== 'undefined') {
            EntityFilters.selectedSystems.clear();
            EntityFilters.selectedUnits.clear();

            // Remove active class from all entity filter tags
            document.querySelectorAll('[data-system], [data-unit]').forEach(tag => {
                tag.classList.remove('active');
            });
        }

        // Clear modal selections
        App.state.modalSelections = {
            events: new Set(),
            locations: new Set(),
            entities: new Set()
        };

        // Apply filters to update the map
        App.applyFilters();

        // Wait a bit for filters to apply, then regenerate all charts
        setTimeout(() => {
            this.generateAllCharts();
            console.log('✅ Filters reset and analytics refreshed');
        }, 200);
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AnalyticsManager = AnalyticsManager;
}
