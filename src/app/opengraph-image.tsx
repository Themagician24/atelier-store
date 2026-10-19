import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// The default social card, for pages without a photo of their own (product
// and collection pages use their packshot). Ink on paper, like the site.
export const alt = `${SITE_NAME} — ready-to-wear made in small runs`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#ffffff",
          color: "#000000",
        }}
      >
        <div style={{ fontSize: 40, letterSpacing: "0.3em", textTransform: "uppercase" }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, maxWidth: 900 }}>
            Ready-to-wear, bags and shoes, made in small runs.
          </div>
          <div style={{ fontSize: 28, color: "#6b6b6b" }}>Free shipping across the US.</div>
        </div>
      </div>
    ),
    size,
  );
}
