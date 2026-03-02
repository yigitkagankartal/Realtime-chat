import client from "./client";

// Profil resmi yükleme fonksiyonu
export const uploadProfileImage = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await client.post("/api/users/me/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  
  return response.data;
};