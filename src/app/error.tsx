"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f4fb] px-6">
      <div className="max-w-xl rounded-2xl bg-white p-8 text-center shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d6b56d]">
          The Gathering KSA
        </p>
        <h2 className="mt-4 text-2xl font-bold text-[#160c26]">
          Something went wrong
        </h2>
        <p className="mt-3 text-gray-600">Please try again.</p>

        <button
          onClick={() => reset()}
          className="mt-6 rounded-full bg-[#d6b56d] px-5 py-3 font-semibold text-[#160c26]"
        >
          Try Again
        </button>

        {error?.digest ? (
          <p className="mt-4 text-xs text-gray-400">Ref: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}