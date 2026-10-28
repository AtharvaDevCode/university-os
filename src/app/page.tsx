'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, CheckCheck, ChevronDown, CircleHelp, Clock3, FileText,
  Inbox, Plus, Search, Settings2, ShieldCheck, Sparkles, Tag, X,
} from 'lucide-react';

type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'CONFLICTING';
type ApiSource = {
  id: string; type: string; filename: string | null; sender: string | null;
  subject: string | null; url: string | null; messageId: string | null;
  evidence: string | null; observedAt: string;
};
type ApiEvent = {
  id: string; title: string; description: string | null; category: string; startsAt: string | null;
  endsAt: string | null; timezone: string; venue: string | null; roomNumber: string | null;
  address: string | null; language: string | null; registrationUrl: string | null;
  registrationRequired: boolean; status: VerificationStatus; cancelled: boolean;
  createdAt: string; updatedAt: string; sources: ApiSource[];
};
type EventItem = {
  id: string; title: string; day: string; date: string; time: string; venue: string;
  room: string; language: string; category: string;
  status: 'Unverified' | 'Verified' | 'Conflicting';
  source: { type: string; filename: string; origin: string; evidence: string; url?: string };
};

const nav = [
  { name: 'Overview', icon: Sparkles }, { name: 'Events', icon: CalendarDays },
  { name: 'Tasks', icon: CheckCheck }, { name: 'Inbox', icon: Inbox },
  { name: 'Lecture vault', icon: FileText },
];
const statusLabels: Record<VerificationStatus, EventItem['status']> = {
  UNVERIFIED: 'Unverified', VERIFIED: 'Verified', CONFLICTING: 'Conflicting',
};

function formatEvent(event: ApiEvent): EventItem {
  const date = event.startsAt ? new Date(event.startsAt) : null;
  const source = event.sources?.[0];
  const sourceType = source?.type ?? 'Manual';
  return {
    id: event.id,
    title: event.title,
    day: date ? date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: event.timezone || 'Europe/Berlin' }).toUpperCase() : 'TBD',
    date: date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: event.timezone || 'Europe/Berlin' }).toUpperCase() : 'DATE TBD',
    time: date ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: event.timezone || 'Europe/Berlin' }) : 'Time TBD',
    venue: event.venue || 'Venue not specified', room: event.roomNumber || 'Room not specified',
    language: event.language || 'Unknown',
    category: event.category || 'Event',
    status: statusLabels[event.status] ?? 'Unverified',
    source: {
      type: sourceType.charAt(0) + sourceType.slice(1).toLowerCase(),
      filename: source?.filename || source?.subject || 'No source attached',
      origin: source?.sender || source?.subject || (source ? source.type : 'You'),
      evidence: source?.evidence || 'No supporting evidence was saved for this event.',
      url: source?.url || undefined,
    },
  };
}
function apiStatus(status: EventItem['status']): VerificationStatus {
  if (status === 'Verified') return 'VERIFIED';
  if (status === 'Conflicting') return 'CONFLICTING';
  return 'UNVERIFIED';
}

