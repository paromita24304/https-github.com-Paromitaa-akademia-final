import type { Course, Lesson, Module } from '@/types';
import { courses } from '@/lib/mock-data';

const ENROLLMENTS_KEY = 'akademia-demo-enrollments';
const DEMO_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

function readEnrollmentIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(localStorage.getItem(ENROLLMENTS_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function getEnrolledCourseIds(): string[] {
  return readEnrollmentIds();
}

export function enrollInCourse(courseId: string): void {
  if (typeof window === 'undefined') return;
  const ids = new Set(readEnrollmentIds());
  ids.add(courseId);
  localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify([...ids]));
}

export function isCourseEnrolled(course: Course): boolean {
  return course.status !== 'not-started' || readEnrollmentIds().includes(course.id);
}

const PROGRESS_KEY = 'akademia-demo-progress';

function readSavedProgress(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

export function getDemoCompletedLessonIds(courseId: string): string[] {
  const course = courses.find((item) => item.id === courseId);
  if (!course) return [];

  const lessons = withCourseExperience(course).modules.flatMap((module) => module.lessons);
  const builtInCompleted = course.status === 'completed'
    ? lessons.map((lesson) => lesson.id)
    : lessons.filter((lesson) => lesson.completed).map((lesson) => lesson.id);
  const savedCompleted = readSavedProgress()[courseId] ?? [];
  return [...new Set([...builtInCompleted, ...savedCompleted])];
}

export function saveDemoLessonCompletion(courseId: string, lessonId: string, completed: boolean): void {
  if (typeof window === 'undefined') return;
  const progress = readSavedProgress();
  const lessonIds = new Set(progress[courseId] ?? []);
  if (completed) lessonIds.add(lessonId);
  else lessonIds.delete(lessonId);
  progress[courseId] = [...lessonIds];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function starterCurriculum(course: Course): Module[] {
  const prefix = course.id.replace(/[^a-z0-9]/gi, '');
  const lessons: Lesson[] = [
    {
      id: `${prefix}_intro`,
      title: `Welcome to ${course.title}`,
      durationMinutes: 8,
      type: 'video',
      completed: false,
      description: 'Meet your instructor and learn what you will build in this course.',
      videoUrl: DEMO_VIDEO_URL,
    },
    {
      id: `${prefix}_core`,
      title: `Core concepts of ${course.title}`,
      durationMinutes: 14,
      type: 'video',
      completed: false,
      description: 'A guided lesson covering the core ideas and workflow.',
      videoUrl: DEMO_VIDEO_URL,
    },
    {
      id: `${prefix}_practice`,
      title: 'Practice and next steps',
      durationMinutes: 10,
      type: 'reading',
      completed: false,
      description: 'Review the key concepts and plan your next practice session.',
      readingContent: `## Practice and next steps\n\nYou are now ready to apply the foundations of **${course.title}**.\n\n- Review the lesson notes\n- Try a small hands-on exercise\n- Mark this lesson complete to finish the starter curriculum`,
    },
  ];

  return [{ id: `${prefix}_starter`, title: 'Getting started', lessons }];
}

function withCourseExperience(course: Course): Course {
  const enrolled = isCourseEnrolled(course);
  return {
    ...course,
    status: course.status === 'not-started' && enrolled ? 'in-progress' : course.status,
    modules: course.modules.length > 0 ? course.modules : starterCurriculum(course),
  };
}

export function getCourseBySlug(slug: string): Course | undefined {
  const course = courses.find((item) => item.slug === slug);
  return course ? withCourseExperience(course) : undefined;
}

export function getAllLessons(course: Course) {
  return withCourseExperience(course).modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title }))
  );
}

export function getLessonById(course: Course, lessonId: string) {
  for (const module of withCourseExperience(course).modules) {
    const lesson = module.lessons.find((item) => item.id === lessonId);
    if (lesson) return { lesson, module };
  }
  return undefined;
}

export function isLessonUnlocked(
  allLessons: Lesson[],
  lessonId: string,
  completedSet: Set<string>
): boolean {
  const index = allLessons.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return true;
  return completedSet.has(allLessons[index - 1].id);
}

export function getFirstUnlockedLesson(
  allLessons: Lesson[],
  completedSet: Set<string>
): Lesson | undefined {
  return allLessons.find((lesson) => !completedSet.has(lesson.id)) ?? allLessons[0];
}

export function getCourseProgress(
  allLessons: Lesson[],
  completedSet: Set<string>
): { completed: number; total: number; pct: number } {
  const total = allLessons.length;
  const completed = allLessons.filter((lesson) => completedSet.has(lesson.id)).length;
  return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
}
