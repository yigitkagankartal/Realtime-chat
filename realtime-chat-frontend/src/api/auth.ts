import api from "./client";

// Backend'deki User.java ile uyumlu tip
export interface MeResponse {
  id: number;
  displayName: string;
  phoneNumber: string;
  profilePictureUrl?: string;
  about?: string;
  isActivated: boolean; // ✅ YENİ
}

interface ActivationLoginResponse {
  id: number;
  displayName: string;
  phoneNumber: string;
  token: string;
  profilePictureUrl?: string;
  about?: string;
  isActivated: boolean; // ✅ YENİ
}

export interface ActivationLoginRequest {
  phoneNumber: string;
  activationCode: string;
}

// 1. Login Fonksiyonu
export const loginWithActivation = async (
  payload: ActivationLoginRequest
): Promise<MeResponse> => {
  const res = await api.post<ActivationLoginResponse>("/api/auth/activate", payload);
  const data = res.data;

  localStorage.setItem("token", data.token);

  return {
    id: data.id,
    displayName: data.displayName,
    phoneNumber: data.phoneNumber,
    profilePictureUrl: data.profilePictureUrl,
    about: data.about,
    isActivated: data.isActivated,
  };
};

// 2. ✅ YENİ: Master Key Doğrulama Fonksiyonu
export const verifyMasterKey = async (phoneNumber: string, masterKey: string): Promise<MeResponse> => {
  const res = await api.post<ActivationLoginResponse>("/api/auth/verify-master-key", {
    phoneNumber,
    masterKey
  });
  const data = res.data;
  
  localStorage.setItem("token", data.token); // Token yenilenebilir

  return {
    id: data.id,
    displayName: data.displayName,
    phoneNumber: data.phoneNumber,
    profilePictureUrl: data.profilePictureUrl,
    about: data.about,
    isActivated: true,
  };
};

// 3. Kullanıcı Bilgisi Çekme
export const fetchMe = async (): Promise<MeResponse> => {
  const res = await api.get("/api/users/me");
  const d = res.data;
  return {
    id: d.id,
    displayName: d.displayName,
    phoneNumber: d.phoneNumber,
    profilePictureUrl: d.profilePictureUrl,
    about: d.about,
    isActivated: d.isActivated !== undefined ? d.isActivated : true, // Eskiden kalan kullanıcılar sorun yaşamasın
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
  const res = await api.put<MeResponse>("/api/users/me", data);
  return res.data;
};