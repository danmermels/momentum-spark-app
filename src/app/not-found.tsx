// src/app/not-found.tsx
import Link from 'next/link';
import { Button } from '../components/ui/button'; // Relative path
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center py-10">
      <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
      <h1 className="text-4xl font-bold font-headline text-primary mb-4">404 - Page Not Found</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Oops! The page you&apos;re looking for doesn&apos;t seem to exist.
      </p>
      <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
        <Link href="/">Go Back to Dashboard</Link>
      </Button>
    </div>
  );
}
