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
import java.util.List;
@Service
public class ChatService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatService(MessageRepository messageRepository,
                       ConversationRepository conversationRepository,
                       UserRepository userRepository,
                       SimpMessagingTemplate messagingTemplate) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public ChatMessageResponse handleIncomingMessage(ChatMessageRequest request) {
        Conversation conversation = conversationRepository.findById(request.conversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        User sender = userRepository.findById(request.senderId())
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(request.content());

        Message saved = messageRepository.save(message);

        ChatMessageResponse response = new ChatMessageResponse(
                saved.getId(),
                conversation.getId(),
                sender.getId(),
                saved.getContent(),
                saved.getCreatedAt(),
                saved.getStatus()
        );

        // WebSocket broadcast
        messagingTemplate.convertAndSend(
                "/topic/conversations/" + conversation.getId(),
                response
        );

        return response;
    }

    public Page<ChatMessageResponse> getMessages(Long conversationId, int page, int size, Long viewerId) {

        Page<Message> pageResult = messageRepository
                .findByConversationIdOrderByCreatedAtDesc(conversationId, PageRequest.of(page, size));

        List<Message> toUpdate = pageResult.getContent().stream()
                .filter(m -> !m.getSender().getId().equals(viewerId))             // bana gelenler
                .filter(m -> m.getStatus() == MessageStatus.SENT)                 // sadece SENT olanlar
                .toList();

        if (!toUpdate.isEmpty()) {
            toUpdate.forEach(m -> m.setStatus(MessageStatus.DELIVERED));
            messageRepository.saveAll(toUpdate);
        }

        return pageResult.map(msg -> new ChatMessageResponse(
                msg.getId(),
                msg.getConversation().getId(),
                msg.getSender().getId(),
                msg.getContent(),
                msg.getCreatedAt(),
                msg.getStatus()
        ));
    }

    @Transactional
    public void markConversationAsSeen(Long conversationId, Long viewerId) {
        // Bu konuşmadaki TÜM mesajları çek
        var messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);

        var toUpdate = messages.stream()
                .filter(m -> !m.getSender().getId().equals(viewerId))          // benim gönderdiklerim değil, bana gelenler
                .filter(m -> m.getStatus() != MessageStatus.SEEN)              // zaten SEEN olmayanlar
                .toList();

        if (toUpdate.isEmpty()) {
            return;
        }

        toUpdate.forEach(m -> m.setStatus(MessageStatus.SEEN));
        messageRepository.saveAll(toUpdate);

        // İstersen burada WebSocket ile güncellenmiş mesajları da publish edebiliriz,
        // ama şimdilik DB tarafını halletmek yeterli.
    }


}
