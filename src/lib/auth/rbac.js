export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  AGENT: "AGENT",
  VIEWER: "VIEWER",
};

/**
 * Shared CRM modules (policies, renewals, claims, reports, etc.)
 * Visibility: organization-wide. Never filter list/read queries by createdById.
 */
export function canAccessSharedResource(user, action, resourceOrgId) {
  if (!user || !user.role) return false;

  if (user.role === UserRole.SUPER_ADMIN) return true;

  if (resourceOrgId && resourceOrgId !== user.organizationId) {
    return false;
  }

  switch (user.role) {
    case UserRole.ADMIN:
      return (
        action === "read" ||
        action === "write" ||
        action === "delete" ||
        action === "export" ||
        action === "admin"
      );
    case UserRole.MANAGER:
      return action === "read" || action === "write" || action === "export" || action === "audit:read";
    case UserRole.AGENT:
      return action === "read" || action === "write";
    case UserRole.VIEWER:
      return action === "read";
    default:
      return false;
  }
}

/**
 * Customer Profiling is the only restricted module.
 * Agents can access only their own profiles; Manager/Admin/Super Admin can access all profiles in scope.
 */
export function canAccessCustomerProfile(user, action, profile) {
  if (!user || !user.role || !profile) return false;

  const userId = user.userId || user.id;
  if (!userId) return false;

  if (user.role !== UserRole.SUPER_ADMIN) {
    if ((profile.organizationId || null) !== (user.organizationId || null)) {
      return false;
    }
  } else if (
    user.organizationId &&
    profile.organizationId &&
    profile.organizationId !== user.organizationId
  ) {
    return false;
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    if (action === "read" || action === "write" || action === "delete") return true;
    return false;
  }

  if (profile.createdById !== userId) {
    return false;
  }

  if (action === "read") return true;
  if (action === "write") {
    return user.role !== UserRole.VIEWER;
  }
  if (action === "delete") {
    return user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
  }
  return false;
}

/**
 * @deprecated Use canAccessSharedResource for CRM modules or canAccessCustomerProfile for profiling.
 */
export function canAccessResource(user, action, resourceOwnerId, resourceOrgId) {
  void resourceOwnerId;
  return canAccessSharedResource(user, action, resourceOrgId);
}

/**
 * Organization-scoped filter for shared CRM modules.
 * Do NOT add createdById here.
 */
export function getOrgFilter(user, action = "read") {
  if (!user || !user.role) {
    return { id: "00000000-0000-0000-0000-000000000000" };
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    return { deletedAt: null };
  }

  const baseFilter = {
    organizationId: user.organizationId,
    deletedAt: null,
  };

  if (user.role === UserRole.VIEWER && action === "write") {
    return { id: "00000000-0000-0000-0000-000000000000" };
  }

  return baseFilter;
}

/**
 * Shared CRM tenant filter (policies, renewals, claims, uploads, dashboards).
 * Alias of getOrgFilter — never scopes by createdById.
 */
export function getTenantFilter(user, action = "read") {
  return getOrgFilter(user, action);
}

/**
 * Customer Profiling owner filter: organization + createdById = current user.
 * Super admin can see all customer profiling leads in scope.
 */
export function getCustomerProfileOwnerFilter(user) {
  const actorId = user?.userId || user?.id;
  if (!actorId) {
    return { id: "00000000-0000-0000-0000-000000000000" };
  }

  const orgFilter = user.organizationId
    ? { organizationId: user.organizationId, deletedAt: null }
    : user.role === UserRole.SUPER_ADMIN
      ? { deletedAt: null }
      : { id: "00000000-0000-0000-0000-000000000000" };

  return {
    ...orgFilter,
    createdById: actorId,
  };
}

export function getCustomerProfileScopedFilter(user) {
  const actorId = user?.userId || user?.id;
  if (!user || !user.role) {
    return { id: "00000000-0000-0000-0000-000000000000" };
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    return user.organizationId
      ? { organizationId: user.organizationId, deletedAt: null }
      : { deletedAt: null };
  }

  if (!actorId) return { id: "00000000-0000-0000-0000-000000000000" };
  return {
    organizationId: user.organizationId || null,
    deletedAt: null,
    createdById: actorId,
  };
}

export const LOB_TERMS = {
  "Motor Insurance": [
    "motor",
    "vehicle",
    "car",
    "two wheeler",
    "bike",
    "scooter",
    "commercial vehicle",
    "taxi",
    "cab",
    "bus",
  ],
  "Health Insurance": ["health", "mediclaim", "hospital", "family floater"],
  "Life Insurance": ["life assured", "life policy", "term life", "endowment"],
  "Warehouse Insurance": ["warehouse"],
  "Fire Insurance": ["fire", "sfsp", "burglary", "msme", "stock", "property"],
  "Marine Insurance": ["marine", "cargo", "transit"],
  "Travel Insurance": ["travel", "trip", "flight"],
  "Cyber Insurance": ["cyber", "ransomware", "data breach"],
  "Shop / Office Insurance": ["shop", "office", "retail"],
  "Business Insurance": ["business", "sme", "commercial"],
};

export function applyLOBRestriction(where, user) {
  void user;
  return where;
}

export function getLOBFilterSQL(assignedLOBs) {
  void assignedLOBs;
  return "";
}
