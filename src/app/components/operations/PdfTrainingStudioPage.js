"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Wand2,
  X,
  LoaderCircle,
} from "lucide-react";
import OperationsBackLink from "@/app/components/operations/OperationsBackLink";
import ModalPortal from "@/app/components/shared/ModalPortal";

const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Select or Upload PDF",
    hint: "Choose a Training policy or import from CRM Queue",
    target: { left: "documents", right: "trainer" },
  },
  {
    step: 2,
    title: "Map Policy Fields",
    hint: "Select a field and click its value directly on the PDF",
    target: { left: "documents", right: "trainer" },
  },
  {
    step: 3,
    title: "Test Unseen PDF",
    hint: "Run extraction against a held-out policy schedule",
    target: { left: "documents", right: "simulator" },
  },
  {
    step: 4,
    title: "Save & Sync to CRM",
    hint: "Publish verified rules to Bulk PDF Upload",
    target: { left: "documents", right: "benchmark" },
  },
];

function statusTone(status) {
  if (status === "confident") {
    return {
      pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
      label: "Confident",
    };
  }
  if (status === "review") {
    return {
      pill: "bg-amber-50 text-amber-800 border-amber-200",
      label: "Needs Review",
    };
  }
  return {
    pill: "bg-rose-50 text-rose-800 border-rose-200",
    label: "Missing",
  };
}

