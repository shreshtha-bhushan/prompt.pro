import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "PromptPro — AI Prompt Engineering & Optimization";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "70px 80px",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 85% 100%, rgba(255, 255, 255, 0.03) 0%, transparent 50%)",
          color: "#f4f4f5",
          fontFamily: "system-ui, -apple-system, sans-serif",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Top Header Row */}
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {/* Sparkle Logo Monogram */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#18181b",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 4C16 13 21 16 28 16C21 16 16 19 16 28C16 19 11 16 4 16C11 16 16 13 16 4Z"
                  fill="#ffffff"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "#ffffff",
              }}
            >
              PromptPro
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 16px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "14px",
              fontFamily: "monospace",
              color: "#a1a1aa",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Next-Gen Prompt Architecture
          </div>
        </div>

        {/* Center Headline & Tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "950px",
          }}
        >
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              margin: 0,
              background:
                "linear-gradient(180deg, #FFFFFF 0%, #E4E4E7 40%, #71717A 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            AI Prompt Engineering
          </h1>
          <p
            style={{
              fontSize: "24px",
              lineHeight: 1.5,
              color: "#a1a1aa",
              marginTop: "20px",
              marginBottom: "0px",
              maxWidth: "750px",
            }}
          >
            Instantly decompose, structure, and optimize prompts across ChatGPT,
            Claude, and Gemini with zero token fluff.
          </p>
        </div>

        {/* Bottom Feature Pill Row */}
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          {[
            "5-Component Decomposition",
            "Real-Time Interception",
            "Multi-Model Routing",
            "Privacy-First Architecture",
          ].map((feature, i) => (
            <div
              key={i}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: "13px",
                fontFamily: "monospace",
                color: "#d4d4d8",
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
