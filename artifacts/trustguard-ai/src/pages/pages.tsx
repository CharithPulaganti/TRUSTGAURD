import { useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowRight, AudioLines, BadgeCheck, Check, ChevronRight,
  CircleHelp, ClipboardCheck, Clock3, FileText, Fingerprint, Globe2, Image, Info, Link2, LockKeyhole,
  MessageSquareText, QrCode, RotateCcw, ScanLine, Shield, ShieldAlert, ShieldCheck, Sparkles, Upload,
} from 'lucide-react';
import {
  getGetHealthQueryKey, getGetVersionQueryKey, getHealthCheckQueryKey, getListHistoryQueryKey,
  getReadAnalysisQueryKey, useAnalyzeAudio, useAnalyzeDigitalArrest, useAnalyzeDocument, useAnalyzeImage,
  useAnalyzeQr, useAnalyzeText, useAnalyzeUrl, useClearHistory, useCreateReport, useGetHealth,
  useGetVersion, useHealthCheck, useListHistory, useReadAnalysis,
} from '@workspace/api-client-react';
import type { AnalysisHistoryItem, AnalysisResult, ReportDocument } from '@workspace/api-client-react';
import { Button, Skeleton, Surface } from '@/components/ui-kit';
import { Notice, PageHeading } from '@/components/shell';
import { clearLocalResults, loadResult, saveResult, sessionId } from '@/lib/session';

const analyzers = [
  { title: 'A message', detail: 'Texts, emails, DMs, and other messages', href: '/analyze/message', icon: MessageSquareText, label: 'Message' },
  { title: 'A link', detail: 'Inspect a URL without opening it', href: '/analyze/url', icon: Link2, label: 'URL' },
  { title: 'A screenshot', detail: 'Read suspicious messages in an image', href: '/analyze/qr', icon: Image, label: 'Image' },
  { title: 'A QR code', detail: 'Decode a code without visiting its destination', href: '/analyze/qr?mode=qr', icon: QrCode, label: 'QR code' },
  { title: 'A document', detail: 'Review a file for suspicious content', href: '/analyze/document', icon: FileText, label: 'Document' },
  { title: 'An audio clip', detail: 'Check audio with optional transcription', href: '/analyze/voice', icon: AudioLines, label: 'Audio' },
];

