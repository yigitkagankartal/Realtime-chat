package com.yigitkagan.realtime_chat_backend.config;

import com.yigitkagan.realtime_chat_backend.auth.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF Kapat (Rest API ve WebSocket için gerekli)
                .csrf(csrf -> csrf.disable())

                // 2. CORS Ayarları (Frontend'in bağlanabilmesi için kapıları açıyoruz)
                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();
                    // Render'da veya Local'de her yerden gelen isteği kabul et
                    config.setAllowedOriginPatterns(List.of("*"));
                    // Tüm HTTP metodlarına izin ver
                    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
                    config.setAllowedHeaders(List.of("*"));
                    // Çerezler veya Token ile gelen isteklere izin ver
                    config.setAllowCredentials(true);
                    return config;
                }))

                // 3. Session Yönetimi (JWT kullandığımız için STATELESS yapıyoruz)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 4. İzin Kuralları (Kritik Bölüm)
                .authorizeHttpRequests(auth -> auth
                        // A. Tarayıcı ön uçuş (Preflight) istekleri (OPTIONS) her zaman geçmeli
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // B. Public Endpointler: Ana sayfa, statik dosyalar ve Hata sayfası (/error)
                        .requestMatchers("/", "/index.html", "/static/**", "/assets/**", "/error").permitAll()

                        // C. Auth (Giriş/Kayıt) işlemleri herkese açık
                        .requestMatchers("/api/auth/**").permitAll()

                        // D. WebSocket Bağlantı Noktası (ÇOK ÖNEMLİ)
                        // Hem "/ws" (Handshake noktası) hem de "/ws/**" (Alt yollar) için izin ver
                        .requestMatchers("/ws/**", "/ws").permitAll()

                        // E. Geri kalan her yer için token zorunlu
                        .anyRequest().authenticated()
                )

                // 5. JWT Filtresini devreye sok
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
            throws Exception {
        return configuration.getAuthenticationManager();
    }
}