import fs from "fs";
import path from "path";

const ACCOUNT_ID_REGEX = /^[a-zA-Z0-9_-]{3,50}$/;

let registryFilePath = null;
let memoryRegistry = null;

function atomicWriteFileSync(filePath, data) {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

export function initAccountRegistry(sessionsRoot) {
  registryFilePath = path.join(sessionsRoot, "accounts.json");
  const defaultSessionDir = path.join(sessionsRoot, "insuredesk_session");

  if (!fs.existsSync(sessionsRoot)) {
    fs.mkdirSync(sessionsRoot, { recursive: true });
  }

  // Backup insuredesk_session if it exists and has credentials
  const defaultCredsPath = path.join(defaultSessionDir, "creds.json");
  if (fs.existsSync(defaultCredsPath)) {
    const backupDir = path.join(sessionsRoot, ".backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupSnapshotDir = path.join(backupDir, `insuredesk_session_backup_${Date.now()}`);
    try {
      fs.cpSync(defaultSessionDir, backupSnapshotDir, { recursive: true });
      console.log(`[Registry] Created secure session backup at: ${backupSnapshotDir}`);
    } catch (err) {
      console.warn("[Registry] Warning: Could not create snapshot backup:", err.message);
    }
  }

  // Read or create accounts.json
  if (fs.existsSync(registryFilePath)) {
    try {
      const raw = fs.readFileSync(registryFilePath, "utf8");
      memoryRegistry = JSON.parse(raw);
    } catch (err) {
      console.error("[Registry] Corrupt accounts.json detected. Recovering...", err);
      memoryRegistry = null;
    }
  }

  if (!memoryRegistry || typeof memoryRegistry !== "object" || !memoryRegistry.accounts) {
    memoryRegistry = {
      activeAccountId: "insuredesk_session",
      accounts: {
        insuredesk_session: {
          id: "insuredesk_session",
          label: "Primary Operations",
          phoneNumber: null,
          status: "DISCONNECTED",
          createdAt: new Date().toISOString(),
          lastSeenAt: null,
        },
      },
    };
    atomicWriteFileSync(registryFilePath, memoryRegistry);
  }

  // Ensure insuredesk_session is always registered
  if (!memoryRegistry.accounts.insuredesk_session) {
    memoryRegistry.accounts.insuredesk_session = {
      id: "insuredesk_session",
      label: "Primary Operations",
      phoneNumber: null,
      status: "DISCONNECTED",
      createdAt: new Date().toISOString(),
      lastSeenAt: null,
    };
    atomicWriteFileSync(registryFilePath, memoryRegistry);
  }

  // Validate activeAccountId points to an existing account
  if (!memoryRegistry.accounts[memoryRegistry.activeAccountId]) {
    memoryRegistry.activeAccountId = "insuredesk_session";
    atomicWriteFileSync(registryFilePath, memoryRegistry);
  }

  return memoryRegistry;
}

export function getActiveAccountId() {
  return memoryRegistry?.activeAccountId || "insuredesk_session";
}

export function setActiveAccountId(accountId) {
  if (!memoryRegistry) throw new Error("Account registry not initialized");
  if (!memoryRegistry.accounts[accountId]) {
    throw new Error(`Account '${accountId}' does not exist in registry`);
  }
  memoryRegistry.activeAccountId = accountId;
  atomicWriteFileSync(registryFilePath, memoryRegistry);
  console.log(`[Registry] Active sender switched to: ${accountId}`);
  return memoryRegistry.accounts[accountId];
}

export function getAllAccounts() {
  if (!memoryRegistry) return [];
  const activeId = getActiveAccountId();
  return Object.values(memoryRegistry.accounts).map((acc) => ({
    ...acc,
    isDefault: acc.id === activeId,
  }));
}

export function getAccount(accountId) {
  return memoryRegistry?.accounts?.[accountId] || null;
}

export function registerAccount(id, label, owner) {
  if (!memoryRegistry) throw new Error("Account registry not initialized");
  const cleanId = String(id || "").trim();
  if (!ACCOUNT_ID_REGEX.test(cleanId)) {
    throw new Error("Invalid Account ID. Must be 3-50 alphanumeric characters or underscores.");
  }
  if (memoryRegistry.accounts[cleanId]) {
    throw new Error(`Account '${cleanId}' is already registered.`);
  }

  if (!owner?.ownerUserId || !owner?.organizationId) throw new Error("Account owner is required");
  const newAccount = {
    ownerUserId: String(owner.ownerUserId),
    organizationId: String(owner.organizationId),
    ownerName: String(owner.ownerName || "Staff member"),
    id: cleanId,
    label: String(label || cleanId).trim(),
    phoneNumber: null,
    status: "DISCONNECTED",
    createdAt: new Date().toISOString(),
    lastSeenAt: null,
  };

  memoryRegistry.accounts[cleanId] = newAccount;
  atomicWriteFileSync(registryFilePath, memoryRegistry);
  return newAccount;
}

export function updateAccount(accountId, updates = {}) {
  if (!memoryRegistry?.accounts?.[accountId]) return null;
  const current = memoryRegistry.accounts[accountId];
  const updated = {
    ...current,
    ...updates,
    id: current.id, // Immutable ID and ownership
    ownerUserId: current.ownerUserId,
    organizationId: current.organizationId,
    ownerName: current.ownerName,
    lastSeenAt: new Date().toISOString(),
  };
  memoryRegistry.accounts[accountId] = updated;
  atomicWriteFileSync(registryFilePath, memoryRegistry);
  return updated;
}

export function removeAccount(accountId) {
  if (!memoryRegistry) throw new Error("Account registry not initialized");
  if (!memoryRegistry.accounts[accountId]) {
    throw new Error(`Account '${accountId}' not found`);
  }

  const accountKeys = Object.keys(memoryRegistry.accounts);
  if (accountKeys.length <= 1) {
    throw new Error("Cannot delete the only remaining WhatsApp account.");
  }

  delete memoryRegistry.accounts[accountId];

  // If we deleted the active account, reassign to another account
  if (memoryRegistry.activeAccountId === accountId) {
    const remaining = Object.keys(memoryRegistry.accounts);
    memoryRegistry.activeAccountId = remaining.includes("insuredesk_session")
      ? "insuredesk_session"
      : remaining[0];
    console.log(`[Registry] Active sender reassigned to: ${memoryRegistry.activeAccountId}`);
  }

  atomicWriteFileSync(registryFilePath, memoryRegistry);
  return true;
}
