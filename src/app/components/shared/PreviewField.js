import { useEffect, useRef, useState } from "react";
import {
  findPhoneIdentityCandidates,
  normalizeClientCode,
} from "@/lib/client-accounts/utils";
import { normalizeContactNumber } from "@/lib/records/validation";

function formatDisplayValue(val) {
  if (val === undefined || val === null) return "-";
  if (typeof val === "object") {
    if (Array.isArray(val)) {
      if (val.length === 0) return "-";
      return val.map((item) => formatDisplayValue(item)).join(", ");
    }
    return val.name || val.insuredName || val.label || JSON.stringify(val);
  }
  return String(val);
}

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
  const isRequired = meta === "Required";
  const isEmptyRequired = isRequired && !String(value || "").trim();

  const labelEl = (
    <span>
      {label}
      {meta && !isRequired ? <em className={metaClass}>{meta}</em> : null}
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

  const classes = [
    wide ? "wide" : "",
    error ? "has-error" : "",
    isEmptyRequired ? "is-required-empty" : "",
    disabled ? "is-disabled" : "",
  ]
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
      {isContactNumber && /[xX*•]/.test(String(value || "")) ? (
        <div
          style={{
            marginTop: "6px",
            padding: "6px 10px",
            borderRadius: "6px",
            backgroundColor: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#c2410c",
            fontSize: "11px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "13px" }}>⚠️</span>
          <span>
            Masked from PDF. Enter real 10-digit number to enable Mobile App access.
          </span>
        </div>
      ) : null}
      {isContactNumber && /^[6-9]\d{9}$/.test(String(value || "").replace(/\D/g, "")) && !/[xX*•]/.test(String(value || "")) ? (
        <div
          style={{
            marginTop: "4px",
            padding: "3px 8px",
            borderRadius: "4px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            fontSize: "10.5px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>✓ Ready for Mobile App & Portal</span>
        </div>
      ) : null}
      {hasSuggestion ? (
        <div className="ai-suggestion-card">
          <div>
            <strong>Suggested value</strong>
            <span>{formatDisplayValue(suggestion.suggestedValue)}</span>
          </div>
          <div>
            <strong>Current value</strong>
            <span>{formatDisplayValue(value)}</span>
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
  const [selectedClientCode, setSelectedClientCode] = useState("");
  const [clientIdRequest, setClientIdRequest] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [quickCreateMessage, setQuickCreateMessage] = useState("");
  const [requestLookupComplete, setRequestLookupComplete] = useState(false);
  const [autoMatchStatus, setAutoMatchStatus] = useState("idle");
  const [candidateProfiles, setCandidateProfiles] = useState([]);
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
    setRequestLookupComplete(false);
    setAutoMatchStatus("idle");
    setCandidateProfiles([]);
    setRequesting(false);
    setCreatingClient(false);
    setRequestError("");
    setQuickCreateMessage("");
    setQuery("");
    setResults([]);
    if (!value) {
      notifiedRequestId.current = "";
      setSelectedClientName("");
      setSelectedClientCode("");
      setClientIdRequest(null);
      onClientIdRequestChange?.("");
    }
  }, [identityKey, onClientIdRequestChange, value]);

  useEffect(() => {
    const cleanValue = String(value || "").trim();
    const isLookupId =
      cleanValue.length === 36 || Boolean(normalizeClientCode(cleanValue));
    if (isLookupId) {
      const controller = new window.AbortController();
      fetch(`/api/client-accounts/${encodeURIComponent(cleanValue)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.name) {
            setSelectedClientName(data.name);
            setSelectedClientCode(data.clientCode || "");
          }
        })
        .catch(() => { });
      return () => controller.abort();
    }
    setSelectedClientName("");
    setSelectedClientCode("");
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
        const matchOutcome = findPhoneIdentityCandidates(
          [...candidates.values()],
          { insuredName, contactNumber, email },
        );
        if (!active || controller.signal.aborted || identityKeyRef.current !== lookupIdentityKey) return;
        if (matchOutcome.status === "EXACT_MATCH" && matchOutcome.exactMatch) {
          setAutoMatchStatus("matched");
          setCandidateProfiles([]);
          autoMatchSuppressedKey.current = "";
          notifiedRequestId.current = "";
          onClientIdRequestChange?.("");
          setSelectedClientName(matchOutcome.exactMatch.name);
          setSelectedClientCode(matchOutcome.exactMatch.clientCode || "");
          onChange(matchOutcome.exactMatch.id);
        } else if (matchOutcome.status === "AMBIGUOUS_EXACT_MATCH") {
          setAutoMatchStatus("ambiguous");
          setCandidateProfiles(matchOutcome.candidates || []);
          setRequestError("Multiple Client IDs match this contact. Select the right profile below.");
        } else if (matchOutcome.status === "PROBABLE_MATCH") {
          setAutoMatchStatus("probable");
          setCandidateProfiles(matchOutcome.candidates || []);
        } else if (matchOutcome.status === "PHONE_CONFLICT") {
          setAutoMatchStatus("conflict");
          setCandidateProfiles(matchOutcome.conflicts || []);
        } else if (lookupFailed) {
          setAutoMatchStatus("error");
          setCandidateProfiles([]);
          setRequestError("Existing Client IDs could not be checked. Try again before creating a new one.");
        } else {
          setAutoMatchStatus("no-match");
          setCandidateProfiles([]);
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

  const selectMatchedProfile = (profile) => {
    setRequestError("");
    setQuickCreateMessage("");
    autoMatchSuppressedKey.current = "";
    onChange(profile.id);
    notifiedRequestId.current = "";
    onClientIdRequestChange?.("");
    setClientIdRequest(null);
    setSelectedClientName(profile.name || "");
    setSelectedClientCode(profile.clientCode || "");
    setAutoMatchStatus("matched");
    setCandidateProfiles([]);
    setShowSearch(false);
    setQuery("");
    setResults([]);
  };

  const handleQuickCreateClientId = async () => {
    const cleanPhone = String(contactNumber || "").replace(/[^0-9]/g, "").slice(-10);
    if (!insuredName?.trim() || cleanPhone.length !== 10) {
      setRequestError("Enter Insured Name and a valid 10-digit mobile number before creating a Client ID.");
      return;
    }
    const requestIdentityKey = identityKey;
    setRequestError("");
    setQuickCreateMessage("");
    setCreatingClient(true);
    try {
      const res = await fetch("/api/client-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: insuredName.trim(),
          phone: cleanPhone,
          email: email || "",
        }),
      });
      const data = await res.json();
      if (identityKeyRef.current !== requestIdentityKey) return;

      if (res.ok && data?.id) {
        selectMatchedProfile(data);
        setQuickCreateMessage(
          `Created & linked ${data.clientCode || "Client ID"}${data.temporaryMpin ? ` · Temp MPIN: ${data.temporaryMpin}` : ""}`,
        );
        return;
      }

      if (res.status === 409 && data?.existingMatch?.id) {
        selectMatchedProfile(data.existingMatch);
        setQuickCreateMessage(`Matched existing Client ID ${data.existingMatch.clientCode || data.existingMatch.name}`);
        return;
      }

      if (res.status === 409 && Array.isArray(data?.conflicts) && data.conflicts.length > 0) {
        setAutoMatchStatus("conflict");
        setCandidateProfiles(data.conflicts);
        setRequestError(data.error || "Phone already belongs to another profile. Link an existing client or ask Super Admin.");
        return;
      }

      throw new Error(data.error || "Could not create Client ID.");
    } catch (err) {
      if (identityKeyRef.current === requestIdentityKey) {
        setRequestError(err.message || "Could not create Client ID.");
      }
    } finally {
      if (identityKeyRef.current === requestIdentityKey) {
        setCreatingClient(false);
      }
    }
  };

  const handleClientIdRequest = async () => {
    if (!requestLookupComplete || !["no-match", "conflict", "probable", "ambiguous"].includes(autoMatchStatus)) return;
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
        selectMatchedProfile(data.profile);
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
        <div className="client-id-linked-status" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span>✓ Linked: {selectedClientName}</span>
          {selectedClientCode ? (
            <span style={{ padding: "1px 6px", borderRadius: "999px", background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontSize: "10px", fontFamily: "monospace", fontWeight: 800 }}>
              {selectedClientCode}
            </span>
          ) : null}
        </div>
      )}
      {quickCreateMessage && (
        <div role="status" style={{ marginTop: "4px", padding: "5px 8px", borderRadius: "6px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: "10.5px", fontWeight: 700 }}>
          {quickCreateMessage}
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
            setSelectedClientCode("");
            setQuickCreateMessage("");
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
      {!value && !clientIdLocked && autoMatchStatus === "checking" && (
        <div style={{ marginTop: "6px", fontSize: "10.5px", color: "#475569", fontWeight: 600 }}>
          Checking existing Client IDs for {insuredName || "client"}…
        </div>
      )}
      {!value && !clientIdLocked && !clientIdRequest && ["probable", "conflict", "ambiguous"].includes(autoMatchStatus) && candidateProfiles.length > 0 && (
        <div
          style={{
            marginTop: "6px",
            padding: "8px",
            borderRadius: "8px",
            border: autoMatchStatus === "conflict" ? "1px solid #f59e0b" : "1px solid #38bdf8",
            background: autoMatchStatus === "conflict" ? "#fffbeb" : "#f0f9ff",
          }}
        >
          <div style={{ fontSize: "10.5px", fontWeight: 700, color: autoMatchStatus === "conflict" ? "#92400e" : "#0369a1", marginBottom: "6px" }}>
            {autoMatchStatus === "conflict"
              ? "Same mobile number belongs to another client — link existing or request Super Admin shared-phone Client ID:"
              : "Possible existing client profile found — click to link:"}
          </div>
          <div style={{ display: "grid", gap: "4px" }}>
            {candidateProfiles.slice(0, 3).map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                disabled={disabled}
                onClick={() => selectMatchedProfile(candidate)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  cursor: "pointer",
                  fontSize: "11px",
                  color: "#0f172a",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                  <span>{candidate.name}</span>
                  <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#047857" }}>
                    {candidate.clientCode || "Link"}
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "#64748b" }}>
                  {candidate.phone}{candidate.email ? ` · ${candidate.email}` : ""}
                </div>
              </button>
            ))}
          </div>
          {onClientIdRequestChange && (
            <button
              type="button"
              onClick={handleClientIdRequest}
              disabled={disabled || requesting}
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "6px 8px",
                borderRadius: "6px",
                border: "1px solid #d97706",
                background: "#ffffff",
                color: "#92400e",
                fontSize: "10.5px",
                fontWeight: 700,
                cursor: requesting ? "wait" : "pointer",
              }}
            >
              {requesting ? "Sending request..." : "Request Super Admin Approval (Shared Phone)"}
            </button>
          )}
        </div>
      )}
      {!value &&
        !clientIdLocked &&
        !clientIdRequest &&
        requestLookupComplete &&
        autoMatchStatus === "no-match" && (
          <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleQuickCreateClientId}
              disabled={disabled || creatingClient}
              style={{
                flex: "1 1 150px",
                padding: "7px 9px",
                border: "1px solid #059669",
                borderRadius: "6px",
                background: "#ecfdf5",
                color: "#065f46",
                fontSize: "10.5px",
                fontWeight: 800,
                cursor: creatingClient ? "wait" : "pointer",
              }}
            >
              {creatingClient ? "Creating Client ID..." : "+ Create & Link Client ID"}
            </button>
            {onClientIdRequestChange && (
              <button
                type="button"
                onClick={handleClientIdRequest}
                disabled={disabled || requesting}
                style={{
                  padding: "7px 9px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  background: "#ffffff",
                  color: "#475569",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: requesting ? "wait" : "pointer",
                }}
              >
                {requesting ? "Sending..." : "Ask Admin"}
              </button>
            )}
          </div>
        )}
      {!value && clientIdRequest && clientIdRequest.status !== "COMPLETED" && (
        <div role={clientIdRequest.status === "WAITING_DOCUMENTS" ? "alert" : "status"} aria-live="polite" style={{ marginTop: "8px", padding: "7px 9px", borderRadius: "6px", background: clientIdRequest.status === "WAITING_DOCUMENTS" ? "#fff1f2" : "#fffbeb", color: clientIdRequest.status === "WAITING_DOCUMENTS" ? "#9f1239" : "#92400e", border: clientIdRequest.status === "WAITING_DOCUMENTS" ? "1px solid #fecdd3" : "1px solid #fde68a", fontSize: "10.5px", fontWeight: "650" }}>
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
        <div role="alert" style={{ marginTop: "6px", color: "#be123c", fontSize: "10.5px", fontWeight: 600 }}>{requestError}</div>
      )}
      {!clientIdLocked ? (
        <button
          type="button"
          className="client-id-search-toggle"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            marginTop: "6px",
            color: "#111827",
            textDecoration: "underline",
            fontSize: "11px",
            fontWeight: "600",
            cursor: "pointer",
          }}
          onClick={() => setShowSearch(!showSearch)}
          disabled={disabled}
        >
          {showSearch ? "Hide client search" : "🔍 Search & Link Different Client"}
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
            placeholder="Type Client Code (BHQ-...), name, phone or email..."
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
                    onClick={() => selectMatchedProfile(profile)}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "11.5px",
                        lineHeight: "1.35",
                        marginBottom: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "6px",
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</span>
                      {profile.clientCode ? (
                        <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#047857", shrink: 0 }}>{profile.clientCode}</span>
                      ) : null}
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
                        ID: {profile.clientCode || profile.id}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
