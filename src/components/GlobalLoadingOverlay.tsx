import Spinner from "./Spinner";

interface GlobalLoadingOverlayProps {
  active: boolean;
}

export const GlobalLoadingOverlay = ({ active }: GlobalLoadingOverlayProps) => {
  if (!active) return null;

  return (
    <div className="
      fixed inset-0
      z-[9999]
      flex items-center justify-center
      bg-black/40
      backdrop-blur-md
    ">
      <Spinner size="xl" />
    </div>
  );
};
