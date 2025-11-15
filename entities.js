// Entity Matching and Icon System Module
const EntityManager = {
    SYSTEMS: {},
    UNITS: {},
    isLoaded: false,

    // System icon mapping (emoji for each system category)
    systemIcons: {
        'Drones (general)': '🛸',
        'Shahed / Geran loitering munition': '💥',
        'Lancet loitering munition': '💥',
        'Orlan-10 reconnaissance drone': '🛸',
        'Bayraktar TB2': '🛸',
        'ZALA drone': '🛸',
        'Missiles (general)': '🚀',
        'Ballistic missile': '🚀',
        'Cruise missile': '🚀',
        'Tomahawk cruise missile': '🚀',
        'Kalibr cruise missile': '🚀',
        'Iskander ballistic missile': '🚀',
        'Kinzhal hypersonic missile': '🚀',
        'Kh-22 / Kh-32': '🚀',
        'Kh-59': '🚀',
        'Kh-101 / Kh-555': '🚀',
        'S-300 air defence': '🛡️',
        'S-400 air defence': '🛡️',
        'Buk air defence': '🛡️',
        'Tor air defence': '🛡️',
        'Pantsir-S1 air defence': '🛡️',
        'Patriot air defence': '🛡️',
        'NASAMS air defence': '🛡️',
        'IRIS-T': '🛡️',
        'Stinger MANPADS': '🛡️',
        'Igla MANPADS': '🛡️',
        'Starstreak': '🛡️',
        'MiG-29': '✈️',
        'MiG-31': '✈️',
        'Su-24': '✈️',
        'Su-25': '✈️',
        'Su-27': '✈️',
        'Su-30': '✈️',
        'Su-34': '✈️',
        'Su-35': '✈️',
        'Su-57': '✈️',
        'Ka-52 attack helicopter': '🚁',
        'Mi-8 helicopter': '🚁',
        'Mi-24 helicopter': '🚁',
        'Mi-28 helicopter': '🚁',
        'HIMARS / GMLRS': '💣',
        'MLRS / Grad / Uragan / Smerch': '💣',
        'Artillery / Howitzer (general)': '🔫',
        'M777 Howitzer': '🔫',
        'Caesar Howitzer': '🔫',
        'PzH 2000': '🔫',
        'D-20 / D-30 Howitzer': '🔫',
        'T-72 main battle tank': '🛞',
        'T-80 main battle tank': '🛞',
        'T-90 main battle tank': '🛞',
        'Leopard 1 / Leopard 2': '🛞',
        'Challenger 2': '🛞',
        'Abrams (M1)': '🛞',
        'Armata (T-14)': '🛞',
        'BMP / IFV': '🚛',
        'BTR / APC': '🚛',
        'Bradley IFV': '🚛',
        'Marder IFV': '🚛',
        'MT-LB': '🚛',
        'ATGM (anti-tank missile)': '🚀',
        'Cluster munitions': '💥',
        'Thermobaric / vacuum bomb': '💥',
        'FAB glide bomb': '💣',
        'Neptune anti-ship missile': '🚀',
        'Harpoon missile': '🚀',
        'Storm Shadow / SCALP': '🚀',
        'ATACMS': '🚀',
        'Glide bomb (general)': '💣',
        'Mortar': '🔫',
        'Grenade / RPG': '💥',
        'Naval / submarine system': '⚓',
        'Electronic warfare system': '📡',
        'Radar / SAM radar': '📡',
        'Nuclear / strategic weapons': '☢️',
        'Unknown weapon': '⚔️'
    },

    // Unit icon (single emoji for all units)
    unitIcon: '🪖',

    // Load entities.json
    async load() {
        try {
            const response = await fetch('entities.json');
            const data = await response.json();

            // Convert regex strings to RegExp objects
            this.SYSTEMS = {};
            for (const [key, pattern] of Object.entries(data.SYSTEMS)) {
                try {
                    this.SYSTEMS[key] = new RegExp(pattern, 'i');
                } catch (e) {
                    console.warn(`Invalid regex for system ${key}:`, e);
                }
            }

            this.UNITS = {};
            for (const [key, pattern] of Object.entries(data.UNITS)) {
                try {
                    this.UNITS[key] = new RegExp(pattern, 'i');
                } catch (e) {
                    console.warn(`Invalid regex for unit ${key}:`, e);
                }
            }

            this.isLoaded = true;
            console.log('✅ Entities loaded:', Object.keys(this.SYSTEMS).length, 'systems,', Object.keys(this.UNITS).length, 'units');
            return true;
        } catch (error) {
            console.error('❌ Failed to load entities.json:', error);
            return false;
        }
    },

    // Determine side from text (UA / RU / unknown)
    getSideFromText(text) {
        if (!text) return 'unk';
        const t = text.toLowerCase();

        // Check for Ukrainian keywords
        if (/\bukrain/i.test(t) || /\bafu\b/i.test(t) || /зсу/i.test(t)) {
            return 'ua';
        }

        // Check for Russian keywords
        if (/\bruss/i.test(t) || /\brussian\b/i.test(t) || /вс\s?рф/i.test(t) || /вооруж.*сил/i.test(t)) {
            return 'ru';
        }

        return 'unk';
    },

    // Match entity in event record
    matchEntity(record) {
        // Combine relevant text fields for matching
        const searchText = [
            record.osint_entities || '',
            record.mm_entities || '',
            record.event_description || '',
            record.translated_text || '',
            record.message_text || ''
        ].join(' ').toLowerCase();

        if (!searchText.trim()) {
            return null;
        }

        // Try to match systems first
        for (const [key, regex] of Object.entries(this.SYSTEMS)) {
            if (regex.test(searchText)) {
                const side = this.getSideFromText(searchText);
                return {
                    key: key,
                    group: 'system',
                    side: side,
                    icon: this.systemIcons[key] || '⚔️'
                };
            }
        }

        // Try to match units
        for (const [key, regex] of Object.entries(this.UNITS)) {
            if (regex.test(searchText)) {
                const side = this.getSideFromText(searchText);
                return {
                    key: key,
                    group: 'unit',
                    side: side,
                    icon: this.unitIcon
                };
            }
        }

        // Check for side mentions even if no specific entity matched
        const side = this.getSideFromText(searchText);
        if (side !== 'unk') {
            return {
                key: null,
                group: 'flag',
                side: side,
                icon: null
            };
        }

        return null;
    },

    // Precompute matches for all events
    precomputeMatches(events) {
        console.log('🔍 Precomputing entity matches for', events.length, 'events...');

        let systemCount = 0;
        let unitCount = 0;
        let flagCount = 0;

        events.forEach(event => {
            const match = this.matchEntity(event);
            event.__match = match;

            if (match) {
                if (match.group === 'system') systemCount++;
                else if (match.group === 'unit') unitCount++;
                else if (match.group === 'flag') flagCount++;
            }
        });

        console.log('✅ Entity matching complete:');
        console.log('  - Systems:', systemCount);
        console.log('  - Units:', unitCount);
        console.log('  - Flags:', flagCount);
        console.log('  - Generic:', events.length - systemCount - unitCount - flagCount);
    },

    // Get counts for each system/unit (for filter UI)
    getCounts(events) {
        const systemCounts = {};
        const unitCounts = {};

        events.forEach(event => {
            const match = event.__match;
            if (!match || !match.key) return;

            if (match.group === 'system') {
                systemCounts[match.key] = (systemCounts[match.key] || 0) + 1;
            } else if (match.group === 'unit') {
                unitCounts[match.key] = (unitCounts[match.key] || 0) + 1;
            }
        });

        return { systemCounts, unitCounts };
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EntityManager = EntityManager;
}
