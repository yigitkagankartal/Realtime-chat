import React, { useState, useRef } from "react";
import { updateProfile } from "../api/auth";
import { uploadProfileImage } from "../api/user";
import type { MeResponse } from "../api/auth";

interface ProfileSetupModalProps {
  onComplete: (updatedUser: MeResponse) => void;
}

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ onComplete }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Dosyayı state'e at (Sunucuya göndermek için)
    setSelectedFile(file);

    // 2. Önizleme oluştur (Ekranda göstermek için)
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      // 1. Önce ismi güncelle
      let currentUser = await updateProfile({
        displayName: name,
        about: "Selam, sende mi buradasın?",
      });

      // 2. Eğer dosya seçildiyse, onu da yükle
      if (selectedFile) {
        currentUser = await uploadProfileImage(selectedFile);
      }

      onComplete(currentUser);
    } catch (error) {
      console.error("Profil oluşturma hatası:", error);
      alert("Bir hata oluştu, lütfen tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2000, backdropFilter: "blur(5px)",
      }}
    >
      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", width: "400px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
        <h2 style={{ color: "#3E3663", marginTop: 0 }}>Profilini Oluştur 🎉</h2>
        <p style={{ color: "#7C75A6", marginBottom: 20 }}>Sohbetlere başlamadan önce seni tanıyalım.</p>

        {/* GİZLİ INPUT */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            hidden 
            accept="image/*"
        />

        {/* Profil Resmi Alanı */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 100, height: 100, margin: "0 auto 20px auto",
            borderRadius: "50%", backgroundColor: "#EAE6FF",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", border: "2px dashed #9B8CFF", color: "#6F79FF",
            backgroundImage: previewImage ? `url(${previewImage})` : "none",
            backgroundSize: "cover", backgroundPosition: "center"
          }}
        >
          {!previewImage && <span>📷 Ekle</span>}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text" placeholder="Adın ve Soyadın" value={name} onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: "12px 15px", borderRadius: "10px", border: "1px solid #DDD6FF", marginBottom: 20, fontSize: "16px", outline: "none" }}
            autoFocus
          />
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "linear-gradient(90deg, #6F79FF, #9B8CFF)", color: "white", border: "none", fontWeight: "bold", fontSize: "16px", cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Kaydediliyor..." : "Başla 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupModal;