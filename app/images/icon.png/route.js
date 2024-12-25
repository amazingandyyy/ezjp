import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';
export const size = {
  width: 32,
  height: 32,
};

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderRadius: "50%",
          padding: "6px",
          boxShadow:
            "0 0 4px rgba(34, 197, 94, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
        }}
      >
        <svg
          viewBox="0 0 448 512"
          style={{
            width: "100%",
            height: "100%",
            color: "#22c55e",
            filter: "drop-shadow(0 0 2px rgba(34, 197, 94, 0.3))",
          }}
          fill="currentColor"
        >
          <path d="M96 0C43 0 0 43 0 96V416c0 53 43 96 96 96H384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V384c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H384 96zm0 384H352v64H96c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16zm16 48H336c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
} 