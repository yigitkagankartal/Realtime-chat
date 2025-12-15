import { useState, useRef } from "react";
import { loginWithActivation } from "../api/auth";
import type { ActivationLoginRequest } from "../api/auth";
import type { MeResponse } from "../api/auth";

interface LoginFormProps {
  onLogin: (me: MeResponse) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [phonePrefix, setPhonePrefix] = useState("+90"); 
  const [phoneNumberBody, setPhoneNumberBody] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneBodyRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^+\d]/g, "");
    if (value.startsWith("+90") || value === "") {
      setPhonePrefix(value);
    }
    if (value === "+90" && phoneBodyRef.current) {
      phoneBodyRef.current.focus();
    }
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setPhoneNumberBody(value);

    if (value.length === 10 && passwordRef.current) {
        passwordRef.current.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const fullPhoneNumber = phonePrefix + phoneNumberBody.trim();
    const trimmedPassword = password.trim();

    if (fullPhoneNumber.length < 13 || !trimmedPassword) {
      setError("Lütfen geçerli bir telefon numarası ve şifre girin.");
      return;
    }

    setLoading(true);
    try {
      const payload: ActivationLoginRequest = {
        phoneNumber: fullPhoneNumber,
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
        background: "linear-gradient(180deg, #C6A7FF 0%, #9B8CFF 45%, #6F79FF 100%)", 
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "30px 40px",
          minWidth: 320,
          maxWidth: 360, 
          textAlign: 'center',
        }}
      >
        <style>
    {`
      input::placeholder {
        color: white;
        opacity: 0.9;
      }
    `}
  </style>

        <h2 style={{ marginBottom: 40, color: "white", fontSize: 28, fontWeight: 700 }}>
          Hoş Geldiniz!
        </h2>

        {/* --- TELEFON NUMARASI ALANI --- */}
        <div style={{ display: "flex", marginBottom: 15 }}>
          
          {/* SABİT +90 KUTUSU (Bayrak ve +90) */}
          <div style={{ 
              width: 90, 
              marginRight: 8,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '10px 0',
              // Şeffaf stil buraya taşındı ve sadeleştirildi
              backgroundColor: 'rgba(255, 255, 255, 0.25)', 
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: 10,
              fontWeight: 600,
              color: 'white',
              cursor: 'default',
              boxSizing: "border-box", // Hata veren kısım buraya taşındı
            }}>
            <span style={{ 
                fontSize: 18, 
                marginRight: 4
              }}>
              🇹🇷 
            </span>
            <span style={{ fontWeight: 600 }}>+90</span>
          </div>

          {/* Numara Gövdesi (5XX XXX XXXX) */}
          <input
            type="tel"
            ref={phoneBodyRef}
            placeholder="5xx xxx xxxx"
            value={phoneNumberBody}
            onChange={handleBodyChange}
            maxLength={10}
            style={{
              flexGrow: 1, 
              padding: "12px 15px",
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: 10, 
              outline: "none",
              color: 'white',
              boxSizing: "border-box" 
            }}
            required
          />
        </div>

        {/* --- ŞİFRE ALANI --- */}
        <input
          type="password"
          ref={passwordRef}
          placeholder="Şifrenizi girin"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 15px",
            marginBottom: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            borderRadius: 10,
            outline: "none",
            color: 'white',
            boxSizing: "border-box" // Hata veren kısım buraya taşındı
          }}
          required
        />

        {error && (
          <div
            style={{
              marginTop: 4,
              marginBottom: 10,
              fontSize: 13,
              color: "white",
              textAlign: "center",
              fontWeight: 600,
              backgroundColor: 'rgba(255, 0, 0, 0.5)',
              padding: '5px 10px',
              borderRadius: 5,
            }}
          >
            {error}
          </div>
        )}

        {/* BUTON: Beyaz Zemin, Mor Yazı */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px 0",
            marginTop: 20,
            borderRadius: 12,
            border: "none",
            backgroundColor: "white",
            color: "#5623d4ff",
            fontWeight: 700,
            fontSize: 18,
            boxShadow: "0 8px 15px rgba(51, 153, 10, 0.1)",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.8 : 1,
            transition: "all 0.3s"
          }}
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>

        <p style={{ marginTop: 20, fontSize: 14, color: 'white' }}>
          Bu uygulama sadece özel kullanıcılar için tasarlanmıştır.
        </p>
      </form>
    </div>
  );
};

export default LoginForm;