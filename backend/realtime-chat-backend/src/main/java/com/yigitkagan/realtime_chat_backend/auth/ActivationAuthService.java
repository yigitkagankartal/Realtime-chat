package com.yigitkagan.realtime_chat_backend.auth;

import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginRequest;
import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginResponse;
import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.VerifyActivationRequest;
import com.yigitkagan.realtime_chat_backend.user.User;
import com.yigitkagan.realtime_chat_backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Optional;

@Service
public class ActivationAuthService {

    @Value("${app.activation.master-key}")
    private String masterActivationKey;

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public ActivationAuthService(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    public ActivationLoginResponse loginWithActivationCode(ActivationLoginRequest request) {
        String rawPhone = request.phoneNumber();
        if (rawPhone == null) rawPhone = "";

        String phone = rawPhone.replaceAll("[^0-9+]", "");
        String incomingCode = request.activationCode() != null ? request.activationCode().trim() : "";

        if (!phone.matches("^\\+905[0-9]{9}$")) {
            throw new RuntimeException("Geçersiz numara! +905xxxxxxxxx formatında olmalıdır.");
        }

        Optional<User> userOptional = userRepository.findByPhoneNumber(phone);
        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            String currentPassword = user.getPasswordHash();

            if (currentPassword == null || !currentPassword.equals(incomingCode)) {
                throw new RuntimeException("Şifre hatalı.");
            }
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

        } else {
            user = new User();
            user.setPhoneNumber(phone);
            user.setDisplayName(phone);
            user.setEmail(phone + "@mobile.chat");
            user.setPasswordHash(incomingCode);
            userRepository.save(user);
        }

        String token = jwtService.generateToken(user);

        return new ActivationLoginResponse(
                user.getId(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                token,
                user.getProfilePictureUrl(),
                user.getAbout(),
                user.isActivated()
        );
    }

    public ActivationLoginResponse verifyAccountActivation(VerifyActivationRequest request) {
        if (!masterActivationKey.equals(request.masterKey())) {
            throw new RuntimeException("Hatalı Aktivasyon Kodu! Erişim reddedildi.");
        }

        String rawPhone = request.phoneNumber();
        String phone = rawPhone.replaceAll("[^0-9+]", "");

        User user = userRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı!"));

        user.setActivated(true);
        userRepository.save(user);

        String token = jwtService.generateToken(user);

        return new ActivationLoginResponse(
                user.getId(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                token,
                user.getProfilePictureUrl(),
                user.getAbout(),
                true
        );
    }
}