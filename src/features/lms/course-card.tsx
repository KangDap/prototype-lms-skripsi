import Link from "next/link";
import { Bookmark } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CourseArtwork } from "./course-artwork";
import { getCourseProgress, type Course } from "./types";

export function CourseCard({
  course,
  saved,
  onSave,
}: {
  course: Course;
  saved: boolean;
  onSave: () => void;
}) {
  const progress = getCourseProgress(course);
  const href = `/courses/${course.id}`;

  return (
    <Card className="course-card gap-0 overflow-hidden pt-0">
      <div className="relative">
        <Link href={href} aria-label={`Buka ${course.title}`}>
          <CourseArtwork variant={course.artwork} />
        </Link>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-3 top-3"
          onClick={onSave}
          aria-pressed={saved}
          aria-label={`${saved ? "Hapus" : "Simpan"} ${course.title}${saved ? " dari tersimpan" : ""}`}
        >
          <Bookmark fill={saved ? "currentColor" : "none"} />
        </Button>
      </div>
      <CardHeader className="gap-2 pt-5">
        <CardTitle>
          <h3>
            <Link href={href} className="hover:underline">
              {course.title}
            </Link>
          </h3>
        </CardTitle>
        <CardDescription className="min-h-10">
          {course.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-5">
        <p className="text-xs text-muted-foreground">{course.lecturer}</p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Progres</span>
            <span className="tabular-nums">{progress.percentage}%</span>
          </div>
          <Progress
            value={progress.percentage}
            aria-label={`Progres ${course.title}`}
          />
        </div>
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {progress.total} materi
        </span>
        <Link href={href} className={buttonVariants({ size: "sm" })}>
          Buka mata kuliah
        </Link>
      </CardFooter>
    </Card>
  );
}
