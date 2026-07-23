import { useEffect, useRef, useState } from "react";
import { findUniqueClientIdentityMatch } from "@/lib/client-accounts/utils";
import { normalizeContactNumber } from "@/lib/records/validation";

export default function PreviewField({
  fieldKey,
  label,
  meta,
  value,
  onChange,
  type = "text",
  wide,
  options,
  error,
  disabled,
  suggestion,
  onApplySuggestion,
  insuredName,
  contactNumber,
  email,
  clientIdRequestId,
  clientIdLocked = false,
  onClientIdRequestChange,
}) {
  const metaClass = meta ? `meta-${meta.toLowerCase().replace(" ", "-")}` : "";
  const hasSuggestion = Boolean(suggestion?.suggestedValue);
  const labelEl = (
    <span>
      {label}
      {meta ? <em className={metaClass}>{meta}</em> : null}
      {hasSuggestion ? <em className="meta-ai-suggestion">AI suggestion available</em> : null}
    </span>
  );

  const isContactNumber = fieldKey === "contactNumber" || label === "Contact Number";
  const isWhatsAppGroup = fieldKey === "whatsappGroupName" || label === "WhatsApp Group Name";
  const isClientId = fieldKey === "clientId" || label === "Client ID";
  const handleTextChange = (event) =>
    onChange(isContactNumber ? normalizeContactNumber(event.target.value) : event.target.value);

  let inputEl;
  if (wide) {
    inputEl = (
      <textarea value={value} onChange={handleTextChange} disabled={disabled} />
    );
  } else if (options?.length) {
    inputEl = (
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else {
    inputEl = (
      <input
        type={type}
        value={value}
        onChange={isClientId ? undefined : handleTextChange}
        onBlur={() => {
          if (isContactNumber) onChange(normalizeContactNumber(value));
        }}
        disabled={disabled}
        readOnly={isClientId}
        aria-readonly={isClientId || undefined}
      />
    );
  }

  const classes = [wide ? "wide" : "", error ? "has-error" : "", disabled ? "is-disabled" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={classes}>
      {labelEl}
      {inputEl}
      {isClientId && (
        <ClientIdSearch
          value={value}
          onChange={onChange}
          disabled={disabled}
          insuredName={insuredName}
          contactNumber={contactNumber}
          email={email}
          currentRequestId={clientIdRequestId}
          clientIdLocked={clientIdLocked}
          onClientIdRequestChange={onClientIdRequestChange}
        />
      )}
      {isWhatsAppGroup ? (
        <WhatsAppGroupSuggestions
          contactNumber={contactNumber}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      ) : null}
      {hasSuggestion ? (
        <div className="ai-suggestion-card">
          <div>
            <strong>Suggested value</strong>
            <span>{suggestion.suggestedValue}</span>
          </div>
          <div>
            <strong>Current value</strong>
            <span>{value || "-"}</span>
          </div>
          {suggestion.evidenceText ? <blockquote>{suggestion.evidenceText}</blockquote> : null}
          <button
            type="button"
            onClick={() =>
              onApplySuggestion ? onApplySuggestion(suggestion) : onChange(suggestion.suggestedValue)
            }
            disabled={disabled}
          >
            Apply Suggestion
          </button>
        </div>
      ) : null}
      {error ? <span className="field-error-message">{error}</span> : null}
    </label>
  );
}
function WhatsAppGroupSuggestions({ contactNumber, value, onChange, disabled }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const phone = normalizeContactNumber(contactNumber);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setGroups([]);
      setLoading(false);
      setChecked(false);
      setError("");
      return undefined;
    }

    const controller = new globalThis.AbortController();
    setGroups([]);
    setChecked(false);
    setError("");
    const timer = globalThis.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/operations/whatsapp/groups?phone=${encodeURIComponent(phone)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "WhatsApp group lookup failed.");
        setGroups(Array.isArray(payload.groups) ? payload.groups : []);
        setChecked(true);
      } catch (lookupError) {
        if (lookupError?.name === "AbortError") return;
        setGroups([]);
        setChecked(true);
        setError(lookupError.message || "WhatsApp group lookup failed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      globalThis.clearTimeout(timer);
      controller.abort();
    };
  }, [contactNumber]);

  if (loading) return <span className="whatsapp-group-lookup-state">Checking associated groups…</span>;
  if (error) return <span className="whatsapp-group-lookup-state error">{error}</span>;
  if (!checked) return null;
  if (!groups.length) {
    return <span className="whatsapp-group-lookup-state">No associated WhatsApp group found.</span>;
  }

  return (
    <div className="whatsapp-group-suggestions">
      <strong>Associated WhatsApp groups</strong>
      <div>
        {groups.slice(0, 5).map((group) => (
          <button
            key={group.id || group.name}
            type="button"
            className={value === group.name ? "selected" : ""}
            onClick={() => onChange(group.name)}
            disabled={disabled}
            title={group.name}
          >
            <span>{group.name}</span>
            {group.participants ? <small>{group.participants} members</small> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClientIdSearch({
  value,
  onChange,
  disabled,
  insuredName,
  contactNumber,
  email,
  currentRequestId,
  clientIdLocked,
  onClientIdRequestChange,
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [clientIdRequest, setClientIdRequest] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestLookupComplete, setRequestLookupComplete] = useState(false);
  const [autoMatchStatus, setAutoMatchStatus] = useState("idle");
  const identityKey = `${String(insuredName || "").trim().toLowerCase()}|${String(contactNumber || "").replace(/\D/g, "").slice(-10)}|${String(email || "").trim().toLowerCase()}`;
  const identityKeyRef = useRef(identityKey);
  const previousIdentityKey = useRef(identityKey);
  const notifiedRequestId = useRef(String(currentRequestId || ""));
  const autoMatchSuppressedKey = useRef("");
  const requestControllerRef = useRef(null);
  identityKeyRef.current = identityKey;

  useEffect(() => {
    notifiedRequestId.current = String(currentRequestId || "");
  }, [currentRequestId]);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (previousIdentityKey.current === identityKey) return;
    previousIdentityKey.current = identityKey;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    autoMatchSuppressedKey.current = "";
    notifiedRequestId.current = "";
    setSelectedClientName("");
    setClientIdRequest(null);
    setRequestLookupComplete(false);
    setAutoMatchStatus("idle");
    setRequesting(false);
    setRequestError("");
    setQuery("");
    setResults([]);
    onClientIdRequestChange?.("");
    if (value && !clientIdLocked) onChange("");
  }, [clientIdLocked, identityKey, onChange, onClientIdRequestChange, value]);

  useEffect(() => {
    setSelectedClientName("");
    if (value && value.length === 36) {
      const controller = new window.AbortController();
      fetch(`/api/client-accounts/${value}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.name) {
            setSelectedClientName(data.name);
          }
        })
        .catch(() => {});
      return () => controller.abort();
    } else {
      setSelectedClientName("");
    }
    return undefined;
  }, [value]);

  useEffect(() => {
    if (
      !requestLookupComplete ||
      value ||
      clientIdRequest?.id ||
      autoMatchSuppressedKey.current === identityKey
    )
      return;

    const controller = new window.AbortController();
    const lookupIdentityKey = identityKey;
    let active = true;
    const runAutoMatch = async () => {
      const cleanPhone = contactNumber ? contactNumber.replace(/[^0-9]/g, "") : "";
      const searchTerms = [];
      if (cleanPhone && cleanPhone.length >= 10) {
        searchTerms.push(cleanPhone.slice(-10));
      }
      if (email && email.includes("@")) {
        searchTerms.push(email);
      }
      if (!insuredName?.trim() || searchTerms.length === 0) {
        if (active && identityKeyRef.current === lookupIdentityKey) setAutoMatchStatus("idle");
        return;
      }

      setAutoMatchStatus("checking");
      setRequestError("");
      try {
        const candidates = new Map();
        let lookupFailed = false;
        for (const term of searchTerms) {
          const res = await fetch(`/api/client-accounts?page=1&limit=5&q=${encodeURIComponent(term)}`, {
            signal: controller.signal,
          });
          if (!active || controller.signal.aborted || identityKeyRef.current !== lookupIdentityKey) return;
          if (res.ok) {
            const data = await res.json();
            if (!active || controller.signal.aborted || identityKeyRef.current !== lookupIdentityKey) return;
            for (const profile of data.accounts || data.profiles || []) candidates.set(profile.id, profile);
          } else {
            lookupFailed = true;
          }
        }
        const { match: identityMatch, matchCount } = findUniqueClientIdentityMatch(
          [...candidates.values()],
          { insuredName, contactNumber, email },
        );
        if (!active || controller.signal.aborted || identityKeyRef.current !== lookupIdentityKey) return;
        if (identityMatch) {
          setAutoMatchStatus("matched");
          autoMatchSuppressedKey.current = "";
          notifiedRequestId.current = "";
          onClientIdRequestChange?.("");
          setSelectedClientName(identityMatch.name);
          onChange(identityMatch.id);
        } else if (matchCount > 1) {
          setAutoMatchStatus("ambiguous");
          setRequestError("Phone and email match different Client IDs. Select the correct client manually.");
        } else if (lookupFailed) {
          setAutoMatchStatus("error");
          setRequestError("Existing Client IDs could not be checked. Try again before requesting a new one.");
        } else {
          setAutoMatchStatus("no-match");
        }
      } catch (err) {
        if (err?.name !== "AbortError" && active && identityKeyRef.current === lookupIdentityKey) {
          setAutoMatchStatus("error");
          setRequestError("Existing Client IDs could not be checked. Try again before requesting a new one.");
        }
      }
    };

    const timer = window.setTimeout(runAutoMatch, 600);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    value,
    insuredName,
    contactNumber,
    email,
    clientIdRequest?.id,
    identityKey,
    requestLookupComplete,
    onChange,
    onClientIdRequestChange,
  ]);

  useEffect(() => {
    if (
      value ||
      !insuredName?.trim() ||
      autoMatchSuppressedKey.current === identityKey
    ) {
      setRequestLookupComplete(false);
      return;
    }
    const cleanPhone = contactNumber?.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone?.length !== 10) {
      setRequestLookupComplete(false);
      return;
    }

    let active = true;
    let timer;
    let inFlight = false;
    let shouldPoll = true;
    const lookupIdentityKey = identityKey;
    const controller = new window.AbortController();
    setRequestLookupComplete(false);
    const scheduleNextCheck = () => {
      window.clearTimeout(timer);
      if (!active || !shouldPoll || document.hidden) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        checkRequest();
      }, 10000);
    };
    const checkRequest = async () => {
      if (!active || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const params = new window.URLSearchParams({
          mine: "1",
          phone: cleanPhone,
          name: insuredName.trim(),
        });
        const res = await fetch(`/api/client-id-requests?${params}`, { signal: controller.signal });
        if (!res.ok || !active) {
          shouldPoll = true;
          return;
        }
        const data = await res.json();
        if (!active || controller.signal.aborted || identityKeyRef.current !== lookupIdentityKey) return;
        const item = data.requests?.[0] || null;
        const isActiveRequest = ["OPEN", "IN_PROGRESS", "WAITING_DOCUMENTS"].includes(item?.status);
        shouldPoll = Boolean(item?.id && isActiveRequest);
        setRequestLookupComplete(true);
        if (!item || (!isActiveRequest && item.status !== "COMPLETED")) {
          setClientIdRequest(null);
          if (currentRequestId || notifiedRequestId.current) onClientIdRequestChange?.("");
          notifiedRequestId.current = "";
        } else if (item.status === "COMPLETED" && item.resolvedClientId) {
          setClientIdRequest(item);
          setSelectedClientName(item.resolvedClientName || "Client");
          if (currentRequestId || notifiedRequestId.current) onClientIdRequestChange?.("");
          notifiedRequestId.current = "";
          onChange(item.resolvedClientId);
        } else if (item.status === "COMPLETED") {
          setClientIdRequest(null);
          if (currentRequestId || notifiedRequestId.current) onClientIdRequestChange?.("");
          notifiedRequestId.current = "";
          setRequestError("This Client ID request was completed without an active client. Request a new Client ID.");
        } else if (item?.id && notifiedRequestId.current !== item.id) {
          setClientIdRequest(item);
          notifiedRequestId.current = item.id;
          onClientIdRequestChange?.(item.id);
        } else {
          setClientIdRequest(item);
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        shouldPoll = true;
        // The normal client search remains available if request status cannot be loaded.
      } finally {
        inFlight = false;
        scheduleNextCheck();
      }
    };

    checkRequest();
    const resumeWhenVisible = () => {
      if (!document.hidden && shouldPoll && !timer && !inFlight) checkRequest();
    };
    document.addEventListener("visibilitychange", resumeWhenVisible);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resumeWhenVisible);
    };
  }, [
    value,
    insuredName,
    contactNumber,
    onChange,
    onClientIdRequestChange,
    identityKey,
    currentRequestId,
  ]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    const controller = new window.AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setResults([]);
      setRequestError("");
      try {
        const res = await fetch(`/api/client-accounts?page=1&limit=5&q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.accounts || data.profiles || []);
        } else {
          setRequestError("Client search could not be completed.");
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          setResults([]);
          setRequestError("Client search could not be completed.");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleClientIdRequest = async () => {
    if (!requestLookupComplete || autoMatchStatus !== "no-match") return;
    const requestIdentityKey = identityKey;
    const controller = new window.AbortController();
    requestControllerRef.current?.abort();
    requestControllerRef.current = controller;
    autoMatchSuppressedKey.current = "";
    setRequestError("");
    setRequesting(true);
    try {
      const res = await fetch("/api/client-id-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: insuredName, phone: contactNumber, email }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (controller.signal.aborted || identityKeyRef.current !== requestIdentityKey) return;
      if (data?.profile?.id) {
        setSelectedClientName(data.profile.name || "Client");
        onClientIdRequestChange?.("");
        onChange(data.profile.id);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Client ID request could not be submitted.");
      setClientIdRequest(data);
      notifiedRequestId.current = data.id;
      onClientIdRequestChange?.(data.id);
    } catch (err) {
      if (err?.name !== "AbortError" && identityKeyRef.current === requestIdentityKey) {
        setRequestError(err.message);
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        if (identityKeyRef.current === requestIdentityKey) setRequesting(false);
      }
    }
  };

  return (
    <div className="client-id-search-container">
      {selectedClientName && (
        <div className="client-id-linked-status">
          ✓ Linked Client: {selectedClientName}
        </div>
      )}
      {value && !disabled && !clientIdLocked ? (
        <button
          type="button"
          className="client-id-search-toggle"
          onClick={() => {
            autoMatchSuppressedKey.current = identityKey;
            notifiedRequestId.current = "";
            setSelectedClientName("");
            setClientIdRequest(null);
            setRequestError("");
            onClientIdRequestChange?.("");
            onChange("");
            setShowSearch(true);
          }}
        >
          Clear linked Client ID
        </button>
      ) : null}
      {!clientIdLocked ? (
        <button
          type="button"
          className="client-id-search-toggle"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: "#111827",
            textDecoration: "underline",
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
          }}
          onClick={() => setShowSearch(!showSearch)}
          disabled={disabled}
        >
          {showSearch ? "Hide client search" : "🔍 Search & Link Client Profile"}
        </button>
      ) : null}
      {showSearch && !clientIdLocked && (
        <div className="client-id-search-panel" style={{
          marginTop: "6px",
          padding: "8px",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
        }}>
          <input
            type="text"
            className="client-id-search-input"
            placeholder="Type name, phone or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "4px 8px",
              fontSize: "11.5px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              marginBottom: "4px",
              outline: "none",
              background: "#ffffff",
              color: "#000000"
            }}
          />
          {searching && <div style={{ fontSize: "10px", color: "#64748b" }}>Searching...</div>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>No matching clients found.</div>
          )}
          {results.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {results.map((profile) => (
                <li key={profile.id} style={{ margin: "4px 0" }}>
                  <button
                    type="button"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      fontSize: "11px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#1e293b",
                      display: "block",
                      overflow: "hidden",
                    }}
                    onClick={() => {
                      if (clientIdRequest?.id && clientIdRequest.status !== "COMPLETED") {
                        setRequestError(
                          "A Client ID request is already active. Resolve it from Client Management to keep every attached policy in sync.",
                        );
                        return;
                      }
                      autoMatchSuppressedKey.current = "";
                      onChange(profile.id);
                      notifiedRequestId.current = "";
                      onClientIdRequestChange?.("");
                      setSelectedClientName(profile.name);
                      setShowSearch(false);
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "11.5px",
                        lineHeight: "1.35",
                        marginBottom: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {profile.name}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: "2px",
                        fontSize: "10px",
                        lineHeight: "1.3",
                        color: "#64748b",
                        minWidth: 0,
                      }}
                    >
                      <span>Phone: {profile.phone || "No phone"}</span>
                      <span
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={profile.id}
                      >
                        Client ID: {profile.id}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!value &&
            !clientIdRequest &&
            onClientIdRequestChange &&
            requestLookupComplete &&
            autoMatchStatus === "no-match" && (
            <button
              type="button"
              onClick={handleClientIdRequest}
              disabled={disabled || requesting}
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "7px 9px",
                border: "1px solid #f59e0b",
                borderRadius: "6px",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: "10.5px",
                fontWeight: "700",
                cursor: requesting ? "wait" : "pointer",
              }}
            >
              {requesting ? "Sending request..." : "No match found — Request Client ID"}
            </button>
          )}
          {clientIdRequest && clientIdRequest.status !== "COMPLETED" && (
            <div role={clientIdRequest.status === "WAITING_DOCUMENTS" ? "alert" : "status"} aria-live="polite" style={{ marginTop: "8px", padding: "7px 9px", borderRadius: "6px", background: clientIdRequest.status === "WAITING_DOCUMENTS" ? "#fff1f2" : "#fffbeb", color: clientIdRequest.status === "WAITING_DOCUMENTS" ? "#9f1239" : "#92400e", fontSize: "10.5px", fontWeight: "650" }}>
              {clientIdRequest.status === "WAITING_DOCUMENTS" ? (
                <>
                  <strong>Client ID request needs correction.</strong>
                  {clientIdRequest.correctionNote ? ` ${clientIdRequest.correctionNote}` : ""}{" "}
                  <a href={`/operations/client-management?clientIdRequest=${clientIdRequest.id}`} style={{ color: "inherit", textDecoration: "underline" }}>
                    Review request
                  </a>
                </>
              ) : (
                "Client ID request sent to Super Admin. This field will fill automatically after approval."
              )}
            </div>
          )}
          {requestError && (
            <div role="alert" style={{ marginTop: "6px", color: "#be123c", fontSize: "10px" }}>{requestError}</div>
          )}
        </div>
      )}
    </div>
  );
}
