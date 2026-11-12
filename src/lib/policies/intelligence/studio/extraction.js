export function clean(value) {
    return value.replace(/^[\s:|=.()\[\]\-–—]+|[\s:|=\-–—]+$/g, '').replace(/\s+/g, ' ').trim();
}
export function anchorPattern(anchor) {
    const parts = anchor.match(/[\p{L}\p{N}#]+/gu);
    if (!parts?.length)
        return null;
    const body = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^\\p{L}\\p{N}#]*');
    return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}#])(?:\\s*[.):\\]])*`, 'iu');
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function normalizeLabel(value) {
    return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function boxOverlapX(a, b, slack = 8) {
    return Math.min(a[2] + slack, b[2] + slack) - Math.max(a[0] - slack, b[0] - slack);
}
function unionWordBox(words) {
    let x0 = words[0].box[0], y0 = words[0].box[1], x1 = words[0].box[2], y1 = words[0].box[3];
    for (let i = 1; i < words.length; i++) {
        x0 = Math.min(x0, words[i].box[0]);
        y0 = Math.min(y0, words[i].box[1]);
        x1 = Math.max(x1, words[i].box[2]);
        y1 = Math.max(y1, words[i].box[3]);
    }
    return [Math.round(x0 * 100) / 100, Math.round(y0 * 100) / 100, Math.round(x1 * 100) / 100, Math.round(y1 * 100) / 100];
}
function getSegments(page) {
    if (page.segments?.length)
        return page.segments;
    return page.lines.map(line => {
        const lineWords = line.wordIds.map(id => page.words[id]).filter(Boolean);
        return {
            id: line.id,
            line: line.id,
            text: line.text,
            wordIds: line.wordIds,
            box: lineWords.length ? unionWordBox(lineWords) : [0, 0, page.width, 0],
        };
    });
}
function getLineSegments(page, lineIndex) {
    const line = page.lines[lineIndex];
    if (!line)
        return [];
    const all = getSegments(page);
    if (line.segmentIds?.length)
        return line.segmentIds.map(id => all[id]).filter(Boolean);
    return all.filter(s => s.line === lineIndex);
}
function matchesFieldAlias(text, field) {
    const candidates = [...field.aliases, field.label].sort((a, b) => b.length - a.length);
    for (const alias of candidates) {
        const m = anchorPattern(alias)?.exec(text);
        if (m)
            return clean(text.slice(m.index, m.index + m[0].length));
    }
    return null;
}
function looksLikeLabelText(text) {
    const cleaned = clean(text);
    if (!cleaned || cleaned.length > 60)
        return false;
    if (/^\d[\d,./\- ]*$/.test(cleaned))
        return false;
    if (validValue(cleaned, 'date') ||
        validValue(cleaned, 'registration') ||
        validValue(cleaned, 'currency') ||
        validValue(cleaned, 'email') ||
        validValue(cleaned, 'phone') ||
        validValue(cleaned, 'policy_number')) {
        return false;
    }
    // Avoid treating coded identifiers like "OG-26-2301..." or long numbers as table headers.
    if (/\d{4,}/.test(cleaned) || /[A-Z]{2,}-\d{2,}/i.test(cleaned))
        return false;
    return /[\p{L}]{2,}/u.test(cleaned);
}
function extractLeadingLabel(text) {
    const colonIdx = text.indexOf(':');
    if (colonIdx > 1 && colonIdx < 50) {
        const head = clean(text.slice(0, colonIdx));
        if (looksLikeLabelText(head))
            return head;
    }
    return null;
}
function findSectionHeading(page, lineIndex) {
    for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 8); i--) {
        const text = clean(page.lines[i]?.text ?? '');
        if (!text || text.length > 65 || text.includes(':'))
            continue;
        const words = text.split(/\s+/);
        if (words.length > 7)
            continue;
        const isUpper = text === text.toUpperCase() && /[A-Z]{3,}/.test(text);
        const isSectionKeyword = /\b(details|particulars|summary|schedule|coverage|insured|vehicle|premium|declaration)\b/i.test(text);
        if (isUpper || (words.length <= 4 && isSectionKeyword))
            return text;
    }
    return undefined;
}
function stripInlinePrefix(rawPrefix, field) {
    // Check if a known field alias or colon appears inside the prefix.
    const colonIdx = rawPrefix.lastIndexOf(':');
    // Avoid splitting at time colons like "12:00:00"
    const isTimeColon = colonIdx > 0 && /\d:\d/.test(rawPrefix.slice(Math.max(0, colonIdx - 1), colonIdx + 2));
    if (colonIdx > 0 && !isTimeColon) {
        const labelPart = clean(rawPrefix.slice(0, colonIdx));
        const afterColon = clean(rawPrefix.slice(colonIdx + 1));
        if (afterColon) {
            const tokens = afterColon.split(/\s+/);
            const lastToken = tokens[tokens.length - 1];
            if (/^(to|from|through|till|until|and|or|-|–|\/)$/i.test(lastToken)) {
                return { anchor: labelPart, inlineBefore: lastToken };
            }
        }
        return { anchor: labelPart };
    }
    // Handle inline range prefix e.g. "Period of cover 14/07/2026 12:00:00 AM to" or "14/07/2026 12:00:00 AM to"
    const inlineMatch = /^(?:(.+?)\s+)?(?:\d[\d/.\-,:]*(?:\s+(?:AM|PM|hrs|\d{1,2}:\d{2}(?::\d{2})?))*)\s+(to|till|until|through|-|–|\/)$/i.exec(clean(rawPrefix));
    if (inlineMatch) {
        const head = inlineMatch[1] ? clean(inlineMatch[1]) : '';
        return { anchor: looksLikeLabelText(head) ? head : '', inlineBefore: inlineMatch[2] };
    }
    // If no colon, check if prefix starts with a known alias and has inline tokens after it.
    for (const alias of [...field.aliases, field.label].sort((a, b) => b.length - a.length)) {
        const match = anchorPattern(alias)?.exec(rawPrefix);
        if (match) {
            const rest = clean(rawPrefix.slice(match.index + match[0].length));
            const restTokens = rest ? rest.split(/\s+/) : [];
            const lastToken = restTokens.at(-1);
            if (lastToken && /^(to|from|through|till|until|-|–|\/)$/i.test(lastToken)) {
                return { anchor: clean(rawPrefix.slice(match.index, match.index + match[0].length)), inlineBefore: lastToken };
            }
            if (!rest)
                return { anchor: clean(rawPrefix.slice(match.index)) };
        }
    }
    return { anchor: clean(rawPrefix) };
}
function extractInlineAfterAndStops(afterWords, sameSegmentWords, adjacentSegments, relation) {
    const stopLabels = [];
    let inlineAfter;
    let suffix = '';
    const segText = clean(sameSegmentWords.map(w => w.text).join(' '));
    if (segText) {
        const colonLabel = extractLeadingLabel(segText);
        if (colonLabel) {
            stopLabels.push(colonLabel);
            suffix = colonLabel;
        }
        else {
            const firstWord = sameSegmentWords[0]?.text ?? '';
            if (/^(to|till|until|through|-|–|\/)$/i.test(firstWord)) {
                inlineAfter = firstWord;
                suffix = firstWord;
            }
            else if (segText.startsWith('(') || /^[\p{L}()]+$/u.test(segText)) {
                if (segText.length <= 30)
                    suffix = segText;
            }
        }
    }
    if (relation !== 'table-column') {
        for (const adj of adjacentSegments) {
            const label = extractLeadingLabel(adj.text);
            if (label)
                stopLabels.push(label);
        }
    }
    // Also check if afterWords starts with (or shortly hits, e.g. after time "12:00:00 AM") a range delimiter token.
    if (!inlineAfter && afterWords.length) {
        const delimWord = afterWords.slice(0, 4).find(w => /^(to|till|until|through|-|–|\/)$/i.test(w.text));
        if (delimWord)
            inlineAfter = delimWord.text;
    }
    return { suffix, inlineAfter, stopLabels: [...new Set(stopLabels)] };
}
export function learnMapping(page, selection, field, documentId) {
    const uniqueIds = new Set(selection.wordIds);
    const selected = page.words.filter(w => uniqueIds.has(w.id)).sort((a, b) => a.id - b.id);
    if (!selected.length || selected.length !== uniqueIds.size) {
        throw new Error('Select valid words from one page.');
    }
    const start = selected[0], end = selected[selected.length - 1];
    // Require words to be contiguous within each selected line (allowing column-wrapped lines where another column sits between them).
    const byLine = new Map();
    for (const w of selected) {
        const arr = byLine.get(w.line) ?? [];
        arr.push(w);
        byLine.set(w.line, arr);
    }
    for (const [lineNo, lineSelected] of byLine.entries()) {
        const first = lineSelected[0].id;
        const last = lineSelected[lineSelected.length - 1].id;
        const expectedInLine = page.words.filter(w => w.line === lineNo && w.id >= first && w.id <= last);
        if (expectedInLine.length !== lineSelected.length) {
            throw new Error('Select continuous words on each line (without skipping words in the same segment).');
        }
    }
    const selectedBox = unionWordBox(selected);
    const startSegs = getLineSegments(page, start.line);
    const startSeg = startSegs.find(s => s.wordIds.includes(start.id)) ?? startSegs[0];
    const segPrefixRaw = startSeg
        ? startSeg.wordIds
            .filter(id => id < start.id)
            .map(id => page.words[id]?.text ?? '')
            .join(' ')
        : '';
    const segPrefix = clean(segPrefixRaw);
    let anchor = '';
    let relation = 'same-line';
    let inlineBefore;
    let columnBand;
    if (segPrefix) {
        const parsed = stripInlinePrefix(segPrefix, field);
        anchor = parsed.anchor;
        inlineBefore = parsed.inlineBefore;
        relation = inlineBefore ? 'inline-after' : 'same-line';
        // If same-segment prefix only held a prior value + delimiter (e.g. "14/07/2026 12:00:00 AM to"), pull anchor from the left segment.
        if (!anchor) {
            const leftSeg = startSegs.filter(s => s.box[2] < (startSeg?.box[0] ?? selectedBox[0])).at(-1);
            if (leftSeg && looksLikeLabelText(leftSeg.text)) {
                anchor = clean(leftSeg.text);
            }
        }
        // Narrow to field alias if prefix contains preceding unrelated text.
        const aliasMatch = anchor ? matchesFieldAlias(anchor, field) : null;
        if (aliasMatch) {
            const m = anchorPattern(aliasMatch)?.exec(anchor);
            if (m && !clean(anchor.slice(m.index + m[0].length))) {
                anchor = clean(anchor.slice(m.index));
            }
        }
        // Column band: span from start segment's left up to the next segment on the line (if any).
        const nextSeg = startSegs.find(s => s.box[0] > (startSeg?.box[2] ?? 0));
        const leftRatio = Math.max(0, ((startSeg?.box[0] ?? selectedBox[0]) - 12) / page.width);
        const rightRatio = nextSeg ? Math.min(1, (nextSeg.box[0] - 6) / page.width) : 1;
        if (nextSeg)
            columnBand = [Math.round(leftRatio * 1000) / 1000, Math.round(rightRatio * 1000) / 1000];
    }
    else {
        // Nothing precedes value inside its own segment: check left segment on same line vs header segment above.
        const leftSeg = startSegs.filter(s => s.box[2] < selectedBox[0]).at(-1);
        const prevLineSegs = start.line > 0 ? getLineSegments(page, start.line - 1) : [];
        const prevPrevLineSegs = start.line > 1 && !prevLineSegs.length ? getLineSegments(page, start.line - 2) : [];
        const headerCandidates = prevLineSegs.length ? prevLineSegs : prevPrevLineSegs;
        const aboveSeg = headerCandidates
            .map(seg => ({ seg, overlap: boxOverlapX(seg.box, selectedBox, 18) }))
            .filter(item => item.overlap > 0)
            .sort((a, b) => b.overlap - a.overlap)[0]?.seg;
        const leftAlias = leftSeg ? matchesFieldAlias(leftSeg.text, field) : null;
        const aboveAlias = aboveSeg ? matchesFieldAlias(aboveSeg.text, field) : null;
        const isMultiColTable = headerCandidates.length >= 2 && startSegs.length >= 2;
        if (aboveAlias && !leftAlias) {
            anchor = clean(aboveSeg.text);
            relation = isMultiColTable ? 'table-column' : 'next-line';
        }
        else if (leftAlias) {
            anchor = clean(leftSeg.text);
            relation = 'same-line';
        }
        else if (isMultiColTable && aboveSeg && looksLikeLabelText(aboveSeg.text)) {
            anchor = clean(aboveSeg.text);
            relation = 'table-column';
        }
        else if (leftSeg && looksLikeLabelText(leftSeg.text)) {
            anchor = clean(leftSeg.text);
            relation = 'same-line';
        }
        else if (aboveSeg && looksLikeLabelText(aboveSeg.text)) {
            anchor = clean(aboveSeg.text);
            relation = headerCandidates.length >= 2 ? 'table-column' : 'next-line';
        }
        else if (start.line > 0) {
            anchor = clean(page.lines[start.line - 1]?.text ?? '');
            relation = 'next-line';
        }
        if (relation === 'table-column' || relation === 'next-line') {
            const headerSegs = headerCandidates;
            const idx = aboveSeg ? headerSegs.findIndex(s => s.id === aboveSeg.id) : -1;
            const prevH = idx > 0 ? headerSegs[idx - 1] : undefined;
            const nextH = idx >= 0 && idx + 1 < headerSegs.length ? headerSegs[idx + 1] : undefined;
            const colL = prevH ? (prevH.box[2] + (aboveSeg?.box[0] ?? selectedBox[0])) / 2 : Math.max(0, selectedBox[0] - 20);
            const colR = nextH ? ((aboveSeg?.box[2] ?? selectedBox[2]) + nextH.box[0]) / 2 : page.width;
            columnBand = [
                Math.round(Math.max(0, colL / page.width) * 1000) / 1000,
                Math.round(Math.min(1, colR / page.width) * 1000) / 1000,
            ];
        }
        else if (leftSeg) {
            const rightSeg = startSegs.find(s => s.box[0] > (startSeg?.box[2] ?? selectedBox[2]));
            const colL = Math.max(0, (leftSeg.box[0] - 10) / page.width);
            const colR = rightSeg ? Math.min(1, (rightSeg.box[0] - 6) / page.width) : 1;
            columnBand = [Math.round(colL * 1000) / 1000, Math.round(colR * 1000) / 1000];
        }
    }
    if (selection.anchor !== undefined && clean(selection.anchor)) {
        anchor = clean(selection.anchor);
    }
    const example = selection.valueOverride?.trim() || selected.map(w => w.text).join(' ');
    if ((!anchor || !anchorPattern(anchor)) && (start.line <= 3 || field.id === 'insuranceCompany')) {
        if (start.line === 0 || /(?:insurance|assurance|general|life|health|ltd|limited)/i.test(example)) {
            anchor = 'HEADER_INSURER';
            relation = 'header-text';
        }
    }
    if (!anchor || !anchorPattern(anchor)) {
        throw new Error('No surrounding label found. Enter the label printed beside or above this value.');
    }
    const endSegs = getLineSegments(page, end.line);
    const endSeg = endSegs.find(s => s.wordIds.includes(end.id));
    const sameSegAfter = endSeg ? endSeg.wordIds.filter(id => id > end.id).map(id => page.words[id]).filter(Boolean) : [];
    const adjAfterSegs = endSegs.filter(s => s.box[0] > (endSeg?.box[2] ?? selectedBox[2]));
    const afterWords = page.words.filter(w => w.line === end.line && w.id > end.id);
    const { suffix, inlineAfter, stopLabels } = extractInlineAfterAndStops(afterWords, sameSegAfter, adjAfterSegs, relation);
    const sectionHeading = findSectionHeading(page, start.line);
    const multiline = selection.multiline ?? end.line > start.line;
    const variant = {
        anchor,
        relation,
        suffix,
        stopLabels,
        ...(inlineBefore ? { inlineBefore } : {}),
        ...(inlineAfter ? { inlineAfter } : {}),
        ...(sectionHeading ? { sectionHeading } : {}),
        ...(columnBand ? { columnBand } : {}),
        multiline,
        example,
        pageHint: page.number,
        documentId,
        ...(selection.semanticHint?.trim() ? { semanticHint: selection.semanticHint.trim() } : {}),
    };
    return {
        ...variant,
        fieldLabel: field.label,
        variants: [variant],
    };
}
export function mergeMapping(existing, incoming) {
    if (!existing)
        return incoming;
    const existingVariants = existing.variants?.length ? existing.variants : [existing];
    const incomingVariants = incoming.variants?.length ? incoming.variants : [incoming];
    const dedup = new Map();
    for (const v of [...incomingVariants, ...existingVariants]) {
        const key = `${normalizeLabel(v.anchor)}|${v.relation}|${v.inlineBefore ?? ''}|${v.inlineAfter ?? ''}`;
        if (!dedup.has(key))
            dedup.set(key, v);
    }
    const variants = [...dedup.values()];
    return {
        ...variants[0],
        fieldLabel: incoming.fieldLabel,
        variants,
    };
}
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function parseMonthToken(token) {
    const low = token.toLowerCase();
    const idx = MONTHS.findIndex(m => m === low || m.slice(0, 3) === low);
    return idx >= 0 ? idx + 1 : 0;
}
export function validValue(value, kind) {
    const v = value.trim();
    if (!v)
        return false;
    if (kind === 'currency') {
        return /^(?:(?:INR|Rs\.?|₹|\$|USD|EUR|GBP)\s*)?\d[\d,]*(?:\.\d{1,2})?(?:\s*\/-)?$/i.test(v);
    }
    if (kind === 'registration') {
        return /^(?:[A-Z]{2}(?:\s*-\s*|\s+)?\d{1,2}(?:\s*-\s*|\s+)?[A-Z]{0,3}(?:\s*-\s*|\s+)?\d{1,4}|\d{2}(?:\s*-\s*|\s+)?BH(?:\s*-\s*|\s+)?\d{4}(?:\s*-\s*|\s+)?[A-Z]{1,2})$/i.test(v);
    }
    if (kind === 'policy_number') {
        if (v.length < 4 || v.length > 60 || !/\d/.test(v))
            return false;
        if (!/^[A-Z0-9][A-Z0-9/\-_. ]*[A-Z0-9]$/i.test(v))
            return false;
        const tokens = v.split(/\s+/);
        if (tokens.length > 7)
            return false;
        // Reject prose sentences while allowing multi-group spaced policy numbers like "2311 2012 3456 7800 000".
        if (tokens.length > 1 && tokens.some(t => /^[a-z]{4,}$/i.test(t) && !/^(?:policy|endorsement|og|c|u|m|t)$/i.test(t) && /^[a-z]+$/.test(t))) {
            return false;
        }
        return true;
    }
    if (kind === 'number') {
        return /^-?\d[\d,]*(?:\.\d+)?$/.test(v);
    }
    if (kind === 'phone') {
        const digits = v.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15 && /^[+\d\s()\-]+$/.test(v);
    }
    if (kind === 'email') {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    }
    if (kind === 'date') {
        let day = 0, month = 0, year = 0;
        let m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/.exec(v);
        if (m) {
            day = Number(m[1]);
            month = Number(m[2]);
            year = Number(m[3]);
            if (m[3].length === 2)
                year = year <= 50 ? 2000 + year : 1900 + year;
        }
        else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v))) {
            year = Number(m[1]);
            month = Number(m[2]);
            day = Number(m[3]);
        }
        else if ((m = /^(\d{1,2})[\s/\-]([A-Za-z]+)[\s/\-,]+(\d{2,4})$/.exec(v))) {
            day = Number(m[1]);
            month = parseMonthToken(m[2]);
            year = Number(m[3]);
            if (m[3].length === 2)
                year = year <= 50 ? 2000 + year : 1900 + year;
        }
        else if ((m = /^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/.exec(v))) {
            month = parseMonthToken(m[1]);
            day = Number(m[2]);
            year = Number(m[3]);
        }
        else {
            return false;
        }
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100)
            return false;
        const d = new Date(Date.UTC(year, month - 1, day));
        return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
    }
    return v.length >= 1 && /[\p{L}\p{N}]/u.test(v);
}
function buildStopPatterns(fields, mappings, ownAnchor) {
    const labels = new Set();
    for (const f of fields) {
        labels.add(f.label);
        for (const a of f.aliases)
            labels.add(a);
    }
    for (const m of Object.values(mappings)) {
        const variants = m.variants?.length ? m.variants : [m];
        for (const v of variants) {
            if (v.anchor)
                labels.add(v.anchor);
            for (const s of v.stopLabels ?? [])
                labels.add(s);
        }
    }
    const ownNorm = ownAnchor ? normalizeLabel(ownAnchor) : '';
    return [...labels]
        .filter(l => normalizeLabel(l) !== ownNorm)
        .sort((a, b) => b.length - a.length)
        .map(anchorPattern)
        .filter((p) => p !== null);
}
function lineLooksLikeNewField(text, stops) {
    const t = clean(text);
    if (!t)
        return true;
    if (stops.some(p => {
        const m = p.exec(t);
        return m !== null && m.index <= 2;
    })) {
        return true;
    }
    // Colon label pattern like "Address :" or "Vehicle Model:"
    if (/^[A-Za-z][A-Za-z0-9 &/().\-]{1,42}\s*:/.test(t))
        return true;
    return false;
}
function extractAllDateTokens(text) {
    const re = /(?<![\d:])(?:\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\s/\-][A-Za-z]{3,9}[\s/\-,]+\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s*\d{4})(?!\d)/g;
    const out = [];
    for (const m of text.matchAll(re)) {
        const cand = clean(m[0]);
        if (validValue(cand, 'date'))
            out.push(cand);
    }
    return out;
}
function extractFirstDateToken(text) {
    return extractAllDateTokens(text)[0] ?? null;
}
function splitCombinedSlashValue(value, anchor, field) {
    const sep = anchor.includes('/') ? '/' : anchor.includes('&') ? '&' : '';
    if (!sep)
        return value;
    const anchorParts = anchor.split(sep).map(p => normalizeLabel(p)).filter(Boolean);
    const valueSep = value.includes('/') ? '/' : value.includes('&') ? '&' : '';
    if (!valueSep)
        return value;
    const valueParts = value.split(valueSep).map(p => clean(p)).filter(Boolean);
    if (anchorParts.length !== 2 || valueParts.length !== 2)
        return value;
    const fieldWords = normalizeLabel(`${field.label} ${field.id.replaceAll('_', ' ')}`).split(/\s+/);
    const score0 = anchorParts[0].split(/\s+/).filter(w => w.length > 2 && fieldWords.includes(w)).length;
    const score1 = anchorParts[1].split(/\s+/).filter(w => w.length > 2 && fieldWords.includes(w)).length;
    if (score0 > 0 && score1 === 0)
        return valueParts[0];
    if (score1 > 0 && score0 === 0)
        return valueParts[1];
    return value;
}
function trimByInlineAndStops(rawText, rule, stops, field, matchedAnchor) {
    const kind = field.kind;
    let value = rawText;
    if (rule.inlineBefore) {
        const delim = new RegExp(`\\b${escapeRegex(rule.inlineBefore)}\\b`, 'i').exec(value);
        if (delim)
            value = clean(value.slice(delim.index + delim[0].length));
        else if (/^[-–—/]$/.test(rule.inlineBefore)) {
            const idx = value.indexOf(rule.inlineBefore);
            if (idx >= 0)
                value = clean(value.slice(idx + rule.inlineBefore.length));
        }
    }
    if (rule.inlineAfter) {
        const delim = /^[-–—/]$/.test(rule.inlineAfter)
            ? value.indexOf(rule.inlineAfter)
            : new RegExp(`(?:^|\\s)${escapeRegex(rule.inlineAfter)}(?:\\s|$)`, 'i').exec(value)?.index;
        if (delim !== undefined && delim > 0)
            value = clean(value.slice(0, delim));
    }
    if (rule.suffix) {
        const suf = anchorPattern(rule.suffix)?.exec(value);
        if (suf && suf.index > 0)
            value = clean(value.slice(0, suf.index));
    }
    // Stop at any known label or colon-delimited label inside the remainder.
    const cutIndices = [];
    for (const p of stops) {
        const m = p.exec(value);
        if (m && m.index > 0)
            cutIndices.push(m.index);
    }
    // Also cut before an embedded "Label :" if it's clearly a second field on the same line (not time like 12:30 and not spanning a date like "Hours of 15/06/2026 To :").
    const colonLabelRe = /\s+([A-Za-z][A-Za-z0-9 &().\-]{1,35}(?:\s+\d)?\s*:(?!\d))/g;
    for (const colonMatch of value.matchAll(colonLabelRe)) {
        if (colonMatch.index !== undefined && colonMatch.index > 0 && !/\d{1,2}[/.\-]\d{1,2}/.test(colonMatch[1])) {
            cutIndices.push(colonMatch.index);
            break;
        }
    }
    if (cutIndices.length)
        value = clean(value.slice(0, Math.min(...cutIndices)));
    if (kind === 'policy_number') {
        const quoted = /['"]([A-Z0-9][A-Z0-9/\-_]{3,40})['"]/i.exec(value);
        if (quoted)
            value = quoted[1];
        value = value.replace(/^['"]+|['"]+$/g, '');
    }
    if (kind === 'registration') {
        const regMatch = /\b([A-Z]{2}(?:\s*-\s*|\s+)?\d{1,2}(?:\s*-\s*|\s+)?[A-Z]{0,3}(?:\s*-\s*|\s+)?\d{1,4}|\d{2}(?:\s*-\s*|\s+)?BH(?:\s*-\s*|\s+)?\d{4}(?:\s*-\s*|\s+)?[A-Z]{1,2})\b/i.exec(value);
        if (regMatch)
            value = regMatch[1];
    }
    if (field.id === 'engineNumber' || field.id === 'chassisNumber') {
        value = value.replace(/\s*&+\s*$/, '').trim();
    }
    if (kind === 'date') {
        const isExpiryRangeAnchor = field.id === 'expiryDate' || /\b(?:end|expiry|to|valid\s+upto)\b/i.test(matchedAnchor ?? '');
        if (isExpiryRangeAnchor && !rule.inlineAfter && !rule.inlineBefore) {
            const dates = extractAllDateTokens(value);
            if (dates.length >= 2) {
                return clean(dates[dates.length - 1]);
            }
        }
        if (!rule.inlineAfter && !rule.inlineBefore) {
            const dateRangeStart = /^(.+?)\s+(?:to|till|until|through|-|–)\s+\d/i.exec(value);
            if (dateRangeStart) {
                const cleanDate = extractFirstDateToken(dateRangeStart[1]);
                if (cleanDate)
                    value = cleanDate;
            }
        }
        const firstDate = extractFirstDateToken(value);
        if (firstDate)
            value = firstDate;
    }
    if (matchedAnchor) {
        value = splitCombinedSlashValue(value, matchedAnchor, field);
    }
    return clean(value);
}
function wordsAfterAnchor(seg, segWords, anchorEndChar) {
    let cursor = 0;
    const result = [];
    for (const w of segWords) {
        const start = seg.text.indexOf(w.text, cursor);
        const wordStart = start >= 0 ? start : cursor;
        const wordEnd = wordStart + w.text.length;
        cursor = wordEnd + 1;
        if (wordStart >= anchorEndChar && !/^[:|=\-–—]+$/.test(w.text)) {
            result.push(w);
        }
    }
    return result;
}
function lineLooksLikeUnmappedFieldRow(page, lineIdx, text, isSingleColumn) {
    if (isSingleColumn) {
        const segs = getLineSegments(page, lineIdx);
        if (segs.length >= 2) {
            const first = clean(segs[0].text);
            const second = clean(segs[1].text);
            if (first && second && looksLikeLabelText(first))
                return true;
        }
    }
    if (/^(?:Date|Policy|Vehicle|Nominee|Broker|Agent|Branch|Mobile|Phone|Email|GSTIN|PAN|Period|Sum|IDV|Cubic|Seating|Fuel|Year)\b[^:]{0,25}\s+(?:\d|[A-Z]{2}\d|\S+@\S+)/i.test(text)) {
        return true;
    }
    return false;
}
function findMatchingWordSpan(lineWords, extractedText) {
    if (!lineWords.length || !extractedText)
        return null;
    const targetTokens = extractedText.split(/\s+/).filter(Boolean);
    if (!targetTokens.length)
        return null;
    for (let i = 0; i <= lineWords.length - targetTokens.length; i++) {
        const slice = lineWords.slice(i, i + targetTokens.length);
        const joined = clean(slice.map(w => w.text).join(' '));
        if (joined === extractedText || joined.includes(extractedText)) {
            return { box: unionWordBox(slice), wordIds: slice.map(w => w.id) };
        }
    }
    const fallback = lineWords.filter(w => extractedText.includes(w.text));
    if (fallback.length)
        return { box: unionWordBox(fallback), wordIds: fallback.map(w => w.id) };
    return null;
}
function columnSliceWords(page, line, colLeft, colRight) {
    return line.wordIds
        .map(id => page.words[id])
        .filter((w) => {
        if (!w)
            return false;
        const cx = (w.box[0] + w.box[2]) / 2;
        return cx >= colLeft && cx <= colRight;
    });
}
function lineVerticalGap(page, prevLine, nextLine) {
    const prevBox = prevLine.box ?? [0, 0, 0, 0];
    const nextBox = nextLine.box ?? [0, 0, 0, 0];
    const height = Math.max(8, prevBox[3] - prevBox[1], nextBox[3] - nextBox[1]);
    return { gap: nextBox[1] - prevBox[3], height };
}
function extractHeaderInsurerCandidates(page, isLearned, fullScan = false) {
    const candidates = [];
    const insurerRe = /(?:\bFor\s+(?:&\s+On\s+Behalf\s+of\s+)?)?([A-Z][A-Za-z&.,' \-]{2,60}?\b(?:General|Health|Life|Motor)?\s*(?:Insurance|Assurance)\b(?:\s+(?:Company|Co\.?|Corporation|Corp\.?))?(?:\s+(?:Ltd\.?|Limited|Pvt\.?\s*Ltd\.?))?)/i;
    const maxLines = fullScan ? page.lines.length : Math.min(5, page.lines.length);
    for (let i = 0; i < maxLines; i++) {
        const line = page.lines[i];
        if (/\b(?:previous|old|prior|regulatory|development\s+authority|licensed\s+by)\b/i.test(line.text))
            continue;
        const isTop = i < 5;
        const isForLine = /^\s*For\s+/i.test(line.text) || /\bFor\s+[A-Z]/i.test(line.text);
        if (!isTop && fullScan && !isForLine && !/(?:Company|Co\.|Limited|Ltd\.?)$/i.test(clean(line.text)))
            continue;
        const m = insurerRe.exec(line.text);
        if (m) {
            const value = clean(m[1]).replace(/^For\s+(?:&\s+On\s+Behalf\s+of\s+)?/i, '').trim();
            if (value.length >= 10 &&
                !/^(?:policy\s+schedule|certificate\s+of\s+insurance|motor\s+insurance|health\s+insurance|marine\s+insurance|warehouse\s+insurance|fire\s+insurance)/i.test(value)) {
                const lineWords = line.wordIds.map(id => page.words[id]).filter(Boolean);
                const span = findMatchingWordSpan(lineWords, value);
                candidates.push({
                    value,
                    page: page.number,
                    anchor: 'HEADER_INSURER',
                    evidence: line.text,
                    source: page.source,
                    score: isLearned ? 0.9 : isTop ? 0.72 : 0.66,
                    box: span?.box ?? line.box,
                    wordIds: span?.wordIds ?? line.wordIds,
                });
            }
        }
    }
    return candidates;
}
function tryWrappedNextLineDate(page, field, lineIdx, sourceText, currentValue, colLeft, colRight) {
    if (field.id !== 'expiryDate' ||
        !/\b(?:to|till|until)\s*:?\s*$/i.test(sourceText) ||
        (validValue(currentValue, 'date') && extractAllDateTokens(sourceText).length >= 2) ||
        lineIdx + 1 >= page.lines.length) {
        return null;
    }
    const nextWords = columnSliceWords(page, page.lines[lineIdx + 1], colLeft, colRight);
    const wrappedDate = extractFirstDateToken(clean(nextWords.map(w => w.text).join(' ')));
    return wrappedDate ? { value: wrappedDate, words: nextWords, line: lineIdx + 1 } : null;
}
function evaluateRuleOnPage(page, field, anchor, rule, stops, isLearned) {
    if (rule?.relation === 'header-text' || anchor === 'HEADER_INSURER') {
        return extractHeaderInsurerCandidates(page, isLearned);
    }
    const pat = anchorPattern(anchor);
    if (!pat)
        return [];
    const results = [];
    const segsAll = getSegments(page);
    for (let lineIdx = 0; lineIdx < page.lines.length; lineIdx++) {
        const line = page.lines[lineIdx];
        const lineSegs = getLineSegments(page, lineIdx);
        // 1) Try table-column match when rule is table-column, OR when line has multi-column headers (not a key-value pair).
        const matchedSeg = lineSegs.find(s => pat.test(s.text));
        const matchedIdx = matchedSeg ? lineSegs.findIndex(s => s.id === matchedSeg.id) : -1;
        const siblingSegs = matchedSeg ? lineSegs.filter(s => s.id !== matchedSeg.id) : [];
        const siblingsLookLikeHeaders = siblingSegs.length > 0 &&
            siblingSegs.every(s => looksLikeLabelText(s.text) && !s.text.includes(':'));
        if (matchedSeg && lineSegs.length >= 2 && (rule?.relation === 'table-column' || (!rule && siblingsLookLikeHeaders))) {
            const m = pat.exec(matchedSeg.text);
            const afterInSeg = m ? clean(matchedSeg.text.slice(m.index + m[0].length)) : '';
            const afterIsHeaderOnly = !afterInSeg ||
                /^&\s*$/.test(afterInSeg) ||
                (looksLikeLabelText(afterInSeg) && !/\d{3,}/.test(afterInSeg) && !afterInSeg.includes(':'));
            if (m && afterIsHeaderOnly && lineIdx + 1 < page.lines.length) {
                const segIdx = matchedIdx;
                const prevSeg = segIdx > 0 ? lineSegs[segIdx - 1] : undefined;
                const nextSeg = segIdx + 1 < lineSegs.length ? lineSegs[segIdx + 1] : undefined;
                const segWords = matchedSeg.wordIds.map(id => page.words[id]).filter(Boolean);
                const anchorSpan = findMatchingWordSpan(segWords, clean(m[0]));
                const afterWordsInSeg = wordsAfterAnchor(matchedSeg, segWords, m.index + m[0].length);
                const afterIsOwnTail = !afterInSeg || /^(?:&|&\s*No\.?|No\.?|Number|Place)$/i.test(afterInSeg);
                const beforeInSeg = clean(matchedSeg.text.slice(0, m.index));
                const hasDistinctBeforeStop = Boolean(beforeInSeg) && stops.some(p => p.test(beforeInSeg));
                const colLeft = hasDistinctBeforeStop && anchorSpan
                    ? anchorSpan.box[0] - 10
                    : prevSeg
                        ? (prevSeg.box[2] + matchedSeg.box[0]) / 2
                        : Math.max(0, matchedSeg.box[0] - 25);
                let colRight = nextSeg ? (matchedSeg.box[2] + nextSeg.box[0]) / 2 : page.width;
                const hasDistinctAfterStop = Boolean(afterInSeg) &&
                    !afterIsOwnTail &&
                    stops.some(p => p.test(afterInSeg));
                if (hasDistinctAfterStop && anchorSpan && afterWordsInSeg.length) {
                    colRight = Math.min(colRight, (anchorSpan.box[2] + afterWordsInSeg[0].box[0]) / 2);
                }
                const isStackedSubHeader = (txt) => !txt ||
                    (/^[\p{L}&/.\-()\s]{1,35}$/u.test(txt) &&
                        /^(?:mark\s*&\s*(?:no\.?|place)|&\s*no\.?|number|no\.?|registration\s*(?:mark|\/invoic.*)?|chassis\s*no\.?|engine\s*no\.?|model|place|turing|pacity|body|date)$/i.test(txt));
                let dataRowIdx = lineIdx + 1;
                let colWords = [];
                let rawColText = '';
                for (let probe = lineIdx + 1; probe < Math.min(page.lines.length, lineIdx + 8); probe++) {
                    const w = columnSliceWords(page, page.lines[probe], colLeft, colRight);
                    const t = clean(w.map(x => x.text).join(' '));
                    if (!t || (looksLikeLabelText(t) && isStackedSubHeader(t))) {
                        continue;
                    }
                    dataRowIdx = probe;
                    colWords = w;
                    rawColText = t;
                    break;
                }
                if (colWords.length && rawColText && !lineLooksLikeNewField(rawColText, stops)) {
                    let value = trimByInlineAndStops(colWords.map(w => w.text).join(' '), rule ?? {}, stops, field, anchor);
                    const collectedWords = [...colWords];
                    const evidenceLines = [lineIdx, dataRowIdx];
                    // Allow multiline wrapping inside the same table column if text field.
                    if (value && (rule?.multiline || field.kind === 'text') && !lineLooksLikeNewField(value, stops)) {
                        for (let k = dataRowIdx + 1; k < page.lines.length; k++) {
                            const prevL = page.lines[k - 1], curL = page.lines[k];
                            const { gap, height } = lineVerticalGap(page, prevL, curL);
                            if (gap > height * 1.75)
                                break;
                            const kWords = columnSliceWords(page, curL, colLeft, colRight);
                            if (!kWords.length)
                                break;
                            const kText = clean(kWords.map(w => w.text).join(' '));
                            if (!kText || lineLooksLikeNewField(kText, stops))
                                break;
                            value = clean(`${value} ${kText}`);
                            collectedWords.push(...kWords);
                            evidenceLines.push(k);
                            if (!rule?.multiline && evidenceLines.length >= 4)
                                break;
                        }
                    }
                    if (value) {
                        const span = findMatchingWordSpan(collectedWords, value);
                        let score = isLearned ? 0.91 : 0.68;
                        if (rule?.sectionHeading && findSectionHeading(page, lineIdx) === rule.sectionHeading)
                            score += 0.04;
                        if (page.source === 'ocr')
                            score -= 0.14;
                        results.push({
                            value,
                            page: page.number,
                            anchor,
                            evidence: evidenceLines.map(i => page.lines[i].text).join(' / '),
                            source: page.source,
                            score: Math.min(0.98, Math.max(0.1, score)),
                            box: span?.box ?? unionWordBox(collectedWords),
                            wordIds: span?.wordIds ?? collectedWords.map(w => w.id),
                        });
                        continue;
                    }
                }
            }
        }
        // 2) Try segment-scoped same-line / inline / next-line match (prevents 2-column bleed!).
        const targetSegs = matchedSeg ? [matchedSeg] : [{ id: -1, line: lineIdx, text: line.text, wordIds: line.wordIds, box: line.box ?? [0, 0, page.width, 0] }];
        for (const seg of targetSegs) {
            const m = pat.exec(seg.text);
            if (!m)
                continue;
            // Do not match "Previous Policy Number" / "Old Policy No." as the active Policy Number,
            // and do not match "IRDA Reg. No." / "IRDAI Regn. No." as the Vehicle Registration Number.
            const beforeMatch = seg.text.slice(0, m.index).trim().toLowerCase();
            if (/\b(previous|old|prior|expiring)$/.test(beforeMatch) && !/^(previous|old|prior|expiring)\b/i.test(anchor)) {
                continue;
            }
            if ((field.id === 'vehicleNumber' || field.id === 'registrationNumber') && /\birdai?\b/.test(beforeMatch)) {
                continue;
            }
            const segWords = seg.wordIds.map(id => page.words[id]).filter(Boolean);
            const anchorEndChar = m.index + m[0].length;
            let effectiveAnchor = anchor;
            let afterSegRaw = clean(seg.text.slice(anchorEndChar));
            const hadHeaderTail = /^(?:&\s*Time|\/\s*Time|\([DdMmYy/\-]+\)|&|&\s*No\.?|&\s*Place)$/i.test(afterSegRaw);
            if (hadHeaderTail) {
                afterSegRaw = '';
            }
            // Handle combined slash/ampersand labels like "Chassis no./Engine no.:" or "Engine No. & Chassis No."
            if (afterSegRaw.startsWith('/') || afterSegRaw.startsWith('&')) {
                const afterColon = /^[\/&][^:]{1,40}:(.*)$/.exec(afterSegRaw);
                if (afterColon) {
                    const labelSpan = seg.text.slice(m.index, seg.text.indexOf(':', anchorEndChar));
                    effectiveAnchor = clean(labelSpan);
                    afterSegRaw = clean(afterColon[1]);
                }
                else if (stops.some(p => p.exec(afterSegRaw)?.index === 1)) {
                    effectiveAnchor = clean(seg.text);
                    afterSegRaw = '';
                }
            }
            else if (/[\/&]$/.test(seg.text.slice(0, m.index).trim())) {
                effectiveAnchor = clean(seg.text.slice(0, anchorEndChar));
            }
            else if (!afterSegRaw && /[\/&]/.test(seg.text) && looksLikeLabelText(seg.text)) {
                effectiveAnchor = clean(seg.text);
            }
            let value = '';
            const evidenceLines = [lineIdx];
            let collectedWords = [];
            // Column bounds for this row: prevent adjacent right-hand column from bleeding into wrapped lines!
            const adjRightSeg = lineSegs.find(s => s.box[0] > seg.box[2] + 4);
            let colLeft = Math.max(0, seg.box[0] - 16);
            let colRight = adjRightSeg ? adjRightSeg.box[0] - 6 : page.width;
            let isTabKeyValue = false;
            if (!adjRightSeg && rule?.columnBand && lineSegs.length > 1) {
                // Keep column bounded if multiple segments exist elsewhere on row
                const bandRight = rule.columnBand[1] * page.width;
                if (seg.box[2] <= bandRight + 20)
                    colRight = Math.min(colRight, bandRight + 20);
            }
            if (afterSegRaw && rule?.relation !== 'next-line') {
                value = trimByInlineAndStops(afterSegRaw, rule ?? {}, stops, field, effectiveAnchor);
                collectedWords = wordsAfterAnchor(seg, segWords, anchorEndChar);
                const wrapped = tryWrappedNextLineDate(page, field, lineIdx, afterSegRaw, value, colLeft, colRight);
                if (wrapped) {
                    value = wrapped.value;
                    collectedWords = wrapped.words;
                    evidenceLines.push(wrapped.line);
                }
            }
            else {
                // Check if value is in the NEXT segment on the same row (e.g. tab-separated key-value pair)
                const nextSegOnRow = lineSegs.find(s => s.id !== seg.id && s.box[0] > seg.box[2]);
                const nextSegIsOwnField = nextSegOnRow &&
                    (/[A-Za-z.)\]]\s*:(?!\d)/.test(nextSegOnRow.text) || stops.some(p => p.exec(nextSegOnRow.text)?.index === 0));
                if (nextSegOnRow && !nextSegIsOwnField && rule?.relation !== 'next-line') {
                    const adjAfterNext = lineSegs.find(s => s.box[0] > nextSegOnRow.box[2] + 4);
                    colLeft = Math.max(0, nextSegOnRow.box[0] - 18);
                    colRight = adjAfterNext ? adjAfterNext.box[0] - 6 : page.width;
                    isTabKeyValue = true;
                    value = trimByInlineAndStops(nextSegOnRow.text, rule ?? {}, stops, field, effectiveAnchor);
                    collectedWords = nextSegOnRow.wordIds.map(id => page.words[id]).filter(Boolean);
                    const wrapped = tryWrappedNextLineDate(page, field, lineIdx, nextSegOnRow.text, value, colLeft, colRight);
                    if (wrapped) {
                        value = wrapped.value;
                        collectedWords = wrapped.words;
                        evidenceLines.push(wrapped.line);
                    }
                }
                else if (lineIdx + 1 < page.lines.length) {
                    // Value is on the line below (allow skipping stacked header continuation like "&" / "No." when header had tail).
                    const probeLeft = colLeft;
                    const probeRight = hadHeaderTail && !adjRightSeg ? Math.min(colRight, seg.box[2] + 80) : colRight;
                    const maxProbe = hadHeaderTail ? Math.min(page.lines.length, lineIdx + 6) : Math.min(page.lines.length, lineIdx + 2);
                    for (let probe = lineIdx + 1; probe < maxProbe; probe++) {
                        const nextWords = columnSliceWords(page, page.lines[probe], probeLeft, probeRight);
                        const nextText = clean(nextWords.map(w => w.text).join(' '));
                        if (!nextText || (hadHeaderTail && /^(?:no\.?|number|&\s*no\.?)$/i.test(nextText)))
                            continue;
                        if (!lineLooksLikeNewField(nextText, stops)) {
                            value = trimByInlineAndStops(nextText, rule ?? {}, stops, field, effectiveAnchor);
                            collectedWords = nextWords;
                            evidenceLines.push(probe);
                        }
                        break;
                    }
                }
            }
            // Dynamic multiline continuation for text fields OR explicitly multiline rules (strictly inside column X-band!).
            const canContinueLines = value &&
                (rule?.multiline ||
                    (field.kind === 'text' &&
                        !rule?.inlineAfter &&
                        !rule?.inlineBefore &&
                        !rule?.suffix));
            if (canContinueLines) {
                for (let k = evidenceLines[evidenceLines.length - 1] + 1; k < page.lines.length; k++) {
                    const prevL = page.lines[k - 1], curL = page.lines[k];
                    const { gap, height } = lineVerticalGap(page, prevL, curL);
                    if (gap > height * 1.75)
                        break;
                    const kWords = columnSliceWords(page, curL, colLeft, colRight);
                    if (!kWords.length)
                        break;
                    if (isTabKeyValue) {
                        const leftCellWords = columnSliceWords(page, curL, 0, colLeft - 1);
                        if (leftCellWords.length > 0)
                            break;
                    }
                    const kText = clean(kWords.map(w => w.text).join(' '));
                    if (!kText || lineLooksLikeNewField(kText, stops))
                        break;
                    // If the next line looks like an ALL-CAPS section heading, stop.
                    if (kText === kText.toUpperCase() && /[A-Z]{4,}/.test(kText) && kText.split(/\s+/).length <= 5)
                        break;
                    // For implicitly wrapped text (when rule.multiline wasn't set), avoid absorbing unrelated paragraphs or single-line adjacent values.
                    if (!rule?.multiline) {
                        if (kWords[0].box[0] < colLeft - 5)
                            break;
                        if (lineLooksLikeUnmappedFieldRow(page, k, kText, lineSegs.length <= 1 && colRight >= page.width - 1))
                            break;
                        if (validValue(kText, 'date') || validValue(kText, 'currency') || validValue(kText, 'registration'))
                            break;
                    }
                    value = clean(`${value} ${kText}`);
                    collectedWords.push(...kWords);
                    evidenceLines.push(k);
                    if (!rule?.multiline && evidenceLines.length >= 4)
                        break;
                }
            }
            if (value) {
                const span = findMatchingWordSpan(collectedWords, value);
                let score = isLearned ? 0.92 : 0.68;
                if (seg.text.slice(m.index, anchorEndChar + 2).includes(':'))
                    score += 0.02;
                if (rule?.sectionHeading && findSectionHeading(page, lineIdx) === rule.sectionHeading)
                    score += 0.04;
                if (rule?.pageHint && rule.pageHint === page.number)
                    score += 0.01;
                if (page.source === 'ocr')
                    score -= 0.14;
                results.push({
                    value,
                    page: page.number,
                    anchor,
                    evidence: evidenceLines.map(i => page.lines[i].text).join(' / '),
                    source: page.source,
                    score: Math.min(0.98, Math.max(0.1, score)),
                    box: span?.box ?? (collectedWords.length ? unionWordBox(collectedWords) : seg.box),
                    wordIds: span?.wordIds ?? collectedWords.map(w => w.id),
                });
            }
        }
    }
    void segsAll;
    return results;
}
export function extract(pages, fields, mappings) {
    return fields.map(field => {
        const mapping = mappings[field.id];
        const learnedVariants = mapping ? (mapping.variants?.length ? mapping.variants : [mapping]) : [];
        const stops = buildStopPatterns(fields, mappings, mapping?.anchor);
        const candidates = [];
        const pushUnique = (list) => {
            for (const c of list) {
                if (!candidates.some(existing => existing.page === c.page && existing.evidence === c.evidence && existing.value === c.value)) {
                    candidates.push(c);
                }
            }
        };
        // 1) Try learned contextual variants first.
        for (const variant of learnedVariants) {
            const ruleStops = buildStopPatterns(fields, mappings, variant.anchor);
            for (const page of pages) {
                pushUnique(evaluateRuleOnPage(page, field, variant.anchor, variant, ruleStops, true));
            }
        }
        // 2) If learned variants found no valid candidate (e.g. different insurer label phrasing), fall back to field aliases/label.
        const hasValidLearned = candidates.some(c => validValue(c.value, field.kind));
        if (!hasValidLearned) {
            const fallbackAnchors = [...field.aliases, field.label]
                .filter(a => !learnedVariants.some(v => normalizeLabel(v.anchor) === normalizeLabel(a)))
                .sort((a, b) => b.length - a.length);
            for (const anchor of fallbackAnchors) {
                let foundValidWithAnchor = false;
                for (const page of pages) {
                    const found = evaluateRuleOnPage(page, field, anchor, null, stops, false);
                    if (found.length) {
                        pushUnique(found);
                        if (found.some(c => validValue(c.value, field.kind))) {
                            foundValidWithAnchor = true;
                        }
                    }
                }
                // Once a specific longer alias finds a valid value, avoid adding shorter substring duplicates.
                if (foundValidWithAnchor)
                    break;
            }
            if (!candidates.some(c => validValue(c.value, field.kind)) && field.id === 'insuranceCompany' && pages.length) {
                pushUnique(extractHeaderInsurerCandidates(pages[0], false, true));
                if (pages[1] && !candidates.some(c => validValue(c.value, field.kind))) {
                    pushUnique(extractHeaderInsurerCandidates(pages[1], false, true));
                }
            }
        }
        if (!candidates.length) {
            return {
                fieldId: field.id,
                label: field.label,
                kind: field.kind,
                required: field.required,
                value: '',
                score: 0,
                status: 'missing',
                needsVerification: true,
                valid: false,
                reason: 'No matching label and value found.',
                candidates: [],
            };
        }
        // Rank candidates: valid format first, then higher contextual score, then earlier page.
        candidates.sort((a, b) => {
            const aValid = validValue(a.value, field.kind) ? 1 : 0;
            const bValid = validValue(b.value, field.kind) ? 1 : 0;
            if (aValid !== bValid)
                return bValid - aValid;
            if (Math.abs(a.score - b.score) > 0.02)
                return b.score - a.score;
            return a.page - b.page;
        });
        const chosen = candidates[0];
        const valid = validValue(chosen.value, field.kind);
        const distinctValidValues = new Set(candidates.filter(c => validValue(c.value, field.kind)).map(c => c.value.toLowerCase()));
        const distinctAllValues = new Set(candidates.map(c => c.value.toLowerCase()));
        const ambiguous = distinctValidValues.size > 1 || (distinctValidValues.size === 0 && distinctAllValues.size > 1);
        let score = chosen.score;
        if (!valid || ambiguous)
            score = Math.min(score, 0.45);
        score = Math.round(score * 100) / 100;
        const needsVerification = !valid || ambiguous || score < 0.8 || chosen.source === 'ocr';
        const status = needsVerification ? 'review' : 'confident';
        let reason = 'High-confidence contextual match.';
        if (ambiguous)
            reason = 'Multiple different candidate values found; verify before use.';
        else if (!valid)
            reason = `Extracted value does not match expected ${field.kind} format.`;
        else if (chosen.source === 'ocr')
            reason = 'Extracted via local OCR; human verification recommended.';
        else if (score < 0.8)
            reason = 'Matched via field alias fallback; verify before use.';
        return {
            fieldId: field.id,
            label: field.label,
            kind: field.kind,
            required: field.required,
            value: chosen.value,
            score,
            status,
            needsVerification,
            valid,
            reason,
            candidates,
            page: chosen.page,
            anchor: chosen.anchor,
            evidence: chosen.evidence,
            source: chosen.source,
            box: chosen.box,
            wordIds: chosen.wordIds,
        };
    });
}
function normalizeDateIso(value) {
    const v = clean(value);
    let d = 0, m = 0, y = 0;
    let match = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/.exec(v);
    if (match) {
        d = Number(match[1]);
        m = Number(match[2]);
        y = Number(match[3]);
        if (match[3].length === 2)
            y = y <= 50 ? 2000 + y : 1900 + y;
    }
    else if ((match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v))) {
        y = Number(match[1]);
        m = Number(match[2]);
        d = Number(match[3]);
    }
    else if ((match = /^(\d{1,2})[\s/\-]([A-Za-z]+)[\s/\-,]+(\d{2,4})$/.exec(v))) {
        d = Number(match[1]);
        m = parseMonthToken(match[2]);
        y = Number(match[3]);
        if (match[3].length === 2)
            y = y <= 50 ? 2000 + y : 1900 + y;
    }
    else if ((match = /^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/.exec(v))) {
        m = parseMonthToken(match[1]);
        d = Number(match[2]);
        y = Number(match[3]);
    }
    return d && m && y ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : v.toLowerCase();
}
export function valuesEquivalent(a, b, kind) {
    const ca = clean(a), cb = clean(b);
    if (!ca || !cb)
        return false;
    if (ca.toLowerCase() === cb.toLowerCase())
        return true;
    if (kind === 'date')
        return normalizeDateIso(ca) === normalizeDateIso(cb);
    if (kind === 'currency' || kind === 'number') {
        const na = Number(ca.replace(/[^\d.\-]/g, ''));
        const nb = Number(cb.replace(/[^\d.\-]/g, ''));
        return Number.isFinite(na) && Number.isFinite(nb) && Math.abs(na - nb) < 0.01;
    }
    if (kind === 'registration' || kind === 'policy_number') {
        return ca.replace(/[\s\-_]/g, '').toLowerCase() === cb.replace(/[\s\-_]/g, '').toLowerCase();
    }
    return normalizeLabel(ca) === normalizeLabel(cb);
}
export function locateValueWordsInPages(pages, targetValue) {
    const needle = targetValue.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!needle)
        return null;
    const tokens = needle.split(' ');
    for (const page of pages) {
        for (let i = 0; i <= page.words.length - tokens.length; i++) {
            const slice = page.words.slice(i, i + tokens.length);
            const joined = slice.map(w => w.text).join(' ').replace(/\s+/g, ' ').toLowerCase();
            if (joined === needle) {
                return { page: page.number, wordIds: slice.map(w => w.id), box: unionWordBox(slice) };
            }
        }
        // Normalized punctuation-insensitive contiguous span fallback (e.g. MP04MR7706 vs MP-04-MR-7706)
        const compactNeedle = needle.replace(/[^a-z0-9]/g, '');
        if (compactNeedle.length >= 4) {
            for (const line of page.lines) {
                const compactLine = line.text.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (compactLine.includes(compactNeedle)) {
                    const lineWords = line.wordIds.map(id => page.words[id]).filter(Boolean);
                    const span = findMatchingWordSpan(lineWords, targetValue);
                    if (span && span.wordIds.length) {
                        return { page: page.number, wordIds: span.wordIds, box: span.box };
                    }
                    const matched = lineWords.filter(w => {
                        const cw = w.text.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return cw.length >= 2 && compactNeedle.includes(cw);
                    });
                    if (matched.length) {
                        return {
                            page: page.number,
                            wordIds: matched.map(w => w.id),
                            box: unionWordBox(matched),
                        };
                    }
                }
            }
        }
    }
    return null;
}
