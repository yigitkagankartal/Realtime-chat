import client from "./client"; // senin axios client'ın

// Profil resmi yükleme fonksiyonu
export const uploadProfileImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  // Content-Type belirtmemize gerek yok, axios FormData görünce otomatik ayarlar
  // ama garanti olsun diye bazen belirtilir.
  const response = await client.post("/users/me/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  
  return response.data; // Güncel user objesi döner
};