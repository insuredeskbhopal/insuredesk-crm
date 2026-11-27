import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gatewayRoot = path.resolve(__dirname, "..");
const verifyOnly = process.argv.includes("--verify");

const PATCH_SPECS = [
  {
    name: "baileys-retry-mutex-safety",
    relativePath: "node_modules/@whiskeysockets/baileys/lib/Socket/messages-recv.js",
    marker: "/* @patched:retry-mutex-safe */",
    original: [
      "                        retryMutex.mutex(async () => {",
      "                            if (ws.isOpen) {",
      "                                if (getBinaryNodeChild(node, 'unavailable')) {",
      "                                    return;",
      "                                }",
      "                                const encNode = getBinaryNodeChild(node, 'enc');",
      "                                await sendRetryRequest(node, !encNode);",
      "                                if (retryRequestDelayMs) {",
      "                                    await delay(retryRequestDelayMs);",
      "                                }",
      "                            }",
      "                            else {",
      "                                logger.debug({ node }, 'connection closed, ignoring retry req');",
      "                            }",
      "                        });",
    ].join("\n"),
    replacement: [
      "                        /* @patched:retry-mutex-safe */",
      "                        await retryMutex.mutex(async () => {",
      "                            try {",
      "                                if (ws.isOpen) {",
      "                                    if (getBinaryNodeChild(node, 'unavailable')) {",
      "                                        return;",
      "                                    }",
      "                                    const encNode = getBinaryNodeChild(node, 'enc');",
      "                                    await sendRetryRequest(node, !encNode);",
      "                                    if (retryRequestDelayMs) {",
      "                                        await delay(retryRequestDelayMs);",
      "                                    }",
      "                                }",
      "                                else {",
      "                                    logger.debug({ msgId: node?.attrs?.id }, 'connection closed, ignoring retry req');",
      "                                }",
      "                            }",
      "                            catch (err) {",
      "                                const statusCode = err?.output?.statusCode;",
      "                                if (!ws.isOpen || statusCode === 428 || err?.message === 'Connection Closed') {",
      "                                    logger.debug({ msgId: node?.attrs?.id }, 'connection closed during retry req');",
      "                                }",
      "                                else {",
      "                                    logger.warn({ msgId: node?.attrs?.id, err: err?.message }, 'Failed to send retry');",
      "                                }",
      "                            }",
      "                        });",
    ].join("\n"),
  },
  {
    name: "baileys-socket-error-waitForMessage",
    relativePath: "node_modules/@whiskeysockets/baileys/lib/Socket/socket.js",
    marker: "/* @patched:waitForMessage-error */",
    original: [
      "                ws.on('close', onErr); // if the socket closes, you'll never receive the message",
      "                ws.off('error', onErr);",
    ].join("\n"),
    replacement: [
      "                /* @patched:waitForMessage-error */",
      "                ws.on('close', onErr); // if the socket closes, you'll never receive the message",
      "                ws.on('error', onErr);",
    ].join("\n"),
  },
  {
    name: "baileys-socket-pair-device-try-catch",
    relativePath: "node_modules/@whiskeysockets/baileys/lib/Socket/socket.js",
    marker: "/* @patched:pair-device-try-catch */",
    original: [
      "    ws.on('CB:iq,type:set,pair-device', async (stanza) => {",
      "        const iq = {",
      "            tag: 'iq',",
      "            attrs: {",
      "                to: S_WHATSAPP_NET,",
      "                type: 'result',",
      "                id: stanza.attrs.id",
      "            }",
      "        };",
      "        await sendNode(iq);",
    ].join("\n"),
    replacement: [
      "    /* @patched:pair-device-try-catch */",
      "    ws.on('CB:iq,type:set,pair-device', async (stanza) => {",
      "        const iq = {",
      "            tag: 'iq',",
      "            attrs: {",
      "                to: S_WHATSAPP_NET,",
      "                type: 'result',",
      "                id: stanza.attrs.id",
      "            }",
      "        };",
      "        try {",
      "            await sendNode(iq);",
      "        }",
      "        catch (err) {",
      "            end(err);",
      "            return;",
      "        }",
    ].join("\n"),
  },
  {
    name: "baileys-socket-success-try-catch",
    relativePath: "node_modules/@whiskeysockets/baileys/lib/Socket/socket.js",
    marker: "/* @patched:success-try-catch */",
    original: [
      "    ws.on('CB:success', async (node) => {",
      "        await uploadPreKeysToServerIfRequired();",
      "        await sendPassiveIq('active');",
      "        logger.info('opened connection to WA');",
      "        clearTimeout(qrTimer); // will never happen in all likelyhood -- but just in case WA sends success on first try",
      "        ev.emit('creds.update', { me: { ...authState.creds.me, lid: node.attrs.lid } });",
      "        ev.emit('connection.update', { connection: 'open' });",
      "    });",
    ].join("\n"),
    replacement: [
      "    /* @patched:success-try-catch */",
      "    ws.on('CB:success', async (node) => {",
      "        try {",
      "            await uploadPreKeysToServerIfRequired();",
      "            await sendPassiveIq('active');",
      "            logger.info('opened connection to WA');",
      "            clearTimeout(qrTimer); // will never happen in all likelyhood -- but just in case WA sends success on first try",
      "            ev.emit('creds.update', { me: { ...authState.creds.me, lid: node.attrs.lid } });",
      "            ev.emit('connection.update', { connection: 'open' });",
      "        }",
      "        catch (err) {",
      "            logger.warn({ err: err?.message }, 'connection closed during login completion');",
      "            end(err);",
      "        }",
      "    });",
    ].join("\n"),
  },
  {
    name: "baileys-socket-offline-preview-catch",
    relativePath: "node_modules/@whiskeysockets/baileys/lib/Socket/socket.js",
    marker: "/* @patched:offline-preview-catch */",
    original: [
      "    ws.on('CB:ib,,offline_preview', (node) => {",
      "        logger.info('offline preview received', JSON.stringify(node));",
      "        sendNode({",
      "            tag: 'ib',",
      "            attrs: {},",
      "            content: [{ tag: 'offline_batch', attrs: { count: '100' } }]",
      "        });",
      "    });",
    ].join("\n"),
    replacement: [
      "    /* @patched:offline-preview-catch */",
      "    ws.on('CB:ib,,offline_preview', () => {",
      "        logger.info('offline preview received');",
      "        sendNode({",
      "            tag: 'ib',",
      "            attrs: {},",
      "            content: [{ tag: 'offline_batch', attrs: { count: '100' } }]",
      "        }).catch((err) => onUnexpectedError(err, 'offline_preview'));",
      "    });",
    ].join("\n"),
  },
  {
    name: "libsignal-redact-session-entry-inspect",
    relativePath: "node_modules/libsignal/src/session_record.js",
    marker: "/* @patched:redact-session-entry */",
    original: [
      "    toString() {",
      "        const baseKey = this.indexInfo && this.indexInfo.baseKey &&",
      "            this.indexInfo.baseKey.toString('base64');",
      "        return `<SessionEntry [baseKey=${baseKey}]>`;",
      "    }",
      "",
      "    inspect() {",
      "        return this.toString();",
      "    }",
    ].join("\n"),
    replacement: [
      "    /* @patched:redact-session-entry */",
      "    toString() {",
      "        return '<SessionEntry [redacted]>';",
      "    }",
      "",
      "    inspect() {",
      "        return this.toString();",
      "    }",
      "",
      "    [Symbol.for('nodejs.util.inspect.custom')]() {",
      "        return this.toString();",
      "    }",
    ].join("\n"),
  },
  {
    name: "libsignal-redact-session-record-console-logs",
    relativePath: "node_modules/libsignal/src/session_record.js",
    marker: "/* @patched:redact-session-record-logs */",
    original: [
      "    closeSession(session) {",
      "        if (this.isClosed(session)) {",
      "            console.warn(\"Session already closed\", session);",
      "            return;",
      "        }",
      "        console.info(\"Closing session:\", session);",
      "        session.indexInfo.closed = Date.now();",
      "    }",
      "",
      "    openSession(session) {",
      "        if (!this.isClosed(session)) {",
      "            console.warn(\"Session already open\");",
      "        }",
      "        console.info(\"Opening session:\", session);",
      "        session.indexInfo.closed = -1;",
      "    }",
      "",
      "    isClosed(session) {",
      "        return session.indexInfo.closed !== -1;",
      "    }",
      "",
      "    removeOldSessions() {",
      "        while (Object.keys(this.sessions).length > CLOSED_SESSIONS_MAX) {",
      "            let oldestKey;",
      "            let oldestSession;",
      "            for (const [key, session] of Object.entries(this.sessions)) {",
      "                if (session.indexInfo.closed !== -1 &&",
      "                    (!oldestSession || session.indexInfo.closed < oldestSession.indexInfo.closed)) {",
      "                    oldestKey = key;",
      "                    oldestSession = session;",
      "                }",
      "            }",
      "            if (oldestKey) {",
      "                console.info(\"Removing old closed session:\", oldestSession);",
      "                delete this.sessions[oldestKey];",
      "            } else {",
      "                throw new Error('Corrupt sessions object');",
      "            }",
      "        }",
      "    }",
    ].join("\n"),
    replacement: [
      "    /* @patched:redact-session-record-logs */",
      "    closeSession(session) {",
      "        if (this.isClosed(session)) {",
      "            return;",
      "        }",
      "        session.indexInfo.closed = Date.now();",
      "    }",
      "",
      "    openSession(session) {",
      "        session.indexInfo.closed = -1;",
      "    }",
      "",
      "    isClosed(session) {",
      "        return session.indexInfo.closed !== -1;",
      "    }",
      "",
      "    removeOldSessions() {",
      "        while (Object.keys(this.sessions).length > CLOSED_SESSIONS_MAX) {",
      "            let oldestKey;",
      "            let oldestSession;",
      "            for (const [key, session] of Object.entries(this.sessions)) {",
      "                if (session.indexInfo.closed !== -1 &&",
      "                    (!oldestSession || session.indexInfo.closed < oldestSession.indexInfo.closed)) {",
      "                    oldestKey = key;",
      "                    oldestSession = session;",
      "                }",
      "            }",
      "            if (oldestKey) {",
      "                delete this.sessions[oldestKey];",
      "            } else {",
      "                throw new Error('Corrupt sessions object');",
      "            }",
      "        }",
      "    }",
    ].join("\n"),
  },
  {
    name: "libsignal-sanitize-cipher-errors",
    relativePath: "node_modules/libsignal/src/session_cipher.js",
    marker: "/* @patched:sanitize-cipher-errors */",
    original: [
      "        console.error(\"Failed to decrypt message with any known session...\");",
      "        for (const e of errs) {",
      "            console.error(\"Session error:\" + e, e.stack);",
      "        }",
    ].join("\n"),
    replacement: [
      "        /* @patched:sanitize-cipher-errors */",
      "        const reasons = [...new Set(errs.map((err) => err?.message || 'Session decrypt error'))].slice(0, 3).join('; ');",
      "        console.warn(`[libsignal] Failed to decrypt message with ${errs.length} session(s): ${reasons}`);",
    ].join("\n"),
  },
  {
    name: "libsignal-sanitize-queue-job-log",
    relativePath: "node_modules/libsignal/src/queue_job.js",
    marker: "/* @patched:sanitize-queue-job */",
    original: "            console.warn(\"Unhandled bucket type (for naming):\", typeof bucket, bucket);",
    replacement: [
      "            /* @patched:sanitize-queue-job */",
      "            console.warn('[libsignal] Unhandled bucket type:', typeof bucket);",
    ].join("\n"),
  },
];

