package com.yigitkagan.realtime_chat_backend.conversation;

import com.yigitkagan.realtime_chat_backend.user.User;
import com.yigitkagan.realtime_chat_backend.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;

    public ConversationService(ConversationRepository conversationRepository,
                               UserRepository userRepository) {
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser(Authentication authentication) {
        String email = (String) authentication.getPrincipal();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public ConversationResponse createOrGetConversation(ConversationCreateRequest request,
                                                        Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        User otherUser = userRepository.findById(request.otherUserId())
                .orElseThrow(() -> new RuntimeException("Other user not found"));

        // Önce mevcut konuşma var mı diye bak
        Conversation existing = conversationRepository
                .findFirstByUser1IdAndUser2IdOrUser2IdAndUser1Id(
                        currentUser.getId(), otherUser.getId(),
                        currentUser.getId(), otherUser.getId()
                );

        Conversation conversation;
        if (existing != null) {
            conversation = existing;
        } else {
            conversation = new Conversation();
            conversation.setUser1(currentUser);
            conversation.setUser2(otherUser);
            conversation = conversationRepository.save(conversation);
        }

        return toResponse(conversation);
    }

    public List<ConversationResponse> listMyConversations(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        List<Conversation> conversations =
                conversationRepository.findByUser1IdOrUser2Id(currentUser.getId(), currentUser.getId());

        return conversations.stream()
                .map(this::toResponse)
                .toList();
    }

    private ConversationResponse toResponse(Conversation c) {
        return new ConversationResponse(
                c.getId(),
                c.getUser1().getId(),
                c.getUser1().getDisplayName(),
                c.getUser2().getId(),
                c.getUser2().getDisplayName()
        );
    }
}
