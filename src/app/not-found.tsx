import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            {/* Floating animated orb */}
            <div className="relative mb-10">
                <div
                    className="w-40 h-40 rounded-full opacity-20"
                    style={{
                        background: "radial-gradient(circle at 30% 30%, hsl(var(--primary)), hsl(var(--primary) / 0.3))",
                        animation: "float 6s ease-in-out infinite",
                    }}
                />
                <span
                    className="absolute inset-0 flex items-center justify-center text-7xl font-black font-headline text-primary select-none"
                    style={{ animation: "pulse-slow 3s ease-in-out infinite" }}
                >
                    404
                </span>
            </div>

            <h1 className="text-3xl font-bold font-headline mb-2 text-foreground">
                Page Not Found
            </h1>
            <p className="text-muted-foreground text-center max-w-md mb-8">
                The page you're looking for doesn't exist or has been moved.
                Let's get you back on track.
            </p>

            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Back to Dashboard
            </Link>

            {/* Keyframe animations */}
            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
        </div>
    );
}
