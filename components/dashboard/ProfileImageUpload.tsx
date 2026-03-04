"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ProfileImageUploadProps {
  userId: string;
  currentAvatar?: string | null;
  displayName: string;
  initials: string;
}

const CROP_SIZE = 320;   // px – visible crop window
const OUTPUT_SIZE = 600; // px – saved image resolution

export function ProfileImageUpload({ userId, currentAvatar, displayName, initials }: ProfileImageUploadProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [localAvatar, setLocalAvatar] = useState(currentAvatar ?? null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync localAvatar when the server refreshes and passes a new currentAvatar prop
  useEffect(() => {
    setLocalAvatar(currentAvatar ?? null);
  }, [currentAvatar]);

  // Crop transform state
  const [zoom, setZoom] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragAnchor = useRef({ mouseX: 0, mouseY: 0, tx: 0, ty: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  // Attach non-passive wheel listener so preventDefault blocks page scroll
  useEffect(() => {
    const el = cropRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(Math.max(z - e.deltaY * 0.003, 1), 5));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [modalOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── File selection ────────────────────────────────────────────────────────
  function openFilePicker() {
    setMenuOpen(false);
    fileRef.current?.click();
  }

  // ── Edit existing photo (re-open crop modal with current image) ───────────
  function handleEdit() {
    setMenuOpen(false);
    if (!localAvatar) return;
    setImageSrc(localAvatar);
    setNaturalSize(null);
    setZoom(1);
    setTx(0);
    setTy(0);
    setModalOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target?.result as string);
      setNaturalSize(null);
      setZoom(1);
      setTx(0);
      setTy(0);
      setModalOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setMenuOpen(false);
    try {
      const { error } = await (supabase.from as any)("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (error) throw error;
      setLocalAvatar(null);
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  // ── Drag / pinch / wheel in crop area ────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    dragAnchor.current = { mouseX: e.clientX, mouseY: e.clientY, tx, ty };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    setTx(dragAnchor.current.tx + e.clientX - dragAnchor.current.mouseX);
    setTy(dragAnchor.current.ty + e.clientY - dragAnchor.current.mouseY);
  }
  function onMouseUp() { setIsDragging(false); }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragAnchor.current = { mouseX: e.touches[0].clientX, mouseY: e.touches[0].clientY, tx, ty };
    }
    if (e.touches.length === 2) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      lastPinchDist.current = d;
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 1 && isDragging) {
      setTx(dragAnchor.current.tx + e.touches[0].clientX - dragAnchor.current.mouseX);
      setTy(dragAnchor.current.ty + e.touches[0].clientY - dragAnchor.current.mouseY);
    }
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      setZoom(z => Math.min(Math.max(z + (d - lastPinchDist.current!) * 0.008, 1), 5));
      lastPinchDist.current = d;
    }
  }
  function onTouchEnd() { setIsDragging(false); lastPinchDist.current = null; }

  // ── Image style inside crop area ──────────────────────────────────────────
  function imageStyle(): React.CSSProperties {
    if (!naturalSize) return { visibility: "hidden" };
    const baseScale = Math.max(CROP_SIZE / naturalSize.w, CROP_SIZE / naturalSize.h);
    const total = baseScale * zoom;
    return {
      position: "absolute",
      left: CROP_SIZE / 2 + tx - (naturalSize.w * total) / 2,
      top:  CROP_SIZE / 2 + ty - (naturalSize.h * total) / 2,
      width:  naturalSize.w * total,
      height: naturalSize.h * total,
      maxWidth: "none",
      maxHeight: "none",
      pointerEvents: "none",
      userSelect: "none",
    };
  }

  // ── Save (canvas → Supabase) ──────────────────────────────────────────────
  async function handleSave() {
    if (!imageSrc || !naturalSize || !imgRef.current) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const baseScale = Math.max(CROP_SIZE / naturalSize.w, CROP_SIZE / naturalSize.h);
      const total = baseScale * zoom;
      const imgLeft = CROP_SIZE / 2 + tx - (naturalSize.w * total) / 2;
      const imgTop  = CROP_SIZE / 2 + ty - (naturalSize.h * total) / 2;

      const srcX = -imgLeft / total;
      const srcY = -imgTop  / total;
      const srcW = CROP_SIZE / total;
      const srcH = CROP_SIZE / total;

      const canvas = document.createElement("canvas");
      canvas.width  = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      canvas.getContext("2d")!.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => b ? res(b) : rej(new Error("toBlob failed")), "image/jpeg", 0.92)
      );

      const path = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, {
        upsert: true, contentType: "image/jpeg",
      });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      // Append cache-buster so the browser always fetches the new file on reload
      const cacheBustedUrl = publicUrl + "?t=" + Date.now();

      const { error: updateError } = await (supabase.from as any)("profiles")
        .update({ avatar_url: cacheBustedUrl })
        .eq("id", userId);
      if (updateError) throw updateError;

      setLocalAvatar(cacheBustedUrl);
      setModalOpen(false);
      setImageSrc(null);
      router.refresh();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setErrorMsg(err?.message ?? "Upload failed — check console for details");
    } finally {
      setUploading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Photo area ─────────────────────────────────────────────────── */}
      <div className="relative shrink-0 w-full" style={{ aspectRatio: "3/4", background: "#e5e7eb" }}>
        {localAvatar ? (
          <img src={localAvatar} alt={displayName} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl font-bold text-gray-400">{initials}</span>
          </div>
        )}

        {/* ⋯ dropdown */}
        <div className="absolute top-2.5 right-2.5" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-6 h-6 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center border border-gray-100 hover:bg-white transition-colors"
            title="Photo options"
          >
            <svg className="w-3 h-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-38 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 overflow-hidden" style={{ minWidth: "148px" }}>
              <button
                onClick={openFilePicker}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              >
                <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Upload photo
              </button>
              {localAvatar && (
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                  </svg>
                  Edit photo
                </button>
              )}
              {localAvatar && (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                >
                  <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Delete photo
                </button>
              )}
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* ── Crop modal ──────────────────────────────────────────────────── */}
      {modalOpen && imageSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setModalOpen(false); setImageSrc(null); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden" style={{ maxWidth: CROP_SIZE + 40 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Adjust Photo</h3>
              <button
                onClick={() => { setModalOpen(false); setImageSrc(null); }}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Crop window */}
            <div className="px-5 pt-4 pb-2">
              <div
                ref={cropRef}
                className="relative rounded-xl overflow-hidden mx-auto select-none"
                style={{
                  width: CROP_SIZE,
                  height: CROP_SIZE,
                  background: "#1a1a1a",
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Rule-of-thirds grid overlay */}
                <div className="absolute inset-0 pointer-events-none z-10" style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                  backgroundSize: `${CROP_SIZE / 3}px ${CROP_SIZE / 3}px`,
                }} />

                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt=""
                  crossOrigin="anonymous"
                  draggable={false}
                  onLoad={() => {
                    if (imgRef.current) {
                      setNaturalSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
                    }
                  }}
                  style={imageStyle()}
                />
              </div>

              <p className="text-center text-[11px] text-gray-400 mt-2 mb-3">
                Drag to reposition · Scroll or pinch to zoom
              </p>

              {/* Zoom slider */}
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd"/>
                </svg>
                <input
                  type="range" min="1" max="5" step="0.01"
                  value={zoom}
                  onChange={e => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-primary h-1"
                />
                <svg className="w-4.5 h-4.5 text-gray-400 shrink-0" style={{ width: 18, height: 18 }} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <p className="mx-5 mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => { setModalOpen(false); setImageSrc(null); }}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={uploading || !naturalSize}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {uploading ? "Saving…" : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
