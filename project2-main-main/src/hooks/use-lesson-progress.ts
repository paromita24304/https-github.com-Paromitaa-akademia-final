import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';

interface ProgressRow {
  lesson_id: string;
  completed: boolean;
}

export function useLessonProgress(courseId: string) {
  const { user } = useAuth();
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const channelSuffix = useRef(Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    if (!user || !courseId || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id)
          .eq('course_id', courseId);

        if (!cancelled && !error && data) {
          const completed = new Set(
            (data as ProgressRow[]).filter((r) => r.completed).map((r) => r.lesson_id)
          );
          setCompletedLessons(completed);
        }
      } catch (err) {
        console.error('Failed to fetch lesson progress:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Each card using this hook needs a distinct realtime channel.
    const channel = supabase
      .channel(`lesson_progress_${courseId}_${user.id}_${channelSuffix}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lesson_progress',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as ProgressRow & { course_id: string };
            if (row.course_id !== courseId) return;
            setCompletedLessons((prev) => {
              const next = new Set(prev);
              if (row.completed) next.add(row.lesson_id);
              else next.delete(row.lesson_id);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as ProgressRow & { course_id: string };
            setCompletedLessons((prev) => {
              const next = new Set(prev);
              next.delete(row.lesson_id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, courseId, channelSuffix]);

  const toggleLesson = useCallback(
    async (lessonId: string, completed: boolean) => {
      if (!user) return;

      setCompletedLessons((prev) => {
        const next = new Set(prev);
        if (completed) next.add(lessonId);
        else next.delete(lessonId);
        return next;
      });

      // Keep the dashboard interactive in preview/demo mode.
      if (!isSupabaseConfigured) return;

      try {
        const { error } = await supabase
          .from('lesson_progress')
          .upsert({
            user_id: user.id,
            course_id: courseId,
            lesson_id: lessonId,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          }, { onConflict: 'user_id,lesson_id' });

        if (error) throw error;
      } catch (err) {
        console.error('Failed to update lesson progress:', err);
        setCompletedLessons((prev) => {
          const next = new Set(prev);
          if (!completed) next.add(lessonId);
          else next.delete(lessonId);
          return next;
        });
      }
    },
    [user, courseId]
  );

  const markComplete = useCallback(
    (lessonId: string) => toggleLesson(lessonId, true),
    [toggleLesson]
  );

  const isCompleted = useCallback(
    (lessonId: string) => completedLessons.has(lessonId),
    [completedLessons]
  );

  return { completedLessons, loading, markComplete, toggleLesson, isCompleted };
}
