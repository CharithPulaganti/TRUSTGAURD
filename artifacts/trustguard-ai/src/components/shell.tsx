import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, ArrowUpRight, FileClock, Fingerprint, HelpCircle, LockKeyhole, Menu, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Overview', icon: ShieldCheck },
  { href: '/analyze', label: 'Analyze something', icon: Activity },
  { href: '/digital-arrest', label: 'Digital arrest', icon: LockKeyhole },
  { href: '/history', label: 'Recent checks', icon: FileClock },
];
const secondary = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/about', label: 'About TrustGuard' },
  { href: '/settings', label: 'Settings' },
];

function NavLink({ href, children, active, icon: Icon }: { href: string; children: ReactNode; active?: boolean; icon?: typeof ShieldCheck }) {
  return <Link href={href} className={`nav-link ${active ? 'nav-link-active' : ''}`} data-testid={`link-${href.replaceAll('/', '') || 'home'}`}>
    {Icon && <Icon size={17} strokeWidth={1.8} />}<span>{children}</span>
  </Link>;
}

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  return <div className="app-frame">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <Link href="/" className="brand" aria-label="TrustGuard AI home">
        <span className="brand-symbol"><ShieldCheck size={22} strokeWidth={1.7} /></span>
        <span className="brand-copy"><b>trustguard</b><small>PERSONAL DIGITAL SAFETY</small></span>
      </Link>
      <div className="nav-caption">YOUR SPACE</div>
      <nav className="primary-nav" aria-label="Main navigation">
        {navItems.map((item) => <NavLink key={item.href} href={item.href} active={location === item.href || (item.href === '/analyze' && location.startsWith('/analyze/'))} icon={item.icon}>{item.label}</NavLink>)}
      </nav>
      <div className="nav-caption nav-caption-secondary">GUIDANCE</div>
      <nav className="secondary-nav" aria-label="More">
        {secondary.map((item) => <NavLink key={item.href} href={item.href} active={location === item.href}>{item.label}</NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="privacy-prompt"><div className="privacy-icon"><Fingerprint size={17} /></div><b>Your checks stay yours.</b><p>Full results stay in this browser session. History stores metadata only.</p><Link href="/privacy">Read our privacy notes <ArrowUpRight size={13} /></Link></div>
        <div className="sidebar-foot"><span className="online-dot" /> Private session <span className="foot-divider">·</span> No account needed</div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <button className="mobile-menu icon-button" aria-label={open ? 'Close menu' : 'Open menu'} data-testid="button-menu" onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Menu size={19} />}</button>
        <div className="breadcrumb"><span>TrustGuard</span><span className="crumb-slash">/</span><b>{navItems.find((item) => location === item.href || (item.href === '/analyze' && location.startsWith('/analyze/')))?.label ?? 'Guidance'}</b></div>
        <div className="topbar-right"><span className="secure-session"><i /><span>Private session</span></span><Link href="/settings" className="top-avatar" aria-label="Settings">TG</Link></div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="site-footer"><span>TrustGuard AI <span className="foot-divider">·</span> Clear signals, calmer decisions.</span><div><Link href="/privacy">Privacy</Link><Link href="/how-it-works">How it works</Link><Link href="/about">About</Link><Link href="/settings">Settings</Link></div></footer>
    </div>
  </div>;
}

export function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-heading enter"><div className="eyebrow"><span />{eyebrow}</div><div className="heading-row"><div><h1>{title}</h1><p>{description}</p></div>{children && <div className="heading-action">{children}</div>}</div></div>;
}

export function Notice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warning' | 'error' | 'success' }) {
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}