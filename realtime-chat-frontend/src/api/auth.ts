import api from "./client";

export interface MeResponse {
  id: number;
  displayName: string;
  phoneNumber: string;
  profilePictureUrl?: string;
  about?: string;
}

interface ActivationLoginResponse {
  id: number;
  displayName: string;
  phoneNumber: string;
  token: string;
  // Backend'den login cevabında bunlar da geliyorsa buraya eklemelisin
  // Gelmiyorsa loginWithActivation return kısmında undefined kalabilirler.
  profilePictureUrl?: string; 
  about?: string;
}

export interface ActivationLoginRequest {
  phoneNumber: string;
  activationCode: string;
}

// Telefon + aktivasyon kodu ile login
export const loginWithActivation = async (
  payload: ActivationLoginRequest
): Promise<MeResponse> => {
  const res = await api.post<ActivationLoginResponse>("/api/auth/activate", payload);
  const data = res.data;

  // Token'ı localStorage'a yaz
  localStorage.setItem("token", data.token);

  // ✅ DÜZELTME 1: Login olunca da resim ve hakkında bilgisi gelsin
  return {
    id: data.id,
    displayName: data.displayName,
    phoneNumber: data.phoneNumber,
    profilePictureUrl: data.profilePictureUrl, // Eklendi
    about: data.about, // Eklendi
  };
};

// Uygulama açıldığında mevcut kullanıcıyı getir
export const fetchMe = async (): Promise<MeResponse> => {
  const res = await api.get("/api/users/me");
  const d = res.data;

  // ✅ DÜZELTME 2: Sayfa yenilenince (refresh) burası çalışır.
  // Eskiden about ve resim burada filtrelenip atılıyordu. Artık alıyoruz.
  return {
    id: d.id,
    displayName: d.displayName,
    phoneNumber: d.phoneNumber,
    profilePictureUrl: d.profilePictureUrl, // Eklendi!
    about: d.about, // Eklendi!
  };
};

export const logout = () => {
  localStorage.removeItem("token");
};

export const updateProfile = async (data: {
  displayName?: string;
  about?: string;
  profilePictureUrl?: string;
}): Promise<MeResponse> => {
  // updateProfile zaten direkt res.data döndüğü için burası doğruydu.
  const res = await api.put<MeResponse>("/api/users/me", data);
  return res.data;
};