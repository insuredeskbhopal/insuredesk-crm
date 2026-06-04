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
