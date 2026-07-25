/**
 * Dark brand header that mirrors jacsalservices.com's top bar, so the intake app
 * reads as part of the site. Uses the same Cloudflare Images logo lockup (native
 * 450x100, includes the wordmark) the marketing site uses, at h=72 for retina.
 *
 * Colors are inlined (not theme tokens) on purpose: the surrounding app runs a
 * LIGHT theme, but this bar is a fixed dark surface using the brand's dark
 * palette (#070c13 base, #6ea4df accent) exactly as the site does.
 */
const LOGO_HEADER =
  'https://imagedelivery.net/uVbp30hZvQwg07VPO-4-FA/3164f22e-e933-46d2-334b-0eb7be620d00/h=72,f=auto';

export function SiteHeader() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(7,12,19,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        // Thin blue underglow, echoing the site's brand-blue accents.
        boxShadow: '0 1px 0 rgba(110,164,223,0.25), 0 6px 24px rgba(1,91,182,0.18)',
      }}
    >
      <div
        style={{
          maxWidth: 1152,
          margin: '0 auto',
          padding: '0 24px',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Logo links back to the marketing site root. */}
        <a href="/" style={{ display: 'flex', alignItems: 'center' }} aria-label="JacSal Services home">
          <img
            src={LOGO_HEADER}
            alt="JacSal Services"
            style={{ height: 34, width: 'auto', display: 'block' }}
          />
        </a>

        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: '0.01em',
            color: '#cfe0f5',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span aria-hidden="true">←</span> jacsalservices.com
        </a>
      </div>
    </header>
  );
}
