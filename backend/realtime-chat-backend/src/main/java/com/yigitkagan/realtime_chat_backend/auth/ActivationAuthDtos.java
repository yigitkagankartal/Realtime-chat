package com.yigitkagan.realtime_chat_backend.auth;

public class ActivationAuthDtos {

    public record ActivationLoginRequest(
            String phoneNumber,
            String activationCode
    ) {}

    public record ActivationLoginResponse(
            Long id,
            String displayName,
            String phoneNumber,
            String token,
            String profilePictureUrl,
            String about,
            boolean isActivated
    ) {}
    public record VerifyActivationRequest(
            String phoneNumber,
            String masterKey // Kullanıcının girmesi gereken GİZLİ ŞİFRE
    ) {}
}
