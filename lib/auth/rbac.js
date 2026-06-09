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
      return action === "read" || action === "write" || action === "admin";
    case UserRole.MANAGER:
      return action === "read" || action === "write";
    case UserRole.AGENT:
      return action === "read" || action === "write";
    case UserRole.VIEWER:
      return action === "read";
    default:
      return false;
  }
}

/**
 * Customer Profiling is private per user within an organization.
 * Visibility: only records where createdById = current user.
 */
export function canAccessCustomerProfile(user, action, profile) {
  if (!user || !user.role || !profile) return false;

  const userId = user.userId || user.id;
  if (!userId) return false;

  if (user.role !== UserRole.SUPER_ADMIN) {
    if (profile.organizationId && user.organizationId && profile.organizationId !== user.organizationId) {
      return false;
    }
  } else if (user.organizationId && profile.organizationId && profile.organizationId !== user.organizationId) {
    return false;
  }

  if (profile.createdById !== userId) {
    return false;
  }

  if (action === "read") return true;
  if (action === "write" || action === "delete") {
    return user.role !== UserRole.VIEWER;
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
    deletedAt: null
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
    createdById: actorId
  };
}

export function getCustomerProfileScopedFilter(user) {
  const base = getCustomerProfileOwnerFilter(user);
  if (user.role === UserRole.SUPER_ADMIN || !user.assignedLOBs) {
    return base;
  }
  const assigned = user.assignedLOBs;
  if (assigned.length === 0) {
    return {
      ...base,
      id: "00000000-0000-0000-0000-000000000000"
    };
  }

  return {
    ...base,
    OR: assigned.map((lob) => ({
      selectedLOBs: { array_contains: lob }
    }))
  };
}

export const LOB_TERMS = {
  "Motor Insurance": ['motor', 'vehicle', 'car', 'two wheeler', 'bike', 'scooter', 'commercial vehicle', 'taxi', 'cab', 'bus'],
  "Health Insurance": ['health', 'mediclaim', 'hospital', 'family floater'],
  "Life Insurance": ['life assured', 'life policy', 'term life', 'endowment'],
  "Warehouse Insurance": ['warehouse'],
  "Fire Insurance": ['fire', 'sfsp', 'burglary', 'msme', 'stock', 'property'],
  "Marine Insurance": ['marine', 'cargo', 'transit'],
  "Travel Insurance": ['travel', 'trip', 'flight'],
  "Cyber Insurance": ['cyber', 'ransomware', 'data breach'],
  "Shop / Office Insurance": ['shop', 'office', 'retail'],
  "Business Insurance": ['business', 'sme', 'commercial']
};

export function applyLOBRestriction(where, user) {
  if (!user || user.role === "SUPER_ADMIN") return where;

  const assignedLOBs = user.assignedLOBs;
  if (!Array.isArray(assignedLOBs)) return where;

  if (assignedLOBs.length === 0) {
    return {
      ...where,
      id: "00000000-0000-0000-0000-000000000000"
    };
  }

  const terms = [];
  let includeOther = false;

  for (const lob of assignedLOBs) {
    if (lob === "Other") {
      includeOther = true;
    } else {
      const lobTerms = LOB_TERMS[lob];
      if (lobTerms) {
        terms.push(...lobTerms);
      }
    }
  }

  const orConditions = [];

  if (terms.length > 0) {
    orConditions.push(
      ...terms.flatMap((term) => [
        { selectedPolicyType: { contains: term, mode: "insensitive" } },
        { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
        { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } }
      ])
    );
  }

  if (includeOther) {
    const allDefinedTerms = Object.values(LOB_TERMS).flat();
    orConditions.push({
      NOT: {
        OR: allDefinedTerms.flatMap((term) => [
          { selectedPolicyType: { contains: term, mode: "insensitive" } },
          { reviewedData: { path: ["policyType"], string_contains: term, mode: "insensitive" } },
          { data: { path: ["policyType"], string_contains: term, mode: "insensitive" } }
        ])
      }
    });
  }

  if (orConditions.length > 0) {
    if (where.AND) {
      if (Array.isArray(where.AND)) {
        where.AND.push({ OR: orConditions });
      } else {
        where.AND = [where.AND, { OR: orConditions }];
      }
    } else {
      where.AND = [{ OR: orConditions }];
    }
  }

  return where;
}

export function getLOBFilterSQL(assignedLOBs) {
  if (!Array.isArray(assignedLOBs)) return "";
  if (assignedLOBs.length === 0) return "AND 1=0";

  const conditions = [];
  let includeOther = false;

  for (const lob of assignedLOBs) {
    if (lob === "Other") {
      includeOther = true;
    } else {
      const terms = LOB_TERMS[lob];
      if (terms) {
        const termConds = terms.map(term => {
          const escaped = term.replace(/'/g, "''");
          return `(LOWER(COALESCE(selected_policy_type, '')) LIKE '%${escaped}%' OR LOWER(COALESCE(reviewed_data->>'policyType', '')) LIKE '%${escaped}%' OR LOWER(COALESCE(data->>'policyType', '')) LIKE '%${escaped}%')`;
        });
        conditions.push(`(${termConds.join(" OR ")})`);
      }
    }
  }

  if (includeOther) {
    const allDefinedTerms = Object.values(LOB_TERMS).flat();
    const termConds = allDefinedTerms.map(term => {
      const escaped = term.replace(/'/g, "''");
      return `(LOWER(COALESCE(selected_policy_type, '')) LIKE '%${escaped}%' OR LOWER(COALESCE(reviewed_data->>'policyType', '')) LIKE '%${escaped}%' OR LOWER(COALESCE(data->>'policyType', '')) LIKE '%${escaped}%')`;
    });
    conditions.push(`NOT (${termConds.join(" OR ")})`);
  }

  if (conditions.length > 0) {
    return `AND (${conditions.join(" OR ")})`;
  }
  return "";
}
