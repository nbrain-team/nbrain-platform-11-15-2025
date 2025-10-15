"use client"
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

export function AdvisorRequestDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company_url: '',
    time_slot: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.time_slot) {
      alert('Please fill in all required fields and select a time slot');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${api}/public/advisor-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setFormData({ name: '', email: '', company_url: '', time_slot: '' });
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
        <button className="btn-secondary">Talk to an Advisor</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Talk to an Advisor</DialogTitle>
          <DialogDescription>
            {success 
              ? "Thanks! An advisor will reach out to confirm your selected time."
              : "Share a few details and pick a time. We'll confirm by email."
            }
          </DialogDescription>
        </DialogHeader>
        
        {!success && (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium">Full Name *</div>
              <Input 
                placeholder="Jane Doe" 
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div>
              <div className="text-sm font-medium">Email *</div>
              <Input 
                type="email" 
                placeholder="jane@company.com"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div>
              <div className="text-sm font-medium">Company URL</div>
              <Input 
                type="url" 
                placeholder="https://example.com"
                value={formData.company_url}
                onChange={e => setFormData(prev => ({ ...prev, company_url: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div>
              <div className="text-sm font-medium">Pick a time *</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {generateTimeSlots().map((slot) => (
                  <label 
                    key={slot} 
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-white p-2 text-sm hover:bg-[var(--color-surface-alt)]"
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
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] bg-white p-2 text-sm hover:bg-[var(--color-surface-alt)] sm:col-span-2">
                  <input 
                    name="slot" 
                    type="radio" 
                    value="Other / Schedule later"
                    checked={formData.time_slot === "Other / Schedule later"}
                    onChange={e => setFormData(prev => ({ ...prev, time_slot: e.target.value }))}
                    className="accent-[var(--color-primary)]"
                    disabled={submitting}
                  />
                  Other / Schedule later
                </label>
              </div>
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
            <p className="text-[var(--color-text-muted)]">We've received your request!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
