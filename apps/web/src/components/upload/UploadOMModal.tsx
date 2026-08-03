/**
 * UploadOMModal — Offering Memorandum Upload & Analysis
 *
 * Allows the user to upload a PDF offering memorandum (or any property
 * investment document). The file is base64-encoded client-side and sent
 * to the backend where Claude extracts the subject property address AND
 * any competitor properties mentioned in the document — all in one LLM call.
 * Addresses are then geocoded via Mapbox.
 *
 * States:
 *  idle       — drag-and-drop zone
 *  analysing  — spinner while Claude + Mapbox work
 *  result     — editable address fields + competitor list + "Plot on Map" / "Cancel"
 *  error      — error message + retry
 *
 * On success: calls onPlot({ lng, lat, address }) and sets competitorPins in
 * UIStore. The parent is responsible for storing the previewPin result.
 */

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, MapPin, RotateCcw, FileText, Loader2 } from "lucide-react";
import { trpc } from "@/api/trpc";
import { useUIStore } from "@/store/useUIStore";
import type { CompetitorPin } from "@/store/useUIStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlotResult {
  lng: number;
  lat: number;
  address: string;
}

interface ExtractedFields {
  address: string;
  city: string;
  state: string;
  zip: string;
  full_address: string;
}

interface ExtractedCompetitor {
  name: string;
  address: string | null;
}

interface GeocodedCompetitor extends ExtractedCompetitor {
  lng: number | null;
  lat: number | null;
}

type ModalState = "idle" | "analysing" | "result" | "error";

