/**
 * Slim dark footer that echoes jacsalservices.com's footer, closing the frame
 * around the light form content so the intake app reads as a site page.
 */
export function SiteFooter() {
  return (
    <footer
      style={{
        background: '#050810',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(231,236,243,0.6)',
      }}
    >
      <div
        style={{
          maxWidth: 1152,
          margin: '0 auto',
          padding: '28px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(231,236,243,0.72)',
          }}
        >
          Supporting Dreams
        </span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5 }}>
          © 2026 JacSal Services. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
