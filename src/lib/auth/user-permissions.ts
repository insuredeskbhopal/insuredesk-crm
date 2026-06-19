import { UserRole } from "@prisma/client";

export const USER_MANAGEMENT_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER];

const ROLE_RANK: Record<string, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  MANAGER: 3,
  AGENT: 2,
  VIEWER: 1,
};

export function canOpenUserManagement(role?: string | null) {
  return Boolean(role && USER_MANAGEMENT_ROLES.includes(role as UserRole));
}

export function canManageRole(actorRole?: string | null, targetRole?: string | null) {
  if (!actorRole || !targetRole) return false;
  if (actorRole === "SUPER_ADMIN") return true;
  return (ROLE_RANK[targetRole] || 0) < (ROLE_RANK[actorRole] || 0);
}

export function getAssignableRoles(actorRole?: string | null) {
  if (actorRole === UserRole.SUPER_ADMIN)
    return [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER];
  if (actorRole === UserRole.ADMIN) return [UserRole.MANAGER, UserRole.AGENT, UserRole.VIEWER];
  return [];
}

export function canMutateUsers(role?: string | null) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

export function getVisibleUserWhere(actor: { role?: string | null; organizationId?: string | null }) {
  const where: { deletedAt: null; organizationId?: string | null; role?: { in: UserRole[] } } = {
    deletedAt: null,
  };

  if (actor.role !== "SUPER_ADMIN") {
    if (actor.organizationId) {
      where.organizationId = actor.organizationId;
    }

    if (actor.role === "ADMIN") {
      where.role = { in: getAssignableRoles(actor.role) };
    }
  }

  return where;
}
