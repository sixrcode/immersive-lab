import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Assuming Select is available

// This is the data structure expected by the onSubmit prop
export interface FeedbackDialog FormData {
  reason: string;
  category?: string;
  reportedContentPath: string;
  prototypeId: string;
}

interface FeedbackDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: FeedbackDialogFormData) => void;
  reportedContentPath: string | null | undefined;
  prototypeId: string | null | undefined;
  isLoading?: boolean; // To disable form while submitting
}

const feedbackCategories = ["Inaccurate", "Offensive", "Harmful", "Other"];

export function FeedbackDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  reportedContentPath,
  prototypeId,
  isLoading = false,
}: FeedbackDialogProps) {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);

  // Reset form when dialog closes or content changes
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setCategory(undefined);
    }
  }, [isOpen, reportedContentPath, prototypeId]);

  const handleSubmit = () => {
    if (!reportedContentPath || !prototypeId) {
      // This should ideally not happen if dialog is opened correctly
      console.error("Missing report context (path or prototypeId)");
      return;
    }
    if (reason.trim().length < 10) {
        // Basic validation, could be more sophisticated
        alert("Please provide a reason with at least 10 characters.");
        return;
    }
    onSubmit({ reason, category, reportedContentPath, prototypeId });
  };

  const canSubmit = reason.trim().length >= 10 && !isLoading;

  if (!reportedContentPath || !prototypeId) {
    // Don't render if essential props are missing, or handle gracefully
    // This might happen if parent component doesn't set them before opening
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Please provide details about the issue you are reporting regarding content at: <strong>{reportedContentPath}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Reason
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
              placeholder="Describe the issue (min. 10 characters)"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {feedbackCategories.map((cat) => (
                  <SelectItem key={cat} value={cat.toLowerCase()}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={!canSubmit}>
            {isLoading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
