"use client"
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  const now = new Date();
  
  // Start from tomorrow
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() + 1);
  
  // Generate 4 time slots over the next week
  let slotsAdded = 0;
  const currentDate = new Date(startDate);
  
  while (slotsAdded < 4 && currentDate < new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)) {
    const dayOfWeek = currentDate.getDay();
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
      const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentDate.getMonth()];
      const date = currentDate.getDate();
      
      // Alternate between morning and afternoon slots
      const time = slotsAdded % 2 === 0 ? '10:00 AM PT' : '2:00 PM PT';
      
      slots.push(`${dayName}, ${month} ${date} — ${time}`);
      slotsAdded++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return slots;
}

interface ScheduleMeetingDialogProps {
  buttonText?: string;
  buttonClass?: string;
}

export function ScheduleMeetingDialog({ buttonText = "Schedule a Chat", buttonClass = "btn-primary" }: ScheduleMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    time_slot: '',
    meeting_description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const token = typeof window !== 'undefined' ? localStorage.getItem("xsourcing_token") : null;

  const handleSubmit = async () => {
    if (!formData.time_slot) {
      alert('Please select a time slot');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${api}/client/schedule-request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setFormData({ time_slot: '', meeting_description: '' });
        }, 3000);
      } else {
        alert(data.error || 'Failed to submit request');
      }
    } catch (e) {
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={buttonClass}>{buttonText}</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a Meeting</DialogTitle>
          <DialogDescription>
            {success 
              ? "Your client advisor will confirm and send a calendar invite."
              : "Select a time and describe what you'd like to discuss."
            }
          </DialogDescription>
        </DialogHeader>
        
        {!success && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Pick a time</div>
              <div className="grid grid-cols-1 gap-2">
                {generateTimeSlots().map((slot) => (
                  <label 
                    key={slot} 
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-white p-3 text-sm hover:bg-[var(--color-surface-alt)]"
                  >
                    <input 
                      name="slot" 
                      type="radio" 
                      value={slot}
                      checked={formData.time_slot === slot}
                      onChange={e => setFormData(prev => ({ ...prev, time_slot: e.target.value }))}
                      className="accent-[var(--color-primary)]"
                      disabled={submitting}
                    />
                    {slot}
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-white p-3 text-sm hover:bg-[var(--color-surface-alt)]">
                  <input 
                    name="slot" 
                    type="radio" 
                    value="Other / Advisor will send available times"
                    checked={formData.time_slot === "Other / Advisor will send available times"}
                    onChange={e => setFormData(prev => ({ ...prev, time_slot: e.target.value }))}
                    className="accent-[var(--color-primary)]"
                    disabled={submitting}
                  />
                  Other / Advisor will send available times
                </label>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium mb-2">Meeting Description</div>
              <textarea
                className="w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm resize-none"
                rows={2}
                placeholder="What would you like to discuss?"
                value={formData.meeting_description}
                onChange={e => setFormData(prev => ({ ...prev, meeting_description: e.target.value }))}
                disabled={submitting}
              />
            </div>
            
            <button 
              className="btn-primary w-full" 
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Request Meeting'}
            </button>
          </div>
        )}
        
        {success && (
          <div className="py-8 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[var(--color-text-muted)]">Meeting request sent!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
