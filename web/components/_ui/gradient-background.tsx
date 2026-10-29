export function GradientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[min(220vw,220vh)] bg-[radial-gradient(circle_farthest-side_at_50%_-20%,#000000_57%,#004fdb_76%,#64afff_86%,#ffffff_100%)] bg-no-repeat md:h-[min(170vw,170vh)] lg:h-[min(150vw,150vh)]"
    />
  );
}