export default function Home() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeNav, setActiveNav] = useState('Overview');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', date: '', time: '', venue: '', room: '', language: 'Unknown', category: 'Event', url: '' });

  async function loadEvents() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/events', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load events from the database.');
      setEvents((data as ApiEvent[]).map(formatEvent));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadEvents(); }, []);

  const filteredEvents = useMemo(() => events.filter((event) =>
    `${event.title} ${event.venue} ${event.room} ${event.category}`.toLowerCase().includes(query.toLowerCase())
  ), [events, query]);

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError('');
    const startsAt = form.date ? `${form.date}T${form.time || '12:00'}:00` : null;
    try {
      const response = await fetch('/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(), startsAt, venue: form.venue.trim() || null,
          roomNumber: form.room.trim() || null,
          language: form.language === 'Unknown' ? null : form.language,
          category: form.category, sourceUrl: form.url.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create event.');
      setEvents((previous) => [formatEvent(data as ApiEvent), ...previous]);
      setForm({ title: '', date: '', time: '', venue: '', room: '', language: 'Unknown', category: 'Event', url: '' });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event.');
    } finally { setSaving(false); }
  }

  async function setStatus(id: string, status: EventItem['status']) {
    const previous = events; setError('');
    setEvents((items) => items.map((event) => event.id === id ? { ...event, status } : event));
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: apiStatus(status) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update event status.');
      setEvents((items) => items.map((event) => event.id === id ? formatEvent(data as ApiEvent) : event));
    } catch (err) {
      setEvents(previous);
      setError(err instanceof Error ? err.message : 'Could not update event status.');
    }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">U<span>·</span></div><div><strong>UNIVERSITY OS</strong><small>YOUR CAMPUS, IN FOCUS</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map((item) => <button key={item.name} className={`nav-item ${activeNav === item.name ? 'active' : ''}`} onClick={() => setActiveNav(item.name)}><item.icon size={17}/><span>{item.name}</span>{item.name === 'Inbox' && <span className="nav-count">64</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sync-status"><span className="status-dot"/><div><strong>{loading ? 'Connecting…' : error ? 'Needs attention' : 'Database connected'}</strong><small>{error ? 'Check the message below' : 'Neon · University OS'}</small></div></div><button className="nav-item muted" onClick={() => alert('Settings will be added after the first data flow is working.')}><Settings2 size={17}/>Settings</button><div className="profile"><div className="avatar">AD</div><div><strong>My workspace</strong><small>University of Koblenz</small></div><ChevronDown size={15}/></div></div>
    </aside>
    <section className="main-panel">
      <header className="topbar"><div className="breadcrumb">UNIVERSITY <span>/</span> {activeNav.toUpperCase()}</div><div className="top-actions"><span className="date-chip"><Clock3 size={14}/> WED, 28 OCT</span><button className="icon-button" aria-label="Help" onClick={() => alert('Source traceability is built into each event card.')}><CircleHelp size={18}/></button><div className="avatar small-avatar">AD</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR ACADEMIC COMMAND CENTRE</div><h1>Make room for<br/><em>what matters.</em></h1><p className="intro">One calm place for lectures, events, deadlines and everything university throws your way.</p></div><div className="welcome-stamp"><span>DE</span><span className="stamp-line"/><span>EN</span></div></div>
        <div className="stats-grid"><div className="stat-card"><span className="stat-label">UPCOMING EVENTS</span><strong>{events.length.toString().padStart(2, '0')}</strong><span className="stat-foot"><CalendarDays size={13}/> In your space</span></div><div className="stat-card"><span className="stat-label">NEEDS VERIFICATION</span><strong>{events.filter((event) => event.status !== 'Verified').length.toString().padStart(2, '0')}</strong><span className="stat-foot warning-text"><CircleHelp size={13}/> Check the source</span></div><div className="stat-card"><span className="stat-label">CONNECTED SOURCES</span><strong>{new Set(events.flatMap((event) => event.source.type === 'Manual' ? [] : [event.source.type])).size.toString().padStart(2, '0')}</strong><span className="stat-foot"><span className="tiny-ring"/> Based on saved event sources</span></div></div>
        <div className="section-heading"><div><div className="eyebrow">YOUR CALENDAR, DE-CLUTTERED</div><h2>{activeNav === 'Overview' ? 'Coming up' : activeNav}</h2></div><div className="heading-actions"><label className="search-box"><Search size={15}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an event..."/></label><button className="primary-button" onClick={() => setShowForm(true)}><Plus size={16}/> Add event</button></div></div>
        {error && <div role="alert" className="empty-state" style={{ marginBottom: 16 }}><strong>Something needs attention</strong><span>{error}</span><button className="secondary-button" onClick={() => void loadEvents()}>Retry</button></div>}
        {showForm && <div className="form-backdrop"><form className="event-form" onSubmit={createEvent}><div className="form-heading"><div><span className="eyebrow">YOUR CALENDAR</span><h3>Create an event</h3></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="Close"><X size={18}/></button></div>
          <label>Event title *<input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AI research seminar"/></label>
          <div className="form-row"><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></label><label>Start time<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}/></label></div>
          <label>Venue / building<input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="e.g. G building, University of Koblenz"/></label>
          <label>Room number<input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. G 309 (leave blank if unknown)"/></label>
          <div className="form-row"><label>Language<select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}><option>Unknown</option><option>English</option><option>German</option><option>German / English</option><option>Other</option></select></label><label>Type<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Event</option><option>Lecture</option><option>Workshop</option><option>Seminar</option><option>Deadline</option><option>Exam</option><option>Administration</option></select></label></div>
          <label>Source URL (optional)<input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..."/></label><p className="form-note"><ShieldCheck size={14}/> Manual events are marked unverified until you confirm them. Venue and room are kept separate.</p>
          <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Create event'} <Plus size={15}/></button></div></form></div>}
        <div className="events-list">
          {loading && <div className="empty-state"><Clock3 size={22}/><strong>Loading events…</strong><span>Fetching your events from Neon.</span></div>}
          {!loading && filteredEvents.length === 0 && <div className="empty-state"><Search size={22}/><strong>No events yet</strong><span>Add an event to save it to your database.</span></div>}
          {filteredEvents.slice(0, showAll ? undefined : 4).map((event, index) => <article className="event-card" key={event.id}>
            <div className="event-date"><strong>{event.day}</strong><span>{event.date}</span><div className="date-marker"/></div><div className="event-main">
              <div className="event-topline"><span className={`category-pill category-${event.category.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{event.category}</span><span className={`verification ${event.status.toLowerCase()}`}><span/> {event.status}</span></div><h3>{event.title}</h3>
              <div className="event-details"><span><Clock3 size={14}/>{event.time}</span><span><Tag size={14}/>{event.language}</span></div><div className="venue-line"><span className="venue-icon">⌖</span><div><strong>{event.venue}</strong><span>{event.room}</span></div></div>
              <div className="event-bottom"><button className={`source-toggle ${expandedSource === event.id ? 'open' : ''}`} onClick={() => setExpandedSource(expandedSource === event.id ? null : event.id)}><FileText size={14}/>{expandedSource === event.id ? 'Hide source' : 'View source'}<ChevronDown size={14}/></button><div className="verify-actions">{event.status !== 'Verified' && <button className="verify-button" onClick={() => void setStatus(event.id, 'Verified')}><CheckCheck size={13}/> Mark verified</button>}<button className="quiet-button" onClick={() => void setStatus(event.id, event.status === 'Conflicting' ? 'Unverified' : 'Conflicting')}>{event.status === 'Conflicting' ? 'Clear conflict' : 'Flag conflict'}</button></div></div>
              {expandedSource === event.id && <div className="source-panel"><div className="source-panel-heading"><span className="source-file-icon"><FileText size={17}/></span><div><strong>{event.source.filename}</strong><small>{event.source.type} · {event.source.origin}</small></div><span className="source-tag">SOURCE</span></div><div className="evidence"><span>EXTRACTED EVIDENCE</span><p>{event.source.evidence}</p></div>{event.source.url && <a className="source-link" href={event.source.url} target="_blank" rel="noreferrer">Open original source ↗</a>}<p className="source-disclaimer">Source details reflect the records currently saved in the database.</p></div>}
            </div><div className="event-side"><button className="event-menu" aria-label="Event actions" onClick={() => setExpandedSource(expandedSource === event.id ? null : event.id)}>···</button><span className="event-index">{String(index + 1).padStart(2, '0')}</span></div>
          </article>)}
        </div>
        {filteredEvents.length > 3 && <button className="show-more" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `View all ${filteredEvents.length} events`} <ChevronDown size={14} className={showAll ? 'rotate' : ''}/></button>}
        <div className="bottom-note"><div className="note-icon"><ShieldCheck size={18}/></div><div><strong>Nothing gets silently trusted.</strong><p>Every saved event keeps its available source and supporting evidence. Unknown rooms stay unknown until a source confirms them.</p></div><span className="note-mark">U/01</span></div><footer><span>UNIVERSITY OS <span className="footer-dot">·</span> EARLY BUILD 0.2</span><span>MADE FOR YOUR CAMPUS LIFE</span></footer>
      </div>
    </section>
  </main>;
}
