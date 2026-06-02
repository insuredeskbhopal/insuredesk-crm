"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Edit3, Plus, RefreshCcw, Search, Trash2, X } from "lucide-react";

const ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "AGENT", "VIEWER"];
const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  AGENT: "Agent",
  VIEWER: "Viewer"
};

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "AGENT"
};

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 10 });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUserId, setEditingUserId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const pageCount = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const assignableRoles = meta.assignableRoles?.length ? meta.assignableRoles : ["AGENT", "VIEWER"];
  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) => {
      return [
        user.name,
        user.email,
        ROLE_LABELS[user.role] || user.role,
        user.organizationId
      ].some((value) => String(value || "").toLowerCase().includes(normalized));
    });
  }, [query, users]);

  const roleCounts = useMemo(() => {
    return users.reduce((counts, user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
      return counts;
    }, {});
  }, [users]);

  const loadUsers = async (targetPage = page) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/users?page=${targetPage}&pageSize=10`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load users");
      setUsers(payload.data || []);
      setMeta(payload.meta || { total: 0, page: targetPage, pageSize: 10 });
      setPage(payload.meta?.page || targetPage);
    } catch (err) {
      setError(err.message || "Failed to load users");
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
  };

  const startCreate = () => {
    setMessage("");
    setError("");
    setForm({ ...EMPTY_FORM, role: assignableRoles[0] || "AGENT" });
    setEditingUserId("");
    setIsFormOpen(true);
  };

  const startEdit = (user) => {
    setMessage("");
    setError("");
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "AGENT"
    });
    setEditingUserId(user.id);
    setIsFormOpen(true);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setError("");

    const body = {
      name: form.name.trim() || undefined,
      email: form.email.trim(),
      role: form.role
    };

    if (!editingUserId || form.password.trim()) {
      body.password = form.password;
    }

    try {
      const response = await fetch(editingUserId ? `/api/users/${editingUserId}` : "/api/users", {
        method: editingUserId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save user");
      setMessage(editingUserId ? "User updated" : "User created");
      resetForm();
      await loadUsers(page);
    } catch (err) {
      setError(err.message || "Unable to save user");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.email}? This will deactivate the user.`)) return;
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to delete user");
      setMessage("User deleted");
      await loadUsers(page);
    } catch (err) {
      setError(err.message || "Unable to delete user");
    }
  };

  return (
    <section className="user-management-page">
      <section className="glass-panel user-management-header">
        <div>
          <p className="eyebrow">Admin Control</p>
          <h1>User Management</h1>
          <p>Manage portal access, user roles, and active accounts.</p>
        </div>
        <div className="title-actions">
          <button className={isLoading ? "is-busy" : ""} type="button" onClick={() => loadUsers(page)} disabled={isLoading}>
            <RefreshCcw size={17} /> Refresh
          </button>
          <button type="button" onClick={startCreate}>
            <Plus size={17} /> Add User
          </button>
        </div>
      </section>

      <section className="user-role-grid">
        {ROLES.map((role) => (
          <div className="metric-card" key={role}>
            <span>{ROLE_LABELS[role]}</span>
            <strong>{roleCounts[role] || 0}</strong>
          </div>
        ))}
      </section>

      {(message || error) ? (
        <section className={error ? "user-notice error" : "user-notice"}>
          {error || message}
        </section>
      ) : null}

      {isFormOpen ? (
        <section className="glass-panel user-form-panel animate-in">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{editingUserId ? "Edit User" : "Create User"}</p>
              <h2>{editingUserId ? "Update account details" : "Add a new portal user"}</h2>
            </div>
            <button aria-label="Close user form" className="icon-button" type="button" onClick={resetForm}>
              <X size={18} />
            </button>
          </div>

          <form className="user-form" onSubmit={saveUser}>
            <label>
              <span>Name</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" />
            </label>
            <label>
              <span>Email</span>
              <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="user@example.com" />
            </label>
            <label>
              <span>{editingUserId ? "New Password" : "Password"}</span>
              <input
                required={!editingUserId}
                minLength={8}
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={editingUserId ? "Leave blank to keep current" : "Minimum 8 characters"}
              />
            </label>
            <label>
              <span>Role</span>
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </label>
            <div className="user-form-actions">
              <button type="button" onClick={resetForm}>Cancel</button>
              <button className={isSaving ? "is-busy" : ""} type="submit" disabled={isSaving}>
                <Check size={17} /> {isSaving ? "Saving..." : "Save User"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="glass-panel user-table-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Users</p>
            <h2>Portal accounts</h2>
          </div>
          <label className="user-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." />
          </label>
        </div>

        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Organization</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6}>Loading users...</td></tr>
              ) : filteredUsers.length ? filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name || "Unnamed user"}</strong>
                    <small>{user.email}</small>
                  </td>
                  <td><span className="role-pill">{ROLE_LABELS[user.role] || user.role}</span></td>
                  <td>{user.organizationId || "-"}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>{formatDate(user.updatedAt)}</td>
                  <td>
                    <div className="user-row-actions">
                      <button type="button" onClick={() => startEdit(user)}><Edit3 size={16} /> Edit</button>
                      <button type="button" onClick={() => deleteUser(user)}><Trash2 size={16} /> Delete</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="table-pagination">
            <span>Page {page} of {pageCount} · {meta.total} users</span>
            <div className="table-page-list">
              <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Prev</button>
              {getPageNumbers(page, pageCount).map((item, index) => (
                item === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "34px",
                      minHeight: "32px",
                      color: "var(--text-secondary, #64748b)",
                      fontSize: "14px",
                      fontWeight: "700",
                      userSelect: "none"
                    }}
                  >
                    ...
                  </span>
                ) : (
                  <button className={page === item ? "active" : ""} key={item} type="button" onClick={() => setPage(item)}>
                    {item}
                  </button>
                )
              ))}
              <button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button>
            </div>
          </div>
        ) : null}
      </section>
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
