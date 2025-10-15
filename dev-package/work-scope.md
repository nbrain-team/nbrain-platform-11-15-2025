


This unified MVP functional scope that includes your original requirements plus the competitive enhancements from Lawmatics/LawLytics-style features. This way, your dev/designer team gets one clear document that covers:
Functional Environments (Backend + Frontend)


Advisor Screens & User Journey


Competitive Enhancements (integrated, not bolted-on)


Data Model & Integration Notes



Unified MVP Functional Environments (Merged)
1. Authentication & Profile
Google/Microsoft OAuth (Gmail, Calendar, Docs/Drive, Contacts, Tasks).


Basic profile wizard: logo, colors, tagline, compliance disclaimer.


Custom domain setup wizard (CNAME + SSL issuance).


Tenant + site auto-provisioned (xyz.com/<username> + optional custom domain).


2. Advisor Dashboard
Daily schedule (Google Calendar).


Task list (approve docs, review notes, follow-ups).


Alerts: signatures completed, payments received, pending approvals.


KPIs: funnel metrics (Views → Intake → Paid → Booked → Signed).


Activity Timeline strip (normalized from events: meetings, docs, payments, forms).


3. Landing Page Builder
Template gallery (3–5 starter templates).


Custom branding: logo, theme colors, banner.


Embed video (YouTube/Vimeo/upload → CDN).


Embed Calendly widget.


Embed Stripe or LawPay checkout widget (consult fee paywall toggle).


SEO schema injection (JSON-LD LegalService + LocalBusiness).


Publish to xyz.com/<username> or custom domain/subdomain.


4. Client Intake → Consultation Flow
Intake form builder (with templates by practice area).


Lead source capture (UTM, referral code, call tracking ID).


Nurture sequence builder (email + optional SMS steps).


Consultation booking (Calendly → Zoom/Meet).


Optional require payment before booking (paywall).


Note taker auto-join (API integration with Otter/Fireflies).


5. Engagement Letter Automation
Draft generated from template (merge fields).


Advisor task: Approve & Send / Edit.


Send via DocuSign / Google eSign.


Client signs → doc stored in Vault.


CRM tag updated to “Signed/Closed.”


Conflict Check Lite (auto-flag name/email match).


6. Onboarding & Document Automation
Trigger onboarding packet (email with forms).


Client portal (view-only) showing: next meeting, pending forms, recent signed docs.


Progress tracker for forms.


Completed forms → stored in Vault.


Automator drafts deliverables (entity formation, OpAgreements).


Advisor approves/edits → send/file.


7. Client Vault & CRM
Secure file vault (per client, S3/GCS signed URLs).


Contact profile: stages, tasks, tags, engagement history.


Global household linking (clients → households table).


Consent flags for sharing with other advisors (tax, financial, insurance).


8. Task & Workflow Engine
Trigger-based (event bus): intake, booking, payment, signature, form completion.


Actions: send email/SMS, create task, generate doc, send for e-sign, move stage.


Workflow Automator UI: edit steps, delays, conditions.


Tasks: New / Pending Approval / Completed.


9. Payments & Referrals
Stripe or LawPay integration.


Webhooks for payment.succeeded → unlock consult booking.


Referral link generator (?ref=<code>) → track attribution.


Simple advisor directory (xyz.com/advisors) filterable by practice area + location.


10. Communications
Email delivery (SendGrid/Mailgun).


SMS reminders (consult + incomplete forms).


Call tracking placeholder (Twilio/CallRail integration — save call SID + source).



Advisor Screens & User Journey (Merged)
Sign-up & Profile Setup


OAuth with Google/Microsoft.


Profile wizard: branding, compliance, API connections.


Dashboard Home


Calendar, tasks, alerts, KPIs, global timeline.


Landing Page Builder


Select template → customize (logo, video, Calendly, payment block).


Publish to vanity URL / custom domain.


Client Intake & Nurture


Intake form collects info → CRM record created.


Source/Referral tracking captured.


Nurture email/SMS sequence triggered.


Optional paid consult gate.


Book consultation → Zoom/Meet link auto-generated + note taker.


Engagement Letter Review


Auto-draft letter with merge fields.


Approve & Send / Edit.


Client signs via e-sign.


Doc stored in Vault; CRM → Signed/Closed.


Conflict Check Lite flag if match detected.


Onboarding Form Portal (Client View)


View upcoming meeting, pending forms, signed doc.


Progress % for forms.


Secure upload to Vault.


Deliverables Draft Review


Automator pre-fills templates (LLC, OA).


