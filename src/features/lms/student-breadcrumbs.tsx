"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { assignments, courses } from "./seed-data";

export function StudentBreadcrumbs() {
  const pathname = usePathname();
  const [, section, courseId, materialSection, materialId] =
    pathname.split("/");
  const items = [{ title: "Dashboard", href: "/dashboard" }];

  if (section === "assignments") {
    items.push({ title: "Tugas", href: "/assignments" });
    if (courseId) {
      const assignment = assignments.find((item) => item.id === courseId);
      items.push({
        title: assignment?.title ?? "Tugas tidak ditemukan",
        href: pathname,
      });
    }
  } else if (section === "calendar") {
    items.push({ title: "Kalender", href: "/calendar" });
  } else if (section === "profile") {
    items.push({ title: "Profil", href: "/profile" });
  } else if (section === "saved") {
    items.push({ title: "Tersimpan", href: "/saved" });
  } else if (section === "courses") {
    items.push({ title: "Mata kuliah", href: "/courses" });
    if (courseId) {
      const course = courses.find((item) => item.id === courseId);
      items.push({
        title: course?.title ?? "Mata kuliah tidak ditemukan",
        href: `/courses/${courseId}`,
      });
      if (course && materialSection === "materials" && materialId) {
        const material = course.materials.find(
          (item) => item.id === materialId,
        );
        items.push({
          title: material?.title ?? "Materi tidak ditemukan",
          href: pathname,
        });
      }
    }
  }

  return (
    <Breadcrumb aria-label="Jejak navigasi" className="min-w-0">
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={item.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem className="min-w-0 max-w-full">
              {index === items.length - 1 ? (
                <BreadcrumbPage>{item.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={item.href} />}>
                  {item.title}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
