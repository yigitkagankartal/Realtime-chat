package com.yigitkagan.realtime_chat_backend.auth;

import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginRequest;
import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginResponse;
import com.yigitkagan.realtime_chat_backend.user.User;
import com.yigitkagan.realtime_chat_backend.user.UserRepository;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Optional;

@Service
public class ActivationAuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public ActivationAuthService(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    public ActivationLoginResponse loginWithActivationCode(ActivationLoginRequest request) {
        String phone = request.phoneNumber().trim();
        String incomingCode = request.activationCode().trim();

        Optional<User> userOptional = userRepository.findByPhoneNumber(phone);
        User user;

        if (userOptional.isPresent()) {
            // --- KULLANICI VARSA ---
            user = userOptional.get();
            String currentPassword = user.getPasswordHash();

            // Şifre yanlışsa hata ver
            if (currentPassword == null || !currentPassword.equals(incomingCode)) {
                throw new RuntimeException("Giriş Başarısız: Bu numara için şifre yanlış.");
            }

            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

        } else {
            // --- KULLANICI YOKSA (KAYIT OL) ---
            user = new User();
            user.setPhoneNumber(phone);
            user.setDisplayName(phone);
            user.setEmail(phone + "@mobile.chat");
            user.setPasswordHash(incomingCode); // İlk girişteki kodu şifre yap

            userRepository.save(user);
        }

        String token = jwtService.generateToken(user);

        return new ActivationLoginResponse(
                user.getId(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                token
        );
    }
}