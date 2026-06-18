import { describe, expect, it } from "vitest";
import {
  canAccessResource,
  canAccessSharedResource,
  canAccessCustomerProfile,
  getTenantFilter,
  getCustomerProfileOwnerFilter,
  getCustomerProfileScopedFilter,
  UserRole,
  applyLOBRestriction,
  getLOBFilterSQL
} from "../lib/auth/rbac";

describe("SaaS Multi-Tenancy & RBAC Tests", () => {
  const orgA = "org-aaaa-aaaa-aaaa-aaaa";
  const orgB = "org-bbbb-bbbb-bbbb-bbbb";
  const user1 = "user-1111";
  const user2 = "user-2222";

  describe("canAccessSharedResource Permissions Matrix", () => {
    it("allows SUPER_ADMIN to bypass all tenant boundaries and perform any action", () => {
      const session = { id: user1, role: UserRole.SUPER_ADMIN, organizationId: orgA };

      expect(canAccessSharedResource(session, "read", orgB)).toBe(true);
      expect(canAccessSharedResource(session, "write", orgB)).toBe(true);
      expect(canAccessSharedResource(session, "delete", orgB)).toBe(true);
      expect(canAccessSharedResource(session, "admin", orgB)).toBe(true);
    });

    it("allows ADMIN to read, write, delete, and export inside their own organization", () => {
      const session = { id: user1, role: UserRole.ADMIN, organizationId: orgA };

      expect(canAccessSharedResource(session, "read", orgA)).toBe(true);
      expect(canAccessSharedResource(session, "write", orgA)).toBe(true);
      expect(canAccessSharedResource(session, "delete", orgA)).toBe(true);
      expect(canAccessSharedResource(session, "export", orgA)).toBe(true);
    });

    it("blocks ADMIN from accessing resources belonging to another organization", () => {
      const session = { id: user1, role: UserRole.ADMIN, organizationId: orgA };

      expect(canAccessSharedResource(session, "read", orgB)).toBe(false);
      expect(canAccessSharedResource(session, "write", orgB)).toBe(false);
      expect(canAccessSharedResource(session, "delete", orgB)).toBe(false);
    });

    it("allows MANAGER to read, write, and export inside their own organization", () => {
      const session = { id: user1, role: UserRole.MANAGER, organizationId: orgA };

      expect(canAccessSharedResource(session, "read", orgA)).toBe(true);
      expect(canAccessSharedResource(session, "write", orgA)).toBe(true);
      expect(canAccessSharedResource(session, "export", orgA)).toBe(true);
    });

    it("blocks MANAGER from deleting records or accessing other organizations", () => {
      const session = { id: user1, role: UserRole.MANAGER, organizationId: orgA };

      expect(canAccessSharedResource(session, "delete", orgA)).toBe(false);
      expect(canAccessSharedResource(session, "read", orgB)).toBe(false);
      expect(canAccessSharedResource(session, "write", orgB)).toBe(false);
    });

    it("allows AGENT to read and write any shared CRM record in their organization", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA };

      expect(canAccessSharedResource(session, "read", orgA)).toBe(true);
      expect(canAccessSharedResource(session, "write", orgA)).toBe(true);
    });

    it("blocks AGENT from deleting records or accessing other organizations", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA };

      expect(canAccessSharedResource(session, "delete", orgA)).toBe(false);
      expect(canAccessSharedResource(session, "read", orgB)).toBe(false);
    });

    it("allows VIEWER to read inside their organization", () => {
      const session = { id: user1, role: UserRole.VIEWER, organizationId: orgA };

      expect(canAccessSharedResource(session, "read", orgA)).toBe(true);
    });

    it("blocks VIEWER from writing, deleting, or accessing other organizations", () => {
      const session = { id: user1, role: UserRole.VIEWER, organizationId: orgA };

      expect(canAccessSharedResource(session, "write", orgA)).toBe(false);
      expect(canAccessSharedResource(session, "delete", orgA)).toBe(false);
      expect(canAccessSharedResource(session, "read", orgB)).toBe(false);
    });
  });

  describe("canAccessCustomerProfile private module", () => {
    const ownProfile = { organizationId: orgA, createdById: user1 };
    const otherProfile = { organizationId: orgA, createdById: user2 };

    it("allows agents to access only their own profiling records", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA };

      expect(canAccessCustomerProfile(session, "read", ownProfile)).toBe(true);
      expect(canAccessCustomerProfile(session, "write", ownProfile)).toBe(true);
      expect(canAccessCustomerProfile(session, "read", otherProfile)).toBe(false);
      expect(canAccessCustomerProfile(session, "write", otherProfile)).toBe(false);
    });

    it("allows manager, admin, and super admin to access all profiling records in scope", () => {
      for (const role of [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN]) {
        const session = { id: user1, role, organizationId: orgA };

        expect(canAccessCustomerProfile(session, "read", otherProfile)).toBe(true);
        expect(canAccessCustomerProfile(session, "write", otherProfile)).toBe(true);
      }
    });

    it("blocks cross-organization profiling access", () => {
      const session = { id: user1, role: UserRole.ADMIN, organizationId: orgA };

      expect(canAccessCustomerProfile(session, "read", { organizationId: orgB, createdById: user1 })).toBe(false);
    });
  });

  describe("getTenantFilter Query Generator", () => {
    it("generates broad query for SUPER_ADMIN only ignoring deleted ones", () => {
      const session = { id: user1, role: UserRole.SUPER_ADMIN, organizationId: orgA };
      const filter = getTenantFilter(session, "read");

      expect(filter).toEqual({ deletedAt: null });
    });

    it("scopes queries to organizationId for ADMIN", () => {
      const session = { id: user1, role: UserRole.ADMIN, organizationId: orgA };
      const filter = getTenantFilter(session, "read");

      expect(filter).toEqual({ organizationId: orgA, deletedAt: null });
    });

    it("scopes read queries to organizationId for AGENT so office CRM data is visible", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA };
      const filter = getTenantFilter(session, "read");

      expect(filter).toEqual({ organizationId: orgA, deletedAt: null });
    });

    it("does not scope shared CRM write queries by createdById for AGENT", () => {
      const session = { userId: user1, role: UserRole.AGENT, organizationId: orgA };
      const filter = getTenantFilter(session, "write");

      expect(filter).toEqual({ organizationId: orgA, deletedAt: null });
      expect(filter.createdById).toBeUndefined();
    });

    it("returns blocking filter for VIEWER trying to write", () => {
      const session = { id: user1, role: UserRole.VIEWER, organizationId: orgA };
      const filter = getTenantFilter(session, "write");

      expect(filter.id).toBe("00000000-0000-0000-0000-000000000000");
    });
  });

  describe("getCustomerProfileOwnerFilter", () => {
    it("always scopes profiling data to the current user", () => {
      const session = { userId: user1, role: UserRole.ADMIN, organizationId: orgA };
      const filter = getCustomerProfileOwnerFilter(session);

      expect(filter).toEqual({
        organizationId: orgA,
        deletedAt: null,
        createdById: user1
      });
    });

    it("scopes SUPER_ADMIN profiling data to the current user as well", () => {
      const session = { userId: user1, role: UserRole.SUPER_ADMIN, organizationId: orgA };
      const filter = getCustomerProfileOwnerFilter(session);

      expect(filter.createdById).toBe(user1);
    });
  });

  describe("getCustomerProfileScopedFilter", () => {
    it("scopes agents to their own customer profiling records", () => {
      const session = { userId: user1, role: UserRole.AGENT, organizationId: orgA };
      const filter = getCustomerProfileScopedFilter(session);

      expect(filter).toEqual({
        organizationId: orgA,
        deletedAt: null,
        createdById: user1
      });
    });

    it("allows managers and admins to view all customer profiles in their organization", () => {
      for (const role of [UserRole.MANAGER, UserRole.ADMIN, UserRole.VIEWER]) {
        const session = { userId: user1, role, organizationId: orgA };
        const filter = getCustomerProfileScopedFilter(session);

        expect(filter).toEqual({ organizationId: orgA, deletedAt: null });
      }
    });
  });

  describe("canAccessResource compatibility alias", () => {
    it("delegates to shared org-wide access rules", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA };

      expect(canAccessResource(session, "write", user2, orgA)).toBe(true);
    });
  });

  describe("LOB Scoping Filters", () => {
    it("returns unmodified where clause for SUPER_ADMIN", () => {
      const session = { id: user1, role: UserRole.SUPER_ADMIN, organizationId: orgA, assignedLOBs: ["Motor Insurance"] };
      const where = { organizationId: orgA };
      const result = applyLOBRestriction(where, session);
      expect(result).toEqual({ organizationId: orgA });
    });

    it("does not block if assignedLOBs is empty because LOB visibility is disabled", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA, assignedLOBs: [] };
      const where = { organizationId: orgA };
      const result = applyLOBRestriction(where, session);
      expect(result).toEqual({ organizationId: orgA });
    });

    it("does not generate Prisma LOB filters when assignedLOBs is present", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA, assignedLOBs: ["Motor Insurance"] };
      const where = { organizationId: orgA };
      const result = applyLOBRestriction(where, session);
      expect(result).toEqual({ organizationId: orgA });
    });

    it("returns no SQL LOB filter", () => {
      const sql = getLOBFilterSQL(["Motor Insurance"]);
      expect(sql).toBe("");
    });

    it("does not block SQL queries when assignedLOBs is empty array", () => {
      const sql = getLOBFilterSQL([]);
      expect(sql).toBe("");
    });
  });
});
