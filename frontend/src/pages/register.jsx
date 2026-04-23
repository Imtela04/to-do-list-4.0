import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/services";
// import Navbar from "../components/navbar";

export default function Register() {
    const [form, setForm]       = useState({ username: "", password: "", confirm: "" });
    const [error, setError]     = useState("");
    const [loading, setLoading] = useState(false);
    const navigate              = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!form.username.trim() || !form.password.trim() || !form.confirm.trim()) {
            setError("All fields required");
            return;
        }
        if (form.password !== form.confirm) {
            setError("Passwords do not match");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        setLoading(true);
        try {
          await register({ 
              username: form.username, 
              password: form.password,
              confirm: form.confirm 
          });
          navigate("/");
        } catch (err) {
            setError(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-3.5 py-2.5 my-2 rounded-xl border border-gray-300 text-sm outline-none font-mono transition-colors duration-500 focus:border-violet-600";

    return (
        <>
        <div className="flex justify-center items-center min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
            <div className="w-full max-w-sm rounded-2xl shadow-lg p-9 text-center" style={{ background: "var(--calendar-color)" }}>
                <h1 className="text-2xl font-bold mb-5" style={{ color: "var(--accent)" }}>Register</h1>

                {error && <p className="text-red-500 font-semibold text-sm mb-3">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={form.username}
                        onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                        autoComplete="username"
                        className={inputClass}
                        style={{ background: "var(--surface)", color: "var(--text)" }}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        autoComplete="new-password"
                        className={inputClass}
                        style={{ background: "var(--surface)", color: "var(--text)" }}
                    />
                    <input
                        type="password"
                        placeholder="Confirm password"
                        value={form.confirm}
                        onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                        autoComplete="new-password"
                        className={inputClass}
                        style={{ background: "var(--surface)", color: "var(--text)" }}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-3 py-2.5 rounded-full font-bold text-sm text-white cursor-pointer transition-all duration-500 disabled:opacity-60"
                        style={{ background: "var(--accent)" }}
                        onMouseOver={e => e.currentTarget.style.background = "var(--accent-hover)"}
                        onMouseOut={e => e.currentTarget.style.background = "var(--accent)"}
                    >
                        {loading ? "Registering..." : "Register"}
                    </button>
                </form>

                <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                        Login here
                    </Link>
                </p>
            </div>
        </div>
        </>
    );
}