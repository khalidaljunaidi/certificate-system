"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f4fb",
          padding: "24px"
        }}>
          <div style={{
            maxWidth: "600px",
            width: "100%",
            background: "#fff",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
          }}>
            
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg,#160c26,#3d244f)",
              color: "#fff",
              padding: "32px"
            }}>
              <h1 style={{ margin: 0 }}>THE GATHERING</h1>
              <p style={{ opacity: 0.7 }}>Something went wrong</p>
            </div>

            {/* Body */}
            <div style={{ padding: "24px" }}>
              <p style={{ color: "#555" }}>
                We couldn’t complete your request. Please try again.
              </p>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  onClick={() => reset()}
                  style={{
                    background: "#d6b56d",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  Try Again
                </button>

                <a href="/" style={{
                  border: "1px solid #ddd",
                  padding: "10px 18px",
                  borderRadius: "8px"
                }}>
                  Home
                </a>
              </div>

              {error?.digest && (
                <p style={{ fontSize: "12px", marginTop: "16px", color: "#aaa" }}>
                  Ref: {error.digest}
                </p>
              )}
            </div>

          </div>
        </main>
      </body>
    </html>
  );
}
