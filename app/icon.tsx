import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
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
          border: '20px solid #f59e0b',
          borderRadius: 96,
        }}
      >
        <div
          style={{
            fontSize: 180,
            fontWeight: 900,
            color: '#fbbf24',
            letterSpacing: '-4px',
            display: 'flex',
          }}
        >
          AV
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: '#f8fafc',
            marginTop: 14,
            letterSpacing: '2px',
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