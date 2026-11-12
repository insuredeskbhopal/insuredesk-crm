import fs from 'node:fs';
import path from 'node:path';
import { clean, extract, locateValueWordsInPages, validValue, valuesEquivalent } from './extraction.js';
let cachedRegistry;
const COMPANY_PATTERNS = [
    [/ICICI\s+Lombard/i, 'ICICI Lombard General Insurance Company Limited'],
    [/TATA\s*AIG/i, 'Tata AIG General Insurance Company Limited'],
    [/IFFCO\s*[- ]?\s*TOKIO/i, 'IFFCO Tokio General Insurance Company Limited'],
    [/Bajaj\s*(?:Allianz|General)/i, 'Bajaj Allianz General Insurance Company Limited'],
    [/United\s+India/i, 'United India Insurance Company Limited'],
    [/New\s+India/i, 'The New India Assurance Company Limited'],
    [/HDFC\s*ERGO/i, 'HDFC ERGO General Insurance Company Limited'],
    [/Care\s*Health|Religare/i, 'Care Health Insurance Limited'],
    [/(?:Future\s+)?Generali|Generali\s+Central/i, 'Future Generali India Insurance Company Limited'],
    [/Royal\s+Sundaram/i, 'Royal Sundaram General Insurance Co. Limited'],
    [/Shriram/i, 'Shriram General Insurance Company Limited'],
    [/Liberty/i, 'Liberty General Insurance Limited'],
    [/(?:Go\s+)?Digit/i, 'Go Digit General Insurance Limited'],
    [/Star\s+Health/i, 'Star Health and Allied Insurance Co Ltd'],
    [/SBI\s+General/i, 'SBI General Insurance Company Limited'],
    [/Cholamandalam|Chola\s*MS/i, 'Cholamandalam MS General Insurance Company Limited'],
    [/Oriental\s+Insurance/i, 'The Oriental Insurance Company Limited'],
    [/National\s+Insurance/i, 'National Insurance Company Limited'],
];
function normalizeCompanyFallback(value = '', text = '') {
    const combined = `${value} ${text}`;
    for (const [pat, canonical] of COMPANY_PATTERNS) {
        if (pat.test(combined))
            return canonical;
    }
    return clean(String(value || ''));
}
function resolveRegistryLocation() {
    const cwd = /*turbopackIgnore: true*/ process.cwd();
    const envPath = process.env.PIE_CRM_REGISTRY_PATH?.trim();
    const candidates = [];
    if (envPath) {
        const resolvedEnv = path.resolve(/*turbopackIgnore: true*/ envPath);
        candidates.push(resolvedEnv.endsWith('.cjs') ? resolvedEnv : path.join(resolvedEnv, 'registry.cjs'));
    }
    for (const base of [cwd, path.resolve(cwd, '..'), path.resolve(cwd, '../..')]) {
        candidates.push(path.join(base, 'src', 'lib', 'policies', 'pdf', 'training', 'registry.cjs'), path.join(base, 'policy training module', '_Registry', 'registry.cjs'), path.join(base, 'src', 'app', 'lib', 'pdf-training', 'registry.cjs'), path.join(base, 'src', 'lib', 'pdf-training', 'registry.cjs'), path.join(base, 'lib', 'pdf-training', 'registry.cjs'));
    }
    for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
            const parent = path.dirname(cand);
            const modRoot = path.basename(parent) === '_Registry' ? path.dirname(parent) : parent;
            return { registryPath: cand, modRoot };
        }
    }
    return null;
}
/**
 * Loads CRM insurer `.cjs` trainer modules + `registry.cjs` using either the main project's
 * existing trainers (`PIE_CRM_REGISTRY_PATH` or auto-detected `pdf-training/registry.cjs`) or a local
 * `policy training module` folder, without requiring Next.js/Turbopack to statically bundle `.cjs` files.
 */
