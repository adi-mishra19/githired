"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScheduleInterviewModalProps {
  applicationId: string;
  studentName: string;
  onScheduled?: () => void;
}

export function ScheduleInterviewModal({
  applicationId,
  studentName,
  onScheduled,
}: ScheduleInterviewModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    round: "round_1",
    scheduledAt: "",
    duration: "60 minutes",
    location: "",
    meetingLink: "",
    interviewers: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.scheduledAt) {
      toast.error("Please select interview date and time");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/company/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          round: formData.round,
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
          duration: formData.duration,
          location: formData.location || undefined,
          meetingLink: formData.meetingLink || undefined,
          interviewers: formData.interviewers
            ? formData.interviewers.split(",").map((i) => i.trim())
            : undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to schedule interview");
      }

      toast.success("Interview scheduled successfully!");
      setOpen(false);
      if (onScheduled) onScheduled();
      
      // Reset form
      setFormData({
        round: "round_1",
        scheduledAt: "",
        duration: "60 minutes",
        location: "",
        meetingLink: "",
        interviewers: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to schedule interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Interview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
          <DialogDescription>
            Schedule an interview for {studentName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Round Selection */}
          <div className="space-y-2">
            <Label htmlFor="round">Interview Round *</Label>
            <select
              id="round"
              className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
              value={formData.round}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, round: e.target.value }))
              }
              required
            >
              <option value="oa">Online Assessment</option>
              <option value="round_1">Technical Round 1</option>
              <option value="round_2">Technical Round 2</option>
              <option value="round_3">Technical Round 3</option>
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date & Time *</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    scheduledAt: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                placeholder="e.g., 60 minutes, 1 hour"
                value={formData.duration}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, duration: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Location & Meeting Link */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Virtual - Google Meet, Bangalore Office"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meetingLink">Meeting Link (if virtual)</Label>
            <Input
              id="meetingLink"
              type="url"
              placeholder="https://meet.google.com/..."
              value={formData.meetingLink}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  meetingLink: e.target.value,
                }))
              }
            />
          </div>

          {/* Interviewers */}
          <div className="space-y-2">
            <Label htmlFor="interviewers">Interviewers (comma-separated)</Label>
            <Input
              id="interviewers"
              placeholder="e.g., John Doe, Jane Smith"
              value={formData.interviewers}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  interviewers: e.target.value,
                }))
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Student</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information or instructions..."
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Schedule Interview"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

