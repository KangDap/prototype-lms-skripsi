"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  CalendarDays,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { courses, student } from "./seed-data";

export type DashboardView = "dashboard" | "courses" | "saved";

export function StudentSidebar({ savedCount }: { savedCount: number }) {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const courseActive =
    pathname === "/courses" || pathname.startsWith("/courses/");
  const toggleLabel = isMobile
    ? "Tutup navigasi"
    : state === "expanded"
      ? "Minimalkan sidebar"
      : "Perluas sidebar";
  const closeMobile = () => setOpenMobile(false);

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="h-16 flex-row items-center justify-center gap-2 transition-[gap] duration-200 ease-linear group-data-[collapsible=icon]:gap-0">
        <Link
          href="/dashboard"
          onClick={closeMobile}
          aria-label="Ruang Belajar, dashboard"
          aria-hidden={state === "collapsed" && !isMobile}
          tabIndex={state === "collapsed" && !isMobile ? -1 : undefined}
          className="sidebar-brand flex min-w-0 flex-1 items-center gap-2 overflow-hidden p-2"
        >
          <span className="brand-mark shrink-0">
            <GraduationCap />
          </span>
          <span className="flex shrink-0 flex-col">
            <span className="truncate text-sm font-semibold">
              Ruang Belajar
            </span>
            <span className="text-xs text-muted-foreground">Mahasiswa</span>
          </span>
        </Link>
        <Tooltip>
          <TooltipTrigger
            render={<SidebarTrigger aria-label={toggleLabel} />}
          />
          <TooltipContent side="right">{toggleLabel}</TooltipContent>
        </Tooltip>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:items-center">
          <SidebarGroupLabel>Pembelajaran</SidebarGroupLabel>
          <nav
            aria-label="Navigasi pembelajaran"
            className="w-full group-data-[collapsible=icon]:w-8"
          >
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Dashboard"
                  isActive={pathname === "/dashboard"}
                  aria-label="Dashboard"
                  aria-current={pathname === "/dashboard" ? "page" : undefined}
                  render={<Link href="/dashboard" />}
                  onClick={closeMobile}
                >
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible
                key={courseActive ? "course-active" : "course-inactive"}
                defaultOpen={courseActive}
                className="group/courses"
                render={<SidebarMenuItem />}
              >
                <SidebarMenuButton
                  tooltip="Mata kuliah"
                  isActive={courseActive}
                  aria-label="Mata kuliah"
                  aria-current={pathname === "/courses" ? "page" : undefined}
                  render={<Link href="/courses" />}
                  onClick={closeMobile}
                >
                  <BookOpen />
                  <span>Mata kuliah</span>
                </SidebarMenuButton>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction aria-label="Tampilkan daftar mata kuliah" />
                  }
                >
                  <ChevronRight className="transition-transform group-data-open/courses:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {courses.map((course) => (
                      <SidebarMenuSubItem key={course.id}>
                        <SidebarMenuSubButton
                          isActive={pathname.startsWith(
                            `/courses/${course.id}`,
                          )}
                          aria-current={
                            pathname === `/courses/${course.id}`
                              ? "page"
                              : undefined
                          }
                          render={<Link href={`/courses/${course.id}`} />}
                          onClick={closeMobile}
                        >
                          <span>{course.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
              {[
                { href: "/assignments", title: "Tugas", icon: ClipboardList },
                { href: "/calendar", title: "Kalender", icon: CalendarDays },
              ].map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={active}
                      aria-label={item.title}
                      aria-current={active ? "page" : undefined}
                      render={<Link href={item.href} />}
                      onClick={closeMobile}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Tersimpan"
                  isActive={pathname === "/saved"}
                  aria-label="Tersimpan"
                  aria-current={pathname === "/saved" ? "page" : undefined}
                  render={<Link href="/saved" />}
                  onClick={closeMobile}
                >
                  <Bookmark />
                  <span>Tersimpan</span>
                </SidebarMenuButton>
                {savedCount > 0 && (
                  <SidebarMenuBadge>{savedCount}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    tooltip="Profil mahasiswa"
                    aria-label="Profil mahasiswa"
                    className="group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full"
                  />
                }
              >
                <Avatar>
                  <AvatarFallback>{student.initials}</AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{student.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {student.email}
                  </span>
                </span>
                <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 max-w-[calc(100vw-2rem)]"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="flex items-center gap-2 py-1">
                      <Avatar>
                        <AvatarFallback>{student.initials}</AvatarFallback>
                      </Avatar>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm text-foreground">
                          {student.name}
                        </span>
                        <span>{student.email}</span>
                      </span>
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    render={<Link href="/profile" />}
                    onClick={closeMobile}
                  >
                    <UserRound />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href="/saved" />}
                    onClick={closeMobile}
                    variant="destructive"
                  >
                    <LogOut />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