function loadRegistry() {
    if (cachedRegistry !== undefined)
        return cachedRegistry;
    const found = resolveRegistryLocation();
    if (!found) {
        cachedRegistry = null;
        return null;
    }
    const { registryPath, modRoot } = found;
    const trainerFiles = new Map();
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory())
                walk(full);
            else if (entry.isFile() && entry.name.endsWith('.cjs')) {
                trainerFiles.set(entry.name.toLowerCase(), full);
            }
        }
    };
    walk(modRoot);
    const moduleCache = new Map();
    const sharedUtilsDir = path.join(modRoot, '_Shared Utils');
    const resolveLocal = (request, fromFile) => {
        const direct = path.resolve(path.dirname(fromFile), request);
        if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
            return direct;
        }
        const norm = request.replace(/\\/g, '/');
        if (norm.endsWith('insurance-companies.cjs'))
            return '__MOCK_INSURANCE_COMPANIES__';
        if (norm.endsWith('rto-master.json'))
            return '__MOCK_RTO_MASTER__';
        if ((norm.includes('/utils/') || path.dirname(fromFile) === sharedUtilsDir) && fs.existsSync(sharedUtilsDir)) {
            return path.join(sharedUtilsDir, path.basename(norm));
        }
        const trainerMatch = /^\.\/([^/]+)\/([^/]+)\.cjs$/.exec(norm);
        if (trainerMatch) {
            const [, ins, cat] = trainerMatch;
            for (const cand of [`${ins}-${cat}.cjs`, `${ins}-${cat.replace(/-/g, '')}.cjs`]) {
                const hit = trainerFiles.get(cand.toLowerCase());
                if (hit)
                    return hit;
            }
        }
        return direct;
    };
    const loadCjs = (filePath) => {
        if (filePath === '__MOCK_INSURANCE_COMPANIES__') {
            return { normalizeInsuranceCompanyName: normalizeCompanyFallback };
        }
        if (filePath === '__MOCK_RTO_MASTER__') {
            return [];
        }
        const abs = path.resolve(filePath);
        const cached = moduleCache.get(abs);
        if (cached)
            return cached.exports;
        if (abs.toLowerCase().endsWith('.json')) {
            const parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
            moduleCache.set(abs, { exports: parsed });
            return parsed;
        }
        const mod = { exports: {} };
        moduleCache.set(abs, mod);
        const code = fs.readFileSync(abs, 'utf8');
        const localRequire = (req) => loadCjs(resolveLocal(req, abs));
        const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', code);
        fn(mod.exports, localRequire, mod, abs, path.dirname(abs));
        return mod.exports;
    };
    try {
        const api = loadCjs(registryPath);
        if (typeof api.applyScopedTraining === 'function' && typeof api.deriveTrainingScope === 'function') {
            cachedRegistry = api;
            return cachedRegistry;
        }
    }
    catch {
        cachedRegistry = null;
        return null;
    }
    cachedRegistry = null;
    return null;
}
function readCrmFieldValue(modOut, fieldId) {
    const direct = modOut[fieldId];
    if (typeof direct === 'string' && direct.trim())
        return clean(direct);
    if (typeof direct === 'number' && Number.isFinite(direct))
        return String(direct);
    const members = Array.isArray(modOut.insuredMembers)
        ? modOut.insuredMembers
        : [];
    if (fieldId === 'numberOfInsuredMembers' && members.length > 0) {
        return String(members.length);
    }
    if (members.length > 0) {
        const memberKeyMap = {
            memberName: 'name',
            memberDateOfBirth: 'dateOfBirth',
            memberAge: 'age',
            memberGender: 'gender',
            memberRelationship: 'relationship',
            memberAbhaId: 'abhaId',
            memberPreExistingDiseases: 'preExistingDiseases',
            memberFirstPolicyInceptionDate: 'firstPolicyInceptionDate',
            memberSpecificConditions: 'specificConditions',
        };
        const mKey = memberKeyMap[fieldId];
        if (mKey) {
            const vals = members.map(m => String(m[mKey] ?? '').trim()).filter(Boolean);
            if (vals.length)
                return vals.join(', ');
        }
    }
    if (fieldId === 'vehicleNumber' && typeof modOut.registrationNumber === 'string' && modOut.registrationNumber.trim()) {
        return clean(modOut.registrationNumber);
    }
    if (fieldId === 'registrationNumber' && typeof modOut.vehicleNumber === 'string' && modOut.vehicleNumber.trim()) {
        return clean(modOut.vehicleNumber);
    }
    if (fieldId === 'totalPremium' && typeof modOut.premiumIncludingGst === 'string' && modOut.premiumIncludingGst.trim()) {
        return clean(modOut.premiumIncludingGst);
    }
    if (fieldId === 'grossPremium' && typeof modOut.premiumIncludingGst === 'string' && modOut.premiumIncludingGst.trim()) {
        return clean(modOut.premiumIncludingGst);
    }
    return '';
}
function makeModuleResult(visual, crmVal, anchor, reason, pages, located, textScore, ocrScore) {
    const targetPage = located?.page ?? visual.page ?? 1;
    const isOcr = visual.source === 'ocr' || pages[targetPage - 1]?.source === 'ocr' || pages[0]?.source === 'ocr';
    const score = isOcr ? ocrScore : textScore;
    const src = isOcr ? 'ocr' : 'text';
    return {
        ...visual,
        value: crmVal,
        valid: true,
        score,
        status: isOcr ? 'review' : 'confident',
        needsVerification: isOcr,
        reason,
        page: targetPage,
        anchor,
        evidence: crmVal,
        source: src,
        box: located?.box ?? visual.box,
        wordIds: located?.wordIds ?? visual.wordIds,
        candidates: [
            {
                value: crmVal,
                page: targetPage,
                anchor,
                evidence: crmVal,
                source: src,
                score,
                box: located?.box,
                wordIds: located?.wordIds,
            },
            ...visual.candidates,
        ],
    };
}
/**
 * 3-Layer Hybrid Extraction:
 * 1) Visual coordinate & user-learned mapping engine (`extract`),
 * 2) Scoped insurer CRM trainers (`policy training module`),
 * 3) Consensus & coordinate grounding merge (learned user clicks always win first).
 */
