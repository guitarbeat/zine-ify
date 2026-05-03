import { useState } from "react";
import {
  Upload, Download, Printer, Eye, Settings2, LayoutGrid,
  BookOpen, Layers, ChevronRight, FileText, Zap, RotateCw,
  Maximize2, X, GripVertical,
} from "lucide-react";

const slots = [
  { id: "P5", row: 0 }, { id: "P4", row: 0 }, { id: "P3", row: 0 }, { id: "P2", row: 0 },
  { id: "P6", row: 1 }, { id: "P7", row: 1 }, { id: "P8", row: 1 }, { id: "Cover", row: 1 },
];

function PageCell({ id }: { id: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: "0.707",
        borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
        border: `1.5px solid ${hovered ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.08)"}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        transition: "all 0.15s ease",
        cursor: "pointer",
        gap: 8,
      }}
    >
      <FileText size={18} color="rgba(255,255,255,0.15)" />
      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
        {id}
      </span>
      {hovered && (
        <div style={{
          position: "absolute", top: 6, right: 6,
          display: "flex", gap: 4,
        }}>
          {[RotateCw, Maximize2, X].map((Icon, i) => (
            <div key={i} style={{
              width: 22, height: 22, borderRadius: 6,
              background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={11} color="rgba(255,255,255,0.7)" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingRow({ icon: Icon, label, sub, color, children }: {
  icon: any; label: string; sub: string; color: string; children?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px",
      borderRadius: 12,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: color + "22",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} color={color} />
        </div>
        <div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Desktop() {
  const [activeGrid, setActiveGrid] = useState("4×2");

  return (
    <div style={{
      width: "100%", height: "100vh",
      background: "linear-gradient(135deg, #0f0c1e 0%, #0a1628 100%)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        height: 56,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BookOpen size={14} color="#78350f" />
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>
            Zine-ify
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <Layers size={13} color="rgba(255,255,255,0.5)" />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>0 / 8 pages</span>
          </div>
          {[
            { Icon: Printer, label: "Print" },
            { Icon: Download, label: "Export" },
          ].map(({ Icon, label }) => (
            <button key={label} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}>
              <Icon size={13} /> {label}
            </button>
          ))}
          <button style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 16px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            color: "#78350f", fontSize: 13, fontWeight: 700,
            cursor: "pointer",
          }}>
            <Eye size={13} /> Preview
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left sidebar */}
        <div style={{
          width: 280,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          padding: 16,
          gap: 12,
          overflowY: "auto",
          flexShrink: 0,
        }}>
          {/* Upload zone */}
          <div style={{
            borderRadius: 14,
            padding: 16,
            background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
            border: "1.5px dashed rgba(251,191,36,0.3)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "rgba(251,191,36,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Upload size={20} color="#fbbf24" />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
                Add Pages
              </div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, lineHeight: 1.4 }}>
                Drop PDFs here or click to browse
              </div>
            </div>
          </div>

          {/* Divider label */}
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", paddingLeft: 4 }}>
            Sheet Settings
          </div>

          <SettingRow icon={LayoutGrid} label="Grid" sub="8 slots · 4×2" color="#63b3ed">
            <div style={{ display: "flex", gap: 3 }}>
              {["4×1", "4×2", "4×3"].map(v => (
                <button key={v} onClick={() => setActiveGrid(v)} style={{
                  padding: "4px 8px", borderRadius: 6, border: "none", fontSize: 10, fontWeight: 700,
                  background: activeGrid === v ? "#fbbf24" : "rgba(255,255,255,0.07)",
                  color: activeGrid === v ? "#78350f" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                }}>{v}</button>
              ))}
            </div>
          </SettingRow>

          <SettingRow icon={FileText} label="Paper" sub="Letter · 8.5 × 11 in" color="#9ae6b4">
            <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
          </SettingRow>

          <SettingRow icon={BookOpen} label="Orientation" sub="Landscape" color="#b794f4">
            <div style={{ display: "flex", gap: 3 }}>
              {["Port.", "Land."].map(v => (
                <button key={v} style={{
                  padding: "4px 8px", borderRadius: 6, border: "none", fontSize: 10, fontWeight: 700,
                  background: v === "Land." ? "#9ae6b4" : "rgba(255,255,255,0.07)",
                  color: v === "Land." ? "#276749" : "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                }}>{v}</button>
              ))}
            </div>
          </SettingRow>

          <SettingRow icon={Zap} label="Page Numbers" sub="Show in corners" color="#fbb6ce">
            <div style={{
              width: 36, height: 20, borderRadius: 10,
              background: "#fbbf24",
              position: "relative", cursor: "pointer",
            }}>
              <div style={{
                position: "absolute", right: 2, top: 2,
                width: 16, height: 16, borderRadius: 8,
                background: "#fff",
              }} />
            </div>
          </SettingRow>

          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", paddingLeft: 4, marginTop: 4 }}>
            Files
          </div>
          <div style={{
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "12px 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>No files uploaded yet</span>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Workspace toolbar */}
          <div style={{
            height: 44,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center",
            padding: "0 20px", gap: 12,
            flexShrink: 0,
          }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Sheet 1</span>
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>Drop pages to fill slots</span>
          </div>

          {/* Zine grid */}
          <div style={{
            flex: 1, padding: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "auto",
          }}>
            <div style={{
              width: "100%", maxWidth: 740,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
              background: "rgba(255,255,255,0.02)",
            }}>
              {/* Cut line label */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Cut line
                </span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              </div>

              <div style={{ padding: 20 }}>
                {/* Top row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}>
                  {slots.filter(s => s.row === 0).map(s => <PageCell key={s.id} id={s.id} />)}
                </div>
                {/* Cut dashes */}
                <div style={{
                  margin: "10px 0",
                  height: 1,
                  backgroundImage: "repeating-linear-gradient(90deg, rgba(251,191,36,0.3) 0, rgba(251,191,36,0.3) 6px, transparent 6px, transparent 12px)",
                }} />
                {/* Bottom row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 10 }}>
                  {slots.filter(s => s.row === 1).map(s => <PageCell key={s.id} id={s.id} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
