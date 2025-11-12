// War Crime Detection Module
const WarCrimeDetector = {
    computeWarCrime: function(event) {
        const text = [
            event.mm_osint, event.mm_political, event.mm_entities, event.mm_summary,
            event.osint_events, event.event_description, event.translated_text, event.message_text,
            event.multimodal_analysis
        ].filter(Boolean).join(" ").replace(/https?:\/\/\S+/g, " ").toLowerCase();

        const WAR_CONTEXT = /\b(missile|rocket|drone|uav|artillery|shell|bomb|airstrike|strike|attack|front|battle|military|tank|mlrs|grenade|mortar|loitering)\b/i;
        if (!WAR_CONTEXT.test(text)) return { tag: null, score: 0 };

        const NEGATION = [
            /no (potential )?war crimes?/i,
            /not a war crime/i,
            /no (indication|evidence) of war crimes?/i,
            /claims? of war crimes? (are|is) false/i,
            /den(y|ied|ies) (any )?war crimes?/i
        ];

        const EV_TREATMENT = [
            /summary execution|execution|massacre|rape|torture|behead(?:ed|ing)/i,
            /\bpow(s)?\b|\bprisoners? of war\b/i,
            /geneva convention/i,
            /deportation/i
        ];
        const EV_CIVILIAN = [
            /civilian(s)?/i,
            /residential|apartment|market|church|mosque|temple/i,
            /school|kindergarten|university/i,
            /hospital|ambulance|clinic|medic/i,
            /children|women|elderly|refugee/i
        ];
        const EV_PROHIB = [
            /cluster (?:munition|bomb|shell)s?/i,
            /white phosphorus|phosphorus (?:munitions?|shells?)/i,
            /thermobaric|vacuum bomb/i,
            /banned|prohibited weapon/i
        ];
        const EV_FIREMODE = [
            /shell(?:ing)?|bomb(?:ing)?|airstrike|missile strike|rocket strike/i,
            /drone strike|loitering (?:munition|drone)/i,
            /artillery|mlrs|mortar/i
        ];

        const hasAny = (patterns) => patterns.some(rx => rx.test(text));
        const neg = hasAny(NEGATION);
        
        let score = 0;
        const t = hasAny(EV_TREATMENT); if (t) score += 2;
        const c = hasAny(EV_CIVILIAN);  if (c) score += 1;
        const p = hasAny(EV_PROHIB);    if (p) score += 1;
        const f = hasAny(EV_FIREMODE);  if (f) score += 1;

        const core = t || c;
        if (neg && score === 0) return { tag: null, score: 0 };
        if (core && score >= 2 && !neg) return { tag: "pos", score };
        return { tag: null, score };
    }
};