export default function PdfTrainingStudioPage() {
  const searchParams = useSearchParams();
  const focusUploadId = searchParams.get("uploadId") || "";

  const [overview, setOverview] = useState(null);
  const [types, setTypes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [runs, setRuns] = useState([]);
  const [crmQueue, setCrmQueue] = useState({ uploads: [], recentCorrections: [] });
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [banner, setBanner] = useState(null);

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [activeDoc, setActiveDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showWordBoxes, setShowWordBoxes] = useState(true);
  const [wordSearch, setWordSearch] = useState("");

  const [leftTab, setLeftTab] = useState(focusUploadId ? "crm-queue" : "documents");
  const [rightTab, setRightTab] = useState("trainer");
  const [uploadRole, setUploadRole] = useState("training");

  const [activeFieldId, setActiveFieldId] = useState("");
  const [selections, setSelections] = useState({});
  const [mappingPreviews, setMappingPreviews] = useState({});
  const [autoDetected, setAutoDetected] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [baseProfileId, setBaseProfileId] = useState("");
  const [removeFieldIds, setRemoveFieldIds] = useState([]);

  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [activeRun, setActiveRun] = useState(null);
  const [truthDraft, setTruthDraft] = useState({});

  const [showNewTypeModal, setShowNewTypeModal] = useState(false);
  const [newTypeForm, setNewTypeForm] = useState({ name: "", description: "", extraFields: "" });

  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [pdfRenderError, setPdfRenderError] = useState("");
  const [numRenderedPages, setNumRenderedPages] = useState(0);

  const showToast = useCallback((type, text) => {
    setBanner({ type, text, id: Date.now() });
  }, []);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, queueRes, tRes, dRes, pRes, rRes] = await Promise.all([
        fetch("/api/operations/pdf-training/status", { cache: "no-store" }),
        fetch("/api/operations/pdf-training/crm-queue", { cache: "no-store" }),
        fetch("/api/operations/pdf-training/types", { cache: "no-store" }),
        fetch("/api/operations/pdf-training/documents", { cache: "no-store" }),
        fetch("/api/operations/pdf-training/profiles", { cache: "no-store" }),
        fetch("/api/operations/pdf-training/runs", { cache: "no-store" }),
      ]);

      const [statusData, queueData, tData, dData, pData, rData] = await Promise.all([
        statusRes.ok ? statusRes.json() : null,
        queueRes.ok ? queueRes.json() : { uploads: [], recentCorrections: [] },
        tRes.ok ? tRes.json() : [],
        dRes.ok ? dRes.json() : [],
        pRes.ok ? pRes.json() : [],
        rRes.ok ? rRes.json() : [],
      ]);

      if (!statusRes.ok && statusData?.error) {
        showToast("error", statusData.error);
      }

      setOverview(statusData);
      setCrmQueue(queueData);
      setTypes(Array.isArray(tData) ? tData : []);
      setDocuments(Array.isArray(dData) ? dData : []);
      setProfiles(Array.isArray(pData) ? pData : []);
      setRuns(Array.isArray(rData) ? rData : []);

      setSelectedTypeId((prev) => prev || tData?.[0]?.id || "");
    } catch (err) {
      showToast("error", err?.message || "Failed to load PDF Training Studio data.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const currentType = useMemo(
    () => types.find((t) => t.id === selectedTypeId) || types[0] || null,
    [types, selectedTypeId],
  );

  const typeDocuments = useMemo(
    () => documents.filter((d) => !currentType || d.typeId === currentType.id),
    [documents, currentType],
  );

  const typeProfiles = useMemo(
    () => profiles.filter((p) => !currentType || p.typeId === currentType.id),
    [profiles, currentType],
  );

  useEffect(() => {
    if (!currentType) return;
    setProfileName((prev) => prev || `${currentType.name} Layout Profile`);
    const latestProfile = typeProfiles[0];
    setBaseProfileId(latestProfile?.id || "");
    setSelectedProfileId(latestProfile?.id || "");
    if (!typeDocuments.some((d) => d.id === selectedDocId)) {
      const preferred = typeDocuments.find((d) => d.role === "training") || typeDocuments[0];
      setSelectedDocId(preferred?.id || "");
    }
  }, [currentType, typeProfiles, typeDocuments, selectedDocId]);

  const runAutoDetect = useCallback(async (docObj, profileId) => {
    if (!docObj?.id || !docObj?.typeId) return;
    try {
      const res = await fetch("/api/operations/pdf-training/profiles/auto-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId: docObj.typeId,
          documentId: docObj.id,
          baseProfileId: profileId || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAutoDetected(data);
      }
    } catch {
      // Optional auto-detect preview
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSelectedDocument() {
      if (!selectedDocId) {
        setActiveDoc(null);
        return;
      }
      try {
        const res = await fetch(`/api/operations/pdf-training/documents/${encodeURIComponent(selectedDocId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const doc = await res.json();
        if (cancelled) return;
        setActiveDoc(doc);
        setCurrentPage(1);
        setSelections({});
        setMappingPreviews({});
        setRemoveFieldIds([]);
        setAutoDetected(null);
        runAutoDetect(doc, baseProfileId);
      } catch {
        if (!cancelled) setActiveDoc(null);
      }
    }
    loadSelectedDocument();
    return () => {
      cancelled = true;
    };
  }, [selectedDocId, baseProfileId, runAutoDetect]);

  useEffect(() => {
    let cancelled = false;
    async function loadPdfBinary() {
      setPdfRenderError("");
      setNumRenderedPages(0);
      if (!activeDoc?.id) {
        pdfDocRef.current = null;
        return;
      }
      try {
        const pdfjs = await import("pdfjs-dist/build/pdf.min.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loadingTask = pdfjs.getDocument(
          `/api/operations/pdf-training/documents/${encodeURIComponent(activeDoc.id)}/file`,
        );
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumRenderedPages(pdf.numPages || activeDoc.pages?.length || 1);
      } catch (err) {
        if (!cancelled) {
          setPdfRenderError(err?.message || "Unable to render PDF binary in canvas.");
        }
      }
    }
    loadPdfBinary();
    return () => {
      cancelled = true;
    };
  }, [activeDoc?.id, activeDoc?.pages?.length]);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      const pdf = pdfDocRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas || !numRenderedPages) return;
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore cancellation error
          }
        }
        const pageNo = Math.min(Math.max(1, currentPage), pdf.numPages);
        const page = await pdf.getPage(pageNo);
        if (cancelled) return;
        const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const viewport = page.getViewport({ scale: zoom * dpr });
        const cssViewport = page.getViewport({ scale: zoom });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err) {
        if (err?.name !== "RenderingCancelledException" && !cancelled) {
          setPdfRenderError(err?.message || "Page render error");
        }
      }
    }
    renderPage();
    return () => {
      cancelled = true;
    };
  }, [currentPage, zoom, numRenderedPages]);

  const activePageData = useMemo(() => {
    if (!activeDoc?.pages?.length) return null;
    return activeDoc.pages.find((p) => p.number === currentPage) || activeDoc.pages[currentPage - 1] || null;
  }, [activeDoc, currentPage]);

  const autoResultByField = useMemo(() => {
    const map = {};
    for (const r of autoDetected?.results || []) {
      map[r.fieldId] = r;
    }
    return map;
  }, [autoDetected]);

  const currentWorkflowStep = useMemo(() => {
    if (overview?.portableStore?.updatedAt && rightTab === "benchmark") return 4;
    if (rightTab === "simulator" || activeRun) return 3;
    if (activeDoc && (Object.keys(selections).length > 0 || activeFieldId || rightTab === "trainer")) return 2;
    return 1;
  }, [overview?.portableStore?.updatedAt, rightTab, activeRun, activeDoc, selections, activeFieldId]);

  const handleWordClick = async (word, event) => {
    if (!activeFieldId || !activeDoc) {
      showToast("info", "Select a field using 'Select in PDF' on the right panel first, then click its value in the PDF.");
      return;
    }
    if (activeDoc.role !== "training") {
      showToast("error", "Held-out test documents cannot be used for training. Switch to a Training role PDF.");
      return;
    }

    const existing = selections[activeFieldId];
    let nextWordIds = [word.id];

    if (event.shiftKey && existing && existing.page === currentPage && existing.wordIds?.length) {
      const anchorId = existing.wordIds[existing.wordIds.length - 1];
      const lo = Math.min(anchorId, word.id);
      const hi = Math.max(anchorId, word.id);
      const rangeIds = (activePageData?.words || [])
        .filter((w) => w.id >= lo && w.id <= hi)
        .map((w) => w.id);
      if (rangeIds.length && rangeIds.length <= 25) {
        nextWordIds = rangeIds;
      }
    } else if ((event.ctrlKey || event.metaKey) && existing && existing.page === currentPage) {
      const set = new Set(existing.wordIds || []);
      if (set.has(word.id)) set.delete(word.id);
      else set.add(word.id);
      nextWordIds = [...set].sort((a, b) => a - b);
    }

    if (!nextWordIds.length) return;
    const nextSel = { fieldId: activeFieldId, page: currentPage, wordIds: nextWordIds };
    setSelections((prev) => ({ ...prev, [activeFieldId]: nextSel }));
    setRemoveFieldIds((prev) => prev.filter((id) => id !== activeFieldId));

    try {
      const res = await fetch("/api/operations/pdf-training/mappings/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: activeDoc.id,
          fieldId: activeFieldId,
          page: currentPage,
          wordIds: nextWordIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data?.error || "Anchor preview failed.");
        return;
      }
      setMappingPreviews((prev) => ({ ...prev, [activeFieldId]: data }));
    } catch (err) {
      showToast("error", err?.message || "Preview request failed.");
    }
  };

  const handleUploadPdf = async (file) => {
    if (!file || !currentType) return;
    setBusyAction("upload");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("typeId", currentType.id);
      form.append("role", uploadRole);

      const res = await fetch("/api/operations/pdf-training/documents", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data?.error || "PDF upload failed.");
        return;
      }
      showToast("success", `"${data.name}" added to ${data.role} dataset.`);
      setSelectedDocId(data.id);
      setLeftTab("documents");
      await loadWorkspace();
    } catch (err) {
      showToast("error", err?.message || "PDF upload failed.");
    } finally {
      setBusyAction("");
    }
  };

  const handleImportCrmUpload = async (uploadItem, role) => {
    if (!currentType || !uploadItem?.id) return;
    setBusyAction(`import-${uploadItem.id}`);
    try {
      const res = await fetch("/api/operations/pdf-training/import-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedFileId: uploadItem.id,
          typeId: currentType.id,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data?.error || "CRM PDF import failed.");
        return;
      }
      showToast("success", `Imported "${uploadItem.sourceFile}" into the ${role} dataset.`);
      setSelectedDocId(data.id);
      setLeftTab("documents");
      await loadWorkspace();
    } catch (err) {
      showToast("error", err?.message || "Import failed.");
    } finally {
      setBusyAction("");
    }
  };

  const handleSaveProfile = async () => {
    if (!activeDoc || !currentType) return;
    const selectionList = Object.values(selections);
    const autoSelections = [];
    for (const r of autoDetected?.results || []) {
      if (
        r.status === "confident" &&
        r.wordIds?.length &&
        r.page &&
        !selections[r.fieldId] &&
        !removeFieldIds.includes(r.fieldId)
      ) {
        autoSelections.push({ fieldId: r.fieldId, page: r.page, wordIds: r.wordIds });
      }
    }
    if (!selectionList.length && !autoSelections.length && !baseProfileId) {
      showToast("error", "Map at least one field in the PDF or run Auto-Detect before saving.");
      return;
    }

    setBusyAction("save-profile");
    try {
      const res = await fetch("/api/operations/pdf-training/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId: currentType.id,
          documentId: activeDoc.id,
          name: profileName.trim() || `${currentType.name} Layout Profile`,
          baseProfileId: baseProfileId || null,
          selections: selectionList,
          autoSelections,
          removeFieldIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data?.error || "Profile save failed.");
        return;
      }
      showToast("success", `Saved "${data.name}" (v${data.version}). Proceed to Step 3 or Sync Rules to CRM.`);
      setBaseProfileId(data.id);
      setSelectedProfileId(data.id);
      await loadWorkspace();
    } catch (err) {
      showToast("error", err?.message || "Failed to save profile.");
    } finally {
      setBusyAction("");
    }
  };

  const handleRunHeldoutTest = async (docIdOverride = null) => {
    const profileId = selectedProfileId || typeProfiles[0]?.id;
    const targetDocId =
      docIdOverride ||
      (activeDoc?.role === "heldout" ? activeDoc.id : typeDocuments.find((d) => d.role === "heldout")?.id);

    if (!profileId || !targetDocId) {
      showToast("error", "At least one Saved Profile and one Held-Out Test PDF are required to run a test.");
      return;
    }
    setBusyAction("run-test");
    try {
      const res = await fetch("/api/operations/pdf-training/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, documentId: targetDocId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data?.error || "Test extraction run failed.");
        return;
      }
      setActiveRun(data);
      const initialTruth = {};
      for (const r of data.results || []) {
        initialTruth[r.fieldId] = r.value || "";
      }
      setTruthDraft(initialTruth);
      setRightTab("simulator");
      showToast("success", "Unseen held-out test completed. Verify the ground truth values below.");
      await loadWorkspace();
    } catch (err) {
      showToast("error", err?.message || "Test run failed.");
    } finally {
      setBusyAction("");
    }
  };

  const handleBatchRunAllHeldout = async () => {
    const profileId = selectedProfileId || typeProfiles[0]?.id;
    if (!profileId) {
      showToast("error", "Please select a saved profile first.");
      return;
    }
    setBusyAction("batch-run");
    try {
      const res = await fetch("/api/operations/pdf-training/runs/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data?.error || "Batch benchmark failed.");
        return;
      }
      showToast("success", `Batch benchmark completed across ${Array.isArray(data?.runs) ? data.runs.length : 0} held-out PDFs.`);
      setRightTab("benchmark");
      await loadWorkspace();
    } catch (err) {
      showToast("error", err?.message || "Batch benchmark failed.");
    } finally {
      setBusyAction("");
    }
  };

  const handleSaveTruthAndPromote = async (promote = false) => {
    if (!activeRun?.id) return;
    setBusyAction("review");
    try {
      const revRes = await fetch(`/api/operations/pdf-training/runs/${encodeURIComponent(activeRun.id)}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truth: truthDraft }),
      });
      const revData = await revRes.json();
      if (!revRes.ok) {
        showToast("error", revData?.error || "Ground truth save failed.");
        return;
      }
      setActiveRun(revData);

      if (promote) {
        const promRes = await fetch("/api/operations/pdf-training/profiles/from-corrections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: activeRun.id,
            allowPromoteHeldout: true,
          }),
        });
        const promData = await promRes.json();
        if (!promRes.ok) {
          showToast("error", promData?.error || "Could not promote corrections into profile.");
          return;
        }
        showToast("success", `Corrections promoted to "${promData.name}" (v${promData.version}).`);
      } else {
        showToast("success", "Ground truth saved and accuracy benchmark updated.");
      }
      await loadWorkspace();
    } catch (err) {
      showToast("error", err?.message || "Review save failed.");
    } finally {
      setBusyAction("");
    }
  };

  const handleSyncToCrm = async () => {
    setBusyAction("sync");
    try {
      const res = await fetch("/api/operations/pdf-training/sync-crm", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data?.error || "CRM sync failed.");
        return;
      }
      showToast(
        "success",
        `Synced ${data.profileCount} profiles and updated ${data.updatedDefinitions} CRM field definitions.`,
      );
      await loadWorkspace();
    } catch (err) {
      showToast("error", err?.message || "CRM sync failed.");
    } finally {
      setBusyAction("");
    }
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    if (!newTypeForm.name.trim()) return;
    setBusyAction("new-type");
    try {
      const extra = newTypeForm.extraFields
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label) => ({
          id: label.toLowerCase().replace(/[^a-z0-9]+/g, ""),
          label,
          kind: "text",
          required: false,
          aliases: [label],
        }));

      const templateFields = currentType?.fields?.length
        ? currentType.fields.filter((f) =>
            ["insuredName", "insuranceCompany", "policyNumber", "startDate", "expiryDate", "sumInsured", "netPremium", "totalPremium"].includes(f.id),
          )
        : [
            { id: "insuredName", label: "Insured Name", kind: "text", required: true, aliases: ["Insured Name", "Proposer Name"] },
            { id: "insuranceCompany", label: "Insurance Company", kind: "text", required: true, aliases: ["Insurance Company", "Insurer"] },
            { id: "policyNumber", label: "Policy Number", kind: "policy_number", required: true, aliases: ["Policy Number", "Policy No"] },
            { id: "startDate", label: "Start Date", kind: "date", required: true, aliases: ["From", "Start Date"] },
            { id: "expiryDate", label: "Expiry Date", kind: "date", required: true, aliases: ["To", "Expiry Date"] },
          ];

      const res = await fetch("/api/operations/pdf-training/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTypeForm.name.trim(),
          description: newTypeForm.description.trim() || "Custom trained insurance policy category",
          fields: [...templateFields, ...extra],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data?.error || "Could not create category.");
        return;
      }
      setShowNewTypeModal(false);
      setNewTypeForm({ name: "", description: "", extraFields: "" });
      setSelectedTypeId(data.id);
      showToast("success", `Category "${data.name}" created.`);
      await loadWorkspace();
    } catch (err) {
      showToast("error", err?.message || "Failed to create category.");
    } finally {
      setBusyAction("");
    }
  };

  const handleDeleteDoc = async (docId) => {
    setBusyAction(`del-${docId}`);
    try {
      const res = await fetch(`/api/operations/pdf-training/documents/${encodeURIComponent(docId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", data?.error || "Delete failed.");
        return;
      }
      if (selectedDocId === docId) setSelectedDocId("");
      showToast("success", "Document removed from Training Studio.");
      await loadWorkspace();
    } catch (err) {
      showToast("error", err?.message || "Delete failed.");
    } finally {
      setBusyAction("");
    }
  };

  const highlightedWordIds = useMemo(() => {
    const selectedSet = new Set();
    const autoSet = new Set();
    for (const sel of Object.values(selections)) {
      if (sel.page === currentPage) {
        (sel.wordIds || []).forEach((id) => selectedSet.add(id));
      }
    }
    for (const r of autoDetected?.results || []) {
      if (r.page === currentPage && !selections[r.fieldId] && !removeFieldIds.includes(r.fieldId)) {
        (r.wordIds || []).forEach((id) => autoSet.add(id));
      }
    }
    return { selectedSet, autoSet };
  }, [selections, autoDetected, currentPage, removeFieldIds]);

  const searchLower = wordSearch.trim().toLowerCase();

  return (
    <div className="operations-module-page pdf-studio-root space-y-5">
      {/* Unified BimaHeadquarter Operations Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <OperationsBackLink />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#1c6c39]">
                <span className="h-2 w-2 rounded-full bg-[#1c6c39]" />
                Built-in Training Engine Active
              </span>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-[#1c6c39]">
                <Sparkles size={22} />
              </span>
              <div>
                <h1 className="m-0 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                  PDF Training Studio
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Teach new insurance policy formats visually, verify on unseen schedules, and publish extraction rules to CRM without affecting Bulk Upload or Motor parsing.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={loadWorkspace}
                disabled={loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <a
                href="/api/operations/pdf-training/backup"
                download="bimaheadquarter-pdf-training-backup.json"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Download size={14} />
                <span>Backup JSON</span>
              </a>
            </div>

            <button
              type="button"
              onClick={handleSyncToCrm}
              disabled={busyAction === "sync"}
              className="studio-btn-primary inline-flex h-9 items-center gap-2 rounded-xl bg-[#1c6c39] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#16582e] disabled:opacity-60"
            >
              {busyAction === "sync" ? <LoaderCircle size={15} className="animate-spin" /> : <Database size={15} />}
              <span>Sync Rules to CRM</span>
            </button>
          </div>
        </div>

        {/* Guided 4-Step Training Workflow */}
        <div className="mt-5 grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          {WORKFLOW_STEPS.map((item) => {
            const isCurrent = currentWorkflowStep === item.step;
            const isDone = currentWorkflowStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  setLeftTab(item.target.left);
                  setRightTab(item.target.right);
                }}
                className={`studio-card-btn items-start gap-3 rounded-xl border p-3 transition-all ${
                  isCurrent
                    ? "border-[#1c6c39] bg-emerald-50/70 shadow-2xs"
                    : isDone
                      ? "border-emerald-200 bg-white hover:border-emerald-300"
                      : "border-slate-200 bg-slate-50/60 hover:bg-white"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                    isCurrent
                      ? "studio-step-active bg-[#1c6c39] text-white"
                      : isDone
                        ? "bg-emerald-100 text-[#1c6c39]"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {isDone ? <Check size={14} /> : item.step}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold leading-snug text-slate-900">{item.title}</div>
                  <div className="mt-0.5 text-xs leading-normal text-slate-600">{item.hint}</div>
                </div>
              </button>
            );
          })}
        </div>

        {banner ? (
          <div
            className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
              banner.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : banner.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-[#1c6c39]"
                  : "border-slate-200 bg-slate-50 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {banner.type === "error" ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
              <span>{banner.text}</span>
            </div>
            <button type="button" onClick={() => setBanner(null)} className="rounded p-1 opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ) : null}
      </div>

      {/* Main 3-Pane Workspace */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
        {/* LEFT PANE: Category, Studio Documents, Profiles & CRM Queue */}
        <section className="xl:col-span-3 flex flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLeftTab("documents")}
              className={`h-8 rounded-lg px-2 transition-colors ${
                leftTab === "documents" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Studio PDFs ({typeDocuments.length})
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("crm-queue")}
              className={`h-8 rounded-lg px-2 transition-colors ${
                leftTab === "crm-queue" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              CRM Queue ({crmQueue.uploads.length})
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="studio-section-label">Policy Category</span>
              <button
                type="button"
                onClick={() => setShowNewTypeModal(true)}
                className="studio-link-green inline-flex items-center"
              >
                <Plus size={13} /> New Category
              </button>
            </div>
            <select
              value={currentType?.id || ""}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="studio-select"
            >
              {types.length ? (
                types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.fields?.length || 0} fields)
                  </option>
                ))
              ) : (
                <option value="">Loading categories...</option>
              )}
            </select>
          </div>

          {leftTab === "documents" ? (
            <>
              <div className="space-y-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Dataset Upload</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                    {["training", "heldout"].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setUploadRole(role)}
                        className={`rounded-md px-2.5 py-1 text-xs font-bold capitalize transition-colors ${
                          uploadRole === role
                            ? "studio-pill-active bg-[#1c6c39] text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {role === "training" ? "Training" : "Held-Out"}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="studio-upload-label flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-bold text-[#1c6c39] shadow-2xs transition-colors hover:bg-emerald-50">
                  {busyAction === "upload" ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
                  <span>Upload {uploadRole === "training" ? "Training" : "Held-Out Test"} PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={busyAction === "upload"}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadPdf(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                {typeDocuments.map((doc) => {
                  const active = doc.id === selectedDocId;
                  return (
                    <div
                      key={doc.id}
                      className={`group flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-colors ${
                        active
                          ? "border-[#1c6c39] bg-emerald-50/70"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedDocId(doc.id)}
                        className="studio-doc-btn min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-sm font-bold text-slate-900">{doc.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                          <span
                            className={`rounded-md px-2 py-0.5 font-semibold capitalize ${
                              doc.role === "training"
                                ? "bg-emerald-100 text-[#1c6c39]"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {doc.role === "training" ? "Training" : "Held-Out"}
                          </span>
                          <span>
                            {doc.pageCount || 1} {doc.pageCount === 1 ? "page" : "pages"}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        {doc.role === "heldout" ? (
                          <button
                            type="button"
                            title="Run Unseen Test"
                            onClick={() => handleRunHeldoutTest(doc.id)}
                            className="rounded-lg p-1.5 text-[#1c6c39] hover:bg-emerald-100"
                          >
                            <Target size={15} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          title="Delete document"
                          onClick={() => handleDeleteDoc(doc.id)}
                          disabled={busyAction === `del-${doc.id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              {!typeDocuments.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-center text-xs leading-relaxed text-slate-500">
                  No new PDFs uploaded in this category yet. Upload a PDF above or import from CRM Queue.
                </div>
              ) : null}
              </div>

              <div className="border-t border-slate-100 pt-3">
                <div className="mb-2 text-xs font-bold text-slate-700">Saved Profiles ({typeProfiles.length})</div>
                <div className="max-h-[160px] space-y-2 overflow-y-auto pr-1">
                  {typeProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setBaseProfileId(p.id);
                        setSelectedProfileId(p.id);
                      }}
                      className={`studio-block-btn px-3 py-2 transition-colors ${
                        baseProfileId === p.id ? "is-selected" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-slate-900">{p.name}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          v{p.version}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {Object.keys(p.mappings || {}).length} fields mapped
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="max-h-[540px] space-y-2.5 overflow-y-auto pr-1">
              <p className="text-xs leading-relaxed text-slate-600">
                Import failed or review-required CRM policy uploads directly into Training Studio:
              </p>
              {crmQueue.uploads.map((u) => {
                const highlighted = focusUploadId && u.id === focusUploadId;
                return (
                  <div
                    key={u.id}
                    className={`rounded-xl border p-3 ${
                      highlighted ? "border-[#1c6c39] bg-emerald-50/70" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="break-words text-sm font-bold text-slate-900">{u.sourceFile}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        {u.status}
                      </span>
                      {u.detectedCompanyName ? <span>{u.detectedCompanyName}</span> : null}
                      {u.detectedServiceCategoryName ? <span>· {u.detectedServiceCategoryName}</span> : null}
                    </div>
                    {u.errorMessage ? (
                      <div className="mt-1.5 line-clamp-2 text-xs text-rose-700">{u.errorMessage}</div>
                    ) : null}
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        disabled={!u.hasFile || busyAction === `import-${u.id}`}
                        onClick={() => handleImportCrmUpload(u, "training")}
                        className="studio-btn-primary h-8 flex-1 rounded-lg bg-[#1c6c39] px-2.5 text-xs font-bold text-white hover:bg-[#16582e] disabled:opacity-50"
                      >
                        {busyAction === `import-${u.id}` ? "Importing..." : "Import for Training"}
                      </button>
                      <button
                        type="button"
                        disabled={!u.hasFile || busyAction === `import-${u.id}`}
                        onClick={() => handleImportCrmUpload(u, "heldout")}
                        className="h-8 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Add to Test
                      </button>
                    </div>
                  </div>
                );
              })}
              {!crmQueue.uploads.length ? (
                <p className="py-8 text-center text-sm text-slate-500">No pending failed or review-required uploads.</p>
              ) : null}
            </div>
          )}
        </section>

        {/* CENTER PANE: Interactive Word-Overlay PDF Canvas */}
        <section className="xl:col-span-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-slate-800">
                Page {currentPage} / {activeDoc?.pages?.length || numRenderedPages || 1}
              </span>
              <button
                type="button"
                disabled={currentPage >= (activeDoc?.pages?.length || numRenderedPages || 1)}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="search"
                  value={wordSearch}
                  onChange={(e) => setWordSearch(e.target.value)}
                  placeholder="Find text on page..."
                  className="studio-input-search h-8 rounded-lg border border-slate-200 text-slate-800 focus:border-[#1c6c39] focus:outline-none"
                />
              </div>
              <select
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="studio-select-compact h-8 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                <option value={0.85}>85%</option>
                <option value={1}>100%</option>
                <option value={1.25}>125%</option>
                <option value={1.5}>150%</option>
              </select>
              <button
                type="button"
                onClick={() => setShowWordBoxes((v) => !v)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold ${
                  showWordBoxes
                    ? "border-emerald-300 bg-emerald-50 text-[#1c6c39]"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <Eye size={14} />
                <span>Word Boxes</span>
              </button>
            </div>
          </div>

          {activeFieldId ? (
            <div className="studio-banner-active flex items-center justify-between rounded-xl bg-[#1c6c39] px-4 py-2.5 text-xs font-semibold text-white">
              <span>
                Mapping Active:{" "}
                <strong>{currentType?.fields?.find((f) => f.id === activeFieldId)?.label || activeFieldId}</strong> —
                Click the value word in the PDF (hold Shift to select a range)
              </span>
              <button type="button" onClick={() => setActiveFieldId("")} className="font-bold underline">
                Done
              </button>
            </div>
          ) : null}

          <div className="relative flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-3 min-h-[540px] max-h-[700px]">
            {activeDoc ? (
              <div className="relative mx-auto inline-block bg-white shadow">
                <canvas ref={canvasRef} className="block" />
                {pdfRenderError ? (
                  <div className="p-6 text-center text-sm text-rose-600">{pdfRenderError}</div>
                ) : null}

                {showWordBoxes && activePageData ? (
                  <div className="absolute inset-0">
                    {activePageData.words.map((word) => {
                      const [x0, y0, x1, y1] = word.box;
                      const left = `${(x0 / activePageData.width) * 100}%`;
                      const top = `${(y0 / activePageData.height) * 100}%`;
                      const width = `${Math.max(0.4, ((x1 - x0) / activePageData.width) * 100)}%`;
                      const height = `${Math.max(0.8, ((y1 - y0) / activePageData.height) * 100)}%`;
                      const isSel = highlightedWordIds.selectedSet.has(word.id);
                      const isAuto = highlightedWordIds.autoSet.has(word.id);
                      const isMatch = searchLower && word.text.toLowerCase().includes(searchLower);

                      let cls = "border-transparent hover:border-[#1c6c39] hover:bg-emerald-500/15";
                      if (isSel) cls = "border-[#1c6c39] bg-emerald-600/30 ring-1 ring-[#1c6c39]";
                      else if (isMatch) cls = "border-amber-500 bg-amber-400/35";
                      else if (isAuto) cls = "border-emerald-500/80 bg-emerald-400/20";

                      return (
                        <button
                          key={word.id}
                          type="button"
                          title={word.text}
                          onClick={(e) => handleWordClick(word, e)}
                          style={{ left, top, width, height }}
                          className={`studio-word-box absolute cursor-crosshair rounded-[2px] border transition ${cls}`}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full min-h-[440px] flex-col items-center justify-center p-6 text-center text-slate-500">
                <FileCheck2 size={44} className="mb-3 text-slate-300" />
                <p className="text-base font-bold text-slate-800">No Policy Document Selected</p>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600">
                  Choose a policy PDF from the left panel or import an uploaded schedule from the CRM Queue to begin mapping fields.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANE: Field Trainer, Unseen Test Simulator & Release Gate */}
        <section className="xl:col-span-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setRightTab("trainer")}
              className={`h-8 rounded-lg px-2 transition-colors ${
                rightTab === "trainer" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Field Trainer
            </button>
            <button
              type="button"
              onClick={() => setRightTab("simulator")}
              className={`h-8 rounded-lg px-2 transition-colors ${
                rightTab === "simulator" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unseen Test
            </button>
            <button
              type="button"
              onClick={() => setRightTab("benchmark")}
              className={`h-8 rounded-lg px-2 transition-colors ${
                rightTab === "benchmark" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Accuracy Gate
            </button>
          </div>

          {rightTab === "trainer" ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-medium text-slate-600">
                  {autoDetected?.crmMatched ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[#1c6c39]">
                      <CheckCircle2 size={13} /> CRM Rule Active:{" "}
                      {typeof autoDetected.scope === "object" && autoDetected.scope !== null
                        ? [autoDetected.scope.category, autoDetected.scope.insurer].filter(Boolean).join(" / ") ||
                          "matched"
                        : autoDetected.scope || "matched"}
                    </span>
                  ) : (
                    <span>Click any field below and select its value in the PDF</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!activeDoc}
                  onClick={() => runAutoDetect(activeDoc, baseProfileId)}
                  className="studio-btn-soft inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Wand2 size={13} /> Auto-Detect
                </button>
              </div>

              <div className="max-h-[540px] space-y-3.5 overflow-y-auto pr-1">
                {(() => {
                  const allFields = currentType?.fields || [];
                  const coreIds = new Set([
                    "insuredName",
                    "insuranceCompany",
                    "policyNumber",
                    "policyType",
                    "policyCoverType",
                    "newOrRenewal",
                    "startDate",
                    "expiryDate",
                    "duration",
                    "invoiceDate",
                    "gstin",
                  ]);
                  const financeIds = new Set([
                    "sumInsured",
                    "idv",
                    "netPremium",
                    "odPremium",
                    "tpPremium",
                    "tpDriverOwner",
                    "grossPremium",
                    "totalPremium",
                    "ncb",
                  ]);
                  const sections = [
                    { title: "Core Policy Details", fields: allFields.filter((f) => coreIds.has(f.id)) },
                    { title: "Financials & Sum Insured", fields: allFields.filter((f) => financeIds.has(f.id)) },
                    {
                      title: "Asset, Location & Risk Details",
                      fields: allFields.filter((f) => !coreIds.has(f.id) && !financeIds.has(f.id)),
                    },
                  ].filter((s) => s.fields.length > 0);

                  return sections.map((section) => (
                    <fieldset key={section.title} className="preview-fieldset">
                      <legend className="preview-legend">{section.title}</legend>
                      <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
                        {section.fields.map((field) => {
                          const manualPreview = mappingPreviews[field.id];
                          const auto = autoResultByField[field.id];
                          const isActive = activeFieldId === field.id;
                          const removed = removeFieldIds.includes(field.id);
                          const rawOverride = selections[field.id]?.valueOverride;
                          const displayValue =
                            rawOverride !== undefined
                              ? rawOverride
                              : manualPreview?.example || (!removed ? auto?.value : "") || "";
                          const anchorText = manualPreview?.anchor || auto?.anchor || "";
                          const isWideField =
                            /name|company|address|location|description|occupancy|makeModel|variant|remarks/i.test(
                              field.id,
                            ) || String(displayValue).length > 28;

                          return (
                            <div
                              key={field.id}
                              className={isWideField ? "min-w-0 sm:col-span-2" : "min-w-0"}
                              title={
                                anchorText
                                  ? `Anchor: ${anchorText}${manualPreview?.relation ? ` (${manualPreview.relation})` : ""}`
                                  : `Click input then click value in PDF to map ${field.label}`
                              }
                            >
                              <label htmlFor={`studio-field-${field.id}`} className="studio-field-label">
                                <span className="truncate">
                                  {field.label}
                                  {field.required ? <span className="ml-0.5 text-rose-500">*</span> : null}
                                </span>
                                {isActive ? (
                                  <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-[#1c6c39]">
                                    Picking
                                  </span>
                                ) : null}
                              </label>

                              <div className="relative">
                                <input
                                  id={`studio-field-${field.id}`}
                                  type="text"
                                  value={displayValue}
                                  placeholder={isActive ? "Click value in PDF..." : ""}
                                  onFocus={() => {
                                    if (activeDoc?.role === "training") setActiveFieldId(field.id);
                                  }}
                                  onChange={(e) => {
                                    const nextVal = e.target.value;
                                    if (!nextVal) {
                                      setSelections((prev) => {
                                        const copy = { ...prev };
                                        delete copy[field.id];
                                        return copy;
                                      });
                                      setMappingPreviews((prev) => {
                                        const copy = { ...prev };
                                        delete copy[field.id];
                                        return copy;
                                      });
                                      setRemoveFieldIds((prev) => [...new Set([...prev, field.id])]);
                                      return;
                                    }
                                    setRemoveFieldIds((prev) => prev.filter((id) => id !== field.id));
                                    setSelections((prev) => {
                                      const existing = prev[field.id];
                                      if (existing) {
                                        return { ...prev, [field.id]: { ...existing, valueOverride: nextVal } };
                                      }
                                      if (auto?.wordIds?.length && auto?.page) {
                                        return {
                                          ...prev,
                                          [field.id]: {
                                            fieldId: field.id,
                                            page: auto.page,
                                            wordIds: auto.wordIds,
                                            valueOverride: nextVal,
                                          },
                                        };
                                      }
                                      return prev;
                                    });
                                  }}
                                  className={`studio-form-input w-full ${isActive ? "studio-form-input-active" : ""}`}
                                />
                                {isActive ? (
                                  <button
                                    type="button"
                                    title="Done mapping"
                                    onClick={() => setActiveFieldId("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1c6c39] hover:opacity-75"
                                  >
                                    <Check size={14} />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  ));
                })()}
              </div>

              <div className="space-y-2.5 border-t border-slate-100 pt-3">
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Profile Name (e.g. ICICI Warehouse Profile)"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-900 focus:border-[#1c6c39] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!activeDoc || activeDoc.role !== "training" || busyAction === "save-profile"}
                  onClick={handleSaveProfile}
                  className="studio-btn-primary flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1c6c39] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#16582e] disabled:opacity-50"
                >
                  {busyAction === "save-profile" ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <FilePlus2 size={16} />
                  )}
                  <span>Save Profile Version</span>
                </button>
              </div>
            </>
          ) : null}

          {rightTab === "simulator" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Saved Profile to Test</label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                >
                  {typeProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (v{p.version})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunHeldoutTest()}
                    disabled={busyAction === "run-test"}
                    className="studio-btn-primary h-9 flex-1 rounded-xl bg-[#1c6c39] px-3 text-xs font-bold text-white hover:bg-[#16582e] disabled:opacity-50"
                  >
                    {busyAction === "run-test" ? "Running..." : "Test Selected Held-Out"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchRunAllHeldout}
                    disabled={busyAction === "batch-run"}
                    className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Batch All
                  </button>
                </div>
              </div>

              {activeRun ? (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-700">
                    Review & Verify Ground Truth ({activeRun.results?.length || 0} fields)
                  </div>
                  <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {(activeRun.results || []).map((r) => (
                      <div key={r.fieldId} className="space-y-1.5 rounded-xl border border-slate-200 p-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>{r.label}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${statusTone(r.status).pill}`}>
                            {Math.round((r.score || 0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="text"
                          value={truthDraft[r.fieldId] ?? ""}
                          onChange={(e) => setTruthDraft((prev) => ({ ...prev, [r.fieldId]: e.target.value }))}
                          placeholder="Expected exact value..."
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyAction === "review"}
                      onClick={() => handleSaveTruthAndPromote(false)}
                      className="h-9 flex-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Save Ground Truth
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === "review"}
                      onClick={() => handleSaveTruthAndPromote(true)}
                      className="studio-btn-primary h-9 flex-1 rounded-xl bg-[#1c6c39] px-3 text-xs font-bold text-white hover:bg-[#16582e]"
                    >
                      Save & Promote
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">
                  Run a held-out test above or open a recent run to review extracted values:
                  <div className="mt-3 space-y-1.5 text-left">
                    {runs.slice(0, 5).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setActiveRun(r);
                          const init = {};
                          for (const item of r.results || []) {
                            init[item.fieldId] = (r.truth && r.truth[item.fieldId]) ?? item.value ?? "";
                          }
                          setTruthDraft(init);
                        }}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Run {r.id.slice(0, 8)} · {r.reviewedAt ? "Reviewed" : "Pending review"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {rightTab === "benchmark" ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600">
                <div className="text-sm font-bold text-slate-900">95% Accuracy Release Gate</div>
                <p className="mt-1">
                  Exact-match accuracy is measured exclusively across unseen held-out policy PDFs. Training documents are excluded from benchmark scores.
                </p>
              </div>
              <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                {(overview?.metrics?.benchmarks || []).map((b) => (
                  <div key={`${b.profileId}-${b.schema}`} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {b.profileName} (v{b.version})
                        </div>
                        <div className="mt-0.5 text-xs text-slate-600">
                          {b.typeName} · {b.documents} held-out PDFs · {b.correct}/{b.total} fields
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          b.ready ? "bg-emerald-100 text-[#1c6c39]" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {b.accuracy ?? 0}% {b.ready ? "READY" : ""}
                      </span>
                    </div>
                  </div>
                ))}
                {!(overview?.metrics?.benchmarks || []).length ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No reviewed held-out benchmark runs yet. Run a test in Step 3 to evaluate accuracy.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {showNewTypeModal ? (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <form
              onSubmit={handleCreateCategory}
              className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="m-0 text-base font-black text-slate-900">New Policy Category</h3>
                <button
                  type="button"
                  onClick={() => setShowNewTypeModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Category Name</label>
                  <input
                    required
                    value={newTypeForm.name}
                    onChange={(e) => setNewTypeForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Burglary Insurance"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Description</label>
                  <input
                    value={newTypeForm.description}
                    onChange={(e) => setNewTypeForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Optional short note"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Extra Custom Fields (comma separated)
                  </label>
                  <input
                    value={newTypeForm.extraFields}
                    onChange={(e) => setNewTypeForm((p) => ({ ...p, extraFields: e.target.value }))}
                    placeholder="e.g. Risk Location, Occupancy, Hypothecation"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTypeModal(false)}
                  className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyAction === "new-type"}
                  className="studio-btn-primary h-9 rounded-xl bg-[#1c6c39] px-4 text-xs font-bold text-white hover:bg-[#16582e]"
                >
                  {busyAction === "new-type" ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}