function riskTone(level?: string) {
  switch (level?.toUpperCase()) {
    case 'LOW': return 'risk-low';
    case 'MEDIUM': return 'risk-medium';
    case 'HIGH': return 'risk-high';
    case 'CRITICAL': return 'risk-critical';
    default: return 'risk-neutral';
  }
}
function riskName(level?: string) {
  switch (level?.toUpperCase()) {
    case 'LOW': return 'Lower risk';
    case 'MEDIUM': return 'Some concerns';
    case 'HIGH': return 'High risk';
    case 'CRITICAL': return 'Critical risk';
    default: return level || 'Not assessed';
  }
}
function formatDate(value?: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function mutationError(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'We couldn’t complete this check. Please try again.';
}
function ResultLink({ id, children = 'View explanation' }: { id: string; children?: string }) {
  return <Link href={`/results/${encodeURIComponent(id)}`} className="text-link">{children}<ArrowRight size={15} /></Link>;
}

export function HomePage() {
  const healthz = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const health = useGetHealth({ query: { queryKey: getGetHealthQueryKey() } });
  const version = useGetVersion({ query: { queryKey: getGetVersionQueryKey() } });
  return <div className="home-page">
    <section className="hero-panel quiet-grid enter">
      <div className="hero-copy">
        <div className="eyebrow"><span /> DIGITAL SAFETY, MADE CLEAR</div>
        <h1>Pause. Check.<br /><em>Know what to do.</em></h1>
        <p className="hero-lede">A strange message. A link you weren’t expecting. TrustGuard helps you look closer—without asking you to guess.</p>
        <div className="hero-actions"><Link className="button button-primary" href="/analyze">Check something <ArrowRight size={16} /></Link><Link className="button button-ghost" href="/how-it-works">How it works</Link></div>
        <div className="hero-assurance"><span><LockKeyhole size={14} /> No account needed</span><span><Fingerprint size={14} /> Results stay in this session</span></div>
      </div>
      <div className="hero-art" aria-label="Illustration of a protected message">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="art-corner art-corner-tl" /><div className="art-corner art-corner-br" />
        <div className="message-float"><div className="float-head"><span className="tiny-avatar">M</span><div><b>Unknown sender</b><small>Just now</small></div><span className="message-dot" /></div><div className="message-copy">Your account needs attention. Verify now to avoid a service interruption.</div><div className="link-chip"><Link2 size={13} /><span>secure-account-check.co</span></div></div>
        <div className="scan-line" />
        <div className="signal-card"><div className="signal-icon"><ScanLine size={19} /></div><div><span>TRUSTGUARD SIGNAL</span><b>Urgency + unfamiliar link</b><small>Two details worth checking</small></div><ChevronRight size={17} /></div>
        <div className="hero-art-caption"><span className="art-caption-line" /> Read the signs. Choose your next step.</div>
      </div>
    </section>
    <div className="trust-strip enter-delay"><div><span className="strip-mark"><ShieldCheck size={17} /></span><span>Grounded in visible signals</span></div><span className="strip-divider" /><div><span className="strip-mark"><Info size={17} /></span><span>Explainable, not a verdict</span></div><span className="strip-divider" /><div><span className="strip-mark"><LockKeyhole size={17} /></span><span>Privacy-first by design</span></div></div>
    <section className="section-block">
      <div className="section-heading"><div><div className="eyebrow"><span /> START WITH WHAT YOU HAVE</div><h2>What would you like to check?</h2><p>Choose the kind of thing that made you pause.</p></div><Link href="/analyze" className="text-link">All check types <ArrowRight size={15} /></Link></div>
      <div className="quick-grid">{analyzers.slice(0, 4).map((item, index) => <Link key={item.label} href={item.href} className={`quick-card quick-card-${index}`} data-testid={`link-check-${item.label.toLowerCase().replace(' ', '-')}`}><span className="quick-icon"><item.icon size={19} strokeWidth={1.7} /></span><span className="quick-content"><b>{item.title}</b><small>{item.detail}</small></span><ArrowRight size={16} className="quick-arrow" /></Link>)}</div>
      <div className="home-more"><Link href="/analyze/document"><FileText size={16} /> Check a document <ArrowRight size={14} /></Link><Link href="/analyze/voice"><AudioLines size={16} /> Review an audio clip <ArrowRight size={14} /></Link><Link href="/digital-arrest"><ShieldAlert size={16} /> I’m being threatened by someone claiming to be an authority <ArrowRight size={14} /></Link></div>
    </section>
    <section className="home-lower">
      <Surface className="grounded-panel"><div className="eyebrow"><span /> A STEADIER WAY TO RESPOND</div><h2>Clear signals.<br /><em>Calmer next steps.</em></h2><p>TrustGuard points to the details it can see, explains what they may mean, and offers practical steps. It never claims to know for certain who sent something.</p><Link href="/how-it-works" className="text-link">See how checks are made <ArrowRight size={15} /></Link></Surface>
      <Surface className="service-panel"><div className="service-header"><div><div className="eyebrow"><span /> SERVICE STATUS</div><h3>TrustGuard systems</h3></div><Activity size={18} /></div>
        {(healthz.isLoading || health.isLoading || version.isLoading) ? <div className="service-skeleton"><Skeleton rows={2} /></div> : (healthz.isError || health.isError || version.isError) ? <Notice tone="warning">System availability details are temporarily unavailable.</Notice> : <><div className="service-row"><span><i className="status-point" /> Health check</span><b>{healthz.data?.status ?? 'Status unavailable'}</b></div><div className="service-row"><span><i className="status-point" /> Application</span><b>{health.data?.status ?? 'Status unavailable'}</b></div><div className="service-meta"><span>Analysis engine</span><b>{version.data?.analysis_engine ?? 'Not reported'}</b></div><div className="service-meta"><span>External reputation</span><b>{version.data?.external_reputation_available ? 'Available' : 'Not available'}</b></div><div className="service-meta"><span>Audio transcription</span><b>{version.data?.audio_transcription_available ? 'Available' : 'Not available'}</b></div></>}
      </Surface>
    </section>
    <section className="bottom-callout"><div><span className="callout-icon"><CircleHelp size={19} /></span><div><b>Under pressure right now?</b><p>Learn about digital arrest scams and how to respond safely.</p></div></div><Link href="/digital-arrest" className="button button-secondary">Get calm guidance <ArrowRight size={15} /></Link></section>
  </div>;
}

export function AnalyzeChooserPage() {
  return <><PageHeading eyebrow="CHECK SOMETHING" title="What are you looking at?" description="Choose a format. We’ll look at the available signals and explain what we can—and can’t—tell." />
    <div className="analyzer-grid">{analyzers.map((item, index) => <Link href={item.href} key={item.label} className="analyzer-card" data-testid={`link-analyzer-${item.label.toLowerCase().replace(' ', '-')}`}><div className="analyzer-top"><span className="analyzer-icon"><item.icon size={20} /></span><span className="analyzer-index">0{index + 1}</span></div><h2>{item.title}</h2><p>{item.detail}</p><div className="analyzer-cta">Choose this check <ArrowRight size={15} /></div></Link>)}</div>
    <Notice><LockKeyhole size={15} /> Uploads are temporary. Files are capped by the service and are not kept as full results.</Notice>
  </>;
}

type AnalyzerKind = 'message' | 'url' | 'document' | 'qr' | 'voice' | 'digital_arrest';
const config: Record<AnalyzerKind, { title: string; eyebrow: string; description: string; submit: string }> = {
  message: { title: 'Check a message', eyebrow: 'MESSAGE CHECK', description: 'Paste the message as it appeared. Remove anything personal you don’t want to include.', submit: 'Review this message' },
  url: { title: 'Check a link', eyebrow: 'LINK CHECK', description: 'Paste a URL to inspect its visible structure. TrustGuard won’t open the destination.', submit: 'Inspect this link' },
  document: { title: 'Check a document', eyebrow: 'DOCUMENT CHECK', description: 'Upload a document for text extraction and indicator review.', submit: 'Review document' },
  qr: { title: 'Check an image or QR code', eyebrow: 'IMAGE CHECK', description: 'Upload a screenshot to read its contents, or a QR image to decode its destination without visiting it.', submit: 'Analyze image' },
  voice: { title: 'Review an audio clip', eyebrow: 'AUDIO CHECK', description: 'Choose whether to send the audio to OpenAI for transcription and local signal analysis.', submit: 'Analyze audio' },
  digital_arrest: { title: 'Digital arrest support', eyebrow: 'CALM GUIDANCE', description: 'Paste the message or describe what the caller said. We’ll look for coercive authority-impersonation signals.', submit: 'Check these signals' },
};

export function AnalyzerPage({ kind }: { kind: AnalyzerKind }) {
  const settings = config[kind];
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();
  const textMutation = useAnalyzeText();
  const digitalMutation = useAnalyzeDigitalArrest();
  const urlMutation = useAnalyzeUrl();
  const imageMutation = useAnalyzeImage();
  const qrMutation = useAnalyzeQr();
  const documentMutation = useAnalyzeDocument();
  const audioMutation = useAnalyzeAudio();
  const mutation = kind === 'message' ? textMutation : kind === 'digital_arrest' ? digitalMutation : kind === 'url' ? urlMutation : kind === 'document' ? documentMutation : kind === 'voice' ? audioMutation : (new URLSearchParams(window.location.search).get('mode') === 'qr' ? qrMutation : imageMutation);
  const pending = mutation.isPending;
  const canSubmit = kind === 'url' ? !!url.trim() : ['document', 'qr', 'voice'].includes(kind) ? !!file : !!text.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const id = sessionId();
    const onSuccess = (result: AnalysisResult) => {
      saveResult(result.analysis_id, result);
      setLocation(`/results/${encodeURIComponent(result.analysis_id)}`);
    };
    if (kind === 'message' || kind === 'digital_arrest') {
      if (!text.trim()) return;
      const data = { session_id: id, text: text.trim() };
      (kind === 'message' ? textMutation : digitalMutation).mutate({ data }, { onSuccess, onError: (reason) => setError(mutationError(reason)) });
    } else if (kind === 'url') {
  const submittedUrl = url.trim();

  if (!submittedUrl) {
    setError('Please enter a URL.');
    return;
  }

  try {
    const parsedUrl = new URL(submittedUrl);

    if (
      !['http:', 'https:'].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname.includes('.') ||
      /\s/.test(submittedUrl)
    ) {
      throw new Error('Invalid URL');
    }
  } catch {
    setError('Enter a valid http:// or https:// URL.');
    return;
  }

  urlMutation.mutate(
    {
      data: {
        session_id: id,
        url: submittedUrl,
      },
    },
    {
      onSuccess,
      onError: (reason) => setError(mutationError(reason)),
    },
  );
} else if (file) {
      if (kind === 'voice' && !optIn) { setError('Please confirm the transcription disclosure before sending this audio.'); return; }
      const data = { session_id: id, file };
      const options = { onSuccess, onError: (reason: unknown) => setError(mutationError(reason)) };
      if (kind === 'document') documentMutation.mutate({ data }, options);
      else if (kind === 'voice') audioMutation.mutate({ data: { ...data, allow_external_transcription: true } }, options);
      else if (new URLSearchParams(window.location.search).get('mode') === 'qr') qrMutation.mutate({ data }, options);
      else imageMutation.mutate({ data }, options);
    }
  }
  return <div className="analyze-page">
    <PageHeading eyebrow={settings.eyebrow} title={settings.title} description={settings.description}><Link href="/analyze" className="back-link">All check types <ChevronRight size={14} /></Link></PageHeading>
    {kind === 'digital_arrest' && <Notice tone="warning"><ShieldAlert size={16} /> No legitimate authority should demand payment, secrecy, or an immediate video call to avoid arrest. If you feel in immediate danger, contact local emergency services through a number you find independently.</Notice>}
    <div className="form-layout">
      <Surface className="input-surface">
        <form onSubmit={submit}>
          {(kind === 'message' || kind === 'digital_arrest') && <label className="field-label" htmlFor="message-input">{kind === 'digital_arrest' ? 'What did they say or ask you to do?' : 'Message text'} <span>Required</span></label>}
          {(kind === 'message' || kind === 'digital_arrest') && <textarea id="message-input" className="text-area" value={text} onChange={(event) => setText(event.target.value)} maxLength={50000} placeholder={kind === 'digital_arrest' ? 'Paste the message or summarize the call…' : 'Paste the message here…'} data-testid="input-message" required />}
          {kind === 'url' && <><label className="field-label" htmlFor="url-input">Web address <span>Required</span></label><div className="url-field"><Globe2 size={17} /><input id="url-input" type="text" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} maxLength={2048} placeholder="https://example.com/path" data-testid="input-url" required /></div><p className="field-hint">We inspect the text of the address only. We do not visit the destination.</p></>}
          {['document', 'qr', 'voice'].includes(kind) && <><label className="field-label" htmlFor="file-input">{kind === 'document' ? 'Choose a document' : kind === 'voice' ? 'Choose an audio file' : new URLSearchParams(window.location.search).get('mode') === 'qr' ? 'Choose a QR image' : 'Choose a screenshot'} <span>Required</span></label><label className="upload-zone" htmlFor="file-input"><input id="file-input" type="file" accept={kind === 'document' ? '.pdf,.docx,.txt' : kind === 'voice' ? '.mp3,.wav,.webm,.m4a,.mp4' : 'image/*'} onChange={(event) => setFile(event.target.files?.[0] ?? null)} data-testid="input-file" /><span className="upload-symbol"><Upload size={21} /></span><b>{file ? file.name : 'Choose a file to upload'}</b><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · temporary upload` : kind === 'document' ? 'PDF, DOCX, or TXT · temporary and service-capped' : kind === 'voice' ? 'MP3, WAV, WEBM, M4A, or MP4 · temporary and service-capped' : 'Image file · temporary and service-capped'}</small></label><p className="field-hint">Files are used for this check and are not retained as full results.</p></>}
          {kind === 'voice' && <div className="opt-in-box"><label className="checkbox-row"><input type="checkbox" checked={optIn} onChange={(event) => setOptIn(event.target.checked)} data-testid="input-audio-optin" /><span className="custom-check"><Check size={12} /></span><span><b>I explicitly agree to send this audio to OpenAI for transcription.</b><small>This starts unchecked. OpenAI receives the selected audio only after you check this box and submit.</small></span></label><div className="credits-note"><Info size={15} /> OpenAI API usage may incur charges on the account that owns the configured key.</div></div>}
          {error && <Notice tone="error"><AlertTriangle size={15} />{error}</Notice>}
          {mutation.isError && !error && <Notice tone="error"><AlertTriangle size={15} />{mutationError(mutation.error)}</Notice>}
          <div className="form-submit-row"><Button type="submit" loading={pending} disabled={!canSubmit || (kind === 'voice' && !optIn)} data-testid="button-analyze">{pending ? 'Reviewing…' : settings.submit}<ArrowRight size={16} /></Button><span><LockKeyhole size={13} /> Sent securely for analysis</span></div>
        </form>
      </Surface>
      <aside className="form-aside">
        <Surface className="aside-card"><span className="aside-icon"><ShieldCheck size={19} /></span><h3>What happens next?</h3><p>You’ll see the signals we found, the context behind them, and clear next steps.</p><ul><li><Check size={14} /> Evidence, not a guess</li><li><Check size={14} /> Recommendations you can act on</li><li><Check size={14} /> Limits explained plainly</li></ul></Surface>
        <div className="aside-footnote"><LockKeyhole size={14} /><p>Analysis details are kept in this browser session. Server-side history contains metadata only.</p></div>
      </aside>
    </div>
  </div>;
}

export function DigitalArrestPage() {
  return <div className="arrest-page">
    <PageHeading eyebrow="WHEN SOMEONE IS PRESSURING YOU" title="You have time to pause." description="“Digital arrest” is a coercive scam pattern. Someone may pose as police, a court, or another authority and try to keep you on a call or force an immediate payment." />
    <div className="arrest-urgent"><ShieldAlert size={23} /><div><b>Do not send money, share codes, or install an app because someone on a call tells you to.</b><p>Hang up. Contact the organization using a number from its official website or a document you already trust.</p></div></div>
    <div className="arrest-grid"><Surface><span className="step-num">01</span><h3>Break the pressure</h3><p>End the call or stop replying. A real official process will not require secrecy or a video call to keep you compliant.</p></Surface><Surface><span className="step-num">02</span><h3>Verify independently</h3><p>Find the organization’s contact details yourself. Don’t use numbers, links, or documents provided by the caller.</p></Surface><Surface><span className="step-num">03</span><h3>Get support</h3><p>Tell someone you trust what happened. If you already sent money, contact your bank promptly using its official contact channel.</p></Surface></div>
    <Surface className="arrest-analysis"><div><div className="eyebrow"><span /> CHECK THE MESSAGE</div><h2>Want to look at the details together?</h2><p>Paste the message or describe the call. TrustGuard can point out coercive patterns without claiming to establish who contacted you.</p><a className="button button-primary" href="#digital-arrest-check">Check a message <ArrowRight size={15} /></a></div><div className="arrest-art"><div className="arrest-ring"><LockKeyhole size={37} /></div><span className="arrest-line line-a" /><span className="arrest-line line-b" /><span className="arrest-line line-c" /><i className="arrest-node node-a" /><i className="arrest-node node-b" /><i className="arrest-node node-c" /></div></Surface>
    <div id="digital-arrest-check"><AnalyzerPage kind="digital_arrest" /></div>
    <Notice tone="neutral"><Info size={15} /> TrustGuard provides information, not law enforcement or emergency services. If you are in immediate danger, contact local emergency services directly.</Notice>
  </div>;
}

function RiskBadge({ level }: { level: string }) {
  return <span className={`risk-badge ${riskTone(level)}`}><span className="risk-glyph">{level === 'LOW' ? <Check size={12} /> : level === 'MEDIUM' ? <Info size={12} /> : <AlertTriangle size={12} />}</span>{riskName(level)}</span>;
}

export function ResultsPage() {
  const params = useParams<{ analysisId: string }>();
  const id = decodeURIComponent(params.analysisId ?? '');
  const sid = sessionId();
  const saved = loadResult<AnalysisResult>(id);
  const metaQuery = useReadAnalysis({ analysis_id: id, session_id: sid }, { query: { enabled: !!id, queryKey: getReadAnalysisQueryKey({ analysis_id: id, session_id: sid }) } });
  const report = useCreateReport();
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const metadata = metaQuery.data;
  function createReport() {
    if (!saved) return;
    const reportAnalysis = { ...saved, extracted_text: null, evidence: includeEvidence ? saved.evidence : [] };
    report.mutate({ data: { analysis_id: id, session_id: sid, include_evidence: includeEvidence, analysis: reportAnalysis } }, {
      onSuccess: (doc: ReportDocument) => {
        const blob = new Blob([doc.html], { type: 'text/html;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = href; anchor.download = doc.filename || 'trustguard-report.html'; anchor.click();
        URL.revokeObjectURL(href);
      },
    });
  }
  if (metaQuery.isLoading && !saved) return <><PageHeading eyebrow="ANALYSIS" title="Loading your check…" description="Retrieving privacy-safe result details." /><Surface><Skeleton rows={5} /></Surface></>;
  if (metaQuery.isError && !saved) return <><PageHeading eyebrow="ANALYSIS" title="This result isn’t available" description="Full analysis results are kept in this browser session. This session no longer has the explanation data." /><Notice tone="warning"><Info size={15} /> Metadata lookup also failed. You can return to the analyzer and check the item again.</Notice><Link href="/analyze" className="button button-primary">Start a new check <ArrowRight size={15} /></Link></>;
  if (!saved) return <><PageHeading eyebrow="ANALYSIS" title={metadata?.category || 'Check summary'} description="The full explanation is not present in this browser session. Only privacy-safe metadata is available." /><Surface className="metadata-only"><div className="metadata-head"><RiskBadge level={metadata?.risk_level ?? ''} /><span className="mono-id">REF {metadata?.analysis_id ?? id}</span></div><div className="metadata-fields"><div><small>Risk score</small><b>{metadata ? `${metadata.risk_score} / 100` : 'Not available'}</b></div><div><small>Category</small><b>{metadata?.category || 'Not available'}</b></div><div><small>Checked</small><b>{formatDate(metadata?.created_at)}</b></div></div><p>{metadata?.summary || 'Full explanations and source content are not stored on the server. Run the check again to review complete details.'}</p><Link href="/analyze" className="button button-primary">Check another item <ArrowRight size={15} /></Link></Surface></>;
  return <div className="results-page">
    <PageHeading eyebrow="YOUR CHECK" title="Here’s what we found." description="This is a signal-based assessment, not a definitive verdict about the sender or destination."><Button variant="secondary" onClick={createReport} loading={report.isPending} data-testid="button-report"><ArrowDownToLine size={15} /> Save report</Button></PageHeading>
    {report.isError && <Notice tone="error">The report could not be created. Please try again.</Notice>}
    <Surface className={`result-summary ${riskTone(saved.risk_level)}`}><div className="result-summary-main"><div className="result-icon"><Shield size={21} /></div><div><span className="summary-overline">ASSESSMENT</span><h2>{riskName(saved.risk_level)}</h2><p>{saved.category}</p></div></div><div className="result-score"><small>Risk score</small><b>{saved.risk_score}<span>/100</span></b><div className="score-track"><i style={{ width: `${Math.max(0, Math.min(saved.risk_score, 100))}%` }} /></div><span>Based on available signals</span></div><div className="risk-legend"><RiskBadge level={saved.risk_level} /><span>{saved.evidence_quality.toLowerCase()} evidence quality</span></div></Surface>
    <div className="results-columns">
      <div className="results-main">
        <Surface className="explanation-card"><div className="surface-title"><div><div className="eyebrow"><span /> THE EXPLANATION</div><h2>Why this signal?</h2></div><span className="explanation-mark"><Sparkles size={18} /></span></div><p className="explanation-text">{saved.explanation}</p><div className="quality-line"><span>Evidence quality</span><b>{saved.evidence_quality}</b><span className="quality-description">{saved.evidence_quality === 'LIMITED' ? 'There is limited information to assess.' : saved.evidence_quality === 'MODERATE' ? 'Some useful details were available.' : 'Multiple supporting details were available.'}</span></div></Surface>
        <Surface className="indicators-card"><div className="surface-title"><div><div className="eyebrow"><span /> VISIBLE SIGNALS</div><h2>Details worth noticing</h2></div><span className="count-pill">{saved.indicators.length}</span></div>{saved.indicators.length ? <div className="indicator-list">{saved.indicators.map((indicator) => <article className="indicator-row" key={indicator.id}><div className={`severity-mark severity-${indicator.severity}`}><span /></div><div className="indicator-copy"><div className="indicator-heading"><b>{indicator.label}</b><span className={`severity-label severity-text-${indicator.severity}`}>{indicator.severity} signal</span></div><p>{indicator.description}</p><div className="evidence-quote-list">{saved.evidence.filter((item) => item.indicator_id === indicator.id).map((item, index) => <blockquote key={`${item.indicator_id}-${index}`}>“{item.text}”</blockquote>)}</div></div></article>)}</div> : <div className="empty-inline"><BadgeCheck size={18} /><span>No specific indicators were returned for this check.</span></div>}</Surface>
        {saved.attack_chain.length > 0 && <Surface className="chain-card"><div className="eyebrow"><span /> POSSIBLE SEQUENCE</div><h2>How these signals can connect</h2><div className="chain-list">{saved.attack_chain.map((step, index) => <div className="chain-step" key={`${index}-${step}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p>{index < saved.attack_chain.length - 1 && <i />}</div>)}</div></Surface>}
        <Surface className="recommend-card"><div className="surface-title"><div><div className="eyebrow"><span /> PRACTICAL NEXT STEPS</div><h2>What you can do now</h2></div><ClipboardCheck size={19} /></div>{saved.recommendations.length ? <ol>{saved.recommendations.map((item, index) => <li key={`${index}-${item}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>)}</ol> : <p>No recommendations were returned for this analysis.</p>}</Surface>
      </div>
      <aside className="results-aside">
        <Surface className="integrity-card"><div className="eyebrow"><span /> WHAT THIS MEANS</div><h3>A signal, not certainty.</h3><p>Automated checks can miss context. A high signal does not prove harm; a low signal does not guarantee safety.</p><div className="intelligence-state"><span className="provider-icon"><Globe2 size={16} /></span><div><b>External reputation</b><small>{saved.external_intelligence.message || saved.external_intelligence.status}</small></div></div></Surface>
        <Surface className="technical-card"><div className="eyebrow"><span /> ANALYSIS DETAILS</div><div className="tech-row"><span>Engine</span><b>{saved.technical_analysis.engine}</b></div><div className="tech-row"><span>Semantic analysis</span><b>{saved.technical_analysis.semantic_analysis}</b></div><div className="tech-row"><span>Extracted text</span><b>{saved.technical_analysis.extracted_text_available ? 'Available' : 'Not available'}</b></div><div className="tech-row"><span>Audio transcription</span><b>{saved.technical_analysis.audio_transcription || 'Not available'}</b></div></Surface>
        <Surface className="report-controls"><div className="eyebrow"><span /> EXPORT</div><label className="checkbox-row"><input type="checkbox" checked={includeEvidence} onChange={(event) => setIncludeEvidence(event.target.checked)} data-testid="input-report-evidence" /><span className="custom-check"><Check size={12} /></span><span>Include evidence in report</span></label><Button variant="secondary" onClick={createReport} loading={report.isPending} data-testid="button-create-report"><ArrowDownToLine size={15} /> Download report</Button></Surface>
      </aside>
    </div>
    {saved.extracted_text && <details className="extracted-details"><summary>View extracted text <ChevronRight size={14} /></summary><pre>{saved.extracted_text}</pre></details>}
    <Notice><Info size={15} />{saved.disclaimer}</Notice>
    <div className="results-end"><span className="mono-id">ANALYSIS {saved.analysis_id}</span><Link href="/analyze" className="button button-primary">Check something else <ArrowRight size={15} /></Link></div>
  </div>;
}

export function HistoryPage() {
  const sid = sessionId();
  const queryClient = useQueryClient();
  const query = useListHistory({ session_id: sid }, { query: { queryKey: getListHistoryQueryKey({ session_id: sid }) } });
  const clearMutation = useClearHistory();
  const items = query.data?.items ?? [];
  function clearHistory() {
    if (!window.confirm('Clear metadata history for this session? Full results stored in this browser session will also be removed.')) return;
    clearMutation.mutate({ params: { session_id: sid } }, {
      onSuccess: () => {
        clearLocalResults();
        queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey({ session_id: sid }) });
      },
    });
  }
  return <><PageHeading eyebrow="YOUR SESSION" title="Recent checks" description="A metadata-only list of checks made in this browser session." >{items.length > 0 && <Button variant="ghost" onClick={clearHistory} loading={clearMutation.isPending} data-testid="button-clear-history"><RotateCcw size={15} /> Clear history</Button>}</PageHeading>
    {query.isLoading && <Surface><Skeleton rows={6} /></Surface>}
    {query.isError && <Surface className="error-state"><AlertTriangle size={23} /><h2>History could not be loaded</h2><p>Check your connection and try again.</p><Button variant="secondary" onClick={() => query.refetch()} data-testid="button-retry-history"><RotateCcw size={15} /> Try again</Button></Surface>}
    {clearMutation.isError && <Notice tone="error">History could not be cleared. Try again.</Notice>}
    {query.isSuccess && items.length === 0 && <Surface className="empty-state"><div className="empty-symbol"><Clock3 size={23} /></div><h2>No checks in this session yet</h2><p>When you analyze a message, link, image, document, or audio clip, its metadata will appear here.</p><Link href="/analyze" className="button button-primary">Start a check <ArrowRight size={15} /></Link></Surface>}
    {query.isSuccess && items.length > 0 && <Surface className="history-surface"><div className="history-list">{items.map((item: AnalysisHistoryItem) => <div className="history-row" key={item.analysis_id}><div className="history-type"><span>{item.input_type === 'url' ? <Globe2 size={17} /> : item.input_type === 'audio' ? <AudioLines size={17} /> : item.input_type === 'document' ? <FileText size={17} /> : item.input_type === 'qr' ? <QrCode size={17} /> : <MessageSquareText size={17} />}</span><div><b>{item.category}</b><small>{formatDate(item.created_at)} <span>·</span> {item.input_type.replace('_', ' ')}</small></div></div><div className="history-summary">{item.summary}</div><div className="history-result"><RiskBadge level={item.risk_level} /><span>{item.risk_score} / 100</span></div><ResultLink id={item.analysis_id} /></div>)}</div></Surface>}
  </>;
}

export function HowItWorksPage() {
  return <><PageHeading eyebrow="PLAIN-LANGUAGE EXPLANATIONS" title="How a check works" description="TrustGuard surfaces indicators from the content you provide. It helps you think through a message—it doesn’t identify a sender or guarantee a destination is safe." />
    <div className="process-stack"><Surface className="process-step"><span className="step-num">01</span><div><h2>Share only what you choose</h2><p>Paste a message or URL, or select a file for a temporary upload. You can remove personal details before submitting.</p></div><span className="process-icon"><Fingerprint size={19} /></span></Surface><Surface className="process-step"><span className="step-num">02</span><div><h2>We look for available signals</h2><p>Depending on the input, the analysis may inspect language, structure, extracted text, or available reputation data. Providers may not always be available.</p></div><span className="process-icon"><ScanLine size={19} /></span></Surface><Surface className="process-step"><span className="step-num">03</span><div><h2>You see the evidence and limits</h2><p>Results explain the indicators returned by the analysis, evidence quality, and practical recommendations. They are not a definitive verdict.</p></div><span className="process-icon"><Info size={19} /></span></Surface><Surface className="process-step"><span className="step-num">04</span><div><h2>Choose your next step</h2><p>Pause before replying, clicking, paying, or sharing a code. Verify unexpected requests through a channel you find independently.</p></div><span className="process-icon"><Check size={19} /></span></Surface></div>
    <div className="two-note-grid"><Surface><h3>Risk score</h3><p>A relative signal from this analysis, not a probability or a guarantee. Review the underlying evidence and context.</p></Surface><Surface><h3>Evidence quality</h3><p>Describes how much usable supporting information was returned. Limited evidence means the result may have more uncertainty.</p></Surface></div>
    <Notice><Info size={15} /> Automated analysis can be incomplete or wrong. When a request involves money, identity, access, or urgency, verify independently.</Notice>
  </>;
}

export function PrivacyPage() {
  return <><PageHeading eyebrow="YOUR INFORMATION" title="Privacy, plainly stated." description="Share only what you need to check. TrustGuard is designed to keep analysis details separate from session history." />
    <div className="privacy-hero"><div className="privacy-hero-icon"><LockKeyhole size={25} /></div><div><h2>Full results stay in this browser session.</h2><p>TrustGuard does not store full analysis results as server-side history. The history list contains metadata only.</p></div></div>
    <div className="privacy-grid"><Surface><span className="privacy-number">01</span><h3>Session-only details</h3><p>Analysis output is kept in session storage for this browser session so you can view results. Closing the session can remove it.</p></Surface><Surface><span className="privacy-number">02</span><h3>Metadata history</h3><p>History may include an analysis identifier, date, input type, risk score and level, category, and summary. You can clear this session’s metadata history.</p></Surface><Surface><span className="privacy-number">03</span><h3>Temporary uploads</h3><p>Files are submitted for analysis, temporary, and subject to service upload caps. Avoid sending unnecessary sensitive information.</p></Surface><Surface><span className="privacy-number">04</span><h3>Optional audio provider</h3><p>Audio is sent to OpenAI only after you explicitly opt in. OpenAI’s processing terms apply, and usage may incur charges on the account that owns the configured API key.</p></Surface></div>
    <Surface className="privacy-control"><div><h3>Manage this session</h3><p>Clear saved analysis details from this browser session and remove metadata history from the service.</p></div><Link href="/settings" className="button button-secondary">Open settings <ArrowRight size={15} /></Link></Surface>
    <Notice><Info size={15} /> This page describes the product behavior presented here. Avoid uploading information you do not have permission to share.</Notice>
  </>;
}

export function AboutPage() {
  return <><PageHeading eyebrow="ABOUT TRUSTGUARD" title="Technology should lower the temperature." description="TrustGuard AI is an everyday-person digital safety companion for the moments when something feels off." />
    <Surface className="about-statement"><span className="about-quote-mark">“</span><h2>Not more alarm.<br /><em>More understanding.</em></h2><p>Our purpose is simple: turn alarming messages, links, and files into grounded, explainable signals and calm next steps—without pretending to be certain.</p></Surface>
    <div className="principles-grid"><Surface><span className="principle-icon"><Info size={18} /></span><h3>Explain the why</h3><p>Show the indicators and evidence behind a result instead of asking people to trust a mysterious score.</p></Surface><Surface><span className="principle-icon"><ShieldCheck size={18} /></span><h3>Respect uncertainty</h3><p>A tool can help identify patterns. It cannot establish intent, verify a person’s identity, or guarantee safety.</p></Surface><Surface><span className="principle-icon"><HeartPulseIcon /></span><h3>Keep people steady</h3><p>Practical recommendations should help people pause and verify, not push them into panic.</p></Surface></div>
    <div className="about-end"><Link href="/how-it-works" className="text-link">How analysis works <ArrowRight size={15} /></Link><Link href="/privacy" className="text-link">Our privacy approach <ArrowRight size={15} /></Link></div>
  </>;
}
function HeartPulseIcon() { return <Activity size={18} />; }

export function SettingsPage() {
  const sid = sessionId();
  const queryClient = useQueryClient();
  const clearMutation = useClearHistory();
  const [message, setMessage] = useState('');
  function clearSession() {
    if (!window.confirm('Remove saved result details from this browser session and clear server-side metadata history?')) return;
    clearLocalResults();
    clearMutation.mutate({ params: { session_id: sid } }, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey({ session_id: sid }) });
        setMessage(`${result.deleted} history record${result.deleted === 1 ? '' : 's'} cleared from this session.`);
      },
      onError: () => setMessage('Server-side history could not be cleared. Local result details were removed.'),
    });
  }
  return <><PageHeading eyebrow="PREFERENCES & SESSION" title="Settings" description="Manage the data held for your current session." />
    <Surface className="settings-section"><div className="settings-header"><span className="settings-icon"><Fingerprint size={19} /></span><div><h2>Current session</h2><p>A temporary identifier is used to associate analysis metadata with this browser session.</p></div></div><div className="settings-data"><span>Session identifier</span><code>{sid}</code><span>Full result data</span><b>Stored in this browser session only</b><span>Server history</span><b>Metadata only</b></div></Surface>
    <Surface className="settings-section danger-zone"><div className="settings-header"><span className="settings-icon danger"><RotateCcw size={18} /></span><div><h2>Clear session data</h2><p>Removes locally saved result details and asks the service to delete this session’s metadata history.</p></div></div><div className="settings-action"><Button variant="danger" onClick={clearSession} loading={clearMutation.isPending} data-testid="button-clear-session">Clear this session <RotateCcw size={15} /></Button></div>{message && <Notice tone={clearMutation.isError ? 'warning' : 'success'}>{message}</Notice>}</Surface>
    <div className="settings-links"><Link href="/privacy" className="text-link">Read privacy details <ArrowRight size={15} /></Link><Link href="/history" className="text-link">View recent checks <ArrowRight size={15} /></Link></div>
  </>;
}