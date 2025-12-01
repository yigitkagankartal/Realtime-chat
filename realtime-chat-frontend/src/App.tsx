// src/App.tsx
import { useEffect, useState } from "react";
import ChatLayout from "./components/ChatLayout";
import LoginForm from "./components/LoginForm";
import {fetchMe, logout } from "./api/auth";
import type { MeResponse } from "./api/auth";

const App: React.FC = () => {
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);

  // Uygulama açıldığında mevcut kullanıcıyı kontrol et
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMe(null);
      return;
    }

    const loadMe = async () => {
      try {
        const res = await fetchMe();
        setMe(res);
      } catch (err) {
        console.error("Me yüklenirken hata:", err);
        // Token bozuksa temizle
        logout();
        setMe(null);
      }
    };

    loadMe();
  }, []);

  const handleLogin = (user: MeResponse) => {
    setMe(user);
  };

  const handleLogoutClick = () => {
    logout();
    setMe(null);
  };

  if (me === undefined) {
    // İlk yükleme
    return <div>Yükleniyor...</div>;
  }

  if (me === null) {
    // Login ekranı
    return <LoginForm onLogin={handleLogin} />;
  }

  // Giriş yapmış kullanıcı için chat ekranı
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* İstersen üstte basit bir bar ile logout koyduk */}
      <div
        style={{
          height: 40,
          backgroundColor: "#4A3F71",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          fontSize: 14,
        }}
      >
        <span>{me.displayName}</span>
        <button
          onClick={handleLogoutClick}
          style={{
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
          }}
        >
          Çıkış Yap
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <ChatLayout me={me} />
      </div>
    </div>
  );
};

export default App;
