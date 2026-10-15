'use client';
import { useEffect, useRef, useState } from 'react';
import { auth, api } from '@/lib/client';
import CinematicHome from '@/components/hrcloud/cinematic-home';
import FloatingChat from '@/components/ui/floating-chat';
import WorkspaceRouter, { JobSearch } from '@/components/workspace';

// Small inline sparkle icon used by the existing assistant UI. Kept local to avoid
// adding another dependency or changing the app's behavior.
function SparkIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5Z" fill="currentColor" />
      <path d="M19 15.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3Z" fill="currentColor" opacity=".7" />
    </svg>
  );
}

type User = { userId: string; email?: string; name?: string; role?: 'candidate' | 'business' | 'admin' | null; isAdminAuthorized?: boolean; authProvider?: string };
type Job = {
  id: string;
  title: string;
  category: string;
  location: string;
  workType: string;
  description: string;
  requirements: string;
  status: string;
  openings: number;
};

function useHash() {
  // `location` does not exist during server rendering / `next build`; read it only in the browser.
  const [route, setRoute] = useState('/');
  useEffect(() => {
    const f = () => setRoute(window.location.hash.slice(1) || '/');
    f();
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return route;
}
const HOME_ROUTES = ['/opportunities', '/updates', '/services', '/how-it-works', '/about', '/contact', '/get-started', '/signup', '/login'];
function go(path: string) {
  location.hash = path;
}

export default function App() {
  const route = useHash();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    auth
      .getUser()
      .then(u => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="boot">
        <div className="mark">SB</div>
        <span>Loading StewardBridge</span>
      </div>
    );
  // UI visibility follows the server-issued role; the API independently enforces admin authorization.
  const admin = user?.role === 'admin' && user?.isAdminAuthorized === true && user?.authProvider === 'google';
  return (
    <div className={'app-shell' + ((!HOME_ROUTES.includes(route) && !route.startsWith('/admin') && !route.startsWith('/workspace')) || route === '/opportunities' || route.startsWith('/workspace') ? ' is-home' : '')}>
      <Header user={user} admin={admin} />
      {route.startsWith('/admin') && user?.role === 'admin' && user?.isAdminAuthorized === true && user?.authProvider === 'google' ? (
        <Admin route={route} />
      ) : route.startsWith('/workspace') && user ? (
        <WorkspaceRouter user={user} route={route} />
      ) : (
        <Public route={route} user={user} />
      )}
      <FloatingChat user={user} />
      <Footer />
    </div>
  );
}

function Header({ user, admin }: { user: User | null; admin: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    // StewardBridge uses a single obsidian appearance.
    document.documentElement.dataset.theme = 'dark';
  }, []);
  return (
    <header className="nav">
      <button className="brand" onClick={() => go('/')}>
        <span className="bridge-logo">SB</span>
        <span>
          <b>STEWARD</b>
          <em>BRIDGE</em>
        </span>
      </button>
      <nav className={menuOpen ? "mobile-open" : ""}>
        <button onClick={() => { go('/services'); setMenuOpen(false); }}>For Businesses</button>
        <button onClick={() => { go('/opportunities'); setMenuOpen(false); }}>Find Opportunities</button>
        <button onClick={() => { go('/updates'); setMenuOpen(false); }}>Updates</button>
        <button onClick={() => { go('/how-it-works'); setMenuOpen(false); }}>How It Works</button>
        <button onClick={() => { go('/about'); setMenuOpen(false); }}>About</button>
        <button onClick={() => { go('/contact'); setMenuOpen(false); }}>Contact</button>
      </nav>
      <div className="nav-actions">
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation">{menuOpen ? "✕" : "☰"}</button>
        {user ? (
          <>
            <button
              className="ghost"
              onClick={() => go(admin ? '/admin' : '/workspace')}
            >
              Workspace
            </button>
            <button
              className="gold-btn"
              onClick={async () => {
                await auth.signOut();
                window.location.hash = '/';
                window.location.reload();
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <button className="ghost" onClick={() => window.location.assign('/auth/sign-in')}>
              Sign in
            </button>
            <button className="gold-btn" onClick={() => window.location.assign('/auth/sign-up')}>
              Join free
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function Public({ route, user }: { route: string; user: User | null }) {
  if (route === '/opportunities') return <JobSearch viewer={user} />;
  if (route === '/updates') return <Updates />;
  if (route === '/services')
    return (
      <Simple
        title="Services"
        kicker="WORKFORCE, RECRUITMENT, OPERATIONS"
        text="Recruitment, workforce sourcing, managed staffing and deployment support for hotels, restaurants, healthcare providers, logistics teams, facilities, retail, events and other organizations. One connected system, tailored to the way your business operates."
      />
    );
  if (route === '/how-it-works') return <HowItWorks />;
  if (route === '/about')
    return (
      <Simple
        title="About StewardBridge"
        kicker="THE BRIDGE BETWEEN PEOPLE AND OPERATIONS"
        text="A workforce platform built to connect people, organizations and operational teams from first enquiry through deployment and follow-up."
      />
    );
  if (route === '/contact') return <Contact />;
  if (route === '/get-started' || route === '/signup') return <ToAuth to="/auth/sign-up" />;
  if (route === '/login') return <ToAuth to="/auth/sign-in" />;
  return <CinematicHome user={user} go={go} />;
}
function ToAuth({ to }: { to: string }) {
  // Sign-in and sign-up live on standard pages: /auth/sign-in and /auth/sign-up.
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <main>
      <section className="page-hero">
        <p>Taking you to secure sign-in…</p>
      </section>
    </main>
  );
}
function Simple({
  title,
  kicker,
  text,
}: {
  title: string;
  kicker: string;
  text: string;
}) {
  return (
    <main>
      <section className="page-hero">
        <div className="eyebrow">{kicker}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </section>
      <section className="cards section">
        <Info
          title="Recruitment"
          text="Structured candidate discovery, applications, screening and progression."
        />
        <Info
          title="Staffing"
          text="Request, match, review and coordinate workforce requirements."
        />
        <Info
          title="Operations"
          text="Keep documents, conversations, schedules, deployments and follow-ups connected."
        />
      </section>
    </main>
  );
}
function Info({ title, text }: { title: string; text: string }) {
  return (
    <article className="info-card">
      <span>✦</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
function HowItWorks() {
  return (
    <main>
      <section className="page-hero">
        <div className="eyebrow">THE FLOW</div>
        <h1>One bridge. Every stage connected.</h1>
        <p>
          Public discovery leads into secure workspaces, then into real
          operational workflows.
        </p>
      </section>
      <section className="timeline section">
        {[
          'Discover',
          'Authenticate',
          'Onboard',
          'Match & apply',
          'Review & approve',
          'Deploy',
          'Follow up',
        ].map((x, i) => (
          <div className="step" key={x}>
            <b>0{i + 1}</b>
            <h3>{x}</h3>
            <p>
              {
                [
                  'Explore opportunities or request workforce support.',
                  'Use Google or email authentication.',
                  'Complete only the profile path relevant to your role.',
                  'Applications and staffing requests become real records.',
                  'Authorized teams review, communicate and approve.',
                  'Team members move into deployment operations.',
                  'Feedback, ratings and future opportunities stay connected.',
                ][i]
              }
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
function Updates() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/api/updates').then(r => setItems(r.data.items || [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);
  return (
    <main>
      <section className="page-hero compact">
        <div className="eyebrow">STEWARDBRIDGE NEWSROOM</div>
        <h1>Updates & announcements.</h1>
        <p>News, platform announcements and important opportunity updates from StewardBridge.</p>
      </section>
      <section className="section">
        {loading ? <div className="empty">Loading latest updates…</div> : items.length ? (
          <div className="job-grid">{items.map(item => <article className="job-card" key={item.id}><div className="job-top"><span>UPDATE</span><small>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</small></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        ) : <div className="empty">No updates have been published yet. Please check back soon.</div>}
      </section>
    </main>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  const [channels, setChannels] = useState<{ email: string | null; whatsapp: string | null; coverage: string }>({ email: null, whatsapp: null, coverage: 'Nationwide' });
  useEffect(() => { api.get('/api/contact').then(({ data }) => setChannels({ email: data.email || null, whatsapp: data.whatsapp || null, coverage: data.coverage || 'Nationwide' })).catch(() => undefined); }, []);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'General enquiry',
    message: '',
  });
  return (
    <main>
      <section className="page-hero">
        <div className="eyebrow">CONTACT STEWARDBRIDGE</div>
        <h1>Let’s connect the right next step.</h1>
        <p>
          Use the direct channels or send a structured enquiry into the
          operations inbox.
        </p>
      </section>
      <section className="section contact-grid">
        <div className="contact-panel">
          <h3>Direct channels</h3>
          {channels.whatsapp ? <a href={`https://wa.me/${channels.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp · +234 706 651 0205</a> : <span>WhatsApp · Not configured yet</span>}
          {channels.whatsapp ? <a href={`tel:+${channels.whatsapp.replace(/\D/g, '')}`}>Call · +234 706 651 0205</a> : null}
          {channels.email ? <a href={`mailto:${channels.email}`}>Email · {channels.email}</a> : <span>Email · Use the enquiry form</span>}
          <span>Coverage · {channels.coverage}</span>
        </div>
        <form
          className="contact-form"
          onSubmit={async e => {
            e.preventDefault();
            await api.post('/api/contact', form);
            setSent(true);
          }}
        >
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
          />
          <select
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
          >
            <option>General enquiry</option>
            <option>Find workers</option>
            <option>Find an opportunity</option>
            <option>Support</option>
          </select>
          <textarea
            required
            placeholder="How can StewardBridge help?"
            value={form.message}
            onChange={e => setForm({ ...form, message: e.target.value })}
          />
          <button className="gold-btn">
            {sent ? 'Enquiry received' : 'Send enquiry'} →
          </button>
        </form>
      </section>
    </main>
  );
}
function Admin({ route }: { route: string }) {
  const [section, setSection] = useState(route.split('/')[2] || 'dashboard');
  return (
    <main>
      <section className="workspace-head admin-head">
        <div>
          <div className="eyebrow">OWNER / ADMIN CONTROL ROOM</div>
          <h1>StewardBridge Operations</h1>
          <p>Authorized administration · source of truth across the platform</p>
        </div>
        <button className="gold-btn" onClick={() => go('/workspace')}>
          Public workspace
        </button>
      </section>
      <div className="workspace section">
        <aside>
          <button
            className={section === 'dashboard' ? 'active' : ''}
            onClick={() => setSection('dashboard')}
          >
            Overview
          </button>
          <button onClick={() => setSection('users')}>Users</button>
          <button onClick={() => setSection('jobs')}>Jobs</button>
          <button onClick={() => setSection('requests')}>
            Staffing Requests
          </button>
          <button onClick={() => setSection('applications')}>
            Applications
          </button>
          <button onClick={() => setSection('documents')}>Documents</button>
          <button onClick={() => setSection('messages')}>Conversations</button>
          <button onClick={() => setSection('ai')}>AI & Approvals</button>
          <button onClick={() => setSection('calendar')}>Calendar</button>
          <button onClick={() => setSection('feedback')}>Feedback</button>
          <button onClick={() => setSection('updates')}>Updates / Site</button>
          <button onClick={() => setSection('integrations')}>
            Integrations
          </button>
          <button onClick={() => setSection('audit')}>Audit Log</button>
          <button onClick={() => setSection('settings')}>Settings</button>
        </aside>
        <div className="workspace-content">
          {section === 'dashboard' && <AdminDashboard />}
          {section === 'users' && (
            <AdminList title="Users" endpoint="/api/admin/users" />
          )}
          {section === 'jobs' && <AdminJobs />}
          {section === 'requests' && (
            <AdminList
              title="Staffing Requests"
              endpoint="/api/admin/requests"
            />
          )}
          {section === 'applications' && (
            <AdminList
              title="Applications"
              endpoint="/api/admin/applications"
            />
          )}
          {section === 'documents' && (
            <AdminList title="Documents" endpoint="/api/admin/documents" />
          )}
          {section === 'messages' && (
            <AdminList title="Conversations" endpoint="/api/admin/messages" />
          )}
          {section === 'ai' && <AdminAI />}
          {section === 'calendar' && (
            <AdminList title="Calendar" endpoint="/api/admin/calendar" />
          )}
          {section === 'feedback' && (
            <AdminList
              title="Feedback & Ratings"
              endpoint="/api/admin/feedback"
            />
          )}
          {section === 'updates' && <AdminUpdates />}
          {section === 'integrations' && <Integrations />}
          {section === 'audit' && (
            <AdminList title="Audit Log" endpoint="/api/admin/audit" />
          )}
          {section === 'settings' && <AdminSettings />}
        </div>
      </div>
    </main>
  );
}
function AdminDashboard() {
  const [stats, setStats] = useState<any>({});
  useEffect(() => {
    api.get('/api/admin/overview').then(r => setStats(r.data.stats || {}));
  }, []);
  return (
    <div>
      <h2>Overview</h2>
      <div className="stat-grid">
        {[
          ['Users', stats.users || 0],
          ['Candidates', stats.candidates || 0],
          ['Jobs', stats.jobs || 0],
          ['Applications', stats.applications || 0],
          ['Requests', stats.requests || 0],
          ['Open approvals', stats.approvals || 0],
        ].map(x => (
          <div className="stat" key={x[0]}>
            <small>{x[0]}</small>
            <b>{x[1]}</b>
          </div>
        ))}
      </div>
      <div className="admin-callout">
        <b>AI operational layer</b>
        <p>
          The website Ask AI, Admin AI and future Telegram channel use the same
          authorized webhook agent and StewardBridge records. Sensitive actions
          can be prepared and sent for approval before execution.
        </p>
      </div>
    </div>
  );
}
function AdminList({ title, endpoint }: { title: string; endpoint: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api
      .get(endpoint)
      .then(r => setItems(r.data.items || []))
      .catch(() => setItems([]));
  }, [endpoint]);
  return (
    <div>
      <h2>{title}</h2>
      {items.length ? (
        <div className="data-list">
          {items.map(x => (
            <div className="data-row" key={x.id}>
              <div>
                <b>{x.fileName || x.title || x.name || x.subject || x.email || 'Record'}</b>
                <small>{x.role || x.status || x.type || ''}</small>
                {endpoint === '/api/admin/documents' && x.id && <a href={`/api/documents/${x.id}`} target="_blank" rel="noreferrer">Open private file</a>}
              </div>
              <span>{x.location || x.createdAt || ''}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">No records yet.</div>
      )}
    </div>
  );
}
function AdminJobs() {
  const [f, setF] = useState({
    title: '',
    category: 'All industries',
    location: 'Nationwide',
    workType: 'Full-time',
    description: '',
    requirements: '',
    openings: 1,
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const load = () => api.get('/api/jobs').then(r => setJobs(r.data.jobs || []));
  useEffect(() => {
    load();
  }, []);
  return (
    <div>
      <h2>Real Job Publisher</h2>
      <div className="form-grid">
        <input
          placeholder="Job title"
          value={f.title}
          onChange={e => setF({ ...f, title: e.target.value })}
        />
        <input
          placeholder="Category"
          value={f.category}
          onChange={e => setF({ ...f, category: e.target.value })}
        />
        <input
          placeholder="Location"
          value={f.location}
          onChange={e => setF({ ...f, location: e.target.value })}
        />
        <input
          placeholder="Work type"
          value={f.workType}
          onChange={e => setF({ ...f, workType: e.target.value })}
        />
        <textarea
          placeholder="Description"
          value={f.description}
          onChange={e => setF({ ...f, description: e.target.value })}
        />
        <textarea
          placeholder="Requirements"
          value={f.requirements}
          onChange={e => setF({ ...f, requirements: e.target.value })}
        />
        <input
          type="number"
          min="1"
          value={f.openings}
          onChange={e => setF({ ...f, openings: Number(e.target.value) })}
        />
        <button
          className="gold-btn"
          onClick={async () => {
            await api.post('/api/admin/jobs', f);
            setF({
              ...f,
              title: '',
              description: '',
              requirements: '',
              openings: 1,
            });
            load();
          }}
        >
          Publish job
        </button>
      </div>
      <div className="data-list">
        {jobs.map(j => (
          <div className="data-row" key={j.id}>
            <b>{j.title}</b>
            <span>
              {j.status} · {j.location}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function AdminUpdates() {
  const [text, setText] = useState('');
  return (
    <div>
      <h2>Website Update Publisher</h2>
      <textarea
        placeholder="Write an update or ask the AI to prepare one."
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button
        className="gold-btn"
        onClick={async () => {
          await api.post('/api/admin/updates', { text });
          setText('');
        }}
      >
        Publish update
      </button>
    </div>
  );
}
function AdminAI() {
  return (
    <div>
      <h2>AI & approvals</h2>
      <p className="muted">
        Webhook agent control. No OpenAI dependency is used by this application.
      </p>
      <AgentPanel embedded adminMode user={null} />
      <div className="approval-note">
        Consequential actions such as closing staffing opportunities, publishing
        sensitive content, or commercial actions should return an approval
        request and remain auditable.
      </div>
    </div>
  );
}
function Integrations() {
  const [s, setS] = useState<any>(null);
  useEffect(() => {
    api.get('/api/integrations/status').then(r => setS(r.data));
  }, []);
  return (
    <div>
      <h2>Integrations</h2>
      <div className="integration">
        <b>Agent Webhook</b>
        <span>
          {s?.webhookConfigured
            ? 'Configured'
            : 'Waiting for secure webhook URL'}
        </span>
      </div>
      <div className="integration">
        <b>Google Authentication</b>
        <span>Enabled</span>
      </div>
      <div className="integration">
        <b>Google Calendar</b>
        <span>Internal calendar ready · Google sync adapter</span>
      </div>
      <div className="integration">
        <b>Contact channels</b>
        <span>Public contact channels are read from server configuration; unset channels are not displayed publicly.</span>
      </div>
    </div>
  );
}
function AdminSettings() {
  return (
    <div>
      <h2>Settings</h2>
      <p className="muted">
        Operational configuration is server-side. Secrets are never exposed in
        the UI or source.
      </p>
      <div className="setting-box">
        <b>Authorized Owner</b>
        <span>Configured in the server-side ADMIN_EMAIL setting</span>
      </div>
      <div className="setting-box">
        <b>Public coverage</b>
        <span>Nationwide</span>
      </div>
      <div className="setting-box">
        <b>AI provider</b>
        <span>External StewardBridge agent via protected webhook</span>
      </div>
      <div className="setting-box">
        <b>Agent control plane</b>
        <span>GET /api/agent/manifest · GET/POST /api/agent/events · POST /api/agent/control</span>
      </div>
      <div className="setting-box">
        <b>Agent security</b>
        <span>Shared signing secret is server-side only; consequential actions are auditable.</span>
      </div>
    </div>
  );
}
function AgentPanel({
  user,
  onClose,
  embedded = false,
  adminMode = false,
}: {
  user: User | null;
  onClose?: () => void;
  embedded?: boolean;
  adminMode?: boolean;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);
  const suggestions = adminMode
    ? ['Summarise new applications', 'Show open support requests', 'Draft an update for businesses']
    : ['Find jobs near me', 'How do I post a role?', 'What documents do I need?'];
  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const r = await api.post('/api/agent/chat', {
        message: q,
        channel: adminMode ? 'admin' : 'website',
        userContext: user,
      });
      setMessages(m => [
        ...m,
        {
          role: 'agent',
          text:
            r.data.reply ||
            r.data.message ||
            'The agent did not return a response.',
        },
      ]);
    } catch (e) {
      setMessages(m => [
        ...m,
        {
          role: 'agent',
          text: 'The AI agent connection is not available yet. Check the webhook configuration in Admin → Integrations.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={embedded ? 'agent-embedded' : 'agent-panel'} role={embedded ? undefined : 'dialog'} aria-label="StewardBridge assistant">
      {!embedded && (
        <div className="agent-head">
          <div className="agent-id">
            <span className="agent-avatar">
              <SparkIcon size={18} />
            </span>
            <div>
              <b>StewardBridge Assistant</b>
              <span>Ask me anything about jobs, hiring or your account</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close assistant">
            ×
          </button>
        </div>
      )}
      <div className="agent-messages">
        {!messages.length && (
          <div className="agent-welcome">
            <span className="agent-spark">
              <SparkIcon size={30} />
            </span>
            <b>{user?.name ? `Hello, ${user.name.split(' ')[0]}.` : 'Hello there.'}</b>
            <p>How can I help you today?</p>
            <div className="agent-suggest">
              {suggestions.map(t => (
                <button key={t} onClick={() => send(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'agent' ? (
            <div key={i} className="msg-agent">
              <span className="agent-avatar agent-avatar--sm">
                <SparkIcon size={14} />
              </span>
              <div className="bubble agent">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="bubble user">
              {m.text}
            </div>
          ),
        )}
        {busy && (
          <div className="msg-agent">
            <span className="agent-avatar agent-avatar--sm agent-think">
              <SparkIcon size={14} />
            </span>
            <div className="bubble agent typing" aria-label="Assistant is thinking">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="agent-compose">
        <div className="agent-input">
          <input
            placeholder="Message StewardBridge…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            aria-label="Message the assistant"
          />
          <button onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <small>AI can make mistakes. Please check important details.</small>
      </div>
    </div>
  );
}
function Footer() {
  return (
    <footer>
      <div>
        <b>
          STEWARD<span>BRIDGE</span>
        </b>
        <p>Connected workforce operations.</p>
      </div>
      <div>
        <span>Coverage · Nationwide</span>
        <a href="https://wa.me/2347066510205" target="_blank" rel="noreferrer">WhatsApp · +234 706 651 0205</a>
        <a href="tel:+2347066510205">Call · +234 706 651 0205</a>
        <a href="mailto:elubodetimothy@gmail.com">Email · elubodetimothy@gmail.com</a>
      </div>
      <small>© 2026 StewardBridge. All rights reserved.</small>
    </footer>
  );
}
