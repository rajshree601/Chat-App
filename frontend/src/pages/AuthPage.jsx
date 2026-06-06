import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, MessageSquare, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ email: "", password: "", name: "", code: "" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      if (mode === "signup") {
        await auth.signUp(form.email, form.password, form.name);
        setMode("confirm");
      } else if (mode === "confirm") {
        await auth.confirmSignUp(form.email, form.code);
        setMode("signin");
      } else {
        await auth.signIn(form.email, form.password);
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative flex min-h-[42vh] items-end overflow-hidden p-8 lg:min-h-screen lg:p-12">
        <img className="absolute inset-0 h-full w-full object-cover opacity-70" src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1600&q=80" alt="Team collaboration" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-950/70 to-slate-950/10" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-cyan-100 backdrop-blur">
            <ShieldCheck size={16} /> AWS-native secure messaging
          </div>
          <h1 className="text-5xl font-semibold tracking-normal text-white md:text-7xl">Realtime Chat Platform</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">Rooms, direct messages, media sharing, presence, read receipts, and AI assistance on a fully serverless AWS architecture.</p>
        </motion.div>
      </section>
      <section className="flex items-center justify-center px-5 py-10">
        <motion.form initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} onSubmit={submit} className="glass w-full max-w-md rounded-lg p-6 shadow-glow">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-400 text-slate-950"><MessageSquare /></div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{mode === "signup" ? "Create account" : mode === "confirm" ? "Verify email" : "Welcome back"}</h2>
              <p className="text-sm text-slate-400">Cognito protected access</p>
            </div>
          </div>
          {mode === "signup" && <Input icon={<Mail />} placeholder="Display name" value={form.name} onChange={(name) => setForm({ ...form, name })} />}
          <Input icon={<Mail />} placeholder="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          {mode !== "confirm" && <Input icon={<Lock />} type="password" placeholder="Password" value={form.password} onChange={(password) => setForm({ ...form, password })} />}
          {mode === "confirm" && <Input icon={<ShieldCheck />} placeholder="Verification code" value={form.code} onChange={(code) => setForm({ ...form, code })} />}
          {error && <p className="mb-3 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
          <button className="w-full rounded-md bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200">
            {mode === "signup" ? "Sign up" : mode === "confirm" ? "Confirm email" : "Sign in"}
          </button>
          <div className="mt-4 flex justify-between text-sm text-slate-300">
            <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Use existing account" : "Create account"}</button>
            <button type="button" onClick={() => auth.forgotPassword(form.email)}>Forgot password</button>
          </div>
        </motion.form>
      </section>
    </main>
  );
}

function Input({ icon, value, onChange, type = "text", placeholder }) {
  return (
    <label className="mb-3 flex items-center gap-3 rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-300">
      <span className="text-slate-500">{icon}</span>
      <input className="min-w-0 flex-1 bg-transparent py-1 outline-none placeholder:text-slate-500" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

