// src/App.tsx
import { useEffect, useState } from "react";
import ChatLayout from "./components/ChatLayout";
import LoginForm from "./components/LoginForm";
import { fetchMe, logout } from "./api/auth";
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
        logout();
        setMe(null);
      }
    };

    loadMe();
  }, []);

  const handleLogin = (user: MeResponse) => {
    setMe(user);
  };

  const handleLogout = () => {
    logout();
    setMe(null);
  };

  if (me === undefined) {
    return <div>Yükleniyor...</div>;
  }

  if (me === null) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Giriş yapmış kullanıcı → direkt ChatLayout
  return (
    <ChatLayout
      me={me}
      onLogout={handleLogout}
    />
  );
};

export default App;