interface Props {
  onPlot: (result: PlotResult) => void;
  onClose: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── Component ─────────────────────────────────────────────────────────────────

export function UploadOMModal({ onPlot, onClose }: Props) {
  const [modalState, setModalState] = useState<ModalState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedFields, setExtractedFields] = useState<ExtractedFields | null>(null);
  const [fileName, setFileName] = useState("");
  const [geocoded, setGeocoded] = useState<{ lng: number; lat: number } | null>(null);
  const [competitors, setCompetitors] = useState<GeocodedCompetitor[]>([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);

  const { setCompetitorPins } = useUIStore();

  // ── tRPC mutations ──────────────────────────────────────────────────────────

  const analyzeMutation = trpc.document.analyzeDocument.useMutation();
  const geocodeMutation = trpc.document.geocodeAddress.useMutation();

  // ── File → base64 helper ────────────────────────────────────────────────────

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        if (!base64) {
          reject(new Error("Failed to encode file"));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // ── File processing ──────────────────────────────────────────────────────────

  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setErrorMessage("Only PDF files are supported.");
        setModalState("error");
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(
          `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE_MB} MB.`
        );
        setModalState("error");
        return;
      }

      setFileName(file.name);
      setModalState("analysing");

      let base64: string;
      try {
        base64 = await fileToBase64(file);
      } catch {
        setErrorMessage("Failed to read file. Please try again.");
        setModalState("error");
        return;
      }

      // Step 1: Claude extracts subject address + competitors in one call.
      let extracted: ExtractedFields;
      let rawCompetitors: ExtractedCompetitor[] = [];
      try {
        const result = await analyzeMutation.mutateAsync({
          fileBase64: base64,
          fileName: file.name,
        });
        const { competitors: comp, ...subjectFields } = result;
        extracted = subjectFields;
        rawCompetitors = comp ?? [];
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to analyse document.";
        setErrorMessage(message);
        setModalState("error");
        return;
      }

      // Step 2: Geocode subject address.
      let coords: { lng: number; lat: number };
      try {
        const geo = await geocodeMutation.mutateAsync({
          full_address: extracted.full_address,
        });
        coords = { lng: geo.lng, lat: geo.lat };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Could not geocode address.";
        setExtractedFields(extracted);
        setGeocoded(null);
        setErrorMessage(message);
        setModalState("result");
        return;
      }

      setExtractedFields(extracted);
      setGeocoded(coords);
      setModalState("result");

      // Step 3: Geocode competitors in parallel (non-blocking — result panel is
      // already shown, competitors section updates reactively as they resolve).
      if (rawCompetitors.length > 0) {
        setCompetitorsLoading(true);
        const settled = await Promise.allSettled(
          rawCompetitors.map(async (c) => {
            if (!c.address) return { ...c, lng: null, lat: null };
            try {
              const geo = await geocodeMutation.mutateAsync({ full_address: c.address });
              return { ...c, lng: geo.lng, lat: geo.lat };
            } catch {
              return { ...c, lng: null, lat: null };
            }
          })
        );
        const geocodedCompetitors = settled.map((r) =>
          r.status === "fulfilled" ? r.value : { name: "", address: null, lng: null, lat: null }
        );
        setCompetitors(geocodedCompetitors);
        setCompetitorsLoading(false);
      }
    },
    [analyzeMutation, geocodeMutation]
  );

  // ── Dropzone ──────────────────────────────────────────────────────────────

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      if (accepted[0]) processFile(accepted[0]);
    },
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: modalState === "analysing",
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePlot = () => {
    if (!extractedFields || !geocoded) return;

    // Set competitor pins in UIStore so CompetitorPinsLayer renders them.
    const plottable: CompetitorPin[] = competitors
      .filter((c) => c.lng !== null && c.lat !== null && c.address)
      .map((c) => ({
        name: c.name,
        address: c.address!,
        longitude: c.lng!,
        latitude: c.lat!,
      }));
    setCompetitorPins(plottable);

    onPlot({
      lng: geocoded.lng,
      lat: geocoded.lat,
      address: extractedFields.full_address,
    });
    onClose();
  };

  const handleClose = () => {
    setCompetitorPins([]);
    onClose();
  };

  const handleRetry = () => {
    setModalState("idle");
    setErrorMessage("");
    setExtractedFields(null);
    setGeocoded(null);
    setCompetitors([]);
    setFileName("");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-md mx-4 bg-land-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-land-accent" />
            <h2 className="text-sm font-semibold text-land-text">Upload Offering Memorandum</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-land-muted hover:text-land-text transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* ── Idle: drop zone ── */}
          {modalState === "idle" && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-land-accent bg-land-accent/10"
                  : "border-white/20 hover:border-land-accent/60 hover:bg-white/5"
              }`}
            >
              <input {...getInputProps()} />
              <Upload
                size={32}
                className={`mx-auto mb-3 ${isDragActive ? "text-land-accent" : "text-land-muted"}`}
              />
              <p className="text-sm font-medium text-land-text">
                {isDragActive ? "Drop the PDF here" : "Drag & drop your OM here"}
              </p>
              <p className="text-xs text-land-muted mt-1">or click to browse</p>
              <p className="text-xs text-land-muted mt-3 opacity-60">
                PDF only · max {MAX_FILE_SIZE_MB} MB
              </p>
            </div>
          )}

          {/* ── Analysing: spinner ── */}
          {modalState === "analysing" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 size={32} className="text-land-accent animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-land-text">Analysing document…</p>
                <p className="text-xs text-land-muted mt-1">{fileName}</p>
              </div>
            </div>
          )}

          {/* ── Result: editable address fields + competitors ── */}
          {modalState === "result" && extractedFields && (
            <div className="space-y-4">
              {/* AI badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <MapPin size={13} className="text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-emerald-400 font-medium">Address found via AI</span>
              </div>

              {/* Editable fields */}
              <div className="space-y-3">
                <AddressField
                  label="Street address"
                  value={extractedFields.address}
                  onChange={(v) =>
                    setExtractedFields((f) => f && { ...f, address: v, full_address: `${v}, ${f.city}, ${f.state} ${f.zip}` })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <AddressField
                    label="City"
                    value={extractedFields.city}
                    onChange={(v) =>
                      setExtractedFields((f) => f && { ...f, city: v, full_address: `${f.address}, ${v}, ${f.state} ${f.zip}` })
                    }
                  />
                  <AddressField
                    label="State / County"
                    value={extractedFields.state}
                    onChange={(v) =>
                      setExtractedFields((f) => f && { ...f, state: v, full_address: `${f.address}, ${f.city}, ${v} ${f.zip}` })
                    }
                  />
                </div>
                <AddressField
                  label="Postcode / ZIP"
                  value={extractedFields.zip}
                  onChange={(v) =>
                    setExtractedFields((f) => f && { ...f, zip: v, full_address: `${f.address}, ${f.city}, ${f.state} ${v}` })
                  }
                />
              </div>

              {/* Geocoding failed warning */}
              {!geocoded && errorMessage && (
                <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-400">{errorMessage}</p>
                  <p className="text-xs text-land-muted mt-1">
                    Edit the address above and try plotting again, or plot manually on the map.
                  </p>
                </div>
              )}

              {/* Competitors section */}
              <CompetitorsList competitors={competitors} loading={competitorsLoading} />

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {geocoded ? (
                  <button
                    onClick={handlePlot}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-land-accent hover:bg-land-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <MapPin size={14} />
                    Plot on Map
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      if (!extractedFields) return;
                      setModalState("analysing");
                      try {
                        const geo = await geocodeMutation.mutateAsync({
                          full_address: extractedFields.full_address,
                        });
                        setGeocoded({ lng: geo.lng, lat: geo.lat });
                        setErrorMessage("");
                        setModalState("result");
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : "Geocoding failed.";
                        setErrorMessage(msg);
                        setModalState("result");
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-land-accent hover:bg-land-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <RotateCcw size={14} />
                    Retry Geocoding
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="px-3 py-2 text-sm text-land-muted hover:text-land-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Error state ── */}
          {modalState === "error" && (
            <div className="space-y-4">
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm font-medium text-red-400">Analysis failed</p>
                <p className="text-xs text-land-muted mt-1">{errorMessage}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRetry}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-land-accent hover:bg-land-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <RotateCcw size={14} />
                  Try again
                </button>
                <button
                  onClick={handleClose}
                  className="px-3 py-2 text-sm text-land-muted hover:text-land-text hover:bg-white/5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: competitors list ────────────────────────────────────────

interface CompetitorsListProps {
  competitors: GeocodedCompetitor[];
  loading: boolean;
}

function CompetitorsList({ competitors, loading }: CompetitorsListProps) {
  if (!loading && competitors.length === 0) return null;

  const plottable = competitors.filter((c) => c.lng !== null).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-land-muted">Competitors in document</span>
        {!loading && competitors.length > 0 && (
          <span className="text-xs text-land-muted">
            {plottable}/{competitors.length} plottable
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
          <Loader2 size={12} className="text-land-muted animate-spin flex-shrink-0" />
          <span className="text-xs text-land-muted">Finding competitors…</span>
        </div>
      ) : (
        <div className="space-y-1 max-h-36 overflow-y-auto">
          {competitors.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-2 bg-white/5 rounded-lg"
            >
              <div
                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  c.lng !== null ? "bg-red-500" : "bg-white/20"
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-land-text truncate">{c.name}</p>
                <p className="text-xs text-land-muted truncate">
                  {c.address ?? "Address not in document"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-component: labelled editable field ─────────────────────────────────

interface AddressFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function AddressField({ label, value, onChange }: AddressFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-land-muted mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-land-bg border border-white/10 rounded-lg text-sm text-land-text placeholder-land-muted focus:outline-none focus:ring-2 focus:ring-land-accent/50"
      />
    </div>
  );
}
