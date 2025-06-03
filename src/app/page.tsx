
// src/app/page.tsx
// Minimal version for debugging 404 issues

export default function HomePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h1>Minimal Test Page</h1>
      <p>If you see this, the basic routing for the root page is working in standalone mode.</p>
      <p>This means the 404 error with the full dashboard page is likely caused by an issue within the original page.tsx (e.g., hooks, client components, data fetching, or AI calls in a production build context).</p>
    </div>
  );
}
