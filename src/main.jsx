import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Edit3,
  Hash,
  Info,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import "./styles.css";
import { apiEnabled, apiRequest, API_SOCKET_URL, setApiToken } from "./api";
import { io } from "socket.io-client";

const STORAGE_KEY = "connectify-state";
const seededPeople = [
  { id: "CN-482951", name: "Maya Chen", username: "mayachen", initials: "MC", color: "coral", online: true, bio: "Product designer who likes quiet mornings." },
  { id: "CN-731824", name: "Noah Williams", username: "noahw", initials: "NW", color: "blue", online: true, bio: "Building tools for thoughtful teams." },
  { id: "CN-105682", name: "Ava Rodriguez", username: "avar", initials: "AR", color: "green", online: false, bio: "A little bit curious about everything." },
];
const seededMessages = {
  "CN-482951": [
    { id: 1, from: "them", text: "Hey! Did you get a chance to look at the new moodboard?", time: "09:41" },
    { id: 2, from: "me", text: "I did — the second direction feels really strong.", time: "09:45", read: true },
    { id: 3, from: "them", text: "That’s my favorite too. I’ll polish it up this afternoon.", time: "09:47" },
  ],
  "CN-731824": [
    { id: 4, from: "them", text: "The launch notes are ready when you are.", time: "Yesterday" },
  ],
  "CN-105682": [
    { id: 5, from: "them", text: "Thanks for connecting on Connectify.", time: "Mon" },
  ],
};

function makeId() {
  return `CN-${Math.floor(100000 + Math.random() * 900000)}`;
}

function getInitialState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch {
    // A corrupted local session should simply start fresh.
  }
  return { user: null, people: seededPeople, messages: seededMessages, theme: "dark" };
}

function Avatar({ person, size = "md", showStatus = false }) {
  return (
    <span className={`avatar avatar-${person?.color || "ink"} avatar-${size}`}>
      {person?.initials || "CF"}
      {showStatus && <i className={`status-dot ${person.online ? "is-online" : ""}`} />}
    </span>
  );
}

function Logo({ small = false }) {
  return <div className={`logo ${small ? "logo-small" : ""}`}><span className="logo-mark"><span /></span><span>connectify</span></div>;
}

