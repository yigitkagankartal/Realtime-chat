package com.yigitkagan.realtime_chat_backend.file;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class FileService {

    private final Cloudinary cloudinary;

    public FileService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String uploadImage(MultipartFile file) {
        try {
            // Cloudinary'ye yükle ve sonucu al
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());

            // Yüklenen resmin güvenli (https) url'ini döndür
            return uploadResult.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Resim yükleme başarısız oldu: " + e.getMessage());
        }
    }
}