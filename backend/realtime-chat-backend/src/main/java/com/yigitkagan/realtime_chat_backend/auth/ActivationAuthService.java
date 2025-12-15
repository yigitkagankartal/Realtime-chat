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
        // Gelen veriyi temizle
        String phone = request.phoneNumber().trim();
        String incomingCode = request.activationCode().trim();

        Optional<User> userOptional = userRepository.findByPhoneNumber(phone);
        User user;

        if (userOptional.isPresent()) {
            // --- SENARYO 1: KULLANICI ZATEN VAR ---
            user = userOptional.get();
            String currentPassword = user.getPasswordHash();

            // Eğer şifresi yoksa (eski kayıt) veya şifre yanlışsa
            if (currentPassword == null || !currentPassword.equals(incomingCode)) {
                // Şifre yanlışsa giriş izni verme!
                throw new RuntimeException("Giriş Başarısız: Bu numara için belirlenen şifre yanlış.");
            }

            // Başarılı giriş: LastLogin güncelle
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);

        } else {
            // --- SENARYO 2: KULLANICI YOK (İLK DEFA GELİYOR) ---
            user = new User();
            user.setPhoneNumber(phone);
            user.setDisplayName(phone); // İsim şimdilik numara olsun
            user.setEmail(phone + "@mobile.chat"); // JWT için zorunlu alan

            // İlk girişte yazılan kodu ŞİFRE olarak kaydet
            user.setPasswordHash(incomingCode);

            userRepository.save(user);
        }

        // Token üret
        String token = jwtService.generateToken(user);

        return new ActivationLoginResponse(
                user.getId(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                token
        );
    }
}