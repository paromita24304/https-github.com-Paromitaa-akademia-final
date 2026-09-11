import { useState } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCourseFeedback, type CourseFeedback } from '@/lib/course-feedback';
import { useAuth } from '@/components/providers/auth-provider';

export function CourseFeedbackPage() {
  const { user } = useAuth();
  const [feedback] = useState<CourseFeedback[]>(() => getCourseFeedback());

  return (
    <div className="space-y-8 animate-in-slide">
      <PageHeader
        title="Course Feedback"
        description={user?.role === 'admin'
          ? 'Review feedback submitted by students across all courses.'
          : 'Review feedback submitted by students for your courses.'}
      />

      {feedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mt-4 font-semibold text-foreground">No feedback yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Student feedback will appear here after it is submitted.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{item.courseTitle}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      From {item.studentName} · Instructor: {item.instructorName}
                    </p>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    {item.rating}/5
                  </Badge>
                </div>
                <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground">
                  {item.message}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
