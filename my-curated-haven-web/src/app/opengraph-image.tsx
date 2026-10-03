import { ImageResponse } from "next/og";

export const alt = "My Curated Haven: good enough is exactly enough. Free toddler recipes by Tiny Soho.";
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
          backgroundColor: "#fbf4ea",
          backgroundImage: "linear-gradient(180deg, #f8e4d3 0%, #fbf4ea 70%)",
          color: "#3d405b",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 34 }}>
          My Curated
          <span style={{ color: "#a34f3b", fontStyle: "italic" }}>Haven</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 960 }}>
          <div style={{ display: "flex", fontSize: 78, lineHeight: 1.05, fontWeight: 400 }}>
            Good enough is exactly enough.
          </div>
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 28, lineHeight: 1.4, color: "#666578" }}>
            A calm corner for parents of little ones, starting with free toddler recipes by Tiny Soho.
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontFamily: "Arial, sans-serif", fontSize: 20 }}>
          {["Kitchen · Open now", "Library · Coming soon", "Nursery · Later", "Shelf · Later"].map((label) => (
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
