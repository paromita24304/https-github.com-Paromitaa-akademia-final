import { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  Star,
  Clock,
  Users,
  PlayCircle,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  FileText,
  Video,
  ListChecks,
  ClipboardCheck,
  MessageSquare,
  Award,
  Globe,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getCourseBySlug, getAllLessons } from '@/lib/course-utils';
import { formatNumber, formatDuration, initials } from '@/lib/format';
import { useLessonProgress } from '@/hooks/use-lesson-progress';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/types';

const lessonTypeIcon: Record<Lesson['type'], typeof Video> = {
  video: Video,
  reading: FileText,
  quiz: ListChecks,
  assignment: ClipboardCheck,
  'ai-coaching': MessageSquare,
};

const difficultyStyles: Record<string, string> = {
  Beginner: 'bg-success/10 text-success border-success/20',
  Intermediate: 'bg-info/10 text-info border-info/20',
  Advanced: 'bg-warning/10 text-warning border-warning/20',
};

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const course = slug ? getCourseBySlug(slug) : undefined;
  const { isCompleted, markComplete } = useLessonProgress(course?.id ?? '');

  if (!course) {
    return <Navigate to="/student/browse" replace />;
  }

  const allLessons = getAllLessons(course);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => isCompleted(l.id)).length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const firstLesson = allLessons[0];
  const isEnrolled = course.status !== 'not-started' || progressPct > 0;

  return (
    <div className="animate-in-slide space-y-8">
      {/* Breadcrumb */}
      <Link
        to="/student/browse"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Link>

      {/* Hero */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{course.category}</Badge>
            <Badge className={cn('border-0', difficultyStyles[course.difficulty])}>
              {course.difficulty}
            </Badge>
            {course.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="font-normal">
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {course.title}
          </h1>
          <p className="text-balance text-lg text-muted-foreground">{course.subtitle}</p>

          <div className="flex flex-wrap items-center gap-5 text-sm">
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-medium text-foreground">{course.rating}</span>
              <span className="text-muted-foreground">({formatNumber(course.reviews)} reviews)</span>
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              {formatNumber(course.enrolled)} enrolled
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatDuration(course.durationHours * 60)}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <PlayCircle className="h-4 w-4" />
              {totalLessons} lessons
            </span>
          </div>

          {/* Instructor */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={course.instructor.avatarUrl} alt={course.instructor.name} />
              <AvatarFallback>{initials(course.instructor.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Instructor</p>
              <p className="truncate font-semibold text-foreground">{course.instructor.name}</p>
              <p className="truncate text-sm text-muted-foreground">{course.instructor.title}</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="flex items-center gap-1 text-sm font-medium text-foreground">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                {course.instructor.rating}
              </p>
              <p className="text-xs text-muted-foreground">{formatNumber(course.instructor.students)} students</p>
            </div>
          </div>

          <p className="text-pretty leading-relaxed text-muted-foreground">{course.description}</p>
        </div>

        {/* Sidebar card */}
        <div className="lg:row-span-2">
          <div className="lg:sticky lg:top-24">
            <Card className="overflow-hidden">
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 grid place-items-center bg-black/30">
                  <PlayCircle className="h-14 w-14 text-background/90" />
                </div>
              </div>
              <CardContent className="space-y-4 p-5">
                {isEnrolled && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your progress</span>
                      <span className="font-medium text-foreground">{progressPct}%</span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {completedCount} of {totalLessons} lessons completed
                    </p>
                  </div>
                )}

                <Button className="w-full" size="lg" asChild>
                  <Link
                    to={`/student/courses/${course.slug}/learn${
                      firstLesson ? `?lesson=${firstLesson.id}` : ''
                    }`}
                  >
                    {isEnrolled ? (
                      <>
                        <PlayCircle className="mr-2 h-5 w-5" />
                        {progressPct > 0 ? 'Continue learning' : 'Start course'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Enroll for free
                      </>
                    )}
                  </Link>
                </Button>

                {!isEnrolled && (
                  <Button variant="outline" className="w-full" size="lg" asChild>
                    <Link to="/student/ai-coach">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Ask AI coach about this
                    </Link>
                  </Button>
                )}

                <div className="space-y-2.5 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    This course includes
                  </p>
                  {[
                    [PlayCircle, `${totalLessons} lessons`],
                    [Clock, formatDuration(course.durationHours * 60)],
                    [FileText, 'Downloadable resources'],
                    [Award, 'Certificate of completion'],
                    [Globe, 'Lifetime access'],
                  ].map(([Icon, label]) => {
                    const I = Icon as typeof PlayCircle;
                    return (
                      <div key={label as string} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <I className="h-4 w-4 text-primary" />
                        {label as string}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Course curriculum</h2>
          <p className="text-sm text-muted-foreground">
            {course.modules.length} modules &middot; {totalLessons} lessons
          </p>
        </div>

        <Accordion type="multiple" defaultValue={[course.modules[0]?.id]} className="space-y-3">
          {course.modules.map((module, mIdx) => {
            const moduleLessons = module.lessons;
            const moduleCompleted = moduleLessons.filter((l) => isCompleted(l.id)).length;
            return (
              <AccordionItem
                key={module.id}
                value={module.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <AccordionTrigger className="hover:no-underline px-5 py-4 [&[data-state=open]>div>svg.chevron]:rotate-90">
                  <div className="flex flex-1 items-center gap-3 pr-4">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                      {mIdx + 1}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-medium text-foreground">{module.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {moduleLessons.length} lessons &middot; {moduleCompleted} completed
                      </p>
                    </div>
                    <ChevronDown className="chevron h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-1">
                  <ul className="divide-y divide-border border-t border-border">
                    {moduleLessons.map((lesson) => {
                      const LIcon = lessonTypeIcon[lesson.type];
                      const done = isCompleted(lesson.id);
                      return (
                        <li key={lesson.id}>
                          <Link
                            to={`/student/courses/${course.slug}/learn?lesson=${lesson.id}`}
                            className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/50"
                          >
                            {done ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                            ) : (
                              <Circle className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                            )}
                            <LIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className={cn('truncate text-sm', done ? 'text-muted-foreground line-through decoration-muted-foreground/40' : 'text-foreground')}>
                                {lesson.title}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDuration(lesson.durationMinutes)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>

      {/* What you'll master */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground">What you will master</h3>
            <ul className="mt-4 space-y-2.5">
              {course.tags.map((tag) => (
                <li key={tag} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  {tag} fundamentals and advanced patterns
                </li>
              ))}
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                Building and debugging real models
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                AI-coached practice and interview prep
              </li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground">Prerequisites</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                'Basic Python programming',
                'Familiarity with NumPy arrays',
                'High school linear algebra',
              ].map((req) => (
                <li key={req} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                  {req}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
