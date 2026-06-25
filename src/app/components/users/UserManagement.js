"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { getUserFacingErrorMessage } from "@/lib/errors/user-facing";
import {
  AlertTriangle,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

const ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "AGENT", "VIEWER"];
const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  AGENT: "Agent",
  VIEWER: "Viewer",
};

const ROLE_DESCRIPTIONS = {
  SUPER_ADMIN: "Full platform control across organizations and all admin settings.",
  ADMIN: "Manages users, records, and operational settings within allowed scope.",
  MANAGER: "Oversees team work, reporting, assignments, and process execution.",
  AGENT: "Works assigned processes and updates day-to-day policy records.",
  VIEWER: "Read-only portal access for monitoring and review.",
};

const ROLE_CARD_DESCRIPTIONS = {
  SUPER_ADMIN: "Platform owners",
  ADMIN: "Admin operators",
  MANAGER: "Team supervisors",
  AGENT: "Frontline users",
  VIEWER: "Read-only access",
};

const LOB_OPTIONS = [
  "Motor Insurance",
  "Health Insurance",
  "Life Insurance",
  "Warehouse Insurance",
  "Fire Insurance",
  "Marine Insurance",
  "Travel Insurance",
  "Cyber Insurance",
  "Shop / Office Insurance",
  "Business Insurance",
  "Other",
];

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "AGENT",
  assignedLOBs: [],
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(user) {
  const source = user.name || user.email || "User";
  return (
    source
      .split(/[.\s@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function getOrganizationLabel(user) {
  return (
    user.organization?.name || user.organizationName || user.organizationId || "No organization assigned"
  );
}

export default function UserManagement() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 10 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(urlQuery);
  const [roleFilter, setRoleFilter] = useState("all");
  const [lobFilter, setLobFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUserId, setEditingUserId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const assignableRoles = meta.assignableRoles?.length ? meta.assignableRoles : ["AGENT", "VIEWER"];
  const selectedLobCount = form.assignedLOBs?.length || 0;
  const canMutateUsers = meta.currentRole === "SUPER_ADMIN" || meta.currentRole === "ADMIN";
  const userTableColumnCount = canMutateUsers ? 6 : 5;

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!ignore) setCurrentUser(payload?.user || null);
      })
      .catch(() => {
        if (!ignore) setCurrentUser(null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    let result = users;

    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter((user) => {
        return [user.name, user.email, ROLE_LABELS[user.role] || user.role, user.organizationId].some(
          (value) =>
            String(value || "")
              .toLowerCase()
              .includes(normalizedQuery),
        );
      });
    }

    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter);
    }

    if (lobFilter !== "all") {
      result = result.filter(
        (user) => Array.isArray(user.assignedLOBs) && user.assignedLOBs.includes(lobFilter),
      );
    }

    return result;
  }, [query, roleFilter, lobFilter, users]);

  const roleCounts = useMemo(() => {
    return users.reduce((counts, user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
      return counts;
    }, {});
  }, [users]);

  const assignedCoverage = useMemo(() => {
    const covered = new Set();
    users.forEach((user) => {
      if (Array.isArray(user.assignedLOBs)) {
        user.assignedLOBs.forEach((lob) => covered.add(lob));
      }
    });
    return covered.size;
  }, [users]);

  const hasActiveFilters = Boolean(query.trim()) || roleFilter !== "all" || lobFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setLobFilter("all");
  };

  const loadUsers = async (targetPage = page) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/users?page=${targetPage}&pageSize=10`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(getUserFacingErrorMessage(payload.error, "Users could not be loaded. Please try again."));
      setUsers(payload.data || []);
      setMeta(payload.meta || { total: 0, page: targetPage, pageSize: 10 });
      setPage(payload.meta?.page || targetPage);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, "Users could not be loaded. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(page);
  }, [page]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingUserId("");
    setIsFormOpen(false);
    setShowPassword(false);
    setFormErrors({});
  };

  const startCreate = () => {
    if (!canMutateUsers) return;
    setMessage("");
    setError("");
    setFormErrors({});
    setForm({ ...EMPTY_FORM, role: assignableRoles[0] || "AGENT" });
    setEditingUserId("");
    setIsFormOpen(true);
    setShowPassword(false);
  };

  const startEdit = (user) => {
    if (!canMutateUsers) return;
    setMessage("");
    setError("");
    setFormErrors({});
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "AGENT",
      assignedLOBs: Array.isArray(user.assignedLOBs) ? user.assignedLOBs : [],
    });
    setEditingUserId(user.id);
    setIsFormOpen(true);
    setShowPassword(false);
  };

  const toggleLOB = (lob) => {
    setForm((current) => {
      const selected = new Set(current.assignedLOBs || []);
      if (selected.has(lob)) selected.delete(lob);
      else selected.add(lob);
      return { ...current, assignedLOBs: Array.from(selected) };
    });
  };

  const selectAllLOBs = () => {
    setForm((current) => ({ ...current, assignedLOBs: [...LOB_OPTIONS] }));
  };

  const clearAllLOBs = () => {
    setForm((current) => ({ ...current, assignedLOBs: [] }));
  };

  const saveUser = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!editingUserId && form.password.trim().length < 8)
      nextErrors.password = "Password must be at least 8 characters.";
    if (editingUserId && form.password.trim() && form.password.trim().length < 8)
      nextErrors.password = "New password must be at least 8 characters.";
    if (!form.role) nextErrors.role = "Choose a role for this user.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    const body = {
      name: form.name.trim() || undefined,
      email: form.email.trim(),
      role: form.role,
      assignedLOBs: form.assignedLOBs || [],
    };

    if (!editingUserId || form.password.trim()) {
      body.password = form.password;
    }

    try {
      const response = await fetch(editingUserId ? `/api/users/${editingUserId}` : "/api/users", {
        method: editingUserId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(getUserFacingErrorMessage(payload.error, "User could not be saved. Please try again."));
      setMessage(editingUserId ? "User updated" : "User created");
      resetForm();
      await loadUsers(page);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, "User could not be saved. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const requestDeleteUser = (user) => {
    if (!canMutateUsers) return;
    setMessage("");
    setError("");
    setDeleteTarget(user);
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(getUserFacingErrorMessage(payload.error, "User could not be deleted. Please try again."));
      setMessage("User deleted");
      setDeleteTarget(null);
      await loadUsers(page);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, "User could not be deleted. Please try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="user-management-page">
      <section className="glass-panel user-management-header user-admin-card">
        <div>
          <p className="eyebrow">Admin Control</p>
          <h1>User Management</h1>
          <p>Manage portal access, roles, permissions, and active accounts.</p>
        </div>
        <div className="title-actions">
          <button
            className={`user-secondary-button ${isLoading ? "is-busy" : ""}`}
            type="button"
            onClick={() => loadUsers(page)}
            disabled={isLoading}
          >
            <RefreshCcw size={17} /> Refresh
          </button>
          {canMutateUsers ? (
            <button className="user-primary-button" type="button" onClick={startCreate}>
              <Plus size={17} /> Add User
            </button>
          ) : null}
        </div>
      </section>

      <section className="user-role-grid">
        {ROLES.map((role) => (
          <div className={`user-role-card role-${role.toLowerCase().replace("_", "-")}`} key={role}>
            <div className="user-role-card-top">
              <span>{ROLE_LABELS[role]}</span>
              <ShieldCheck size={18} />
            </div>
            <strong>{roleCounts[role] || 0}</strong>
            <p>{ROLE_CARD_DESCRIPTIONS[role]}</p>
          </div>
        ))}
        <div className="user-role-card user-role-card-wide">
          <div className="user-role-card-top">
            <span>Active users</span>
            <UsersRound size={18} />
          </div>
          <strong>{meta.total || users.length}</strong>
          <p>
            {assignedCoverage} of {LOB_OPTIONS.length} processes covered
          </p>
        </div>
      </section>

      {message || error ? (
        <section className={error ? "user-notice error" : "user-notice"} role={error ? "alert" : "status"}>
          {error ? <AlertTriangle size={18} /> : <Check size={18} />}
          <span>{error || message}</span>
          {error ? (
            <button type="button" onClick={() => loadUsers(page)}>
              Retry
            </button>
          ) : null}
        </section>
      ) : null}

      {isFormOpen && canMutateUsers && isMounted
        ? createPortal(
            <div
              className="user-form-modal-backdrop"
              role="presentation"
              onMouseDown={() => !isSaving && resetForm()}
            >
              <section
                className="glass-panel user-form-panel user-admin-card animate-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-form-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="panel-head">
                  <div className="user-form-brand-block">
                    <BrandLogo className="user-form-logo" />
                    <div className="user-form-title-block">
                      <p className="eyebrow">{editingUserId ? "Edit User" : "Create User"}</p>
                      <h2 id="user-form-title">
                        {editingUserId ? "Update account details" : "Add a new portal user"}
                      </h2>
                      <span className="panel-helper">
                        Set credentials, assign a role, and scope process access without changing existing
                        permissions.
                      </span>
                    </div>
                  </div>
                  <button
                    aria-label="Close user form"
                    className="icon-button user-form-close"
                    type="button"
                    onClick={resetForm}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form className="user-form" onSubmit={saveUser}>
                  <label>
                    <span>Name</span>
                    <small>Display name shown across admin views.</small>
                    <input
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="Full name"
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <small>Used for login and account notifications.</small>
                    <input
                      required
                      type="email"
                      autoComplete="off"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      placeholder="user@example.com"
                    />
                    {formErrors.email ? <em>{formErrors.email}</em> : null}
                  </label>
                  <label>
                    <span>{editingUserId ? "New Password" : "Password"}</span>
                    <small>
                      {editingUserId
                        ? "Leave blank to keep the existing password."
                        : "Minimum 8 characters required."}
                    </small>
                    <div className="user-password-field">
                      <input
                        required={!editingUserId}
                        minLength={8}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                        placeholder={editingUserId ? "Leave blank to keep current" : "Minimum 8 characters"}
                      />
                      <button
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formErrors.password ? <em>{formErrors.password}</em> : null}
                  </label>
                  <label>
                    <span>Role</span>
                    <small>{ROLE_DESCRIPTIONS[form.role] || "Choose the user permission level."}</small>
                    <select
                      value={form.role}
                      onChange={(event) => setForm({ ...form, role: event.target.value })}
                    >
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    {formErrors.role ? <em>{formErrors.role}</em> : null}
                  </label>
                  <div className="user-lob-section">
                    <div className="user-lob-header">
                      <div>
                        <span>Assigned Processes (LOBs)</span>
                        <small>
                          {selectedLobCount} selected. This controls the process scope already enforced by the
                          app.
                        </small>
                      </div>
                      <div>
                        <button type="button" onClick={selectAllLOBs}>
                          Select All
                        </button>
                        <button type="button" onClick={clearAllLOBs}>
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="lob-checklist">
                      {LOB_OPTIONS.map((lob) => {
                        const isChecked = (form.assignedLOBs || []).includes(lob);
                        return (
                          <label className={isChecked ? "is-selected" : ""} key={lob}>
                            <input type="checkbox" checked={isChecked} onChange={() => toggleLOB(lob)} />
                            <Check size={14} />
                            <span>{lob}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="user-form-actions">
                    <button type="button" onClick={resetForm}>
                      Cancel
                    </button>
                    <button className={isSaving ? "is-busy" : ""} type="submit" disabled={isSaving}>
                      <Check size={18} /> {isSaving ? "Saving..." : "Save User"}
                    </button>
                  </div>
                </form>
              </section>
            </div>,
            document.body,
          )
        : null}

      <section className="glass-panel user-table-panel user-admin-card">
        <div className="panel-head user-table-head">
          <div>
            <p className="eyebrow">Users</p>
            <h2>Portal accounts</h2>
            <span className="panel-helper">
              Showing {filteredUsers.length} users
              {hasActiveFilters ? ` from ${users.length} loaded accounts` : ""}
            </span>
          </div>
          <div className="user-filter-bar">
            <label className="user-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or email"
              />
            </label>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="all">All Roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] || role}
                </option>
              ))}
            </select>
            <select value={lobFilter} onChange={(event) => setLobFilter(event.target.value)}>
              <option value="all">All Processes</option>
              {LOB_OPTIONS.map((lob) => (
                <option key={lob} value={lob}>
                  {lob}
                </option>
              ))}
            </select>
            <button
              className="user-clear-filter"
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              <SlidersHorizontal size={16} /> Clear
            </button>
          </div>
        </div>

        {error && !users.length && !isLoading ? (
          <div className="user-state-card error">
            <AlertTriangle size={28} />
            <h3>Could not load users</h3>
            <p>{error}</p>
            <button type="button" onClick={() => loadUsers(page)}>
              Retry
            </button>
          </div>
        ) : (
          <div className="user-table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Organization</th>
                  <th>Created</th>
                  <th>Updated</th>
                  {canMutateUsers ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr className="user-skeleton-row" key={`loading-${index}`}>
                      <td>
                        <span />
                        <small />
                      </td>
                      <td>
                        <span />
                      </td>
                      <td>
                        <span />
                      </td>
                      <td>
                        <span />
                      </td>
                      <td>
                        <span />
                      </td>
                      {canMutateUsers ? (
                        <td>
                          <span />
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-identity">
                          <div className="user-avatar">{getInitials(user)}</div>
                          <div>
                            <strong>{user.name || "Unnamed user"}</strong>
                            <small>{user.email}</small>
                          </div>
                        </div>
                        {Array.isArray(user.assignedLOBs) && user.assignedLOBs.length > 0 ? (
                          <div className="user-lob-pills">
                            {user.assignedLOBs.map((lob) => (
                              <span key={lob}>{lob.replace(" Insurance", "")}</span>
                            ))}
                          </div>
                        ) : (
                          <div className="user-lob-empty">No processes assigned</div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`role-pill role-${String(user.role || "")
                            .toLowerCase()
                            .replace("_", "-")}`}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td>
                        <span className="user-org-label">{getOrganizationLabel(user)}</span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>{formatDate(user.updatedAt)}</td>
                      {canMutateUsers ? (
                        <td>
                          <div className="user-row-actions">
                            <button
                              aria-label={`Edit ${user.email}`}
                              title="Edit user"
                              type="button"
                              onClick={() => startEdit(user)}
                            >
                              <Edit3 size={20} />
                            </button>
                            <button
                              aria-label={`Delete ${user.email}`}
                              title="Delete user"
                              type="button"
                              onClick={() => requestDeleteUser(user)}
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={userTableColumnCount}>
                      <div className="user-state-card">
                        <UserRound size={28} />
                        <h3>No users found</h3>
                        <p>Adjust filters or add a new portal account.</p>
                        {hasActiveFilters ? (
                          <button type="button" onClick={clearFilters}>
                            Clear filters
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="table-pagination">
            <span>
              Page {page} of {pageCount} · {meta.total} users
            </span>
            <div className="table-page-list">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Prev
              </button>
              {getPageNumbers(page, pageCount).map((item, index) =>
                item === "..." ? (
                  <span key={`ellipsis-${index}`} className="table-pagination-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    className={page === item ? "active" : ""}
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={page === pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {deleteTarget && isMounted
        ? createPortal(
            <div
              className="user-modal-backdrop"
              role="presentation"
              onMouseDown={() => !isDeleting && setDeleteTarget(null)}
            >
              <section
                className="user-delete-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-user-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="user-delete-icon">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2 id="delete-user-title">Delete user?</h2>
                  <p>
                    This will deactivate <strong>{deleteTarget.email}</strong>. Existing backend safeguards
                    still apply.
                  </p>
                  {currentUser?.id && currentUser.id === deleteTarget.id ? (
                    <div className="user-delete-warning">
                      You are about to delete your own account. Confirm only if this is intentional.
                    </div>
                  ) : null}
                  {deleteTarget.role === "SUPER_ADMIN" && (roleCounts.SUPER_ADMIN || 0) <= 1 ? (
                    <div className="user-delete-warning">
                      This appears to be the last Super Admin in the loaded user list. The server may block
                      this action.
                    </div>
                  ) : null}
                </div>
                <div className="user-delete-actions">
                  <button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                    Cancel
                  </button>
                  <button
                    className={isDeleting ? "is-busy" : ""}
                    type="button"
                    onClick={deleteUser}
                    disabled={isDeleting}
                  >
                    <Trash2 size={16} /> {isDeleting ? "Deleting..." : "Delete User"}
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function getPageNumbers(currentPage, totalPages) {
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    if (currentPage <= 4) {
      end = 5;
    } else if (currentPage >= totalPages - 3) {
      start = totalPages - 4;
    }
    if (start > 2) {
      pages.push("...");
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < totalPages - 1) {
      pages.push("...");
    }
    pages.push(totalPages);
  }
  return pages;
}
