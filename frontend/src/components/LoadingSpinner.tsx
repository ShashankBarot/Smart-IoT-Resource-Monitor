interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({
  message = "Loading data...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />

      <p className="text-sm text-slate-400">
        {message}
      </p>
    </div>
  );
}