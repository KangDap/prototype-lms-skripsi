export type LearningMaterial = {
  id: string;
  title: string;
  durationMinutes: number;
  completed: boolean;
  introduction: string;
};

export type CourseActivity =
  | { type: "material"; materialId: string }
  | { type: "assignment"; assignmentId: string };

export type CourseMeeting = {
  id: string;
  title: string;
  date: string;
  description: string;
  activities: CourseActivity[];
};

export type Course = {
  id: string;
  code: string;
  title: string;
  description: string;
  lecturer: string;
  lecturerInitials: string;
  category: string;
  artwork: "mathematics" | "semantic";
  materials: LearningMaterial[];
  meetings: CourseMeeting[];
};

export type RecentActivity = {
  id: string;
  courseId: string;
  materialId: string;
  title: string;
  completed: boolean;
  detail?: string;
  time?: string;
};

export type Assignment = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  instructions: string[];
  dueAt: string;
  submittedAt?: string;
};

export function getCourseProgress(course: Course) {
  const completed = course.materials.filter(
    (material) => material.completed,
  ).length;
  return {
    completed,
    total: course.materials.length,
    percentage: course.materials.length
      ? Math.round((completed / course.materials.length) * 100)
      : 0,
  };
}
