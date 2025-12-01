// src/api/auth.ts
import api from "./client";

export interface MeResponse {
  id: number;
  displayName: string;
  phoneNumber: string;
}

interface ActivationLoginResponse {
  id: number;
  displayName: string;
  phoneNumber: string;
  token: string;
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

  // MeResponse döndür (ChatLayout bunu kullanıyor)
  return {
    id: data.id,
    displayName: data.displayName,
    phoneNumber: data.phoneNumber,
  };
};

// Uygulama açıldığında mevcut kullanıcıyı getir
export const fetchMe = async (): Promise<MeResponse> => {
  const res = await api.get("/api/users/me");
  const d = res.data;

  return {
    id: d.id,
    displayName: d.displayName,
    phoneNumber: d.phoneNumber,
  };
};

export const logout = () => {
  localStorage.removeItem("token");
};
