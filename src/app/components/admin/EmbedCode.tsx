import { useMemo, useState } from 'react';
import { Copy, Check, Code, ExternalLink, MousePointerClick } from 'lucide-react';

type EmbedType = 'button' | 'iframe';
type Position = 'bottom-right' | 'bottom-left' | 'inline';

export function EmbedCode() {
  const [embedType, setEmbedType] = useState<EmbedType>('button');
  const [iframeDimensions, setIframeDimensions] = useState({ width: '100%', height: '800px' });
  const [copied, setCopied] = useState(false);

  const [label, setLabel] = useState('Book a Consultation');
  const [color, setColor] = useState('#0f172a');
  const [textColor, setTextColor] = useState('#ffffff');
  const [position, setPosition] = useState<Position>('bottom-right');
  const [target, setTarget] = useState('#booking-button');
  const [service, setService] = useState('');
  const [radius, setRadius] = useState('9999px');

  const bookingUrl = window.location.origin;

  const buttonSnippet = useMemo(() => buildButtonSnippet({
    origin: bookingUrl, label, color, textColor, position, target, service, radius,
  }), [bookingUrl, label, color, textColor, position, target, service, radius]);

  const iframeCode = `<iframe
  src="${bookingUrl}"
  width="${iframeDimensions.width}"
  height="${iframeDimensions.height}"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`;

  const code = embedType === 'button' ? buttonSnippet : iframeCode;

  const handleCopy = async () => {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, code.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      return ok;
    };

    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
        ok = true;
      }
    } catch {}
    if (!ok) ok = fallback();

    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      console.error('Copy failed — clipboard blocked. Select the code manually to copy.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Embed Code</h2>
        <p className="text-muted-foreground">
          Drop a single snippet on any page to launch the screening flow as a popup, or embed the full form inline.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h3>Choose Embed Method</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setEmbedType('button')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              embedType === 'button' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="w-5 h-5 text-primary" />
              <h4>Button + Popup</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Floating or inline CTA button. Opens the screening flow in a modal. Works anywhere JavaScript runs.
            </p>
          </button>

          <button
            onClick={() => setEmbedType('iframe')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              embedType === 'iframe' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-5 h-5 text-primary" />
              <h4>iFrame Embed</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Renders the full form inline on the page. Best for dedicated booking pages.
            </p>
          </button>
        </div>
      </div>

      {embedType === 'button' && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3>Button Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Button Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block mb-2">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="bottom-right">Floating — bottom right</option>
                <option value="bottom-left">Floating — bottom left</option>
                <option value="inline">Inline (mount into a target element)</option>
              </select>
            </div>
            <div>
              <label className="block mb-2">Background Color</label>
              <div className="flex gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-10 rounded border border-border bg-transparent" />
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="block mb-2">Text Color</label>
              <div className="flex gap-2">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-12 h-10 rounded border border-border bg-transparent" />
                <input type="text" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1 px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="block mb-2">Border Radius</label>
              <input
                type="text"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="9999px"
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
              />
            </div>
            <div>
              <label className="block mb-2">Pre-select Service (optional)</label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="service id or slug"
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {position === 'inline' && (
              <div className="md:col-span-2">
                <label className="block mb-2">Target Selector</label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="#booking-button"
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  CSS selector for the element to mount the button inside (e.g. <code>#booking-button</code>).
                </p>
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg p-6 flex items-center justify-center bg-muted/30">
            <button
              type="button"
              style={{ background: color, color: textColor, borderRadius: radius, padding: '12px 20px', border: 0, fontWeight: 600, boxShadow: '0 6px 20px rgba(0,0,0,.18)', cursor: 'pointer' }}
            >
              {label}
            </button>
          </div>
        </div>
      )}

      {embedType === 'iframe' && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3>iFrame Dimensions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Width</label>
              <input
                type="text"
                value={iframeDimensions.width}
                onChange={(e) => setIframeDimensions({ ...iframeDimensions, width: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block mb-2">Height</label>
              <input
                type="text"
                value={iframeDimensions.height}
                onChange={(e) => setIframeDimensions({ ...iframeDimensions, height: e.target.value })}
                className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3>Embed Code</h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {copied ? (<><Check className="w-4 h-4" /> Copied!</>) : (<><Copy className="w-4 h-4" /> Copy Code</>)}
          </button>
        </div>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto max-h-96">
          <code className="text-sm font-mono whitespace-pre">{code}</code>
        </pre>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3>Live Preview</h3>
          <a
            href={`${bookingUrl}/widget`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Open widget view
          </a>
        </div>
        <div className="border border-border rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <iframe src={`${bookingUrl}/widget`} width="100%" height="100%" style={{ border: 'none' }} title="Widget Preview" />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-900 mb-2">💡 Notes</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• The button snippet is fully self-contained — paste it on any HTML page.</li>
          <li>• Email clients strip JavaScript, so for emails link to a landing page that hosts the snippet.</li>
          <li>• Call <code>window.ScreeningWidget.open()</code> from your own buttons or links if you want custom triggers.</li>
        </ul>
      </div>
    </div>
  );
}

interface SnippetOpts {
  origin: string;
  label: string;
  color: string;
  textColor: string;
  position: Position;
  target: string;
  service: string;
  radius: string;
}

function buildButtonSnippet(o: SnippetOpts): string {
  const cfg = JSON.stringify({
    origin: o.origin,
    label: o.label,
    color: o.color,
    textColor: o.textColor,
    position: o.position,
    target: o.position === 'inline' ? o.target : null,
    service: o.service || null,
    radius: o.radius,
  });
  return `<!-- Screening Widget -->
<script>
(function(){
  var c = ${cfg};
  function injectStyles(){
    if(document.getElementById('sw-styles')) return;
    var s=document.createElement('style');s.id='sw-styles';
    s.textContent='.sw-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;border:0;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.18);transition:transform .15s ease}.sw-btn:hover{transform:translateY(-1px)}.sw-fab{position:fixed;z-index:2147483000}.sw-fab.br{right:20px;bottom:20px}.sw-fab.bl{left:20px;bottom:20px}.sw-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px}.sw-md{position:relative;width:100%;max-width:680px;height:min(90vh,860px);background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.4)}.sw-fr{width:100%;height:100%;border:0;display:block}.sw-cl{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:9999px;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:20px;cursor:pointer;z-index:2}';
    document.head.appendChild(s);
  }
  var ov=null;
  function close(){ if(!ov) return; ov.remove(); ov=null; document.body.style.overflow=''; }
  function open(){
    if(ov) return;
    ov=document.createElement('div'); ov.className='sw-ov';
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
    var m=document.createElement('div'); m.className='sw-md';
    var x=document.createElement('button'); x.className='sw-cl'; x.setAttribute('aria-label','Close'); x.textContent='\\u00d7'; x.addEventListener('click',close);
    var f=document.createElement('iframe'); f.className='sw-fr';
    f.src=c.origin+'/widget'+(c.service?('?service='+encodeURIComponent(c.service)):'');
    m.appendChild(x); m.appendChild(f); ov.appendChild(m);
    document.body.appendChild(ov); document.body.style.overflow='hidden';
  }
  window.addEventListener('message',function(e){ if(e.origin!==c.origin) return; var d=e.data||{}; if(d.source==='screening-widget'&&d.type==='close') close(); });
  window.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
  function mount(){
    injectStyles();
    var b=document.createElement('button'); b.type='button'; b.className='sw-btn'; b.textContent=c.label;
    b.style.background=c.color; b.style.color=c.textColor; b.style.borderRadius=c.radius;
    b.addEventListener('click',open);
    if(c.target){ var h=document.querySelector(c.target); if(h){ h.appendChild(b); return; } }
    var w=document.createElement('div'); w.className='sw-fab '+(c.position==='bottom-left'?'bl':'br'); w.appendChild(b);
    document.body.appendChild(w);
  }
  window.ScreeningWidget={open:open,close:close};
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',mount); } else { mount(); }
})();
</script>`;
}
