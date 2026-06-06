export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  AGENT: "AGENT",
  VIEWER: "VIEWER",
};

/**
 * Checks if a user has permission to perform an action on a specific resource.
 * 
 * @param {object} user Decoded JWT user object containing { id, role, organizationId }
 * @param {'read' | 'write' | 'delete' | 'admin'} action The type of action
 * @param {string|null} resourceOwnerId The ID of the user who created the resource
 * @param {string|null} resourceOrgId The ID of the organization the resource belongs to
 * @returns {boolean} True if access is permitted
 */
export function canAccessResource(user, action, resourceOwnerId, resourceOrgId) {
  if (!user || !user.role) return false;
  const userId = user.id || user.userId;

  // 1. SUPER_ADMIN bypasses all organization scoping checks
  if (user.role === UserRole.SUPER_ADMIN) return true;

  // 2. All other roles must match the tenant organization boundary
  if (resourceOrgId && resourceOrgId !== user.organizationId) {
    return false;
  }

  // 3. Role action matrix checks
  switch (user.role) {
    case UserRole.ADMIN:
      // ADMIN can read and write within their organization; deletion is reserved for SUPER_ADMIN.
      return action === "read" || action === "write" || action === "admin";

    case UserRole.MANAGER:
      // MANAGER has read and write permissions (no deleting)
      return action === "read" || action === "write";

    case UserRole.AGENT:
      // AGENT can read office-wide CRM data, but can only write their own created/owned records.
      if (action === "read") {
        return true;
      }
      if (action === "write") {
        return !resourceOwnerId || resourceOwnerId === userId;
      }
      return false;

    case UserRole.VIEWER:
      // VIEWER has read-only access to all organization records
      return action === "read";

    default:
      return false;
  }
}

/**
 * Generates a standard Prisma 'where' filter object to automatically enforce
 * multi-tenancy, soft deletes, and role-based ownership boundaries.
 * 
 * @param {object} user Decoded JWT user object
 * @param {'read' | 'write'} action Action type
 * @returns {object} Prisma where query object
 */
export function getTenantFilter(user, action = "read") {
  if (!user || !user.role) {
    // If no session exists, force a non-matching query block
    return { id: "00000000-0000-0000-0000-000000000000" };
  }

  // SUPER_ADMIN can query across all organizations globally
  if (user.role === UserRole.SUPER_ADMIN) {
    return { deletedAt: null };
  }

  // Base scope for standard roles: match tenant ID and ignore soft-deleted items
  const baseFilter = {
    organizationId: user.organizationId,
    deletedAt: null,
  };

  // AGENT reads are office-wide; writes stay restricted to their own records.
  if (user.role === UserRole.AGENT && action === "write") {
    baseFilter.createdById = user.id || user.userId;
  }

  // VIEWER is restricted to read-only
  if (user.role === UserRole.VIEWER && action === "write") {
    return { id: "00000000-0000-0000-0000-000000000000" };
  }

  return baseFilter;
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
    // If they have no processes assigned, return no access
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

export function getCustomerProfileOwnerFilter(user) {
  const actorId = user.userId || user.id;
  if (user.role === "SUPER_ADMIN") {
    return getTenantFilter(user, "read");
  }

  return {
    ...getTenantFilter(user, "read"),
    createdById: actorId
  };
}

export function getCustomerProfileScopedFilter(user) {
  const base = getCustomerProfileOwnerFilter(user);
  if (user.role === "SUPER_ADMIN" || !user.assignedLOBs) {
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
    OR: assigned.map(lob => ({
      selectedLOBs: { array_contains: lob }
    }))
  };
}
