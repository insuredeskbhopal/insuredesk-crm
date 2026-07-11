/* global navigator */
"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  X,
  Edit2,
  Copy,
  Check,
  KeyRound,
  Shield,
  Loader2,
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";

export default function ClientManagementPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Copy State Tracking
  const [copiedId, setCopiedId] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [selectedProfileId, setSelectedProfileId] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchClients();
  }, [page, searchQuery]);

  async function fetchClients() {
    setLoading(true);
    setError("");
    try {
      const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/client-accounts?page=${page}&limit=${limit}${queryParam}`);
      if (!res.ok) throw new Error("Failed to fetch client accounts");
      const data = await res.json();
      setProfiles(data.accounts || data.profiles || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setSelectedProfileId("");
    setName("");
    setEmail("");
    setPhone("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (profile) => {
    setModalMode("edit");
    setSelectedProfileId(profile.id);
    setName(profile.name || "");
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSubmitting(true);

    if (!name || !phone) {
      setFormError("Name and Phone number are required.");
      setFormSubmitting(false);
      return;
    }

    const payload = {
      name,
      phone: phone.replace(/[^0-9]/g, ""),
      email: email.trim(),
    };

    try {
      let res;
      if (modalMode === "create") {
        res = await fetch("/api/client-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/client-accounts/${selectedProfileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save customer profile");
      }

      setSuccessMessage(
        modalMode === "create"
          ? "Client profile generated successfully!"
          : "Client profile updated successfully!"
      );
      setIsModalOpen(false);
      fetchClients();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setFormError(err.message || "Something went wrong.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const getMpin = (phoneStr) => {
    if (!phoneStr) return "N/A";
    const cleanPhone = phoneStr.replace(/[^0-9]/g, "");
    return cleanPhone.length >= 4 ? cleanPhone.slice(-4) : cleanPhone;
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <OperationsBackLink />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-emerald-600" />
            Client Management
          </h1>
          <p className="text-slate-500 mt-1">
            Generate and manage client portal access credentials, view Client IDs, and configure login MPINs.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-sm font-medium transition-colors w-fit"
        >
          <Plus className="h-5 w-5" />
          Create Client Login
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Credential Mechanism Guidelines</p>
          <p>
            * <strong>Client ID</strong>: This is the unique profile identification key generated automatically for the client.
          </p>
          <p>
            * <strong>Client MPIN</strong>: This is a secure 4-digit code matching the <strong>last 4 digits</strong> of the client&apos;s registered phone number.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Main Workspace Table Panel */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients by name, phone, or Client ID..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Showing {profiles.length} of {totalCount} total clients
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
            <p className="text-sm font-medium">Loading client portal profiles...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Users className="h-12 w-12 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-700">No client profiles found</p>
            <p className="text-sm text-slate-400">Search with another filter or create a new client login.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Client Details
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Client ID (Unique Key)
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Client MPIN
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
                          {profile.name ? profile.name[0].toUpperCase() : "?"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{profile.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Phone className="h-3 w-3" /> {profile.phone || "No phone"}
                          </div>
                          {profile.email && (
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Mail className="h-3 w-3" /> {profile.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg w-fit">
                        <span>{profile.id}</span>
                        <button
                          onClick={() => handleCopy(profile.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                          title="Copy Client ID"
                        >
                          {copiedId === profile.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <KeyRound className="h-4 w-4 text-emerald-600" />
                        <span className="font-mono font-semibold text-slate-800 text-sm tracking-wider">
                          {getMpin(profile.phone)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenEditModal(profile)}
                        className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit Credentials</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* CREATE & EDIT MODALS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur with overlay mask */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          ></div>

          {/* Modal Container: centered vertically and horizontally */}
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                {modalMode === "create" ? "Generate Client Portal Login" : "Edit Portal Credentials"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Client Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Girish Sharma"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={formSubmitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. client@gmail.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={formSubmitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Mobile Number (Client MPIN is based on last 4 digits)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={formSubmitting}
                />
                {phone.replace(/[^0-9]/g, "").length >= 4 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Computed Client MPIN will be:{" "}
                    <strong className="text-slate-700 font-mono">
                      {getMpin(phone)}
                    </strong>
                  </p>
                )}
              </div>

              {modalMode === "edit" && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
                  Client ID (Permanent Key):{" "}
                  <strong className="font-mono text-slate-700 block mt-0.5">{selectedProfileId}</strong>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  disabled={formSubmitting}
                >
                  {formSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{modalMode === "create" ? "Generate Login" : "Update Credentials"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
