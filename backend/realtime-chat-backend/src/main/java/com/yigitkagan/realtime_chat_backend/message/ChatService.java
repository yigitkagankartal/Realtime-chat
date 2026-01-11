package com.yigitkagan.realtime_chat_backend.message;

import com.yigitkagan.realtime_chat_backend.conversation.Conversation;
import com.yigitkagan.realtime_chat_backend.conversation.ConversationRepository;
import com.yigitkagan.realtime_chat_backend.user.User;
import com.yigitkagan.realtime_chat_backend.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final MessageDeletionsRepository messageDeletionsRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatService(MessageRepository messageRepository,
                       ConversationRepository conversationRepository,
                       UserRepository userRepository,
                       MessageReactionRepository messageReactionRepository,
                       MessageDeletionsRepository messageDeletionsRepository,
                       SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.messageReactionRepository = messageReactionRepository;
        this.messageDeletionsRepository = messageDeletionsRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ChatMessageResponse handleIncomingMessage(ChatMessageRequest request) {
        Conversation conversation = conversationRepository.findById(request.conversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        User sender = userRepository.findById(request.senderId())
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(request.content());
        message.setReactions(new ArrayList<>());

        Message saved = messageRepository.save(message);

        ChatMessageResponse response = new ChatMessageResponse(
                saved.getId(),
                conversation.getId(),
                sender.getId(),
                saved.getContent(),
                saved.getCreatedAt(),
                null,
                saved.getStatus(),
                new ArrayList<>(),
                false
        );

        // 1. Sohbet odasındaki herkes (aktif sohbet ekranı için - ANLIK İLETİŞİM)
        messagingTemplate.convertAndSend("/topic/conversations/" + conversation.getId(), response);

        // 2. 🔥 GÜNCELLEME: Alıcıya özel bildirim gönder (Topic Notification Yöntemi)
        // Bu yöntem "User Principal" karmaşasını ortadan kaldırır ve mesajı garanti iletir.
        Long recipientId = conversation.getUser1().getId().equals(sender.getId())
                ? conversation.getUser2().getId()
                : conversation.getUser1().getId();

        // "/topic/notifications/{userId}" kanalına atıyoruz.
        // Frontend tarafında SocketContext.tsx bu kanalı dinleyecek.
        messagingTemplate.convertAndSend("/topic/notifications/" + recipientId, response);

        return response;
    }

    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getMessages(Long conversationId, int page, int size, Long viewerId) {
        Page<Message> pageResult = messageRepository
                .findByConversationIdOrderByCreatedAtDesc(conversationId, PageRequest.of(page, size));

        return pageResult.map(msg -> {
            if (messageDeletionsRepository.existsByMessageIdAndUserId(msg.getId(), viewerId)) {
                return null;
            }

            List<ReactionSummary> summaries = getReactionSummaries(msg, viewerId);
            return new ChatMessageResponse(
                    msg.getId(),
                    msg.getConversation().getId(),
                    msg.getSender().getId(),
                    msg.getContent(),
                    msg.getCreatedAt(),
                    msg.getUpdatedAt(),
                    msg.getStatus(),
                    summaries,
                    msg.isDeletedForEveryone()
            );
        });
    }

    @Transactional
    public void editMessage(Long messageId, Long userId, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Mesaj bulunamadı"));

        if (!message.getSender().getId().equals(userId)) {
            throw new RuntimeException("Yetkisiz işlem.");
        }
        if (message.isDeletedForEveryone()) {
            throw new RuntimeException("Silinmiş mesaj düzenlenemez.");
        }

        long diff = System.currentTimeMillis() - message.getCreatedAt().toEpochMilli();
        if (diff > 15 * 60 * 1000) {
            throw new RuntimeException("Süre doldu.");
        }

        message.setContent(newContent);
        message.setUpdatedAt(Instant.now());
        Message saved = messageRepository.save(message);

        List<ReactionSummary> summaries = getReactionSummaries(saved, userId);
        ChatMessageResponse response = new ChatMessageResponse(
                saved.getId(),
                saved.getConversation().getId(),
                saved.getSender().getId(),
                saved.getContent(),
                saved.getCreatedAt(),
                saved.getUpdatedAt(),
                saved.getStatus(),
                summaries,
                saved.isDeletedForEveryone()
        );
        messagingTemplate.convertAndSend("/topic/conversations/" + saved.getConversation().getId(), response);
    }

    @Transactional
    public void deleteMessageForEveryone(Long messageId, Long userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Mesaj bulunamadı"));

        if (!message.getSender().getId().equals(userId)) {
            throw new RuntimeException("Yetkisiz işlem.");
        }

        message.setContent("Bu mesaj silindi");
        message.setDeletedForEveryone(true);
        message.setUpdatedAt(null);

        Message saved = messageRepository.save(message);

        List<ReactionSummary> summaries = getReactionSummaries(saved, userId);
        ChatMessageResponse response = new ChatMessageResponse(
                saved.getId(),
                saved.getConversation().getId(),
                saved.getSender().getId(),
                saved.getContent(),
                saved.getCreatedAt(),
                saved.getUpdatedAt(),
                saved.getStatus(),
                summaries,
                true
        );
        messagingTemplate.convertAndSend("/topic/conversations/" + saved.getConversation().getId(), response);
    }

    @Transactional
    public void deleteMessageForMe(Long messageId, Long userId) {
        if (!messageDeletionsRepository.existsByMessageIdAndUserId(messageId, userId)) {
            messageDeletionsRepository.insertDeletion(messageId, userId);
        }
    }

    private List<ReactionSummary> getReactionSummaries(Message message, Long viewerId) {
        if (message.getReactions() == null) return new ArrayList<>();
        Map<String, List<MessageReaction>> grouped = message.getReactions().stream()
                .collect(Collectors.groupingBy(MessageReaction::getContent));
        List<ReactionSummary> summaries = new ArrayList<>();
        for (Map.Entry<String, List<MessageReaction>> entry : grouped.entrySet()) {
            boolean isMe = entry.getValue().stream().anyMatch(r -> r.getUser() != null && r.getUser().getId().equals(viewerId));
            summaries.add(new ReactionSummary(entry.getKey(), entry.getValue().size(), isMe));
        }
        return summaries;
    }

    @Transactional
    public void toggleReaction(Long messageId, Long userId, String emoji) {
        Message message = messageRepository.findById(messageId).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();
        Optional<MessageReaction> existingOpt = messageReactionRepository.findByMessageIdAndUserId(messageId, userId);
        if (existingOpt.isPresent()) {
            if (existingOpt.get().getContent().equals(emoji)) messageReactionRepository.delete(existingOpt.get());
            else { existingOpt.get().setContent(emoji); messageReactionRepository.save(existingOpt.get()); }
        } else {
            messageReactionRepository.save(new MessageReaction(message, user, emoji));
        }
    }

    @Transactional
    public void markConversationAsSeen(Long conversationId, Long viewerId) {
        var msgs = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        msgs.stream().filter(m -> !m.getSender().getId().equals(viewerId) && m.getStatus() != MessageStatus.SEEN)
                .forEach(m -> m.setStatus(MessageStatus.SEEN));
        messageRepository.saveAll(msgs);
    }
}