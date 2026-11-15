import type { ComponentProps } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

// shadcn pagination composition adapted to the existing Base UI Button.
function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return <nav aria-label="Pagination" data-slot="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />;
}
function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={cn("flex flex-wrap items-center justify-center gap-1", className)} {...props} />;
}
function PaginationItem(props: ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}
type PaginationLinkProps = ComponentProps<typeof Button> & { isActive?: boolean };
function PaginationLink({ isActive, size = "icon", ...props }: PaginationLinkProps) {
  return <Button data-slot="pagination-link" aria-current={isActive ? "page" : undefined} data-active={isActive || undefined}
    nativeButton={false} render={<a />} variant={isActive ? "outline" : "ghost"} size={size} {...props} />;
}
function PaginationPrevious({ text = "Previous", ...props }: PaginationLinkProps & { text?: string }) {
  return <PaginationLink aria-label={text} size="default" {...props}><ChevronLeft data-icon="inline-start" /><span className="hidden sm:block">{text}</span></PaginationLink>;
}
function PaginationNext({ text = "Next", ...props }: PaginationLinkProps & { text?: string }) {
  return <PaginationLink aria-label={text} size="default" {...props}><span className="hidden sm:block">{text}</span><ChevronRight data-icon="inline-end" /></PaginationLink>;
}
function PaginationEllipsis({ className, ...props }: ComponentProps<"span">) {
  return <span aria-hidden="true" data-slot="pagination-ellipsis" className={cn("flex size-8 items-center justify-center", className)} {...props}><MoreHorizontal className="size-4" /></span>;
}
export { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis };
