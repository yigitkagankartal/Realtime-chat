import React, { useState } from "react";
import { verifyMasterKey } from "../api/auth";
import type { MeResponse } from "../api/auth";

interface Props {
  me: MeResponse;
  onSuccess: (updatedMe: MeResponse) => void;
  onLogout: () => void;
}

const ActivationGate: React.FC<Props> = ({ me, onSuccess, onLogout }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const updatedUser = await verifyMasterKey(me.phoneNumber, code);
      onSuccess(updatedUser);
    } catch (err) {
      setError("Hatalı kod! Erişim izniniz yok.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #1e1e2e 0%, #2d2b55 100%)",
      color: "white", fontFamily: "Segoe UI, sans-serif"
    }}>
      <div style={{
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
        padding: "40px", borderRadius: "20px", width: "100%", maxWidth: "400px",
        textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
      }}>
        <h1 style={{ marginBottom: "10px" }}>🔒 Erişim Kısıtlı</h1>
        <p style={{ color: "#ccc", marginBottom: "30px", fontSize: "14px" }}>
          Hoş geldin {me.displayName}. Devam etmek için davet kodunu (Master Key) girin.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Aktivasyon Kodu"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "none",
              marginBottom: "15px", backgroundColor: "rgba(0,0,0,0.3)", color: "white",
              fontSize: "16px", outline: "none", textAlign: "center", boxSizing: "border-box"
            }}
          />
          
          {error && <div style={{ color: "#ff6b6b", marginBottom: "15px", fontSize: "14px" }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "none",
              backgroundColor: "#6F79FF", color: "white", fontSize: "16px", fontWeight: "bold",
              cursor: "pointer", opacity: loading ? 0.7 : 1, transition: "0.2s"
            }}
          >
            {loading ? "Doğrulanıyor..." : "Kilidi Aç 🔓"}
          </button>
        </form>

        <button
          onClick={onLogout}
          style={{
            marginTop: "20px", background: "none", border: "none", color: "#aaa",
            cursor: "pointer", fontSize: "13px", textDecoration: "underline"
          }}
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};

export default ActivationGate;