import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'EZJP - Learn Japanese Through News';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #1a1a1a, #2d3748)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          position: 'relative',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 25px 25px, #333 2%, transparent 0%)',
            backgroundSize: '50px 50px',
            opacity: 0.2,
          }}
        />

        {/* Logo and title container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            maxWidth: '80%',
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: '96px',
              fontWeight: 800,
              background: 'linear-gradient(to right, #4ade80, #22c55e)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            EZJP
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '32px',
              color: '#e2e8f0',
              marginTop: '16px',
            }}
          >
            Learn Japanese Through News
          </div>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              gap: '32px',
              marginTop: '32px',
            }}
          >
            {['AI-Powered', 'Real News', 'Track Progress'].map((feature) => (
              <div
                key={feature}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '12px 24px',
                  borderRadius: '9999px',
                  color: '#e2e8f0',
                  fontSize: '24px',
                }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
} 