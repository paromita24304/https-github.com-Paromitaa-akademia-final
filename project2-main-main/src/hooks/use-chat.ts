import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import { generateResponse, generateTitle } from '@/lib/ai-engine';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load conversation list from Supabase
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setConversations(data as ChatConversation[]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime: refresh conversation list when any conversation changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chat_conversations_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations', filter: `user_id=eq.${user.id}` },
        () => { loadConversations(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadConversations]);

  // Load messages for a conversation from Supabase
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as ChatMessage[]);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages]);

  // Realtime: append new messages as they arrive
  useEffect(() => {
    if (!activeConversationId) return;
    const channel = supabase
      .channel(`chat_messages_${activeConversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${activeConversationId}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId]);

  // Stream text character-by-character
  const streamResponse = useCallback((fullText: string, onComplete: () => void) => {
    setStreamingText('');
    let i = 0;
    const chars = fullText.split('');
    if (streamTimer.current) clearInterval(streamTimer.current);
    streamTimer.current = setInterval(() => {
      i += Math.max(1, Math.floor(chars.length / 120));
      setStreamingText(fullText.slice(0, i));
      if (i >= chars.length) {
        if (streamTimer.current) clearInterval(streamTimer.current);
        setStreamingText('');
        onComplete();
      }
    }, 16);
  }, []);

  // Send a message via Supabase
  const sendMessage = useCallback(
    async (text: string) => {
      if (!user || !text.trim() || sending) return;

      setSending(true);
      let convId = activeConversationId;

      try {
        // Create conversation if none active
        if (!convId) {
          const title = generateTitle(text);
          const { data: newConv, error: convError } = await supabase
            .from('chat_conversations')
            .insert({ user_id: user.id, title })
            .select()
            .single();

          if (convError || !newConv) {
            setSending(false);
            return;
          }

          convId = (newConv as ChatConversation).id;
          setActiveConversationId(convId);
          setConversations((prev) => [newConv as ChatConversation, ...prev]);
        }

        // Post user message to Supabase
        const { data: userMsg, error: userMsgError } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: convId,
            user_id: user.id,
            role: 'user',
            content: text,
          })
          .select()
          .single();

        if (!userMsgError && userMsg) {
          setMessages((prev) => [...prev, userMsg as ChatMessage]);
        }

        // Generate AI response
        const aiContent = generateResponse(text);

        // Stream the response visually, then save assistant message to Supabase
        streamResponse(aiContent, async () => {
          try {
            const { data: aiMsg, error: aiError } = await supabase
              .from('chat_messages')
              .insert({
                conversation_id: convId,
                user_id: user.id,
                role: 'assistant',
                content: aiContent,
              })
              .select()
              .single();

            if (!aiError && aiMsg) {
              setMessages((prev) => [...prev, aiMsg as ChatMessage]);
            }

            // Update conversation updated_at
            await supabase
              .from('chat_conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', convId);

            loadConversations();
          } catch (err) {
            console.error('Failed to save AI message:', err);
          } finally {
            setSending(false);
          }
        });
      } catch (err) {
        console.error('Failed to send message:', err);
        setSending(false);
      }
    },
    [user, activeConversationId, sending, streamResponse, loadConversations]
  );

  // New conversation
  const newConversation = useCallback(() => {
    if (streamTimer.current) clearInterval(streamTimer.current);
    setActiveConversationId(null);
    setMessages([]);
    setStreamingText('');
    setSending(false);
  }, []);

  // Delete conversation via Supabase
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from('chat_conversations')
          .delete()
          .eq('id', conversationId);

        if (!error) {
          setConversations((prev) => prev.filter((c) => c.id !== conversationId));
          if (activeConversationId === conversationId) {
            newConversation();
          }
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [user, activeConversationId, newConversation]
  );

  useEffect(() => {
    return () => {
      if (streamTimer.current) clearInterval(streamTimer.current);
    };
  }, []);

  return {
    conversations,
    activeConversationId,
    messages,
    loadingConversations,
    loadingMessages,
    sending,
    streamingText,
    setActiveConversationId,
    sendMessage,
    newConversation,
    deleteConversation,
  };
}
