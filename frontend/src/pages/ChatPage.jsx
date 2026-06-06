import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Bot, FileUp, Hash, LogOut, Mic, Plus, Send, Sparkles, Users } from "lucide-react";
import { api, uploadToS3 } from "../lib/api";
import { config } from "../lib/config";
import { useAuth } from "../contexts/AuthContext";

const fallbackRooms = [
  { roomId: "general", name: "general", type: "room", members: [] },
  { roomId: "engineering", name: "engineering", type: "group", members: [] }
];

export default function ChatPage() {
  const { user, signOut } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState("general");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary] = useState("");
  const wsRef = useRef(null);
  const active = useMemo(() => rooms.find((room) => room.roomId === activeRoom) || fallbackRooms[0], [rooms, activeRoom]);

  const loadRooms = useCallback(async () => {
    const { data } = await api.get("/rooms").catch(() => ({ data: { rooms: fallbackRooms } }));
    setRooms(data.rooms?.length ? data.rooms : fallbackRooms);
  }, []);

  const loadMessages = useCallback(async (roomId) => {
    const { data } = await api.get(`/rooms/${roomId}/messages`).catch(() => ({ data: { messages: [] } }));
    setMessages(data.messages || []);
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    loadMessages(activeRoom);
  }, [activeRoom, loadMessages]);

  useEffect(() => {
    if (!config.websocketUrl) return;
    const ws = new WebSocket(`${config.websocketUrl}?username=${encodeURIComponent(user?.username || "Member")}`);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ action: "joinRoom", roomId: activeRoom }));
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "message.created" && payload.message.roomId === activeRoom) setMessages((items) => [...items, payload.message]);
      if (payload.type === "typing" && payload.roomId === activeRoom) {
        setTyping(payload.isTyping ? `${payload.username} is typing` : "");
        setTimeout(() => setTyping(""), 1800);
      }
    };
    return () => ws.close();
  }, [activeRoom, user?.username]);

  async function sendMessage(media = []) {
    if (!draft.trim() && media.length === 0) return;
    const optimistic = {
      messageId: crypto.randomUUID(),
      roomId: activeRoom,
      username: user?.username || "You",
      content: draft,
      media,
      createdAt: new Date().toISOString(),
      readBy: [user?.userId]
    };
    setMessages((items) => [...items, optimistic]);
    setDraft("");
    await api.post("/messages", { roomId: activeRoom, content: optimistic.content, media }).catch(() => null);
  }

  async function handleFile(event, mediaType) {
    const file = event.target.files?.[0];
    if (!file) return;
    const uploaded = await uploadToS3(file, mediaType);
    await sendMessage([uploaded]);
    event.target.value = "";
  }

  async function createRoom() {
    const name = window.prompt("Room name");
    if (!name) return;
    const { data } = await api.post("/rooms", { name, type: "room" });
    setRooms((items) => [...items, data.room]);
    setActiveRoom(data.room.roomId);
  }

  async function askAi(kind) {
    const body = { messages: messages.slice(-20).map((message) => `${message.username}: ${message.content}`) };
    if (kind === "reply") {
      const { data } = await api.post("/ai/replies", body);
      setSuggestions(data.suggestions || []);
    } else {
      const { data } = await api.post("/ai/summarize", body);
      setSummary(data.summary);
    }
  }

  return (
    <main className="flex h-screen overflow-hidden p-3 text-slate-100 md:p-4">
      <aside className="glass hidden w-20 flex-col items-center gap-4 rounded-lg p-3 md:flex">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-cyan-300 text-slate-950"><Hash /></div>
        <IconButton title="Notifications" icon={<Bell />} />
        <IconButton title="AI" icon={<Bot />} onClick={() => askAi("summary")} />
        <button className="mt-auto grid h-11 w-11 place-items-center rounded-md text-slate-300 hover:bg-white/10" onClick={signOut} title="Sign out"><LogOut /></button>
      </aside>
      <section className="ml-0 grid min-w-0 flex-1 grid-cols-1 gap-3 md:ml-3 lg:grid-cols-[280px_1fr_320px]">
        <nav className="glass flex min-h-0 flex-col rounded-lg p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Workspace</p>
              <h2 className="text-xl font-semibold">Rooms</h2>
            </div>
            <button onClick={createRoom} className="grid h-10 w-10 place-items-center rounded-md bg-white/10 hover:bg-white/15" title="Create room"><Plus /></button>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto">
            {(rooms.length ? rooms : fallbackRooms).map((room) => (
              <button key={room.roomId} onClick={() => setActiveRoom(room.roomId)} className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition ${room.roomId === activeRoom ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}>
                <Hash size={18} />
                <span className="min-w-0 flex-1 truncate font-medium">{room.name}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </button>
            ))}
          </div>
        </nav>
        <section className="glass flex min-h-0 flex-col rounded-lg">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-slate-900"><Hash /></div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold">{active.name}</h1>
                <p className="truncate text-sm text-slate-400">{typing || "Realtime room with presence and media sharing"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IconButton title="Smart replies" icon={<Sparkles />} onClick={() => askAi("reply")} />
              <IconButton title="Members" icon={<Users />} />
            </div>
          </header>
          <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {messages.map((message) => <Message key={message.messageId} message={message} self={message.username === user?.username} />)}
            {!messages.length && <Skeleton />}
          </div>
          {suggestions.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3">
              {suggestions.map((suggestion) => <button key={suggestion} onClick={() => setDraft(suggestion)} className="shrink-0 rounded-full border border-cyan-300/30 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10">{suggestion}</button>)}
            </div>
          )}
          <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="border-t border-white/10 p-4">
            <div className="flex items-end gap-2 rounded-lg bg-slate-950/70 p-2">
              <label className="grid h-11 w-11 cursor-pointer place-items-center rounded-md hover:bg-white/10" title="Upload file"><FileUp /><input className="hidden" type="file" onChange={(event) => handleFile(event, "file")} /></label>
              <label className="grid h-11 w-11 cursor-pointer place-items-center rounded-md hover:bg-white/10" title="Voice message"><Mic /><input className="hidden" type="file" accept="audio/*" onChange={(event) => handleFile(event, "voice")} /></label>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-3 outline-none placeholder:text-slate-500" placeholder={`Message #${active.name}`} />
              <button className="grid h-11 w-11 place-items-center rounded-md bg-cyan-300 text-slate-950 hover:bg-cyan-200" title="Send"><Send size={20} /></button>
            </div>
          </form>
        </section>
        <aside className="glass hidden rounded-lg p-4 xl:block">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">AI Brief</p>
          <h2 className="mt-2 text-xl font-semibold">Room summary</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-300">{summary || "Ask the assistant to summarize the last messages, extract decisions, and list action items."}</p>
        </aside>
      </section>
    </main>
  );
}

function Message({ message, self }) {
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${self ? "justify-end" : ""}`}>
      {!self && <Avatar name={message.username} />}
      <div className={`max-w-[78%] rounded-lg px-4 py-3 ${self ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-slate-100"}`}>
        <div className="mb-1 flex items-center gap-2 text-xs opacity-75">
          <span className="font-semibold">{message.username}</span>
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        {message.content && <p className="whitespace-pre-wrap break-words leading-6">{message.content}</p>}
        {message.media?.map((item) => <a className="mt-2 block rounded-md border border-white/20 px-3 py-2 text-sm underline" href={item.url} target="_blank" rel="noreferrer" key={item.url}>{item.name || item.type}</a>)}
      </div>
      {self && <Avatar name={message.username} />}
    </motion.article>
  );
}

function Avatar({ name = "M" }) {
  return <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gradient-to-br from-teal-300 to-rose-300 font-semibold text-slate-950">{name.slice(0, 1).toUpperCase()}</div>;
}

function IconButton({ icon, title, onClick }) {
  return <button onClick={onClick} title={title} className="grid h-10 w-10 place-items-center rounded-md text-slate-300 hover:bg-white/10">{icon}</button>;
}

function Skeleton() {
  return <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-white/10" />)}</div>;
}

