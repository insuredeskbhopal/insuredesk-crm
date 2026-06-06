import { describe, expect, it } from "vitest";
import { canAccessResource, getTenantFilter, UserRole, applyLOBRestriction, getLOBFilterSQL } from "../lib/auth/rbac";

describe("SaaS Multi-Tenancy & RBAC Tests", () => {
  const orgA = "org-aaaa-aaaa-aaaa-aaaa";
  const orgB = "org-bbbb-bbbb-bbbb-bbbb";
  const user1 = "user-1111";
  const user2 = "user-2222";

  describe("canAccessResource Permissions Matrix", () => {
    // 1. SUPER_ADMIN Role Tests
    it("allows SUPER_ADMIN to bypass all tenant boundaries and perform any action", () => {
      const session = { id: user1, role: UserRole.SUPER_ADMIN, organizationId: orgA };
      
      expect(canAccessResource(session, "read", user2, orgB)).toBe(true);
      expect(canAccessResource(session, "write", user2, orgB)).toBe(true);
      expect(canAccessResource(session, "delete", user2, orgB)).toBe(true);
      expect(canAccessResource(session, "admin", user2, orgB)).toBe(true);
    });

    // 2. ADMIN Role Tests
    it("allows ADMIN to read and write inside their own organization but not delete", () => {
      const session = { id: user1, role: UserRole.ADMIN, organizationId: orgA };

      expect(canAccessResource(session, "read", user2, orgA)).toBe(true);
      expect(canAccessResource(session, "write", user2, orgA)).toBe(true);
      expect(canAccessResource(session, "delete", user2, orgA)).toBe(false);
    });

    it("blocks ADMIN from accessing resources belonging to another organization", () => {
      const session = { id: user1, role: UserRole.ADMIN, organizationId: orgA };

      expect(canAccessResource(session, "read", user2, orgB)).toBe(false);
      expect(canAccessResource(session, "write", user2, orgB)).toBe(false);
      expect(canAccessResource(session, "delete", user2, orgB)).toBe(false);
    });

    // 3. MANAGER Role Tests
    it("allows MANAGER to read and write inside their own organization", () => {
      const session = { id: user1, role: UserRole.MANAGER, organizationId: orgA };

      expect(canAccessResource(session, "read", user2, orgA)).toBe(true);
      expect(canAccessResource(session, "write", user2, orgA)).toBe(true);
    });

    it("blocks MANAGER from deleting records or accessing other organizations", () => {
      const session = { id: user1, role: UserRole.MANAGER, organizationId: orgA };

      expect(canAccessResource(session, "delete", user2, orgA)).toBe(false);
      expect(canAccessResource(session, "read", user2, orgB)).toBe(false);
      expect(canAccessResource(session, "write", user2, orgB)).toBe(false);
    });

    // 4. AGENT Role Tests (Office-wide reads, ownership-bound writes)
    it("allows AGENT to read office records and write their own created records in their organization", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA };

      expect(canAccessResource(session, "read", user1, orgA)).toBe(true);
      expect(canAccessResource(session, "read", user2, orgA)).toBe(true);
      expect(canAccessResource(session, "write", user1, orgA)).toBe(true);
    });

    it("blocks AGENT from writing other agents' records, even in the same organization", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA };

      expect(canAccessResource(session, "write", user2, orgA)).toBe(false);
    });

    it("blocks AGENT from deleting their own records", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA };

      expect(canAccessResource(session, "delete", user1, orgA)).toBe(false);
    });

    // 5. VIEWER Role Tests
    it("allows VIEWER to read inside their organization", () => {
      const session = { id: user1, role: UserRole.VIEWER, organizationId: orgA };

      expect(canAccessResource(session, "read", user2, orgA)).toBe(true);
    });

    it("blocks VIEWER from writing, deleting, or accessing other organizations", () => {
      const session = { id: user1, role: UserRole.VIEWER, organizationId: orgA };

      expect(canAccessResource(session, "write", user2, orgA)).toBe(false);
      expect(canAccessResource(session, "delete", user2, orgA)).toBe(false);
      expect(canAccessResource(session, "read", user2, orgB)).toBe(false);
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

    it("uses userId from JWT payloads when generating AGENT write ownership filters", () => {
      const session = { userId: user1, role: UserRole.AGENT, organizationId: orgA };
      const filter = getTenantFilter(session, "write");

      expect(filter).toEqual({ organizationId: orgA, deletedAt: null, createdById: user1 });
    });

    it("returns blocking filter for VIEWER trying to write", () => {
      const session = { id: user1, role: UserRole.VIEWER, organizationId: orgA };
      const filter = getTenantFilter(session, "write");

      expect(filter.id).toBe("00000000-0000-0000-0000-000000000000");
    });
  });

  describe("LOB Scoping Filters", () => {
    it("returns unmodified where clause for SUPER_ADMIN", () => {
      const session = { id: user1, role: UserRole.SUPER_ADMIN, organizationId: orgA, assignedLOBs: ["Motor Insurance"] };
      const where = { organizationId: orgA };
      const result = applyLOBRestriction(where, session);
      expect(result).toEqual({ organizationId: orgA });
    });

    it("returns blocking filter if assignedLOBs is empty array and role is not SUPER_ADMIN", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA, assignedLOBs: [] };
      const where = { organizationId: orgA };
      const result = applyLOBRestriction(where, session);
      expect(result.id).toBe("00000000-0000-0000-0000-000000000000");
    });

    it("generates correct Prisma query filters when assignedLOBs is present", () => {
      const session = { id: user1, role: UserRole.AGENT, organizationId: orgA, assignedLOBs: ["Motor Insurance"] };
      const where = { organizationId: orgA };
      const result = applyLOBRestriction(where, session);
      expect(result.AND).toBeDefined();
      expect(result.AND[0].OR.length).toBeGreaterThan(0);
      expect(result.AND[0].OR[0].selectedPolicyType.contains).toBe("motor");
    });

    it("returns correct getLOBFilterSQL output", () => {
      const sql = getLOBFilterSQL(["Motor Insurance"]);
      expect(sql).toContain("LOWER(COALESCE(selected_policy_type, '')) LIKE '%motor%'");
    });

    it("blocks queries in SQL when assignedLOBs is empty array", () => {
      const sql = getLOBFilterSQL([]);
      expect(sql).toBe("AND 1=0");
    });
  });
});
