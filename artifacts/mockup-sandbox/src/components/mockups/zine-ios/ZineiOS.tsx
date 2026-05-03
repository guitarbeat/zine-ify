import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Printer,
  Download,
  Eye,
  Settings2,
  GripHorizontal,
  BookOpen,
  Layers,
  LayoutGrid,
} from "lucide-react";

export function ZineIOS() {
  const [sheetHeight, setSheetHeight] = useState(340);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);
  const MIN_H = 120;
  const MAX_H = 560;

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartH.current = sheetHeight;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = dragStartY.current - e.clientY;
    setSheetHeight(Math.min(MAX_H, Math.max(MIN_H, dragStartH.current + delta)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  const slots = [
    { id: "P5", label: "P5", filled: false },
    { id: "P4", label: "P4", filled: false },
    { id: "P3", label: "P3", filled: false },
    { id: "P2", label: "P2", filled: false },
    { id: "P6", label: "P6", filled: false },
    { id: "P7", label: "P7", filled: false },
    { id: "P8", label: "P8", filled: false },
    { id: "Cover", label: "Cover", filled: false },
  ];

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        background: "linear-gradient(160deg, #1c1436 0%, #0e0b1f 60%, #0a1628 100%)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Phone frame */}
      <div
        style={{
          width: 390,
          height: 844,
          borderRadius: 52,
          background: "#0f0c1d",
          boxShadow: "0 40px 120px rgba(0,0,0,0.7), inset 0 0 0 1.5px rgba(255,255,255,0.08)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 28px 0",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>9:41</span>
          <div
            style={{
              width: 120,
              height: 34,
              background: "#0f0c1d",
              borderRadius: 20,
              border: "1.5px solid rgba(255,255,255,0.1)",
            }}
          />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 18, height: 12, borderRadius: 2, background: "rgba(255,255,255,0.6)" }} />
          </div>
        </div>

        {/* App header */}
        <div style={{ padding: "20px 24px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>
                Your workspace
              </p>
              <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>
                Zine-ify
              </h1>
            </div>
            <button
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Settings2 size={18} color="rgba(255,255,255,0.7)" />
            </button>
          </div>
        </div>

        {/* Background (preview card) — amber/warm */}
        <div
          style={{
            flex: 1,
            background: "linear-gradient(160deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
            borderRadius: "32px 32px 0 0",
            padding: "24px 24px 0",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative blobs */}
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 80,
              left: -30,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.08)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4, letterSpacing: 0.6, textTransform: "uppercase" }}>
                  Current sheet
                </p>
                <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
                  8 Slots Ready
                </h2>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 12,
                  padding: "6px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Layers size={14} color="#fff" />
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>0/8</span>
              </div>
            </div>

            {/* Mini grid preview */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {slots.map((s) => (
                <div
                  key={s.id}
                  style={{
                    aspectRatio: "0.75",
                    borderRadius: 8,
                    background: s.filled ? "#fff" : "rgba(255,255,255,0.15)",
                    border: "1.5px solid rgba(255,255,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: 600 }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Action row */}
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { icon: <Printer size={16} color="#b45309" />, label: "Print" },
                { icon: <Download size={16} color="#b45309" />, label: "Export" },
                { icon: <Eye size={16} color="#b45309" />, label: "Preview" },
              ].map((btn) => (
                <button
                  key={btn.label}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.9)",
                    border: "none",
                    borderRadius: 12,
                    padding: "10px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                  }}
                >
                  {btn.icon}
                  <span style={{ color: "#b45309", fontSize: 11, fontWeight: 600 }}>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sliding sheet */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: sheetHeight,
              background: "linear-gradient(170deg, #1e3a5f 0%, #162d4b 100%)",
              borderRadius: "28px 28px 0 0",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              userSelect: "none",
            }}
          >
            {/* Drag handle */}
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                display: "flex",
                justifyContent: "center",
                cursor: "ns-resize",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.2)",
                }}
              />
            </div>

            {/* Sheet header */}
            <div
              style={{
                padding: "4px 24px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 2, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Settings
                </p>
                <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
                  Sheet Options
                </h3>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 14px",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Letter
                </button>
              </div>
            </div>

            {/* Options */}
            <div
              style={{
                padding: "0 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {/* Upload row */}
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  border: "1.5px dashed rgba(255,255,255,0.15)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(245,158,11,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Upload size={18} color="#f59e0b" />
                </div>
                <div>
                  <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                    Add Pages
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                    Drop PDF files here
                  </p>
                </div>
              </div>

              {/* Grid size */}
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "rgba(99,179,237,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LayoutGrid size={18} color="#63b3ed" />
                  </div>
                  <div>
                    <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Grid</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>8 slots · 4×2</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["4×1", "4×2", "4×3"].map((v) => (
                    <button
                      key={v}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 8,
                        border: "none",
                        background: v === "4×2" ? "#f59e0b" : "rgba(255,255,255,0.08)",
                        color: v === "4×2" ? "#0f0c1d" : "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "rgba(154,230,180,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookOpen size={18} color="#9ae6b4" />
                  </div>
                  <div>
                    <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Orientation</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Landscape</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["Port.", "Land."].map((v) => (
                    <button
                      key={v}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 8,
                        border: "none",
                        background: v === "Land." ? "#9ae6b4" : "rgba(255,255,255,0.08)",
                        color: v === "Land." ? "#0f0c1d" : "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom indicator */}
            <div style={{ marginTop: "auto", paddingBottom: 8, display: "flex", justifyContent: "center" }}>
              <GripHorizontal size={20} color="rgba(255,255,255,0.12)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
