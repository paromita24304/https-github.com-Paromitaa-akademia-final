import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';
import type { CourseMessage } from '@/types';

export function useCourseMessages(courseId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CourseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !courseId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('course_messages')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .order('created_at', { ascending: true });

        if (!cancelled && !error && data) {
          setMessages(data as CourseMessage[]);
        }
      } catch (err) {
        console.error('Failed to load course messages:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Realtime: listen for new messages (e.g. instructor replies on another device)
    const channel = supabase
      .channel(`course_messages_${courseId}_${user.id}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'course_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as CourseMessage;
          if (newMsg.course_id !== courseId) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, courseId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !content.trim() || sending) return;

      setSending(true);
      const tempId = `temp_${Date.now()}`;
      const newMsg: CourseMessage = {
        id: tempId,
        user_id: user.id,
        course_id: courseId,
        sender_role: 'student',
        content: content.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMsg]);

      try {
        const { data, error } = await supabase
          .from('course_messages')
          .insert({
            user_id: user.id,
            course_id: courseId,
            sender_role: 'student',
            content: content.trim(),
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? (data as CourseMessage) : m))
          );
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      } finally {
        setSending(false);
      }
    },
    [user, courseId, sending]
  );

  return { messages, loading, sending, sendMessage, scrollRef };
}
