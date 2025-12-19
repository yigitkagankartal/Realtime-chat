// src/utils/imageUtils.ts

export const compressImage = async (file: File, quality: "SD" | "HD" = "SD"): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      // WhatsApp Mantığına benzer küçültme
      // SD: Standart Kalite (Hızlı gönderim)
      const MAX_WIDTH = quality === "SD" ? 800 : 1280; 
      const MAX_HEIGHT = quality === "SD" ? 800 : 1280;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas oluşturulamadı"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // JPEG formatında %75 kalite ile sıkıştır
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Sıkıştırma başarısız"));
      }, "image/jpeg", 0.75);
    };
    
    img.onerror = (err) => reject(err);
  });
};