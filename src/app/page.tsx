'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, CheckCheck, ChevronDown, CircleHelp, Clock3, FileText, Inbox, Plus, Search, Settings2, ShieldCheck, Sparkles, Tag, Upload, X } from 'lucide-react';

type Source = { type: string; filename: string; origin: string; evidence: string; url?: string };
type EventItem = {
  id: string; title: string; day: string; date: string; time: string; venue: string; room: string;
  language: string; category: string; status: 'Unverified' | 'Verified' | 'Conflicting'; registration?: string;
  source: Source;
};

const initialEvents: EventItem[] = [
  { id: 'e1', title: 'Picture a Scientist — Film Screening', day: 'THU', date: '05 NOV', time: '18:00', venue: 'University of Koblenz', room: 'Room to be confirmed', language: 'English', category: 'Campus event', status: 'Unverified', registration: 'Check invitation', source: { type: 'Email', filename: 'Invitation to Film Screening.eml', origin: 'International Relations Office', evidence: 'Source preview placeholder. The real integration will preserve the exact sentence and original email link.' } },
  { id: 'e2', title: 'Machine Learning lecture', day: 'FRI', date: '30 OCT', time: '10:00', venue: 'Universität Koblenz', room: 'Room not extracted', language: 'German / English unknown', category: 'Lecture', status: 'Unverified', source: { type: 'Email', filename: 'Lecture today as Video.eml', origin: 'Course announcement', evidence: 'Venue and room are deliberately unconfirmed until they are found in the original source.' } },
  { id: 'e3', title: 'Research and career workshop', day: 'MON', date: '02 NOV', time: '14:00', venue: 'Venue not specified', room: 'Not specified', language: 'German', category: 'Workshop', status: 'Unverified', source: { type: 'Webpage', filename: 'University events page', origin: 'Manually added demo source', evidence: 'Demo entry only. No live university source has been connected yet.' } },
];

const nav = [
  { name: 'Overview', icon: Sparkles }, { name: 'Events', icon: CalendarDays }, { name: 'Tasks', icon: CheckCheck },
  { name: 'Inbox', icon: Inbox }, { name: 'Lecture vault', icon: FileText },
];

