package com.yigitkagan.realtime_chat_backend.auth;

import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginRequest;
import com.yigitkagan.realtime_chat_backend.auth.ActivationAuthDtos.ActivationLoginResponse;
import com.yigitkagan.realtime_chat_backend.user.User;
import com.yigitkagan.realtime_chat_backend.user.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ActivationAuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public ActivationAuthService(
            UserRepository userRepository,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    public ActivationLoginResponse loginWithActivationCode(ActivationLoginRequest request) {
        String phone = request.phoneNumber().trim();
        String incomingCode = request.activationCode().trim();

        Optional<User> userOptional = userRepository.findByPhoneNumber(phone);

        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            String currentPassword = user.getPasswordHash();
            if (currentPassword == null || !currentPassword.equals(incomingCode)) {
                throw new RuntimeException("Hatalı kod! Bu numara için belirlenen şifre (kod) yanlış.");
            }

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
                token
        );
    }
}