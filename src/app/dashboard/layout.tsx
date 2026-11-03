// On phones the dashboard runs a bit smaller so more fits on screen. Text boxes stay at 16px,
// because iOS zooms in on anything smaller when you tap it (we can't block zoom: people need it).
const phoneScale = `@media (max-width: 640px) {
  html { font-size: 13px; }
  :is(input:not([type=checkbox], [type=radio], [type=color], [type=range], [type=file]), select, textarea) { font-size: 16px; }
}`;

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <>
      <style>{phoneScale}</style>
      {children}
    </>
  );
}
