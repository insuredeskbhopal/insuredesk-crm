export function getAiProviderConfig() {
    const provider = process.env.PIE_AI_PROVIDER;
    if (provider === 'openai-compatible' && process.env.PIE_AI_BASE_URL && process.env.PIE_AI_MODEL) {
        return { configured: true, provider: 'openai-compatible', model: process.env.PIE_AI_MODEL };
    }
    if (provider === 'gemini' && process.env.PIE_GEMINI_API_KEY) {
        return { configured: true, provider: 'gemini', model: process.env.PIE_AI_MODEL || 'gemini-2.5-flash' };
    }
    return { configured: false, provider: 'none', model: null };
}
/**
 * Optional pluggable document-model fallback/enhancer for missing or low-confidence fields.
 * Disabled unless explicitly configured via PIE_AI_PROVIDER environment variables.
 */
export async function enhanceWithAiModel(pages, fields, baseline) {
    const config = getAiProviderConfig();
    if (!config.configured)
        return baseline;
    const missingOrWeak = baseline.filter(r => r.status === 'missing' || !r.valid || r.score < 0.6);
    if (!missingOrWeak.length)
        return baseline;
    const docText = pages
        .map(p => `--- PAGE ${p.number} (${p.source}) ---\n${p.lines.map(l => l.text).join('\n')}`)
        .join('\n\n')
        .slice(0, 24000);
    const requestedFields = missingOrWeak.map(r => {
        const def = fields.find(f => f.id === r.fieldId);
        return {
            id: r.fieldId,
            label: r.label,
            kind: r.kind,
            aliases: def?.aliases ?? [],
            description: def?.description ?? '',
        };
    });
    const prompt = [
        'Extract ONLY the requested insurance policy fields from the document text below.',
        'Return strict JSON object mapping fieldId -> exact substring from the document (or "" if absent). Do not invent values.',
        `Fields: ${JSON.stringify(requestedFields)}`,
        `Document:\n${docText}`,
    ].join('\n\n');
    let extractedJson = null;
    if (config.provider === 'openai-compatible') {
        const baseUrl = process.env.PIE_AI_BASE_URL.replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.PIE_AI_API_KEY ? { Authorization: `Bearer ${process.env.PIE_AI_API_KEY}` } : {}),
            },
            body: JSON.stringify({
                model: config.model,
                temperature: 0,
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (res.ok) {
            const payload = (await res.json());
            const text = payload.choices?.[0]?.message?.content;
            if (text)
                extractedJson = JSON.parse(text);
        }
    }
    else if (config.provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.PIE_GEMINI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0, responseMimeType: 'application/json' },
            }),
        });
        if (res.ok) {
            const payload = (await res.json());
            const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text)
                extractedJson = JSON.parse(text);
        }
    }
    if (!extractedJson)
        return baseline;
    return baseline.map(item => {
        if (!(item.fieldId in extractedJson))
            return item;
        const aiVal = String(extractedJson[item.fieldId] ?? '').trim();
        if (!aiVal || item.status === 'confident')
            return item;
        if (item.value && item.valid)
            return item;
        return {
            ...item,
            value: aiVal,
            score: 0.72,
            status: 'review',
            needsVerification: true,
            valid: true,
            reason: `AI model (${config.provider}) suggestion; verify against PDF.`,
            evidence: aiVal,
        };
    });
}