Advisor approves/edits → send/file.


Doc stored in Vault + status updated.


Client Vault & CRM


Secure Vault with docs + forms.


CRM record with household link, consent flags.


Task list and timeline of all activities.


Marketplace & Referrals


Advisor directory listing (opt-in).


Referral code generator; track attribution.




Data Model Additions
households { id, name }


household_members { household_id, contact_id, role }


consents { id, contact_id, type, target_party, status, granted_at }


referrals { id, code, advisor_id, campaign, created_at }


conflict_flags { lead_id, reason, score, status, reviewer_id, decided_at }


events { id, type, contact_id, tenant_id, metadata }



📌 MVP Task Bundle (Law Advisor SaaS)

Epic 1: Authentication & Profile Setup
User Stories
As an advisor, I can sign up with Google or Microsoft, so my email, calendar, docs, and contacts sync automatically.


As an advisor, I can configure my branding (logo, colors, disclaimer) so my landing pages are personalized.


As an advisor, I can reserve a vanity URL xyz.com/<username> and optionally add a custom domain.


Acceptance Criteria
OAuth scopes captured (Mail, Calendar, Docs/Drive, Contacts, Tasks).


Tenant and site provisioned on signup.


Custom domain DNS instructions + SSL issuance flow works.



Epic 2: Advisor Dashboard
User Stories
As an advisor, I see my calendar, pending tasks, alerts, and funnel metrics in one place.


As an advisor, I can track client activity on a timeline (meetings, payments, docs).


Acceptance Criteria
Calendar feed loads from Google/Microsoft.


Tasks and alerts render correctly.


Funnel KPIs: Views → Intake → Paid → Booked → Signed visible.


Timeline shows most recent 10 events.



Epic 3: Landing Page Builder
User Stories
As an advisor, I can choose from templates and customize with my logo, colors, and video.


As an advisor, I can embed Calendly, Stripe/LawPay, and publish my site.


As an advisor, my site includes SEO metadata and JSON-LD schema.


Acceptance Criteria
3–5 starter templates selectable.


Video block supports YouTube, Vimeo, or file upload.


Payment block toggle to require payment before booking.


SEO schema generated for each advisor site.



Epic 4: Client Intake & Nurture Flow
User Stories
As a client, I can complete an intake form that feeds into the advisor’s CRM.


As an advisor, I can build nurture sequences (email/SMS).


As a client, I can pay for a consult before booking.


As a client, I can book a consult that syncs to Zoom/Meet with a note taker bot.


Acceptance Criteria
Intake form → CRM record created.


Nurture builder supports email + SMS steps.


Payment webhook required to reveal scheduling block.


Zoom/Meet link created + note taker auto-joined.



Epic 5: Engagement Letter Automation
User Stories
As an advisor, I receive a draft engagement letter after a consult.


As an advisor, I can approve/edit before sending.


As a client, I can e-sign the engagement letter.


Acceptance Criteria
Template merge fields filled (name, fee, scope, firm).


Approve & Send / Edit buttons functional.


E-sign integration works (DocuSign/Google eSign).


Signed doc stored in Vault; CRM tag “Signed/Closed.”


Conflict check runs on new leads and shows banner if match.



Epic 6: Onboarding & Deliverables
User Stories
As a client, I can log in to a portal and see next meeting, pending forms, and signed docs.


As an advisor, I can track progress on client forms.


As an advisor, I can review auto-drafted deliverables (LLC, OA).


Acceptance Criteria
Portal shows only client’s files with expiring links.


Form progress tracked and visible to advisor.


Deliverable drafts auto-generated with placeholders.


Approve/Edit → send/file → Vault update.



Epic 7: Client Vault & CRM
User Stories
As an advisor, I have a secure Vault for each client.


As an advisor, I can see client contact records, stages, and tags.


As an advisor, I can link clients into households and record consent flags.


Acceptance Criteria
Vault stores docs in per-tenant path; signed URLs generated.


CRM pipeline stages visible.


Household linking functional.


Consent flags storable and visible.



Epic 8: Payments & Referrals
User Stories
As a client, I can pay securely using Stripe or LawPay.


As an advisor, I can generate referral links to share.


As a prospect, I can discover advisors via a public directory.


Acceptance Criteria
Payment processing works; test charges succeed.


Referral codes attach to leads.


Directory at xyz.com/advisors filters by practice area + location.



Epic 9: Communications
User Stories
As a client, I receive SMS reminders for consults and incomplete forms.


As an advisor, I can see when a lead calls a tracked number.