function Button({ children, variant = "primary", className = "", ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function Landing({ onNavigate }) {
  return (
    <main className="landing">
      <nav className="landing-nav content-width">
        <Logo />
        <div className="landing-nav-links">
          <a href="#why">Why Connectify</a>
          <a href="#privacy">Privacy</a>
        </div>
        <div className="landing-actions">
          <Button variant="ghost" onClick={() => onNavigate("login")}>Sign in</Button>
          <Button onClick={() => onNavigate("register")}>Create account <ArrowUpRight size={16} /></Button>
        </div>
      </nav>
      <section className="hero content-width">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> A quieter way to connect</div>
          <h1>Make room for<br /><em>real</em> conversation.</h1>
          <p>Private, beautifully simple messaging for the people who matter. No noise. No feeds. Just your conversations, exactly how they should be.</p>
          <div className="hero-actions">
            <Button className="button-large" onClick={() => onNavigate("register")}>Get started <ArrowUpRight size={18} /></Button>
            <button className="text-button" onClick={() => onNavigate("login")}>I already have an account <ArrowUpRight size={16} /></button>
          </div>
          <div className="trust-row"><Shield size={15} /> End-to-end privacy by design <span>·</span> No email required</div>
        </div>
        <div className="hero-art" aria-label="Connectify conversation preview">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="preview-card">
            <div className="preview-top"><span className="live-label"><i /> Live now</span><MoreHorizontal size={18} /></div>
            <div className="preview-person"><Avatar person={seededPeople[0]} size="lg" showStatus /><div><strong>Maya Chen</strong><small>@mayachen · online</small></div></div>
            <div className="preview-message preview-message-them">I have a good feeling about this one.</div>
            <div className="preview-message preview-message-me">Same here. Let’s make it happen <span>✦</span></div>
            <div className="preview-input"><span>Write a message...</span><span className="send-mini"><Send size={14} /></span></div>
          </div>
          <div className="float-note"><MessageCircle size={16} /> 3 new messages</div>
          <div className="float-person"><Avatar person={seededPeople[1]} size="sm" showStatus /></div>
        </div>
      </section>
      <section className="feature-strip content-width" id="why">
        <div><span className="feature-number">01</span><strong>Find your people</strong><p>Connect by ID, not by contact list. Your space stays yours.</p></div>
        <div><span className="feature-number">02</span><strong>Keep it personal</strong><p>Thoughtful tools for the conversations worth having.</p></div>
        <div><span className="feature-number">03</span><strong>Stay in control</strong><p>No algorithm, no attention traps. Just you and your people.</p></div>
      </section>
      <footer className="landing-footer content-width"><Logo small /><span>© 2025 Connectify</span><span className="footer-right">Built for better conversations <Sparkles size={14} /></span></footer>
    </main>
  );
}

function AuthShell({ children, onBack }) {
  return <main className="auth-page"><div className="auth-top"><button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={18} /></button><Logo /><span className="auth-help">Need help? <a href="mailto:hello@connectify.app">Contact us</a></span></div>{children}</main>;
}

function Register({ onBack, onComplete, people }) {
  const [values, setValues] = useState({ name: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (!values.name.trim() || !values.username.trim()) return setError("Please enter your name and username.");
    if (!/^[a-zA-Z0-9_]+$/.test(values.username)) return setError("Username can only use letters, numbers, and underscores.");
    if (values.password.length < 8) return setError("Your password needs at least 8 characters.");
    if (values.password !== values.confirm) return setError("Your passwords do not match.");
    const user = { id: makeId(), name: values.name.trim(), username: values.username.toLowerCase(), initials: values.name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(), color: "ink", online: true, bio: "New to Connectify." };
    try {
      if (apiEnabled) {
        const result = await apiRequest("/auth/register", { method: "POST", body: JSON.stringify({ name: values.name, username: values.username, password: values.password, confirmPassword: values.confirm }) });
        setApiToken(result.token);
        onComplete(result.user, [...people, result.user]);
      } else {
        onComplete({ ...user, password: values.password }, [...people, user]);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  return <AuthShell onBack={onBack}><section className="auth-card"><div className="auth-heading"><span className="auth-kicker">Start your space</span><h1>Create your account</h1><p>Your Connectify ID is generated automatically. No email or phone number needed.</p></div><form onSubmit={submit} className="auth-form">
    {error && <div className="form-error">{error}</div>}
    <label>Full name<input autoFocus value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} placeholder="e.g. Alex Morgan" /></label>
    <label>Username<div className="input-prefix"><span>@</span><input value={values.username} onChange={(e) => setValues({ ...values, username: e.target.value })} placeholder="your_username" /></div></label>
    <div className="form-grid"><label>Password<input type="password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} placeholder="8+ characters" /></label><label>Confirm password<input type="password" value={values.confirm} onChange={(e) => setValues({ ...values, confirm: e.target.value })} placeholder="Repeat password" /></label></div>
    <Button className="button-wide">Create account <ArrowUpRight size={16} /></Button><p className="auth-switch">Already have an account? <button type="button" onClick={() => onBack("login")}>Sign in</button></p>
  </form></section></AuthShell>;
}

function Login({ onBack, onComplete, people }) {
  const [values, setValues] = useState({ id: "", password: "" });
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    const person = people.find((item) => item.id.toLowerCase() === values.id.trim().toLowerCase());
    try {
      if (apiEnabled) {
        const result = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ userId: values.id, password: values.password }) });
        setApiToken(result.token);
        onComplete(result.user);
      } else {
        if (!person || (person.password && person.password !== values.password)) return setError("That ID or password doesn’t look right.");
        onComplete(person);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  return <AuthShell onBack={onBack}><section className="auth-card auth-card-login"><div className="auth-heading"><span className="auth-kicker">Welcome back</span><h1>Good to see you.</h1><p>Sign in with your Connectify ID to pick up where you left off.</p></div><form onSubmit={submit} className="auth-form">
    {error && <div className="form-error">{error}</div>}
    <label>Connectify ID<div className="input-prefix"><Hash size={16} /><input autoFocus value={values.id} onChange={(e) => setValues({ ...values, id: e.target.value })} placeholder="CN-482951" /></div></label>
    <label>Password<input type="password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} placeholder="Your password" /></label>
    <div className="form-meta"><label className="checkbox-label"><input type="checkbox" defaultChecked /> Remember me</label><a href="#reset">Forgot password?</a></div>
    <Button className="button-wide">Sign in <ArrowUpRight size={16} /></Button><p className="auth-switch">New to Connectify? <button type="button" onClick={() => onBack("register")}>Create an account</button></p>
  </form></section></AuthShell>;
}

function ChatDashboard({ state, setState, onLogout }) {
  const [activeId, setActiveId] = useState(state.people[0]?.id || "");
  const [activeConversationId, setActiveConversationId] = useState("");
  const [view, setView] = useState("chats");
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState("");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const active = state.people.find((person) => person.id === activeId) || state.people[0];
  const messages = state.messages[activeId] || [];
  const filteredPeople = useMemo(() => state.people.filter((person) => `${person.name} ${person.username}`.toLowerCase().includes(query.toLowerCase())), [state.people, query]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    apiRequest("/conversations").then(({ conversations }) => {
      if (cancelled) return;
      const people = conversations.flatMap((conversation) =>
        conversation.participants
          .filter((person) => person.id !== state.user.id && person.userId !== state.user.id)
          .map((person) => ({ ...person, id: person.userId, initials: person.name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(), color: "ink" }))
      );
      if (conversations.length) {
        const conversation = conversations[0];
        const person = people.find((item) => conversation.participants.some((participant) => participant.userId === item.id));
        setActiveConversationId(conversation._id);
        if (person) setActiveId(person.id);
      }
      if (people.length) updateState({ people });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!apiEnabled || !activeConversationId) return;
    apiRequest(`/messages/${activeConversationId}`).then(({ messages }) => {
      updateState({ messages: { ...state.messages, [activeId]: messages.map((message) => ({
        id: message._id,
        from: message.sender.mongoId === state.user.mongoId || message.sender.userId === state.user.id ? "me" : "them",
        text: message.deletedForEveryone ? "Message deleted" : message.content,
        time: new Date(message.createdAt).toLocaleTimeStamp ? new Date(message.createdAt).toLocaleTimeStamp() : new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: true,
      })) } });
    }).catch(() => {});
  }, [activeConversationId]);
  useEffect(() => {
    if (!apiEnabled || !activeConversationId) return;
    const socket = io(API_SOCKET_URL, { auth: { token: localStorage.getItem("connectify_api_token") }, withCredentials: true });
    socket.emit("join_conversation", activeConversationId);
    socket.on("receive_message", (message) => {
      updateState({ messages: { ...state.messages, [activeId]: [...(state.messages[activeId] || []), {
        id: message._id,
        from: message.sender?.userId === state.user.id ? "me" : "them",
        text: message.deletedForEveryone ? "Message deleted" : message.content,
        time: "now",
        read: true,
      }] } });
    });
    return () => socket.disconnect();
  }, [activeConversationId]);
  function updateState(next) { setState({ ...state, ...next }); }
  async function sendMessage(e) {
    e.preventDefault();
    if (!composer.trim() || !active) return;
    try {
      if (apiEnabled && activeConversationId) {
        await apiRequest(`/messages/${activeConversationId}`, { method: "POST", body: JSON.stringify({ content: composer.trim() }) });
      } else if (apiEnabled && !activeConversationId) {
        const { conversation } = await apiRequest("/conversations", { method: "POST", body: JSON.stringify({ userId: active.id }) });
        setActiveConversationId(conversation._id);
        await apiRequest(`/messages/${conversation._id}`, { method: "POST", body: JSON.stringify({ content: composer.trim() }) });
      } else {
        const next = [...messages, { id: Date.now(), from: "me", text: composer.trim(), time: "now", read: true }];
        updateState({ messages: { ...state.messages, [activeId]: next } });
      }
      setComposer("");
    } catch (requestError) {
      setToast(requestError.message);
      setTimeout(() => setToast(""), 2200);
    }
  }
  async function openConversation(person) {
    if (!apiEnabled) {
      setActiveId(person.id);
      setView("chats");
      setMobileSidebar(false);
      return;
    }
    try {
      const { conversation } = await apiRequest("/conversations", { method: "POST", body: JSON.stringify({ userId: person.id }) });
      setActiveId(person.id);
      setActiveConversationId(conversation._id);
      setView("chats");
      setMobileSidebar(false);
    } catch (requestError) {
      setToast(requestError.message);
      setTimeout(() => setToast(""), 2200);
    }
  }
  function copyId() {
    navigator.clipboard?.writeText(state.user.id);
    setToast("Connectify ID copied");
    setTimeout(() => setToast(""), 2200);
  }
  return <main className="dashboard">
    <aside className={`sidebar ${mobileSidebar ? "sidebar-open" : ""}`}><div className="sidebar-head"><Logo small /><button className="icon-button mobile-close" onClick={() => setMobileSidebar(false)}><X size={18} /></button></div>
      <button className="profile-chip" onClick={() => setProfileOpen(true)}><Avatar person={state.user} size="sm" showStatus /><span><strong>{state.user.name}</strong><small>@{state.user.username}</small></span><ChevronDown size={16} /></button>
      <div className="sidebar-nav"><button className={view === "chats" ? "nav-active" : ""} onClick={() => setView("chats")}><MessageCircle size={17} /> Messages <span className="nav-count">3</span></button><button className={view === "find" ? "nav-active" : ""} onClick={() => setView("find")}><UserPlus size={17} /> Find people</button></div>
      <div className="sidebar-label"><span>Recent conversations</span><button onClick={() => setView("find")} aria-label="New conversation"><Plus size={16} /></button></div>
      <div className="conversation-list">{filteredPeople.map((person) => <button key={person.id} className={`conversation ${activeId === person.id && view === "chats" ? "conversation-active" : ""}`} onClick={() => { setActiveId(person.id); setView("chats"); setMobileSidebar(false); }}><Avatar person={person} size="md" showStatus /><span className="conversation-copy"><strong>{person.name}</strong><small>{(state.messages[person.id] || [])[((state.messages[person.id] || []).length - 1)]?.text || "Start a conversation"}</small></span><time>{(state.messages[person.id] || [])[((state.messages[person.id] || []).length - 1)]?.time || ""}</time></button>)}</div>
      <div className="sidebar-bottom"><button onClick={() => setProfileOpen(true)}><Settings size={17} /> Settings</button><button onClick={onLogout}><ArrowLeft size={17} /> Sign out</button></div>
    </aside>
    <section className="chat-panel"><header className="chat-header"><button className="icon-button menu-button" onClick={() => setMobileSidebar(true)}><Menu size={20} /></button>{active && <><Avatar person={active} size="md" showStatus /><div className="chat-heading"><strong>{active.name}</strong><small>{active.online ? "Active now" : "Last seen recently"}</small></div><div className="chat-actions"><button className="icon-button"><Bell size={18} /></button><button className="icon-button"><Info size={18} /></button><button className="icon-button"><MoreHorizontal size={18} /></button></div></>}</header>
      {view === "find" ? <FindPeople people={state.people} query={query} setQuery={setQuery} onSelect={openConversation} /> : <><div className="message-area">{messages.length ? <>{messages.map((message) => <div key={message.id} className={`message-row ${message.from === "me" ? "message-row-me" : ""}`}><div className={`message-bubble ${message.from === "me" ? "message-bubble-me" : ""}`}>{message.text}<div className="message-meta">{message.time}{message.from === "me" && (message.read ? <CheckCheck size={14} /> : <Check size={14} />)}</div></div></div>)}<div className="typing-indicator"><span /><span /><span /> {active?.name.split(" ")[0]} is typing</div></> : <div className="empty-chat"><div className="empty-icon"><MessageCircle size={24} /></div><h2>Start the conversation</h2><p>Say hello to {active?.name.split(" ")[0]} and make this space yours.</p></div>}</div><form className="composer" onSubmit={sendMessage}><button type="button" className="icon-button"><Paperclip size={19} /></button><input value={composer} onChange={(e) => setComposer(e.target.value)} placeholder={`Message ${active?.name.split(" ")[0] || "someone"}...`} /><button type="button" className="icon-button"><Sparkles size={18} /></button><button className="send-button" aria-label="Send message"><Send size={17} /></button></form></>}
    </section>
    <aside className="details-panel"><div className="details-top"><span>Conversation</span><button className="icon-button"><MoreHorizontal size={18} /></button></div>{active && <><div className="details-person"><Avatar person={active} size="xl" showStatus /><h2>{active.name}</h2><p>@{active.username}</p><div className="id-badge"><Hash size={13} /> {active.id}</div></div><div className="details-section"><span className="details-label">About</span><p>{active.bio}</p></div><div className="details-section"><span className="details-label">Shared space</span><div className="shared-stat"><span><Users size={16} /> Members</span><strong>2</strong></div><div className="shared-stat"><span><Paperclip size={16} /> Files shared</span><strong>0</strong></div></div></>}</aside>
    {profileOpen && <ProfileModal user={state.user} onClose={() => setProfileOpen(false)} onCopy={copyId} onSave={async (user) => {
      try {
        const saved = apiEnabled ? await apiRequest("/auth/profile", { method: "PUT", body: JSON.stringify({ name: user.name, bio: user.bio }) }) : { user };
        updateState({ user: saved.user });
        setProfileOpen(false);
      } catch (requestError) {
        setToast(requestError.message);
        setTimeout(() => setToast(""), 2200);
      }
    }} />}
    {toast && <div className="toast"><Check size={15} /> {toast}</div>}
  </main>;
}

function FindPeople({ people, query, setQuery, onSelect }) {
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  async function searchPeople(event) {
    event?.preventDefault();
    setSearchError("");
    setSearching(true);
    try {
      if (apiEnabled && /^CN-\d{6}$/i.test(query.trim())) {
        const { user } = await apiRequest(`/users/search/${encodeURIComponent(query.trim().toUpperCase())}`);
        setSearchResults([{ ...user, initials: user.name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(), color: "ink" }]);
      } else {
        const localResults = people.filter((person) => `${person.id} ${person.name} ${person.username}`.toLowerCase().includes(query.toLowerCase()));
        setSearchResults(localResults);
      }
    } catch (error) {
      setSearchResults([]);
      setSearchError(error.message);
    } finally {
      setSearching(false);
    }
  }
  useEffect(() => {
    if (apiEnabled && query.trim()) {
      const timer = setTimeout(() => searchPeople(), 350);
      return () => clearTimeout(timer);
    }
  }, [query]);
  const results = searchResults.length || !query.trim()
    ? searchResults
    : people.filter((person) => `${person.id} ${person.name} ${person.username}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="find-panel"><div className="find-heading"><span className="auth-kicker">Grow your circle</span><h1>Find people</h1><p>Search by Connectify ID, name, or username to start a private conversation.</p></div><form className="search-large" onSubmit={searchPeople}><Search size={19} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try CN-482951 or a username" /><button type="submit" className="icon-button" aria-label="Search"><ArrowUpRight size={17} /></button></form>{searchError && <div className="form-error">{searchError}</div>}<div className="find-results">{searching ? <p>Searching...</p> : results.map((person) => <button className="person-result" key={person.id} onClick={() => onSelect(person)}><Avatar person={person} size="lg" showStatus /><span><strong>{person.name}</strong><small>@{person.username} · {person.id}</small></span><ArrowUpRight size={18} /></button>)}</div></div>;
}

function ProfileModal({ user, onClose, onCopy, onSave }) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="profile-modal"><div className="modal-head"><span>Profile & settings</span><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="profile-hero"><Avatar person={user} size="xl" /><button className="avatar-edit"><Edit3 size={14} /></button><h2>{user.name}</h2><p>@{user.username}</p></div><label>Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>Bio<textarea rows="3" value={bio} onChange={(e) => setBio(e.target.value)} /></label><div className="profile-id"><div><span>Your Connectify ID</span><strong>{user.id}</strong></div><button className="icon-button" onClick={onCopy}><Copy size={17} /></button></div><Button className="button-wide" onClick={() => onSave({ ...user, name, bio, initials: name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase() })}>Save changes</Button></section></div>;
}

function App() {
  const [state, setState] = useState(getInitialState);
  const [screen, setScreen] = useState(state.user ? "dashboard" : "landing");
  useEffect(() => {
    if (!apiEnabled || state.user) return;
    apiRequest("/auth/me").then(({ user }) => {
      setState((current) => ({ ...current, user }));
      setScreen("dashboard");
    }).catch(() => {
      // No server session is expected for a fresh browser.
    });
  }, []);
  function completeRegistration(user, people) { setState({ ...state, user, people }); setScreen("dashboard"); }
  function completeLogin(user) { setState({ ...state, user }); setScreen("dashboard"); }
  async function logout() {
    if (apiEnabled && state.user) {
      try { await apiRequest("/auth/logout", { method: "POST" }); } catch { /* local logout still clears the client session */ }
    }
    setApiToken(null);
    setState({ ...state, user: null });
    setScreen("landing");
  }
  if (screen === "register") return <Register onBack={(next) => setScreen(next || "landing")} onComplete={completeRegistration} people={state.people} />;
  if (screen === "login") return <Login onBack={(next) => setScreen(next || "landing")} onComplete={completeLogin} people={state.people} />;
  if (screen === "dashboard") return <ChatDashboard state={state} setState={setState} onLogout={logout} />;
  return <Landing onNavigate={setScreen} />;
}

createRoot(document.getElementById("root")).render(<App />);
