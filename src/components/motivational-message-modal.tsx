// src/components/motivational-message-modal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog"; // Relative
import { Button } from "./ui/button"; // Relative
import { Sparkles, Volume2 } from "lucide-react"; // Removed X as it's part of DialogContent

interface MotivationalMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  messageType?: 'text' | 'audio';
}

export default function MotivationalMessageModal({
  isOpen,
  onClose,
  message,
  messageType = 'text',
}: MotivationalMessageModalProps) {
  const handlePlayAudio = () => {
    // Placeholder for actual audio playback
    alert("Playing audio (simulated): " + message);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center font-headline">
            <Sparkles className="mr-2 h-5 w-5 text-primary" />
            Your Motiv-Action!
          </DialogTitle>
          <DialogDescription className="pt-2 text-left">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start">
          {messageType === 'audio' && (
            <Button variant="outline" onClick={handlePlayAudio}>
              <Volume2 className="mr-2 h-4 w-4" /> Play Audio
            </Button>
          )}
          <Button onClick={onClose} variant="default">
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
