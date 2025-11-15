// War Crime Detection Module
const WarCrimeDetector = {
    computeWarCrime: function(event) {
        const text = [
            event.mm_osint, event.mm_political, event.mm_entities, event.mm_summary,
            event.osint_events, event.event_description, event.translated_text, event.message_text,
            event.multimodal_analysis
        ].filter(Boolean).join(" ").replace(/https?:\/\/\S+/g, " ").toLowerCase();

        const WAR_CONTEXT = /\b(missile|rocket|drone|uav|artillery|shell|bomb|airstrike|strike|attack|front|battle|military|tank|mlrs|grenade|mortar|loitering|combat|warfare|offensive)\b/i;
        if (!WAR_CONTEXT.test(text)) return { tag: null, score: 0 };

        const NEGATION = [
            /no (potential )?war crimes?/i,
            /not a war crime/i,
            /no (indication|evidence) of war crimes?/i,
            /claims? of war crimes? (are|is) false/i,
            /den(y|ied|ies) (any )?war crimes?/i,
            /unlikely to (be|constitute) war crimes?/i
        ];

        // Explicit war crime mentions (HIGH PRIORITY)
        const EV_EXPLICIT = [
            /war crimes?/i,
            /violat(?:e|ed|ing|ion) (?:of )?international (?:humanitarian )?law/i,
            /violat(?:e|ed|ing|ion) (?:of )?geneva conventions?/i,
            /crimes? against humanity/i,
            /breach(?:es)? of international law/i,
            /violat(?:e|ed|ing|ion) (?:of )?laws? of war/i,
            /international humanitarian law violation/i
        ];

        // Treatment of persons (SEVERE)
        const EV_TREATMENT = [
            /summary execution|extrajudicial (killing|execution)/i,
            /execution|massacre|mass killing/i,
            /rape|sexual violence|sexual assault/i,
            /torture|cruel treatment|inhuman treatment/i,
            /behead(?:ed|ing)|mutilat(?:e|ed|ing|ion)/i,
            /\bpow(s)?\b|\bprisoners? of war\b/i,
            /mistreatment of (prisoners|detainees|captives)/i,
            /forced labor|slavery/i,
            /human shield/i,
            /forced displacement|forcible transfer/i,
            /deportation|unlawful deportation/i
        ];

        // Protected targets/persons (HIGH)
        const EV_PROTECTED = [
            /civilian casualties|civilian deaths?|killed civilians?/i,
            /civilian(s)? (?:target|attack|killed|wounded|injured)/i,
            /residential (?:area|building|complex|district)/i,
            /apartment|market|shopping (?:center|mall)/i,
            /church|mosque|temple|synagogue|religious site/i,
            /school|kindergarten|university|educational/i,
            /hospital|medical (?:facility|center)/i,
            /ambulance|clinic|medic(?:al)? personnel/i,
            /children|minors|kids|infant/i,
            /women|elderly|disabled|vulnerable/i,
            /refugee camp|displaced persons/i,
            /cultural heritage|historic(?:al)? site/i,
            /protected (?:site|zone|area|building)/i,
            /humanitarian (?:aid|worker|convoy)/i
        ];

        // Prohibited weapons/methods (HIGH)
        const EV_PROHIBITED = [
            /cluster (?:munition|bomb|shell|warhead)s?/i,
            /white phosphorus|phosphorus (?:munitions?|shells?|bombs?)/i,
            /thermobaric|vacuum bomb|fuel-air explosive/i,
            /banned (?:weapon|munition|bomb)/i,
            /prohibited (?:weapon|munition|bomb)/i,
            /chemical (?:weapon|agent|attack)/i,
            /biological (?:weapon|agent)/i,
            /anti-personnel (?:mine|landmine)s?/i,
            /incendiary weapon/i
        ];

        // Indiscriminate/disproportionate attacks (MEDIUM)
        const EV_INDISCRIMINATE = [
            /indiscriminate (?:attack|shelling|bombing|strike)/i,
            /disproportionate (?:attack|force|response)/i,
            /excessive (?:force|casualties)/i,
            /random (?:shelling|bombing|attack)/i,
            /carpet bombing/i,
            /deliberate (?:targeting|attack) (?:of|on) civilian/i,
            /intentional (?:targeting|attack) (?:of|on) civilian/i
        ];

        // Attack methods (context, lower weight)
        const EV_FIREMODE = [
            /shell(?:ing)?|barrage/i,
            /bomb(?:ing)?|bombardment/i,
            /airstrike|air strike|air raid/i,
            /missile strike|rocket (?:strike|attack)/i,
            /drone strike|kamikaze drone/i,
            /artillery (?:strike|fire|attack)/i,
            /mlrs|multiple rocket launcher/i,
            /mortar (?:strike|fire|attack)/i
        ];

        const hasAny = (patterns) => patterns.some(rx => rx.test(text));
        const countMatches = (patterns) => patterns.filter(rx => rx.test(text)).length;

        const neg = hasAny(NEGATION);

        let score = 0;
        let reasons = [];

        // Check explicit mentions (very high weight)
        const explicit = hasAny(EV_EXPLICIT);
        if (explicit) {
            score += 3;
            reasons.push("Explicit violation of international law mentioned");
        }

        // Check severe treatment violations
        const treatment = countMatches(EV_TREATMENT);
        if (treatment > 0) {
            score += Math.min(treatment * 2, 4); // Max 4 points for multiple treatment violations
            reasons.push("Treatment violations detected");
        }

        // Check protected targets
        const protected = countMatches(EV_PROTECTED);
        if (protected > 0) {
            score += Math.min(protected, 3); // Max 3 points for multiple protected targets
            reasons.push("Protected targets/persons involved");
        }

        // Check prohibited weapons
        const prohibited = countMatches(EV_PROHIBITED);
        if (prohibited > 0) {
            score += Math.min(prohibited * 2, 3); // Max 3 points
            reasons.push("Prohibited weapons detected");
        }

        // Check indiscriminate attacks
        const indiscriminate = hasAny(EV_INDISCRIMINATE);
        if (indiscriminate) {
            score += 2;
            reasons.push("Indiscriminate/disproportionate attack indicators");
        }

        // Fire mode adds minimal weight (context only)
        const firemode = hasAny(EV_FIREMODE);
        if (firemode && (protected > 0 || treatment > 0)) {
            score += 1; // Only add if there's a protected target or treatment violation
        }

        // Core violations that should trigger detection
        const hasCore = explicit || treatment > 0 || protected > 0 || prohibited > 0 || indiscriminate;

        // Negation handling
        if (neg) {
            // Strong negation overrides low scores
            if (score < 3) return { tag: null, score: 0 };
            // Reduce score but don't eliminate if there's strong evidence
            score = Math.max(1, Math.floor(score / 2));
        }

        // Detection threshold: need core violation and score >= 2
        if (hasCore && score >= 2 && !neg) {
            return { tag: "pos", score, reasons };
        }

        // If negated but had some score, return neutral with the reduced score
        if (neg && score > 0) {
            return { tag: null, score, reasons };
        }

        return { tag: null, score: 0 };
    }
};