import { AssignmentTimeline } from "./assignment-timeline";

export function AssignmentsView({ now }: { now: string }) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tugas</h1>
      </header>
      <AssignmentTimeline now={now} initialStatus="all" showAllLink={false} />
    </>
  );
}
