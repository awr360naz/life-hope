export default function TestSentryButton() {
  return (
    <button
      onClick={() => {
        throw new Error("Test Sentry error from Life-Hope frontend");
      }}
    >
      جرّب Sentry
    </button>
  );
}