Acceptance Criteria
SMS reminder toggles in nurture builder.


T-24h and T+48h triggers run.


Call tracking placeholder saves source + call SID.



🗓 Sprint Breakdown
Foundations
Tenant/site provisioning (Epic 1).


Dashboard shell + calendar feed (Epic 2).


Data model tables for households, consents, referrals, conflict_flags.


Landing Pages
Landing page builder UI.


Template gallery + theming.


SEO schema injection.


Intake & Booking
Intake form builder.


CRM record creation.


Nurture builder (email only).


Calendly + Zoom/Meet integration.


Payments & Paywall
Stripe/LawPay setup.


Paywall toggle (unlock scheduling).


Directory skeleton + referral links.


Documents & Automation
Engagement letter generation + approval flow.


E-sign integration.


Conflict check lite.


Deliverable draft automation.


Client Experience
Client portal (view-only).


Form progress tracker.


Vault integration + signed URL downloads.


SMS reminders.


QA checklist + go-live test.



With this breakdown, the team has:
Epics (9 total),


Stories with acceptance criteria,


6-Day Sprint Plan.


__________________________________________________________________________
Notes on some of the screen shot UI we like for the Client view of their “Vault of Entities and documents” along with action buttons they can toggle or the advisor can trigger below
Inside button across top need “Contribute Asset to Trust” “Need a Distribution” “Need to setup Investment committee” 


                

Inside button across top need “Contribute Asset to Trust” “Need a Distribution” “Need to setup Investment committee” 

When they push button it should open the question bot with the google form bots and 

Action categories in client portal in BOLD 

