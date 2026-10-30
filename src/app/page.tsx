'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, CheckCheck, ChevronDown, CircleHelp, Clock3,
  FileText, Inbox, Plus, Search, Settings2, ShieldCheck, Tag, X,
} from 'lucide-react';

type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'CONFLICTING';

type ApiSource = {
  id: string;
  type: string;
  filename: string | null;
  sender: string | null;
  subject: string | null;
  url: string | null;
  messageId: string | null;
  evidence: string | null;
  observedAt: string;
};

type ApiEvent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  venue: string | null;
  roomNumber: string | null;
  address: string | null;
  language: string | null;
  registrationUrl: string | null;
  registrationRequired: boolean;
  status: VerificationStatus;
  cancelled: boolean;
  createdAt: string;
  updatedAt: string;
  sources: ApiSource[];
};

type EventItem = {
  id: string;
  startsAt: string | null;
  cancelled: boolean;
  title: string;
  day: string;
  date: string;
  time: string;
  venue: string;
  room: string;
  language: string;
  category: string;
  status: 'Unverified' | 'Verified' | 'Conflicting';
  source: {
    type: string;
    filename: string;
    origin: string;
    evidence: string;
    url?: string;
  };
};

type InboxEmail = {
  id: string;
  messageId: string;
  sender: string | null;
  subject: string | null;
  receivedAt: string | null;
  folder: string;
  category: string | null;
  language: string | null;
};

type InboxEmailDetail = InboxEmail & { textBody: string | null };

const nav = [
  { name: 'Overview', icon: CalendarDays },
  { name: 'Events', icon: CalendarDays },
  { name: 'Tasks', icon: CheckCheck },
  { name: 'Inbox', icon: Inbox },
  { name: 'Lecture vault', icon: FileText },
];

const statusLabels: Record<VerificationStatus, EventItem['status']> = {
  UNVERIFIED: 'Unverified',
  VERIFIED: 'Verified',
  CONFLICTING: 'Conflicting',
};