function normalizeEol(content) {
  return content.replace(/\r\n/g, "\n");
}

function applyOrVerifyPatch(spec) {
  const fullPath = path.join(gatewayRoot, spec.relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing dependency file for patch '${spec.name}': ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const normalized = normalizeEol(raw);

  if (normalized.includes(spec.marker)) {
    if (normalized.includes(spec.original)) {
      throw new Error(`Patch '${spec.name}' marker present alongside unpatched code in ${spec.relativePath}`);
    }
    return "already-patched";
  }

  if (verifyOnly) {
    throw new Error(`Patch '${spec.name}' is NOT applied in ${spec.relativePath}`);
  }

  if (!normalized.includes(spec.original)) {
    throw new Error(`Patch '${spec.name}' target snippet not found in ${spec.relativePath}`);
  }

  const updated = normalized.replace(spec.original, spec.replacement);
  const finalContent = eol === "\r\n" ? updated.replace(/\n/g, "\r\n") : updated;
  fs.writeFileSync(fullPath, finalContent, "utf8");

  const recheck = normalizeEol(fs.readFileSync(fullPath, "utf8"));
  if (!recheck.includes(spec.marker) || recheck.includes(spec.original)) {
    throw new Error(`Post-write verification failed for patch '${spec.name}'`);
  }
  return "applied";
}

function main() {
  const results = [];
  for (const spec of PATCH_SPECS) {
    const status = applyOrVerifyPatch(spec);
    results.push(`${spec.name}: ${status}`);
  }
  console.log(`[Patches] ${verifyOnly ? "Verified" : "Applied & verified"} ${results.length} patches cleanly.`);
}

main();
