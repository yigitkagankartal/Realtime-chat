import { useEffect, useState } from "react";
import ChatLayout from "./components/ChatLayout";
import LoginForm from "./components/LoginForm";
import ActivationGate from "./components/ActivationGate";
import { fetchMe, logout } from "./api/auth";
import type { MeResponse } from "./api/auth";
import { SocketProvider } from "./context/SocketContext";

const App: React.FC = () => {
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);

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

  // Kilit ekranında başarılı giriş yapınca burası çalışır
  const handleActivationSuccess = (updatedUser: MeResponse) => {
    setMe(updatedUser);
  };

  if (me === undefined) {
    return <div style={{height: "100vh", background: "#1e1e2e", color:"white", display:"flex", alignItems:"center", justifyContent:"center"}}>Yükleniyor...</div>;
  }

  if (me === null) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // ✅ KONTROL: Aktif değilse Kapı Ekranına git
  if (!me.isActivated) {
    return (
      <ActivationGate 
        me={me} 
        onSuccess={handleActivationSuccess} 
        onLogout={handleLogout} 
      />
    );
  }

  // ✅ Aktifse Sohbete git
  // 🔥 BURAYI GÜNCELLEDİK: SocketProvider ile sarmaladık.
  return (
    <SocketProvider userId={me.id}>
      <ChatLayout
        me={me}
        onLogout={handleLogout}
      />
    </SocketProvider>
  );
};

export default App;