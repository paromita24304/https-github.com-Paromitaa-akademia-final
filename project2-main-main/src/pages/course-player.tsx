import { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useSearchParams, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  PlayCircle,
  Video as VideoIcon,
  FileText,
  ListChecks,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  StickyNote,
  PanelRightClose,
  PanelRightOpen,
  X,
  Menu,
  ExternalLink,
  Check,
  Loader2,
  Lock,
  ClipboardCheck,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { VideoPlayer } from '@/components/player/video-player';
import { PdfViewer } from '@/components/player/pdf-viewer';
import { NotesPanel } from '@/components/player/notes-panel';
import { CourseMessaging } from '@/components/player/course-messaging';
import { getCourseBySlug, getAllLessons, getLessonById, isLessonUnlocked } from '@/lib/course-utils';
import { useLessonProgress } from '@/hooks/use-lesson-progress';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/types';

const lessonTypeIcon: Record<Lesson['type'], typeof VideoIcon> = {
  video: VideoIcon,
  reading: FileText,
  quiz: ListChecks,
  assignment: ClipboardCheck,
  'ai-coaching': MessageSquare,
};

const lessonTypeLabel: Record<Lesson['type'], string> = {
  video: 'Video',
  reading: 'Reading',
  quiz: 'Quiz',
  assignment: 'Assignment',
  'ai-coaching': 'AI Coaching',
};

type PanelTab = 'notes' | 'messages';

export function CoursePlayerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const course = slug ? getCourseBySlug(slug) : undefined;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>('notes');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { completedLessons, isCompleted, markComplete, loading: progressLoading } = useLessonProgress(course?.id ?? '');

  const allLessons = useMemo(() => (course ? getAllLessons(course) : []), [course]);

  const currentLessonId = searchParams.get('lesson') ?? allLessons[0]?.id;
  const currentLessonData = course && currentLessonId ? getLessonById(course, currentLessonId) : undefined;
  const currentLesson = currentLessonData?.lesson;
  const currentModule = currentLessonData?.module;

  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : undefined;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : undefined;

  const completedCount = allLessons.filter((l) => isCompleted(l.id)).length;
  const progressPct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  const isCurrentUnlocked = course && currentLesson
    ? isLessonUnlocked(allLessons, currentLesson.id, completedLessons)
    : false;

  useEffect(() => {
    if (!currentLessonId && allLessons[0]) {
      setSearchParams({ lesson: allLessons[0].id }, { replace: true });
    }
  }, [currentLessonId, allLessons, setSearchParams]);

  if (!course) {
    return <Navigate to="/student/browse" replace />;
  }

  if (!currentLesson) {
    return <Navigate to={`/student/courses/${course.slug}`} replace />;
  }

  const navigateToLesson = (lessonId: string) => {
    setSearchParams({ lesson: lessonId });
    setMobileMenuOpen(false);
  };

  const handleComplete = () => {
    markComplete(currentLesson.id);
    toast.success('Lesson completed', {
      description: nextLesson ? 'Moving to the next lesson.' : 'You finished the course!',
    });
    if (nextLesson) {
      setTimeout(() => navigateToLesson(nextLesson.id), 600);
    }
  };

  const goToNext = () => {
    if (nextLesson) navigateToLesson(nextLesson.id);
  };

  const goToPrev = () => {
    if (prevLesson) navigateToLesson(prevLesson.id);
  };

  const lessonDone = isCompleted(currentLesson.id);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Open lessons">
          <Menu className="h-5 w-5" />
        </Button>
        <Link to={`/student/courses/${course.slug}`} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{course.title}</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <Progress value={progressPct} className="h-1.5 w-28" />
            <span className="text-xs font-medium tabular-nums text-muted-foreground">{progressPct}%</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPanelOpen((v) => !v)}
            aria-label={panelOpen ? 'Hide panel' : 'Show panel'}
          >
            {panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Lesson sidebar — desktop */}
        <aside className="hidden w-72 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
          <LessonSidebar
            course={course}
            allLessons={allLessons}
            currentLessonId={currentLessonId}
            isCompleted={isCompleted}
            isUnlocked={(id) => isLessonUnlocked(allLessons, id, completedLessons)}
            onNavigate={navigateToLesson}
            progressPct={progressPct}
            completedCount={completedCount}
            totalCount={allLessons.length}
          />
        </aside>

        {/* Lesson sidebar — mobile drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">Lessons</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <LessonSidebar
                course={course}
                allLessons={allLessons}
                currentLessonId={currentLessonId}
                isCompleted={isCompleted}
                isUnlocked={(id) => isLessonUnlocked(allLessons, id, completedLessons)}
                onNavigate={navigateToLesson}
                progressPct={progressPct}
                completedCount={completedCount}
                totalCount={allLessons.length}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl p-4 lg:p-6">
              {!isCurrentUnlocked && currentIndex > 0 ? (
                <LockedLessonNotice prevLessonTitle={prevLesson?.title ?? 'the previous lesson'} />
              ) : (
                <>
                  {/* Lesson header */}
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          {(() => {
                            const I = lessonTypeIcon[currentLesson.type];
                            return <I className="h-3 w-3" />;
                          })()}
                          {lessonTypeLabel[currentLesson.type]}
                        </Badge>
                        {currentModule && (
                          <span className="text-xs text-muted-foreground">{currentModule.title}</span>
                        )}
                      </div>
                      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {currentLesson.title}
                      </h1>
                      {currentLesson.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{currentLesson.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{formatDuration(currentLesson.durationMinutes)}</span>
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="mb-6">
                    {currentLesson.type === 'video' && currentLesson.videoUrl ? (
                      <VideoPlayer src={currentLesson.videoUrl} onEnded={handleComplete} onNext={nextLesson ? goToNext : undefined} />
                    ) : currentLesson.type === 'reading' && currentLesson.readingContent ? (
                      <ReadingContent content={currentLesson.readingContent} />
                    ) : currentLesson.type === 'assignment' ? (
                      <AssignmentContent lesson={currentLesson} onComplete={handleComplete} />
                    ) : currentLesson.type === 'quiz' ? (
                      <InlineQuiz lesson={currentLesson} onComplete={handleComplete} />
                    ) : currentLesson.type === 'ai-coaching' ? (
                      <AICoachingPlaceholder lessonTitle={currentLesson.title} />
                    ) : (
                      <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground">
                        <div className="text-center">
                          <PlayCircle className="mx-auto mb-2 h-10 w-10" />
                          <p className="text-sm">Content for this lesson is coming soon.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resources */}
                  {currentLesson.resources && currentLesson.resources.length > 0 && (
                    <div className="mb-6 rounded-xl border border-border bg-card p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <FileText className="h-4 w-4 text-primary" />
                        Resources
                      </h3>
                      <ul className="space-y-1.5">
                        {currentLesson.resources.map((r) => (
                          <li key={r.url}>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {r.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Nav + complete */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={goToPrev} disabled={!prevLesson}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNext}
                        disabled={!nextLesson || !lessonDone}
                      >
                        Next
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      onClick={handleComplete}
                      variant={lessonDone ? 'secondary' : 'default'}
                      size="sm"
                      disabled={progressLoading}
                    >
                      {progressLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : lessonDone ? (
                        <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      {lessonDone ? 'Completed' : 'Mark as complete'}
                    </Button>
                  </div>

                  {/* Next lesson locked indicator */}
                  {nextLesson && !lessonDone && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4 text-warning" />
                      <span>
                        Complete this lesson to unlock <strong className="text-foreground">{nextLesson.title}</strong>
                      </span>
                    </div>
                  )}

                  {/* Mobile panel toggle */}
                  {!panelOpen && (
                    <Button
                      variant="outline"
                      className="mt-4 w-full lg:hidden"
                      onClick={() => setPanelOpen(true)}
                    >
                      <StickyNote className="mr-2 h-4 w-4" />
                      Open notes & messages
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: Notes + Messages */}
        {panelOpen && (
          <aside className="hidden w-80 shrink-0 border-l border-border bg-card lg:flex lg:flex-col">
            <div className="flex border-b border-border">
              <button
                onClick={() => setPanelTab('notes')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                  panelTab === 'notes'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <StickyNote className="h-4 w-4" />
                Notes
              </button>
              <button
                onClick={() => setPanelTab('messages')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                  panelTab === 'messages'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <MessageSquare className="h-4 w-4" />
                Instructor
              </button>
            </div>
            {panelTab === 'notes' ? (
              <NotesPanel
                courseId={course.id}
                lessonId={currentLesson.id}
                lessonTitle={currentLesson.title}
                className="flex-1"
              />
            ) : (
              <CourseMessaging courseId={course.id} />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function LockedLessonNotice({ prevLessonTitle }: { prevLessonTitle: string }) {
  return (
    <div className="grid place-items-center py-20 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-warning/10">
        <Lock className="h-8 w-8 text-warning" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-foreground">This lesson is locked</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Complete <strong className="text-foreground">{prevLessonTitle}</strong> to unlock this lesson.
        You must follow the course sequence in order.
      </p>
    </div>
  );
}

function LessonSidebar({
  course,
  allLessons,
  currentLessonId,
  isCompleted,
  isUnlocked,
  onNavigate,
  progressPct,
  completedCount,
  totalCount,
}: {
  course: ReturnType<typeof getCourseBySlug>;
  allLessons: ReturnType<typeof getAllLessons>;
  currentLessonId: string;
  isCompleted: (id: string) => boolean;
  isUnlocked: (id: string) => boolean;
  onNavigate: (id: string) => void;
  progressPct: number;
  completedCount: number;
  totalCount: number;
}) {
  if (!course) return null;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <Link to={`/student/courses/${course.slug}`} className="mb-3 block">
          <Logo size="sm" />
        </Link>
        <p className="line-clamp-2 text-sm font-semibold text-foreground">{course.title}</p>
        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{completedCount} / {totalCount} lessons</span>
            <span className="font-medium text-foreground">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {course.modules.map((module, mIdx) => (
          <div key={module.id} className="mb-3">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {mIdx + 1}. {module.title}
            </p>
            <ul className="space-y-0.5">
              {module.lessons.map((lesson) => {
                const LIcon = lessonTypeIcon[lesson.type];
                const done = isCompleted(lesson.id);
                const active = lesson.id === currentLessonId;
                const unlocked = isUnlocked(lesson.id);
                return (
                  <li key={lesson.id}>
                    <button
                      onClick={() => unlocked && onNavigate(lesson.id)}
                      disabled={!unlocked}
                      className={cn(
                        'group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                        !unlocked && 'cursor-not-allowed opacity-50',
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : unlocked
                            ? 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                            : 'text-muted-foreground/40'
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-success')} />
                      ) : !unlocked ? (
                        <Lock className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      ) : active ? (
                        <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                      )}
                      <LIcon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="line-clamp-1 flex-1">{lesson.title}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {lesson.durationMinutes}m
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadingContent({ content }: { content: string }) {
  const sections = content.split('\n## ').filter(Boolean);
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-border bg-card p-6 lg:p-8">
      {sections.map((section, i) => {
        const lines = section.split('\n');
        const title = i === 0 && !section.startsWith('## ') ? null : lines[0];
        const body = title ? lines.slice(1) : lines;
        return (
          <div key={i} className={i > 0 ? 'mt-6' : ''}>
            {title && <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>}
            <div className="space-y-2">
              {body.map((line, j) => {
                if (line.startsWith('### ')) {
                  return <h4 key={j} className="mt-3 text-sm font-semibold text-foreground">{line.slice(4)}</h4>;
                }
                if (line.startsWith('- ')) {
                  return (
                    <p key={j} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-primary">•</span>
                      <span>{line.slice(2)}</span>
                    </p>
                  );
                }
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={j} className="text-sm font-semibold text-foreground">{line.slice(2, -2)}</p>;
                }
                if (line.trim()) {
                  return <p key={j} className="text-sm leading-relaxed text-muted-foreground">{line}</p>;
                }
                return null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssignmentContent({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) {
  const [submitted, setSubmitted] = useState(lesson.assignmentSubmitted ?? false);

  const handleSubmit = () => {
    setSubmitted(true);
    onComplete();
    toast.success('Assignment submitted', {
      description: 'Your instructor will review your submission.',
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            {lesson.assignmentTitle ?? lesson.title}
          </h3>
        </div>
        {lesson.assignmentDescription && (
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            {lesson.assignmentDescription}
          </p>
        )}
        {lesson.readingContent && (
          <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
            <ReadingContent content={lesson.readingContent} />
          </div>
        )}
        {lesson.resources && lesson.resources.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assignment files
            </p>
            <ul className="space-y-1.5">
              {lesson.resources.map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
          {submitted ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm font-medium text-foreground">Assignment submitted</p>
              <p className="text-xs text-muted-foreground">Your instructor will review your work.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload your solution to submit</p>
              <Button size="sm" onClick={handleSubmit}>
                <Upload className="mr-2 h-4 w-4" />
                Submit assignment
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineQuiz({ lesson, onComplete }: { lesson: Lesson; onComplete: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const quizQuestions = useMemo(() => {
    const content = lesson.readingContent ?? '';
    return content;
  }, [lesson]);

  return (
    <div className="rounded-xl border border-info/20 bg-info/5 p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-info/10">
          <ListChecks className="h-5 w-5 text-info" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{lesson.title}</h3>
          <p className="text-sm text-muted-foreground">{lesson.description ?? 'Test your understanding'}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            This quiz is part of the course sequence. Complete it to unlock the next lesson.
          </p>
        </div>
        <Button onClick={onComplete} className="w-full">
          <Check className="mr-2 h-4 w-4" />
          Complete quiz
        </Button>
      </div>
    </div>
  );
}

function AICoachingPlaceholder({ lessonTitle }: { lessonTitle: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-teal/30 bg-teal/5 p-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal/10">
        <Sparkles className="h-7 w-7 text-teal" />
      </div>
      <h3 className="mt-4 font-semibold text-foreground">AI Coach is ready</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Ask questions about "{lessonTitle}" or paste your code for instant debugging help.
      </p>
      <Button className="mt-4" asChild>
        <Link to="/student/ai-coach">
          <Sparkles className="mr-2 h-4 w-4 text-teal" />
          Start coaching session
        </Link>
      </Button>
    </div>
  );
}
