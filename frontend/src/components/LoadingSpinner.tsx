interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({
  message = "Loading data...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#333333] border-t-[#9984d8]" />

      <p className="text-sm text-slate-400">
        {message}
      </p>
    </div>
  );
}