export default function Home() {
  const [events, setEvents] = useState(initialEvents);
  const [activeNav, setActiveNav] = useState('Overview');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', venue: '', room: '', language: 'Unknown', category: 'Event', url: '' });

  const filteredEvents = useMemo(() => events.filter(e => `${e.title} ${e.venue} ${e.room} ${e.category}`.toLowerCase().includes(query.toLowerCase())), [events, query]);

  function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const date = form.date ? new Date(`${form.date}T12:00:00`) : null;
    const day = date ? date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase() : 'TBD';
    const dateLabel = date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase() : 'DATE TBD';
    const newEvent: EventItem = {
      id: `manual-${Date.now()}`, title: form.title.trim(), day, date: dateLabel, time: form.time || 'Time TBD',
      venue: form.venue.trim() || 'Venue not specified', room: form.room.trim() || 'Room not specified',
      language: form.language, category: form.category, status: 'Unverified',
      source: { type: 'Manual', filename: 'Manually created event', origin: 'You', evidence: 'Created manually. No external source is attached.', url: form.url || undefined },
    };
    setEvents(prev => [newEvent, ...prev]); setForm({ title: '', date: '', time: '', venue: '', room: '', language: 'Unknown', category: 'Event', url: '' }); setShowForm(false);
  }

  function setStatus(id: string, status: EventItem['status']) { setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e)); }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">U<span>·</span></div><div><strong>UNIVERSITY OS</strong><small>YOUR CAMPUS, IN FOCUS</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.name} className={`nav-item ${activeNav === item.name ? 'active' : ''}`} onClick={() => setActiveNav(item.name)}><item.icon size={17}/><span>{item.name}</span>{item.name === 'Inbox' && <span className="nav-count">64</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sync-status"><span className="status-dot"/><div><strong>Local preview</strong><small>Integrations not connected</small></div></div><button className="nav-item muted" onClick={() => alert('Settings will be added after the first data flow is working.')}><Settings2 size={17}/>Settings</button><div className="profile"><div className="avatar">AD</div><div><strong>My workspace</strong><small>University of Koblenz</small></div><ChevronDown size={15}/></div></div>
    </aside>

    <section className="main-panel">
      <header className="topbar"><div className="breadcrumb">UNIVERSITY <span>/</span> {activeNav.toUpperCase()}</div><div className="top-actions"><span className="date-chip"><Clock3 size={14}/> WED, 28 OCT</span><button className="icon-button" aria-label="Help" onClick={() => alert('Source traceability is built into each event card.')}><CircleHelp size={18}/></button><div className="avatar small-avatar">AD</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR ACADEMIC COMMAND CENTRE</div><h1>Make room for<br/><em>what matters.</em></h1><p className="intro">One calm place for lectures, events, deadlines and everything university throws your way.</p></div><div className="welcome-stamp"><span>DE</span><span className="stamp-line"/><span>EN</span></div></div>

        <div className="stats-grid"><div className="stat-card"><span className="stat-label">UPCOMING EVENTS</span><strong>{events.length.toString().padStart(2, '0')}</strong><span className="stat-foot"><CalendarDays size={13}/> In your space</span></div><div className="stat-card"><span className="stat-label">NEEDS VERIFICATION</span><strong>{events.filter(e => e.status !== 'Verified').length.toString().padStart(2, '0')}</strong><span className="stat-foot warning-text"><CircleHelp size={13}/> Check the source</span></div><div className="stat-card"><span className="stat-label">CONNECTED SOURCES</span><strong>00</strong><span className="stat-foot"><span className="tiny-ring"/> Connect SOGo next</span></div></div>

        <div className="section-heading"><div><div className="eyebrow">YOUR CALENDAR, DE-CLUTTERED</div><h2>{activeNav === 'Overview' ? 'Coming up' : activeNav}</h2></div><div className="heading-actions"><label className="search-box"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find an event..."/></label><button className="primary-button" onClick={() => setShowForm(true)}><Plus size={16}/> Add event</button></div></div>

        {showForm && <div className="form-backdrop"><form className="event-form" onSubmit={createEvent}><div className="form-heading"><div><span className="eyebrow">YOUR CALENDAR</span><h3>Create an event</h3></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="Close"><X size={18}/></button></div><label>Event title *<input required autoFocus value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. AI research seminar"/></label><div className="form-row"><label>Date<input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}/></label><label>Start time<input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})}/></label></div><label>Venue / building<input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} placeholder="e.g. G building, University of Koblenz"/></label><label>Room number<input value={form.room} onChange={e => setForm({...form, room: e.target.value})} placeholder="e.g. G 309 (leave blank if unknown)"/></label><div className="form-row"><label>Language<select value={form.language} onChange={e => setForm({...form, language: e.target.value})}><option>Unknown</option><option>English</option><option>German</option><option>German / English</option><option>Other</option></select></label><label>Type<select value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option>Event</option><option>Lecture</option><option>Workshop</option><option>Seminar</option><option>Deadline</option><option>Exam</option><option>Administration</option></select></label></div><label>Source URL (optional)<input type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..."/></label><p className="form-note"><ShieldCheck size={14}/> Manual events are marked unverified until you confirm them. Venue and room are kept separate.</p><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-button">Create event <Plus size={15}/></button></div></form></div>}

        <div className="events-list">{filteredEvents.length === 0 && <div className="empty-state"><Search size={22}/><strong>No matching events</strong><span>Try another search or add an event.</span></div>}{filteredEvents.slice(0, showAll ? undefined : 4).map((event, index) => <article className="event-card" key={event.id}><div className="event-date"><strong>{event.day}</strong><span>{event.date}</span><div className="date-marker"/></div><div className="event-main"><div className="event-topline"><span className={`category-pill category-${event.category.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{event.category}</span><span className={`verification ${event.status.toLowerCase()}`}><span/> {event.status}</span></div><h3>{event.title}</h3><div className="event-details"><span><Clock3 size={14}/>{event.time}</span><span><Tag size={14}/>{event.language}</span></div><div className="venue-line"><span className="venue-icon">⌖</span><div><strong>{event.venue}</strong><span>{event.room}</span></div></div><div className="event-bottom"><button className={`source-toggle ${expandedSource === event.id ? 'open' : ''}`} onClick={() => setExpandedSource(expandedSource === event.id ? null : event.id)}><FileText size={14}/>{expandedSource === event.id ? 'Hide source' : 'View source'}<ChevronDown size={14}/></button><div className="verify-actions">{event.status !== 'Verified' && <button className="verify-button" onClick={() => setStatus(event.id, 'Verified')}><CheckCheck size={13}/> Mark verified</button>}<button className="quiet-button" onClick={() => setStatus(event.id, event.status === 'Conflicting' ? 'Unverified' : 'Conflicting')}>{event.status === 'Conflicting' ? 'Clear conflict' : 'Flag conflict'}</button></div></div>{expandedSource === event.id && <div className="source-panel"><div className="source-panel-heading"><span className="source-file-icon"><FileText size={17}/></span><div><strong>{event.source.filename}</strong><small>{event.source.type} · {event.source.origin}</small></div><span className="source-tag">SOURCE</span></div><div className="evidence"><span>EXTRACTED EVIDENCE</span><p>{event.source.evidence}</p></div>{event.source.url && <a className="source-link" href={event.source.url} target="_blank" rel="noreferrer">Open original source ↗</a>}<p className="source-disclaimer">Demo source metadata. Live email linking and exact evidence snippets will be added with the SOGo integration.</p></div>}</div><div className="event-side"><button className="event-menu" aria-label="Event actions" onClick={() => setExpandedSource(expandedSource === event.id ? null : event.id)}>···</button><span className="event-index">0{index + 1}</span></div></article>)}</div>
        {filteredEvents.length > 3 && <button className="show-more" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `View all ${filteredEvents.length} events`} <ChevronDown size={14} className={showAll ? 'rotate' : ''}/></button>}

        <div className="bottom-note"><div className="note-icon"><ShieldCheck size={18}/></div><div><strong>Nothing gets silently trusted.</strong><p>Every extracted detail will retain its source, filename and supporting evidence. Unknown rooms stay unknown until a source confirms them.</p></div><span className="note-mark">U/01</span></div>
        <footer><span>UNIVERSITY OS <span className="footer-dot">·</span> EARLY BUILD 0.1</span><span>MADE FOR YOUR CAMPUS LIFE</span></footer>
      </div>
    </section>
  </main>;
}
