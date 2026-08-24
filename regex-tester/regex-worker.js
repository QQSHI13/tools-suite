/**
 * Regex Tester worker
 *
 * User-supplied patterns can backtrack catastrophically (the classic
 * `(a+)+$` against a long run of "a"s). A regex has no interruption point,
 * so the only reliable escape is to run it off the main thread and have the
 * page terminate this worker when it overruns its time budget.
 *
 * Message in:  { pattern, flags, text, replacement }
 * Message out: { ok: true, matches, subOutput } | { ok: false, error }
 */
self.onmessage = (e) => {
    const { pattern, flags, text, replacement } = e.data;

    let matches;
    try {
        // Validate the pattern with the flags the user actually typed, so a bad
        // flag is reported as such rather than surfacing from the 'g' variant.
        new RegExp(pattern, flags);

        matches = [];
        const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
        let match;
        while ((match = globalRegex.exec(text)) !== null) {
            matches.push({
                text: match[0],
                index: match.index,
                groups: match.slice(1)
            });
            // Prevent infinite loop on zero-width matches (e.g., a*, \b, (?=a))
            if (match[0].length === 0) {
                globalRegex.lastIndex++;
            }
            if (!flags.includes('g')) break;
        }
    } catch (err) {
        self.postMessage({ ok: false, error: err.message });
        return;
    }

    // The substitution preview is a separate concern: a replacement string can
    // be rejected ($<name> against a pattern with no such group) without the
    // match list being wrong, so report it independently.
    let subOutput;
    try {
        subOutput = text.replace(new RegExp(pattern, flags), replacement);
    } catch (err) {
        subOutput = 'Invalid replacement';
    }

    self.postMessage({ ok: true, matches, subOutput });
};
