import { useState } from "react";
import {
  Upload, Download, Printer, Eye, Settings2, LayoutGrid,
  BookOpen, Layers, ChevronRight, FileText, X, RotateCw,
  Maximize2, ChevronUp, ChevronDown,
} from "lucide-react";

const slots = [
  { id: "P5" }, { id: "P4" }, { id: "P3" }, { id: "P2" },
  { id: "P6" }, { id: "P7" }, { id: "P8" }, { id: "Cover" },
];

export function Mobile() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeGrid, setActiveGrid] = useState("4×2");

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f0c1e 0%, #0a1628 100%)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px 12px",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BookOpen size={14} color="#78350f" />
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 17, letterSpacing: -0.4 }}>Zine-ify</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 10px", borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
          }}>
            <Layers size={12} color="rgba(255,255,255,0.4)" />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600 }}>0/8</span>
          </div>
          <button
            onClick={() => setSheetOpen(o => !o)}
            style={{
              width: 34, height: 34, borderRadius: 10, border: "none",
              background: "rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Settings2 size={16} color="rgba(255,255,255,0.6)" />
          </button>
        </div>
      </div>

      {/* Upload strip */}
      <div style={{ padding: "0 16px 16px", flexShrink: 0 }}>
        <div style={{
          borderRadius: 14,
          padding: "14px 16px",
          background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
          border: "1.5px dashed rgba(251,191,36,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "rgba(251,191,36,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Upload size={18} color="#fbbf24" />
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Add Pages</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Drop or tap to pick PDFs</div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1,
        padding: "0 16px",
        overflowY: "auto",
        paddingBottom: sheetOpen ? 320 : 100,
      }}>
        {/* Sheet info row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Sheet 1
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>4×2 · Landscape</span>
        </div>

        {/* Page grid */}
        <div style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          background: "rgba(255,255,255,0.02)",
          padding: 14,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
            {slots.slice(0, 4).map(s => (
              <div key={s.id} style={{
                aspectRatio: "0.707",
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid rgba(255,255,255,0.07)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <FileText size={14} color="rgba(255,255,255,0.12)" />
                <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 9, fontWeight: 600 }}>{s.id}</span>
              </div>
            ))}
          </div>
          {/* Cut line */}
          <div style={{
            margin: "8px 0",
            height: 1,
            backgroundImage: "repeating-linear-gradient(90deg, rgba(251,191,36,0.35) 0, rgba(251,191,36,0.35) 5px, transparent 5px, transparent 10px)",
          }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
            {slots.slice(4).map(s => (
              <div key={s.id} style={{
                aspectRatio: "0.707",
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid rgba(255,255,255,0.07)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <FileText size={14} color="rgba(255,255,255,0.12)" />
                <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 9, fontWeight: 600 }}>{s.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action dock */}
      <div style={{
        position: "absolute",
        bottom: sheetOpen ? 310 : 0,
        left: 0, right: 0,
        padding: "12px 16px",
        background: "linear-gradient(to top, rgba(10,22,40,1) 60%, transparent)",
        display: "flex", gap: 8,
        transition: "bottom 0.35s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 10,
      }}>
        <button style={{
          flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
          background: "rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          cursor: "pointer",
        }}>
          <Printer size={14} /> Print
        </button>
        <button style={{
          flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
          background: "rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          cursor: "pointer",
        }}>
          <Download size={14} /> Export
        </button>
        <button style={{
          flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
          background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
          color: "#78350f", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          cursor: "pointer",
        }}>
          <Eye size={14} /> Preview
        </button>
      </div>

      {/* Bottom sheet */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: 310,
        background: "linear-gradient(170deg, #1a2a44 0%, #13203a 100%)",
        borderRadius: "24px 24px 0 0",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
        transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Handle */}
        <div style={{ paddingTop: 12, display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px 16px",
          flexShrink: 0,
        }}>
          <h3 style={{ color: "#fff", fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Sheet Options</h3>
          <button onClick={() => setSheetOpen(false)} style={{
            width: 30, height: 30, borderRadius: 8, border: "none",
            background: "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <X size={14} color="rgba(255,255,255,0.5)" />
          </button>
        </div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          {/* Grid setting */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#63b3ed22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LayoutGrid size={15} color="#63b3ed" />
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Grid</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>8 slots · 4×2</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["4×1","4×2","4×3"].map(v => (
                <button key={v} onClick={() => setActiveGrid(v)} style={{
                  padding: "4px 9px", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 700,
                  background: activeGrid === v ? "#fbbf24" : "rgba(255,255,255,0.08)",
                  color: activeGrid === v ? "#78350f" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                }}>{v}</button>
              ))}
            </div>
          </div>

          {/* Paper */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#9ae6b422", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={15} color="#9ae6b4" />
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Paper</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Letter · 8.5 × 11 in</div>
              </div>
            </div>
            <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
          </div>

          {/* Orientation */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#b794f422", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={15} color="#b794f4" />
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Orientation</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Landscape</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["Port.","Land."].map(v => (
                <button key={v} style={{
                  padding: "4px 9px", borderRadius: 7, border: "none", fontSize: 11, fontWeight: 700,
                  background: v === "Land." ? "#9ae6b4" : "rgba(255,255,255,0.08)",
                  color: v === "Land." ? "#276749" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                }}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