export function extractHybrid(pages, fields, mappings, options) {
    const visualResults = extract(pages, fields, mappings);
    const fullText = pages.map(p => p.lines.map(l => l.text).join('\n')).join('\n');
    const registry = loadRegistry();
    if (!registry || !fullText.trim()) {
        return {
            results: visualResults,
            scope: { insurer: '', category: '' },
            crmMatched: false,
        };
    }
    const baseResult = {
        sourceFile: options?.fileName || 'document.pdf',
        sourceText: fullText,
    };
    if (options?.categoryName) {
        baseResult.documentCategory = options.categoryName;
    }
    for (const r of visualResults) {
        if (r.valid && r.value.trim()) {
            baseResult[r.fieldId] = r.value.trim();
        }
    }
    const context = { text: fullText, sourceText: fullText, pages };
    const scope = registry.deriveTrainingScope(baseResult, context);
    const modOut = registry.applyScopedTraining(baseResult, context);
    const crmMatched = Boolean(scope.insurer);
    const mergedResults = visualResults.map(visual => {
        const field = fields.find(f => f.id === visual.fieldId);
        if (!field)
            return visual;
        const crmVal = readCrmFieldValue(modOut, field.id);
        const crmValid = Boolean(crmVal) && validValue(crmVal, field.kind);
        const hasLearnedRule = Boolean(mappings[field.id]);
        const isOcr = visual.source === 'ocr' ||
            pages[(visual.page ?? 1) - 1]?.source === 'ocr' ||
            pages[0]?.source === 'ocr';
        // 1) User's visually learned rule has highest priority.
        if (hasLearnedRule && visual.valid && visual.score >= 0.85) {
            if (crmValid && valuesEquivalent(visual.value, crmVal, field.kind)) {
                return {
                    ...visual,
                    score: isOcr ? Math.max(visual.score, 0.85) : 0.99,
                    status: isOcr ? 'review' : 'confident',
                    needsVerification: isOcr,
                    reason: 'Verified by trained visual rule and insurer module.',
                };
            }
            return visual;
        }
        // 2) Both agree on the same value -> high confidence consensus.
        if (visual.valid && crmValid && valuesEquivalent(visual.value, crmVal, field.kind)) {
            const score = isOcr ? Math.max(visual.score, 0.85) : Math.max(visual.score, 0.96);
            return {
                ...visual,
                score: Math.round(score * 100) / 100,
                status: isOcr ? 'review' : 'confident',
                needsVerification: isOcr,
                reason: 'Verified by both visual layout engine and insurer module.',
            };
        }
        // 3) Visual missed or returned an invalid value, and CRM module found a valid one.
        if ((!visual.value.trim() || !visual.valid) && crmValid) {
            const located = locateValueWordsInPages(pages, crmVal);
            return makeModuleResult(visual, crmVal, `MODULE:${scope.insurer || 'rule'}`, `Auto-detected via insurer module (${scope.insurer || 'scoped rule'}).`, pages, located, located ? 0.9 : 0.84, located ? 0.78 : 0.72);
        }
        // 4) Both found valid values that differ (no learned click yet): prefer CRM insurer guard when visual came from low-confidence fallback.
        if (visual.valid && crmValid && crmMatched && visual.score < 0.78) {
            const located = locateValueWordsInPages(pages, crmVal);
            return makeModuleResult(visual, crmVal, `MODULE:${scope.insurer}`, `Selected insurer-specific guard (${scope.insurer}) over generic fallback.`, pages, located, 0.86, 0.76);
        }
        return visual;
    });
    return {
        results: mergedResults,
        scope,
        crmMatched,
    };
}
