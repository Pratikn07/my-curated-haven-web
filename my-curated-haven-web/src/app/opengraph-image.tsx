import { ImageResponse } from "next/og";

export const alt =
  "My Curated Haven is starting with recipes by Tiny Soho, with clearly labelled previews of what may be ahead.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "66px 76px",
          backgroundColor: "#fdfcf8",
          color: "#3d405b",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#526849", fontSize: 26 }}>
          <div style={{ width: 48, height: 4, borderRadius: 4, backgroundColor: "#e07a5f" }} />
          My Curated Haven
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 960 }}>
          <div style={{ fontSize: 68, lineHeight: 1.12, fontWeight: 600 }}>
            A little more support for everyday parenting.
          </div>
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 28, lineHeight: 1.4, color: "#666578" }}>
            Starting with toddler recipes by Tiny Soho.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontFamily: "Arial, sans-serif", fontSize: 20 }}>
          {["Recipes", "Parenting Chat · Planned", "Curated Shop · Planned", "Bloom · Planned"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid #ddd9d1",
                borderRadius: 999,
                padding: "12px 18px",
                backgroundColor: "#ffffff",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
