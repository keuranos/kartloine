// Analytics Manager Module
// Generates charts and visualizations for the OSINT dashboard

const AnalyticsManager = {
    charts: {
        timeline: null,
        systems: null,
        units: null,
        locations: null,
        warCrimes: null
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

            console.log('✅ All charts generated successfully');
        } catch (error) {
            console.error('❌ Error generating charts:', error);
            alert('Failed to generate analytics charts. Please try again.');
        }
    },

    /**
     * Generate Events Over Time chart (line chart)
     */
    generateTimelineChart: function() {
        const events = App.state.filteredEvents;

        // Group events by date
        const eventsByDate = {};
        events.forEach(event => {
            const date = event.event_date;
            if (date) {
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
                }
            }
        });
    },

    /**
     * Generate Top 10 Systems chart (horizontal bar chart)
     */
    generateTopSystemsChart: function() {
        const events = App.state.filteredEvents;

        // Count systems
        const systemCounts = {};
        events.forEach(event => {
            if (event.__match && event.__match.group === 'system') {
                const system = event.__match.entity;
                systemCounts[system] = (systemCounts[system] || 0) + 1;
            }
        });

        // Get top 10 systems
        const sortedSystems = Object.entries(systemCounts)
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
     * Generate Top 10 Units chart (horizontal bar chart)
     */
    generateTopUnitsChart: function() {
        const events = App.state.filteredEvents;

        // Count units
        const unitCounts = {};
        events.forEach(event => {
            if (event.__match && event.__match.group === 'unit') {
                const unit = event.__match.entity;
                unitCounts[unit] = (unitCounts[unit] || 0) + 1;
            }
        });

        // Get top 10 units
        const sortedUnits = Object.entries(unitCounts)
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
     * Generate Top 10 Locations chart (horizontal bar chart)
     */
    generateTopLocationsChart: function() {
        const events = App.state.filteredEvents;

        // Count locations
        const locationCounts = {};
        events.forEach(event => {
            const location = event.event_location;
            if (location) {
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
     * Generate War Crimes Distribution chart (doughnut chart)
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
    }
};
