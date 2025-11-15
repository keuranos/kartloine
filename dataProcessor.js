// Data Processing & Utilities Module
const DataProcessor = {
    parseMultimodalAnalysis: function(text) {
        if (!text) return {};
        
        const sections = {};
        const newPatterns = {
            summary: /###\s*1\.\s*Multimodal Summary\s*\n+([\s\S]*?)(?=\n###|$)/i,
            osint: /###\s*2\.\s*OSINT Analysis\s*\n+([\s\S]*?)(?=\n###|$)/i,
            political: /###\s*3\.\s*Political Analysis\s*\n+([\s\S]*?)(?=\n###|$)/i,
            topics: /###\s*4\.\s*Topic Modeling\s*\n+([\s\S]*?)(?=\n###|$)/i,
            entities: /###\s*5\.\s*Named Entities\s*\n+([\s\S]*?)(?=\n###|$)/i,
            sentiment: /###\s*6\.\s*Sentiment Analysis\s*\n+([\s\S]*?)(?=\n###|$)/i
        };
        
        let foundAny = false;
        for (const [key, pattern] of Object.entries(newPatterns)) {
            const match = text.match(pattern);
            if (match) {
                sections[key] = match[1].trim();
                foundAny = true;
            }
        }
        
        if (!foundAny) {
            const oldPatterns = {
                summary: /\*\*1\.\s*Multimodal Summary\*\*\s*\n+([\s\S]*?)(?=\n\*\*2\.|$)/i,
                osint: /\*\*2\.\s*OSINT Analysis\*\*\s*\n+([\s\S]*?)(?=\n\*\*3\.|$)/i,
                political: /\*\*3\.\s*Political Analysis\*\*\s*\n+([\s\S]*?)(?=\n\*\*4\.|$)/i,
                topics: /\*\*4\.\s*Topic Modeling\*\*\s*\n+([\s\S]*?)(?=\n\*\*5\.|$)/i,
                entities: /\*\*5\.\s*Named Entities\*\*\s*\n+([\s\S]*?)(?=\n\*\*6\.|$)/i,
                sentiment: /\*\*6\.\s*Sentiment Analysis\*\*\s*\n+([\s\S]*?)(?=\n\*\*7\.|$)/i
            };
            
            for (const [key, pattern] of Object.entries(oldPatterns)) {
                const match = text.match(pattern);
                if (match) {
                    sections[key] = match[1].trim();
                }
            }
        }
        
        return sections;
    },

    getWeaponType: function(event) {
        const text = (event.event_name + ' ' + event.event_description + ' ' + event.osint_entities).toLowerCase();
        const types = {
            drone: /\b(drone|uav|бпла)\b/i,
            shahed: /\b(shahed|шахед)\b/i,
            strike: /\b(strike|удар)\b/i,
            missile: /\b(missile|ракет)\b/i,
            combat: /\b(combat|бої)\b/i,
            patriot: /\b(patriot|патріот)\b/i,
            artillery: /\b(artillery|артилері)\b/i,
            iskander: /\b(iskander|іскандер)\b/i,
            tank: /\b(tank|танк)\b/i
        };
        
        for (const [type, pattern] of Object.entries(types)) {
            if (pattern.test(text)) return type;
        }
        return 'default';
    },

    detectSide: function(event) {
        const text = (event.event_name + ' ' + event.event_description + ' ' + event.osint_entities).toLowerCase();
        if (/russia|russian|рашист/.test(text)) return 'russian';
        if (/ukraine|ukrainian|україн/.test(text)) return 'ukrainian';
        return null;
    },

    formatAnalysisText: function(text) {
        if (!text) return '';

        text = text.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\n\n/g, '</p><p>');
        text = '<p>' + text + '</p>';

        // Add interactive hyperlinks for sources, entities, and locations
        try {
            if (typeof HyperlinkProcessor !== 'undefined' && HyperlinkProcessor.processEventDetailText) {
                text = HyperlinkProcessor.processEventDetailText(text);
            }
        } catch (error) {
            console.warn('Failed to add hyperlinks to event detail:', error);
        }

        return text;
    }
};