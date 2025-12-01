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
            String token
    ) {}
}
