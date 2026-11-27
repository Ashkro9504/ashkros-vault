import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#020617',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '8px solid #f59e0b',
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: '#fbbf24',
            letterSpacing: '-2px',
            display: 'flex',
          }}
        >
          AV
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#f8fafc',
            marginTop: 6,
            letterSpacing: '1px',
            display: 'flex',
          }}
        >
          ASHKRO'S VAULT
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}