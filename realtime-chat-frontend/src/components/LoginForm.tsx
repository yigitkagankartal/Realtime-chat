import { useState } from "react";
import { loginWithActivation } from "../api/auth";
import type { ActivationLoginRequest } from "../api/auth";
import type { MeResponse } from "../api/auth";

interface LoginFormProps {
  onLogin: (me: MeResponse) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState(""); // Değişken adı password oldu
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedPhone = phoneNumber.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone || !trimmedPassword) {
      setError("Telefon numarası ve şifre zorunlu.");
      return;
    }

    setLoading(true);
    try {
      // Backend hala "activationCode" beklediği için şifreyi o isimle gönderiyoruz
      const payload: ActivationLoginRequest = {
        phoneNumber: trimmedPhone,
        activationCode: trimmedPassword, 
      };

      const me = await loginWithActivation(payload);
      onLogin(me);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Giriş başarısız. Telefon veya şifreyi kontrol et.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(#E8DFFC, #C9B9F7)",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: "#FFFFFF",
          padding: "24px 28px",
          borderRadius: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          minWidth: 320,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16, color: "#4A3F71", textAlign: "center" }}>
          Giriş Yap
        </h2>

        {/* Telefon Alanı */}
        <label style={{ display: "block", fontSize: 14, marginBottom: 4, color: "#666" }}>
          Telefon Numarası
        </label>
        <input
          type="tel"
          placeholder="+90 5xx xxx xx xx"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid #C5B8E6",
            outline: "none",
            boxSizing: "border-box" // Input taşmasını engeller
          }}
        />

        {/* Şifre Alanı */}
        <label style={{ display: "block", fontSize: 14, marginBottom: 4, color: "#666" }}>
          Şifre
        </label>
        <input
          type="password"  // Gizli karakter
          placeholder="Şifrenizi girin"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid #C5B8E6",
            outline: "none",
            boxSizing: "border-box"
          }}
        />

        {error && (
          <div
            style={{
              marginTop: 4,
              marginBottom: 8,
              fontSize: 13,
              color: "#B00020",
              textAlign: "center"
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 0",
            marginTop: 8,
            borderRadius: 8,
            border: "none",
            backgroundColor: "#6C4AB6",
            color: "white",
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "background 0.3s"
          }}
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

        <p
          style={{
            marginTop: 15,
            fontSize: 12,
            color: "#7C6FA5",
            textAlign: "center"
          }}
        >
          Telefon numaranızı ve oluşturmak istediğiniz şifreyi girmelisiniz.
        </p>
      </form>
    </div>
  );
};

export default LoginForm;