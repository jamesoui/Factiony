import { useState } from "react"
import { supabase } from "../../lib/supabaseClient";

export default function RegisterForm() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!username.trim()) {
      setError("Le nom d'utilisateur est requis")
      return
    }

    if (username.length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères")
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores")
      return
    }

    console.log("Email submitted:", email, "Username:", username, "Password submitted:", password)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim()
        }
      }
    })

    if (error) {
      console.error("❌ Erreur inscription:", error)
      setError(error.message)
    } else {
      console.log("✅ Inscription réussie:", data)
      setSuccess("Compte créé avec succès !")
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}>
      <input
        type="text"
        placeholder="Nom d'utilisateur"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        minLength={3}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">S'inscrire</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
    </form>
  )
}
