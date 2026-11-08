import { useState } from "react";
import type { FormEvent } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function submit(ev: FormEvent) {
    ev.preventDefault();
    setErr(""); setBusy(true);
    signInWithEmailAndPassword(auth, email.trim(), pass)
      .catch((e: { code?: string }) => {
        setErr(e.code === "auth/too-many-requests" ? "Trop d'essais. Réessaie dans quelques minutes."
          : e.code === "auth/network-request-failed" ? "Pas de connexion internet."
          : "E-mail ou mot de passe incorrect.");
      })
      .then(() => setBusy(false));
  }

  return (
    <div className="authbox">
      <form className="panel form" onSubmit={submit}>
        <h2>Mon carnet de recettes</h2>
        <label htmlFor="loginEmail">E-mail
          <input type="email" id="loginEmail" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label htmlFor="loginPass">Mot de passe
          <input type="password" id="loginPass" autoComplete="current-password" required value={pass} onChange={e => setPass(e.target.value)} />
        </label>
        <p className="hint" role="alert">{err}</p>
        <button className="btn primary" type="submit" disabled={busy}>Se connecter</button>
      </form>
    </div>
  );
}