function formatEvent(event: ApiEvent): EventItem {
  const date = event.startsAt ? new Date(event.startsAt) : null;
  const source = event.sources?.[0];
  const sourceType = source?.type ?? 'Manual';

  return {
    id: event.id,
    startsAt: event.startsAt,
    cancelled: event.cancelled,
    title: event.title,
    day: date
      ? date.toLocaleDateString('en-GB', {
          weekday: 'short',
          timeZone: event.timezone || 'Europe/Berlin',
        }).toUpperCase()
      : 'TBD',
    date: date
      ? date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          timeZone: event.timezone || 'Europe/Berlin',
        }).toUpperCase()
      : 'DATE TBD',
    time: date
      ? date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: event.timezone || 'Europe/Berlin',
        })
      : 'Time TBD',
    venue: event.venue || 'Venue not specified',
    room: event.roomNumber || 'Room not specified',
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
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nextEvent = useMemo(() => {
    const now = currentTime.getTime();
    return events
      .filter((event) =>
        !event.cancelled && event.startsAt && new Date(event.startsAt).getTime() > now
      )
      .sort((a, b) =>
        new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime()
      )[0] ?? null;
  }, [events, currentTime]);

  const countdown = nextEvent?.startsAt
    ? Math.max(0, new Date(nextEvent.startsAt).getTime() - currentTime.getTime())
    : null;

  const countdownParts = countdown === null ? null : {
    days: Math.floor(countdown / 86400000),
    hours: Math.floor((countdown % 86400000) / 3600000),
    minutes: Math.floor((countdown % 3600000) / 60000),
    seconds: Math.floor((countdown % 60000) / 1000),
  };
  const [activeNav, setActiveNav] = useState('Overview');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', date: '', time: '', venue: '', room: '',
    language: 'Unknown', category: 'Event', url: '',
  });

  const [inboxEmails, setInboxEmails] = useState<InboxEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<InboxEmailDetail | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [inboxCursor, setInboxCursor] = useState<string | null>(null);
  const [inboxHasMore, setInboxHasMore] = useState(false);
  const [inboxTotal, setInboxTotal] = useState(0);
  const [inboxError, setInboxError] = useState('');

  async function loadEvents() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/events', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not load events.');
      }

      setEvents((data as ApiEvent[]).map(formatEvent));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  async function loadInbox(search = '', cursor: string | null = null, append = false) {
    setInboxLoading(true);
    setInboxError('');

    try {
      const params = new URLSearchParams({ limit: '20' });

      if (search.trim()) params.set('q', search.trim());
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`/api/inbox?${params.toString()}`, {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not load inbox.');
      }

      setInboxEmails((previous) =>
        append ? [...previous, ...data.emails] : data.emails
      );
      setInboxCursor(data.nextCursor ?? null);
      setInboxHasMore(Boolean(data.hasMore));
      setInboxTotal(Number(data.totalCount) || 0);
    } catch (err) {
      setInboxError(err instanceof Error ? err.message : 'Could not load inbox.');
    } finally {
      setInboxLoading(false);
    }
  }

  async function openEmail(email: InboxEmail) {
    setEmailLoading(true);
    setInboxError('');

    try {
      const response = await fetch(
        `/api/inbox/${encodeURIComponent(email.id)}`,
        { cache: 'no-store' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not open email.');
      }

      setSelectedEmail(data.email as InboxEmailDetail);
    } catch (err) {
      setInboxError(err instanceof Error ? err.message : 'Could not open email.');
    } finally {
      setEmailLoading(false);
    }
  }

  useEffect(() => {
    if (activeNav === 'Inbox') {
      setSelectedEmail(null);
      void loadInbox();
    }
  }, [activeNav]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) =>
        `${event.title} ${event.venue} ${event.room} ${event.category}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [events, query]
  );

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const startsAt = form.date
      ? `${form.date}T${form.time || '12:00'}:00`
      : null;

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          startsAt,
          venue: form.venue.trim() || null,
          roomNumber: form.room.trim() || null,
          language: form.language === 'Unknown' ? null : form.language,
          category: form.category,
          sourceUrl: form.url.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not create event.');
      }

      setEvents((previous) => [formatEvent(data as ApiEvent), ...previous]);
      setForm({
        title: '', date: '', time: '', venue: '', room: '',
        language: 'Unknown', category: 'Event', url: '',
      });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event.');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: EventItem['status']) {
    const previous = events;
    setError('');

    setEvents((items) =>
      items.map((event) => event.id === id ? { ...event, status } : event)
    );

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: apiStatus(status) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not update event status.');
      }

      setEvents((items) =>
        items.map((event) => event.id === id ? formatEvent(data as ApiEvent) : event)
      );
    } catch (err) {
      setEvents(previous);
      setError(err instanceof Error ? err.message : 'Could not update event status.');
    }
  }

  const today = currentTime.toLocaleDateString('en-GB', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).toUpperCase();

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
  <div className="brand-mark">K</div>
  <div className="brand-text">
    <strong>KOBLENZ</strong>
    <small>PERSONAL CAMPUS SPACE</small>
  </div>
</div>

        <nav>
          {nav.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${activeNav === item.name ? 'active' : ''}`}
              onClick={() => setActiveNav(item.name)}
            >
              <item.icon size={17} />
              <span>{item.name}</span>
              {item.name === 'Inbox' && (
                <span className="nav-count">{inboxTotal || '—'}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sync-status">
            <span className="status-dot" />
            <div>
              <strong>{loading ? 'Connecting…' : error ? 'Needs attention' : 'Connected'}</strong>
              <small>{error ? 'Check the error message' : 'Neon database'}</small>
            </div>
          </div>

          <button
            className="nav-item muted"
            onClick={() => alert('Settings are not available yet.')}
          >
            <Settings2 size={17} />
            Settings
          </button>
        </div>
     
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            KOBLENZ <span>/</span> {activeNav.toUpperCase()}
          </div>

          <div className="top-actions">
            <span className="date-chip">
              <Clock3 size={14} /> {today}
            </span>
          </div>
        </header>

        <div className="content">
          <section className="clock-dashboard">
            <div className="clock-event-panel">
              <div className="eyebrow"><span className="eyebrow-line" /> NEXT EVENT</div>
              {nextEvent && countdownParts ? (
                <>
                  <h1 className="clock-event-title">{nextEvent.title}</h1>
                  <div className="clock-event-meta">
                    <span>{nextEvent.day}, {nextEvent.date} · {nextEvent.time}</span>
                    <span>{nextEvent.venue}{nextEvent.room !== 'Room not specified' ? ` · ${nextEvent.room}` : ''}</span>
                  </div>
                  <div className="event-countdown" aria-label="Time until next event">
                    <div><strong>{String(countdownParts.days).padStart(2, '0')}</strong><small>DAYS</small></div>
                    <div><strong>{String(countdownParts.hours).padStart(2, '0')}</strong><small>HRS</small></div>
                    <div><strong>{String(countdownParts.minutes).padStart(2, '0')}</strong><small>MIN</small></div>
                    <div><strong>{String(countdownParts.seconds).padStart(2, '0')}</strong><small>SEC</small></div>
                  </div>
                </>
              ) : (
                <div className="no-next-event">
                  <h2>No upcoming events</h2>
                  <p>Add something to your calendar and it will appear here.</p>
                </div>
              )}
            </div>

            <div className="live-clock-panel">
              <div className="eyebrow">LOCAL TIME · KOBLENZ</div>
              <div className="live-clock-time" aria-live="off">
                {currentTime.toLocaleTimeString('en-GB', {
                  timeZone: 'Europe/Berlin',
                  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                })}
              </div>
              <div className="live-clock-date">
                {currentTime.toLocaleDateString('en-GB', {
                  timeZone: 'Europe/Berlin',
                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                }).toUpperCase()}
              </div>
              <div className="clock-timezone">CET / CEST · EUROPE/BERLIN</div>
            </div>
          </section>

          <style jsx global>{`
            .clock-dashboard {
              display: grid;
              grid-template-columns: minmax(220px, 0.78fr) minmax(0, 1.55fr);
              align-items: stretch;
              gap: 34px;
              min-height: 265px;
              padding: 34px 0 38px;
              border-bottom: 1px solid var(--border);
            }
            .clock-event-panel {
              min-width: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              padding-right: 30px;
              border-right: 1px solid var(--border);
            }
            .clock-event-title {
              margin: 23px 0 12px;
              font-size: clamp(23px, 2.5vw, 34px);
              line-height: 1.12;
              font-weight: 500;
              letter-spacing: -1.2px;
              overflow-wrap: anywhere;
            }
            .clock-event-meta {
              display: grid; gap: 7px; color: var(--muted);
              font-size: 11px; line-height: 1.5;
            }
            .event-countdown {
              display: flex; flex-wrap: wrap; gap: 16px; margin-top: 27px;
              font-variant-numeric: tabular-nums;
            }
            .event-countdown > div { min-width: 37px; }
            .event-countdown strong { display: block; font-size: 23px; font-weight: 500; letter-spacing: -1px; }
            .event-countdown small { display: block; margin-top: 4px; color: var(--muted); font-size: 8px; letter-spacing: 1.5px; }
            .no-next-event { margin-top: 26px; }
            .no-next-event h2 { font-size: 22px; font-weight: 500; }
            .no-next-event p { margin-top: 9px; color: var(--muted); font-size: 12px; line-height: 1.6; }
            .live-clock-panel {
              min-width: 0; display: flex; flex-direction: column;
              align-items: center; justify-content: center; text-align: center;
            }
            .live-clock-time {
              margin: 14px 0 12px; font-size: clamp(54px, 8.2vw, 112px);
              line-height: 1; font-weight: 400; letter-spacing: -0.075em;
              white-space: nowrap; font-variant-numeric: tabular-nums;
            }
            .live-clock-date { color: var(--muted); font-size: 10px; letter-spacing: 2px; }
            .clock-timezone { margin-top: 20px; color: var(--muted); font-size: 8px; letter-spacing: 1.8px; opacity: .7; }
            @media (max-width: 760px) {
              .clock-dashboard { grid-template-columns: 1fr; gap: 28px; padding: 26px 0 30px; }
              .clock-event-panel { border-right: 0; border-bottom: 1px solid var(--border); padding: 0 0 25px; }
              .live-clock-time { font-size: clamp(47px, 12vw, 76px); }
              .live-clock-date { font-size: 9px; letter-spacing: 1.3px; }
            }
          `}</style>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">SAVED EVENTS</span>
              <strong>{events.length.toString().padStart(2, '0')}</strong>
              <span className="stat-foot"><CalendarDays size={13} /> Your calendar</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">NEEDS REVIEW</span>
              <strong>
                {events.filter((event) => event.status !== 'Verified').length.toString().padStart(2, '0')}
              </strong>
              <span className="stat-foot"><CircleHelp size={13} /> Unverified sources</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">CONNECTED SOURCES</span>
              <strong>
                {new Set(events.flatMap((event) =>
                  event.source.type === 'Manual' ? [] : [event.source.type]
                )).size.toString().padStart(2, '0')}
              </strong>
              <span className="stat-foot"><span className="tiny-ring" /> Saved event sources</span>
            </div>
          </div>

          <div className="section-heading">
            <div>
              <div className="eyebrow">YOUR CAMPUS, IN FOCUS</div>
              <h2>{activeNav === 'Overview' ? 'Coming up' : activeNav}</h2>
            </div>

            <div className="heading-actions">
              <label className="search-box">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (activeNav === 'Inbox') void loadInbox(e.target.value);
                  }}
                  placeholder={activeNav === 'Inbox' ? 'Search mail…' : 'Find an event…'}
                />
              </label>

              {activeNav !== 'Inbox' && (
                <button className="primary-button" onClick={() => setShowForm(true)}>
                  <Plus size={16} /> Add event
                </button>
              )}
            </div>
          </div>

          {error && (
            <div role="alert" className="empty-state" style={{ marginBottom: 16 }}>
              <strong>Something needs attention</strong>
              <span>{error}</span>
              <button className="secondary-button" onClick={() => void loadEvents()}>
                Retry
              </button>
            </div>
          )}

          {showForm && (
            <div className="form-backdrop">
              <form className="event-form" onSubmit={createEvent}>
                <div className="form-heading">
                  <div>
                    <span className="eyebrow">YOUR CALENDAR</span>
                    <h3>Create an event</h3>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setShowForm(false)}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <label>
                  Event title *
                  <input
                    required
                    autoFocus
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. AI research seminar"
                  />
                </label>

                <div className="form-row">
                  <label>
                    Date
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                  </label>
                  <label>
                    Start time
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                    />
                  </label>
                </div>

                <label>
                  Venue / building
                  <input
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    placeholder="e.g. G building"
                  />
                </label>

                <label>
                  Room number
                  <input
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                    placeholder="e.g. G 309"
                  />
                </label>

                <div className="form-row">
                  <label>
                    Language
                    <select
                      value={form.language}
                      onChange={(e) => setForm({ ...form, language: e.target.value })}
                    >
                      <option>Unknown</option>
                      <option>English</option>
                      <option>German</option>
                      <option>German / English</option>
                      <option>Other</option>
                    </select>
                  </label>

                  <label>
                    Type
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      <option>Event</option>
                      <option>Lecture</option>
                      <option>Workshop</option>
                      <option>Seminar</option>
                      <option>Deadline</option>
                      <option>Exam</option>
                      <option>Administration</option>
                    </select>
                  </label>
                </div>

                <label>
                  Source URL (optional)
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://..."
                  />
                </label>

                <p className="form-note">
                  <ShieldCheck size={14} />
                  Manual events remain unverified until you confirm them.
                </p>

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" disabled={saving}>
                    {saving ? 'Saving…' : 'Create event'} <Plus size={15} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeNav === 'Inbox' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(260px, 0.9fr) minmax(320px, 1.1fr)',
                gap: 18,
                minHeight: 420,
                alignItems: 'start',
              }}
            >
              <section className="inbox-list-panel">
                <div className="inbox-list-header" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}>
                  <div>
                    <strong>University inbox</strong>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
                      {inboxTotal} messages · SOGo · Read-only
                    </div>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => void loadInbox(query)}
                    disabled={inboxLoading}
                  >
                    {inboxLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>

                {inboxError && (
                  <div role="alert" style={{ padding: 12, color: '#c58e8e' }}>
                    {inboxError}
                  </div>
                )}

                <div className="inbox-email-scroll">
                  {inboxEmails.length === 0 && !inboxLoading && (
                    <div className="empty-state">
                      <Inbox size={22} />
                      <strong>No emails found</strong>
                      <span>Try another search.</span>
                    </div>
                  )}

                  {inboxEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => void openEmail(email)}
                      style={{
                        background: selectedEmail?.id === email.id ? '#242424' : undefined,
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        alignItems: 'start',
                      }}>
                        <strong>{email.sender || 'Unknown sender'}</strong>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {email.receivedAt
                            ? new Date(email.receivedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                              })
                            : '—'}
                        </span>
                      </div>

                      <div style={{ marginTop: 6 }}>
                        {email.subject || '(No subject)'}
                      </div>

                      {email.category && (
                        <span className="category-pill" style={{
                          display: 'inline-block',
                          marginTop: 8,
                        }}>
                          {email.category}
                        </span>
                      )}
                    </button>
                  ))}

                  {inboxHasMore && (
                    <div style={{ padding: 14, textAlign: 'center' }}>
                      <button
                        className="secondary-button"
                        onClick={() => void loadInbox(query, inboxCursor, true)}
                        disabled={inboxLoading}
                      >
                        {inboxLoading ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                minHeight: 420,
                overflow: 'hidden',
              }}>
                {emailLoading ? (
                  <div className="empty-state">
                    <Clock3 size={22} />
                    <strong>Opening message…</strong>
                  </div>
                ) : selectedEmail ? (
                  <div style={{ padding: 25 }}>
                    <div className="eyebrow">EMAIL MESSAGE</div>

                    <h2 style={{
                      fontSize: 23,
                      margin: '12px 0 17px',
                      overflowWrap: 'anywhere',
                    }}>
                      {selectedEmail.subject || '(No subject)'}
                    </h2>

                    <div style={{
                      fontSize: 12,
                      lineHeight: 1.8,
                      color: '#aaa',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: 17,
                      marginBottom: 20,
                    }}>
                      <div><strong>From:</strong> {selectedEmail.sender || 'Unknown sender'}</div>
                      <div>
                        <strong>Date:</strong>{' '}
                        {selectedEmail.receivedAt
                          ? new Date(selectedEmail.receivedAt).toLocaleString('en-GB')
                          : 'Unknown date'}
                      </div>
                      <div><strong>Folder:</strong> {selectedEmail.folder}</div>
                    </div>

                    <div style={{
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      fontSize: 13,
                      lineHeight: 1.85,
                      color: '#ddd',
                    }}>
                      {selectedEmail.textBody || 'No plain-text body is available.'}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state" style={{ minHeight: 420 }}>
                    <Inbox size={26} />
                    <strong>Select an email</strong>
                    <span>Choose a message to read it here.</span>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="events-list">
              {loading && (
                <div className="empty-state">
                  <Clock3 size={22} />
                  <strong>Loading events…</strong>
                  <span>Fetching your events.</span>
                </div>
              )}

              {!loading && filteredEvents.length === 0 && (
                <div className="empty-state">
                  <Search size={22} />
                  <strong>No events yet</strong>
                  <span>Add an event to save it to your database.</span>
                </div>
              )}

              {filteredEvents.slice(0, showAll ? undefined : 4).map((event, index) => (
                <article className="event-card" key={event.id}>
                  <div className="event-date">
                    <strong>{event.day}</strong>
                    <span>{event.date}</span>
                    <div className="date-marker" />
                  </div>

                  <div className="event-main">
                    <div className="event-topline">
                      <span className={`category-pill category-${event.category.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                        {event.category}
                      </span>
                      <span className={`verification ${event.status.toLowerCase()}`}>
                        <span /> {event.status}
                      </span>
                    </div>

                    <h3>{event.title}</h3>

                    <div className="event-details">
                      <span><Clock3 size={14} /> {event.time}</span>
                      <span><Tag size={14} /> {event.language}</span>
                    </div>

                    <div className="venue-line">
                      <span className="venue-icon">⌖</span>
                      <div>
                        <strong>{event.venue}</strong>
                        <span>{event.room}</span>
                      </div>
                    </div>

                    <div className="event-bottom">
                      <button
                        className={`source-toggle ${expandedSource === event.id ? 'open' : ''}`}
                        onClick={() => setExpandedSource(
                          expandedSource === event.id ? null : event.id
                        )}
                      >
                        <FileText size={14} />
                        {expandedSource === event.id ? 'Hide source' : 'View source'}
                        <ChevronDown size={14} />
                      </button>

                      <div className="verify-actions">
                        {event.status !== 'Verified' && (
                          <button
                            className="verify-button"
                            onClick={() => void setStatus(event.id, 'Verified')}
                          >
                            <CheckCheck size={13} /> Mark verified
                          </button>
                        )}

                        <button
                          className="quiet-button"
                          onClick={() => void setStatus(
                            event.id,
                            event.status === 'Conflicting' ? 'Unverified' : 'Conflicting'
                          )}
                        >
                          {event.status === 'Conflicting' ? 'Clear conflict' : 'Flag conflict'}
                        </button>
                      </div>
                    </div>

                    {expandedSource === event.id && (
                      <div className="source-panel">
                        <div className="source-panel-heading">
                          <span className="source-file-icon"><FileText size={17} /></span>
                          <div>
                            <strong>{event.source.filename}</strong>
                            <small>{event.source.type} · {event.source.origin}</small>
                          </div>
                          <span className="source-tag">SOURCE</span>
                        </div>

                        <div className="evidence">
                          <span>EXTRACTED EVIDENCE</span>
                          <p>{event.source.evidence}</p>
                        </div>

                        {event.source.url && (
                          <a
                            className="source-link"
                            href={event.source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open original source ↗
                          </a>
                        )}

                        <p className="source-disclaimer">
                          Source details reflect the records currently saved in the database.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="event-side">
                    <button
                      className="event-menu"
                      aria-label="Event actions"
                      onClick={() => setExpandedSource(
                        expandedSource === event.id ? null : event.id
                      )}
                    >
                      ···
                    </button>
                    <span className="event-index">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeNav !== 'Inbox' && filteredEvents.length > 3 && (
            <button className="show-more" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show less' : `View all ${filteredEvents.length} events`}
              <ChevronDown size={14} className={showAll ? 'rotate' : ''} />
            </button>
          )}

          {activeNav !== 'Inbox' && (
            <div className="bottom-note">
              <div className="note-icon"><ShieldCheck size={18} /></div>
              <div>
                <strong>Every detail has a source.</strong>
                <p>
                  Saved events retain their available source and supporting evidence.
                  Unknown rooms stay unknown until a source confirms them.
                </p>
              </div>
              <span className="note-mark">K/01</span>
            </div>
          )}

          <footer>
            <span>KOBLENZ <span className="footer-dot">·</span> PERSONAL SPACE</span>
            <span>UNIVERSITY OF KOBLENZ</span>
          </footer>
        </div>
      </section>
    </main>
  );
}