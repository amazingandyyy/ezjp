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

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            maxWidth: '90%',
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <div
            style={{
              fontSize: '120px',
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
              fontSize: '36px',
              color: '#e2e8f0',
              marginTop: '16px',
              maxWidth: '80%',
              lineHeight: 1.4,
            }}
          >
            Improve Your Japanese with AI-Powered News Articles
          </div>

          {/* Call to action */}
          <div
            style={{
              background: 'rgba(74, 222, 128, 0.1)',
              border: '2px solid #4ade80',
              padding: '16px 32px',
              borderRadius: '9999px',
              color: '#4ade80',
              fontSize: '24px',
              marginTop: '24px',
            }}
          >
            Start Reading Now
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
} 