Contribution to Trust (these docs go into the vault for the WPTC

Questionnaire
Trustee Acceptance of Contribution (goes into 
State Special Meeting Minutes and Resolutions (goes into the LLC or Hold Co outside the box) 
Affidavit of Settlor

All signed by client

Asset Protection Trust University (down the road add on education with 

Distributions From Trust (DDC=Discretionary Distribution Committee)


DDC Minutes Appointing WAPA
DDC Acceptance of Appointment (WAPA signs does not need to be wet signature)
Investment Committee Questionnaire
DDC Distribution Request Form
DDC Minutes Approving Distribution (WAPA signs does not need to be wet signature)
State Distribution Meeting Minutes

Investment Decisions

Investment Committee Creation and Appointment
Investment Committee Questionnaire
Investment Committee Meeting Minutes

Wyoming Private Family Trust Documents

PTC Operating Agreement (single or two grantors)
PTC Organizational Minutes (single or multi-member)

Wyoming Private Family Trust Documents need to be done when PTC is created. Other categories are done if needed and the client should be prompted by the portal to fill out a questionnaire and the questionnaire should populate the document and send it to the client for signature.


_____________________________________________
Example of the mimimum landing page template we need replicated 100% by tomorrow.  as an option in the three-5 in the advisor panel is here below
https://schedule.wyomingassetprotectiontrust.com


____________________________________________________________________________Done—I'll remind you tomorrow at 9:00am PT to package the mockups into a clickable storyboard PDF.
Post-Signup: What must happen (front end + back end)
A. Multi-tenant SaaS + public advisor pages
Tenancy model


tenants (advisor/firms), users, sites, domains, pages, clients, files, webhooks, templates, integrations.


Every record has tenant_id; enforce row-level security & per-tenant S3/GCS prefixes.


Replicated marketplace directory


Public directory at xyz.com/advisors and vanity paths xyz.com/<username>.


Optional custom domain per site (e.g., smithlaw.com), plus per-funnel subpages like plan.smithlaw.com or smithlaw.com/trust-planning.


Routing


Wildcard: *.xyz.com to the app load balancer.


Resolve by host header → domains table → site_id → render page/theme.


Theming


Theme tokens (colors, logo, typography) stored per site.


Server-side render or hydrated SPA with theme vars.


B. Custom domains & subdomains (DNS/SSL automation)
Flow


Advisor adds a domain/subdomain in “Site Settings.”


We show required DNS records; poll ACME challenge until verified.


Auto-provision SSL (Let’s Encrypt) and store certificate (KMS-encrypted).


Records to show


Apex (if supported by host):


ALIAS/ANAME @ → xyz.com (or A to LB IPs)


Subdomain:


CNAME app.smithlaw.com → cname.xyz.com


ACME (if needed):


TXT _acme-challenge.smithlaw.com → <token>


Backend


Worker watches “domain_verifications” queue → attempts issuance via ACME → updates domains.status = active.


On success, purge CDN cache; mark site published.


C. OAuth & account linking (Google / Microsoft)
Front end


Explicit consent page listing scopes; granular toggles (Mail, Calendar, Drive/Docs, Contacts, Tasks).


Show what we read vs write (trust + compliance).


Scopes (minimum viable)


Google: gmail.readonly, calendar, drive.file, contacts.readonly, tasks, openid email profile.


Microsoft 365: analogous Graph scopes (Mail.Read, Calendars.ReadWrite, Files.ReadWrite, Contacts.Read, Tasks.ReadWrite).


Backend


Store tokens in integrations (provider, scopes, access/refresh encrypted).


Webhooks: Google push notifications (watch channels) or poll if webhook not available.


Sync jobs (idempotent): inbox leads → CRM contacts; calendar → dashboard; Drive links → Vault.


Rate-limit + exponential backoff; token refresh daemon.


D. Calendly, video, payments, e-sign
Calendly


Embed widget on landing pages; also capture event.created webhook → create CRM activity, create Zoom/Meet link, enqueue “note-taker join.”


Zoom / Google Meet


Zoom OAuth (meetings.create). Meet can come from Google Calendar insert.


Video on page


YouTube/Vimeo URL or file upload → transcode → CDN.


Payments


Provider option: Stripe or LawPay


Create payment_accounts with provider + account id.


Nurture → Paywall step (optional): charge consult fee before booking.


Webhooks: payment.succeeded → tag CRM “Paid Consult”.


E-sign


DocuSign / Google eSign. Template IDs mapped to advisor’s templates.


Webhook: envelope.completed → store signed PDF to Vault, tag contact “Signed/Closed”.


E. Workflow Automator & tasks
Core objects: workflows, triggers (form_submitted, event_scheduled, payment_succeeded, envelope_completed), actions (send_email, create_task, generate_doc, request_esign, move_deal_stage).


Runtime


Event bus (e.g., Postgres LISTEN/NOTIFY, Kafka, or SQS) → workers execute actions.


Every action must be idempotent (store last_run hash).


Tasks


tasks with assignee_id, due_at, status (new/pending_approval/completed), entity_ref.


F. CRM & Vault
CRM contact


Stages: Intake → Consult Booked → Paid → Signed → Onboarding → In Progress → Completed.


Timeline: emails, meetings, payments, signatures, uploads.


Vault


S3/GCS keying: /tenant/<id>/client/<id>/…


Signed URLs for client portal; virus scan + DLP; checksum recorded.


Metadata links back to templates and e-sign envelopes.


G. Security & compliance
RBAC: Roles = Owner, Advisor, Staff, Client (portal).


Audit log on all accesses/writes (immutable append).


PII encryption at rest; KMS; least-privileged service accounts.


Data residency flag per tenant (if needed later).


Email sending with DMARC/SPF/DKIM; per-tenant sending domain optional.



Front-End UX: what happens immediately after signup
Welcome → “Create Your Public Site”


Pick username → reserves xyz.com/<username>


Upload logo + pick color theme


Add headline/subhead + About copy


Add video URL (YT/Vimeo) or upload


Toggle directory listing (show in marketplace Y/N)


Connect Accounts (wizard)


Google / Microsoft toggle cards


Buttons: “Connect Gmail,” “Connect Calendar,” “Connect Drive/Docs,” “Connect Contacts,” “Connect Tasks”


Calendly connect button (API key/OAuth)


Payments: Choose Stripe or LawPay → connect


E-sign: Choose provider → connect


Note-taker: toggle (enter API key if using 3rd party)


Pick a Template Landing Page


Choose layout (3–5)


Add Calendly block


Add Payment block (consult fee, optional)


Add Testimonials block (optional)


Publish to xyz.com/<username> (one click)


Custom Domain (optional now or later)


Enter domain/subdomain


Show DNS records & live status checker


“Issue SSL” button appears when verified


Nurture Sequence Starter


Choose preset “Lead → Paid Consult” flow


Edit email copy; set delays


Toggle SMS (if enabled)


Save & Activate


Templates & Docs


Choose Engagement Letter template


Choose Intake/Onboarding packet


Map merge fields (firm name, address, pricing, scope)


Go Live Checklist


✅ Public page published


✅ Calendly connected


✅ Payments connected


✅ E-sign connected


✅ Nurture sequence active


✅ Custom domain secured (optional)



Back-End Provisioning: step-by-step
Create tenant & site


tenants.insert(...) → sites.insert(default_site)


Reserve /<username> and a wildcard subdomain for previews (e.g., <username>.preview.xyz.com)


Seed defaults


Default theme tokens; default page sections


Default email templates + workflow “Lead → Consult → Sign → Onboard”


Default storage prefixes and IAM policies


Integration records


Pre-create integrations rows with status=pending per connector chosen in wizard


On OAuth callback, save tokens, flip to active, enqueue initial sync


Webhooks


Register tenant-scoped webhook endpoints for:


Calendly (event.created, invitee.canceled)


Stripe/LawPay (payment.succeeded/failed, account.updated)


DocuSign/Google eSign (envelope.completed/declined)


Zoom (meeting.created, meeting.ended) if needed


Verify signatures; persist event; enqueue workflow run


Publishing


On “Publish,” render static (or SSR cached) files for the landing page; push to CDN bucket


Update sites.published_at


Custom domain


Create domain verification job


If success → request/renew SSL (ACME), store cert, update CDN mapping


Access & audit


Create default RBAC roles, team invites


Start audit streams



What we must collect from advisor after signup (onboarding form)
Brand & public presence
Legal entity name; display name; short bio


Logo (SVG/PNG), brand colors (primary/secondary), favicon


Headshot/team photos (optional)


Practice areas / services menu


Video link (YouTube/Vimeo) or file upload


Public URL & directory
Desired username for xyz.com/<username>


Custom domain/subdomain (optional now)


Directory listing: opt-in/opt-out; service regions; specialties; min fee (optional)


Contact + compliance
Office address, phone, support email


Jurisdictions admitted / licensing text


Compliance disclaimer text


Privacy policy & terms URLs (or use hosted defaults)


Calendaring & meetings
Calendly account link or API key; default event type (duration, price if paid)


Preferred meeting platform (Zoom / Google Meet)


Timezone and business hours


Payments
Choose Stripe or LawPay


Connect account (OAuth) or provide account ID


Default consult fee, currency, refund policy


E-sign
Provider (DocuSign or Google eSign)


Template IDs to load (Engagement Letter, NDAs)


Signature routing (client email, cc list)


Documents & templates
Engagement Letter doc (DOCX/Google Doc) with placeholders


Intake & onboarding packet templates


Standard deliverables (LLC formation, Operating Agreement, etc.) templates


Merge field mapping (field → placeholder)


Integrations
Google: authorize Mail, Calendar, Drive, Contacts, Tasks


or Microsoft 365: authorize Mail, Calendar, OneDrive, Contacts, To Do


Note-taker integration (toggle + key) if using external


CRM & workflow
Pipeline stages (if custom)


Nurture sequence choice: preset or upload copy


Task SLA preferences (e.g., “review drafts within 24h”)


Team & access
Team members to invite; roles


Support inbox to pipe into the system (optional)



Dev notes & sample configs
Example merge fields (Engagement Letter)
{{client.full_name}}
{{client.address}}
{{engagement.scope}}
{{engagement.fee_amount}}
{{firm.legal_name}}
{{firm.contact_email}}
{{signature.block}}

Example webhooks (JSON shape you should standardize)
{
  "event": "signature.completed",
  "tenant_id": "t_123",
  "contact_id": "c_456",
  "envelope_id": "es_789",
  "document_url": "s3://bucket/tenant/t_123/client/c_456/engagement_signed.pdf",
  "occurred_at": "2025-08-20T16:20:00Z"
}

Example DNS copy for advisors
To use app.smithlaw.com:
CNAME app.smithlaw.com → cname.xyz.com

After propagation, we’ll issue SSL automatically. This can take up to 30 minutes.

Minimal queues / workers
domain_verifier, acme_issuer, integration_sync, webhook_dispatch, workflow_runner, email_sender, doc_generator.


Doc generation
Server fills DOCX/Google Doc via placeholders → renders PDF → stores in Vault.


Client portal
Public, tokenized access links per client; optional password; download tracking.



QA checklist (per tenant go-live)
Directory profile visible at xyz.com/<username>


Landing page renders; Calendly loads


Payment test charge succeeds (test mode)


E-sign template merges correctly; test envelope completes; PDF lands in Vault


Google/Microsoft sync pulls next 24h events to dashboard


Nurture sequence sends first email in sandbox


Custom domain validated; SSL issued (if applicable)


Role permissions correct; client portal loads only that client’s files



If you want, I can turn the onboarding form above into a Typeform/Notion/Jotform schema and a CSV/JSON field spec your team can wire directly into the provisioning pipeline.
________________________________________________________________
SCREENS for all sections above mocked for UI






