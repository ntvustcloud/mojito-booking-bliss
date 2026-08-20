# Mojito Booking Bliss

Build a complete, modern, responsive customer-facing website for:

Mojito Nail Salon

The website should function as a real nail salon discovery and appointment-booking experience, not just a static marketing website.

The main customer journey is:

Explore → Learn → Add Services → Save Nail Inspiration → Review Appointment → Book

Do NOT build owner management, POS, payroll, SaaS, or other advanced salon-management features yet.

1. Brand & Visual Style

Use a minimalist, calming, wellness-inspired design.

Brand:

Mojito Nail Salon

Logo concept:

Minimalist capybara

Green banana leaf

Cute and friendly but still professional

Suitable for website, signage, social media, cups, and future app icon

Primary font:

Nunito

Use slightly larger, highly readable typography.

Color palette:

Soft sage green

Light muted green

Creamy white

Ivory

Warm beige

Light neutral gray

Use darker muted green for primary buttons and selected states.

Avoid:

Neon colors

Strong pink

Heavy gold

Dark luxury themes

Excessive gradients

Flashy animations

The website should communicate:

Cleanliness + Comfort + Relaxation + Professionalism

Do NOT include an AI chatbot.

2. Main Navigation

Use:

Home | Services | Gallery | About | Contact | Book Appointment

Make Book Appointment the primary CTA.

The entire website must work well on desktop, tablet, and mobile.

3. Homepage

Recommended order:

Navigation

Hero

Our Menu — 6 Popular Services

Featured Gallery

Why Choose Us

Booking CTA

Google Reviews

Visit Us + Map

Footer

Hero

Show:

Mojito Nail Salon

A short relaxing tagline.

Primary CTA:

Book Appointment

Secondary CTA:

View Our Menu

View Our Menu should scroll to the homepage menu section.

4. Homepage — Our Menu

Show only the 6 most popular services.

Example:

Signature Pedicure

Gel Manicure

Deluxe Pedicure

Dip Powder

Acrylic Full Set

Gel-X

Desktop layout:

Left: fixed 2-column × 3-row service grid

Right: fixed Service Story panel

Service cards must NEVER rearrange or jump when hovering.

Hover Behavior

Hovering a service card should:

Highlight the card subtly

Update the Service Story panel

Reveal + Add to Appointment inside the hovered card

The card itself should NOT navigate anywhere.

Service Story Panel

Show:

Service name

Starting price

Estimated duration

Short description

What's Included

Temporary short service video or slideshow

Use subtle fade/crossfade transitions only.

The video is a placeholder and should be easy to replace later.

5. Add to Appointment

Customers must be able to select multiple services before booking.

Clicking:

+ Add to Appointment

should:

Add the service

Keep the customer on the current page

Change the button to ✓ Added

Update the shared appointment selection

Show a subtle confirmation such as:
✓ Signature Pedicure added

Do NOT immediately send customers to the Booking page.

Customers should be encouraged to continue exploring.

Prevent accidental duplicate services.

6. Shared “Your Appointment” State

Use one shared appointment-selection state across:

Homepage

Services

Gallery

Booking

Selections should remain when customers navigate between pages.

For the prototype, use a simple solution such as:

React Context

Zustand

localStorage

Equivalent lightweight state management

Do not over-engineer this.

7. Floating Appointment Tray

After at least one service is selected, show:

Your Appointment · 2

On desktop, clicking it opens a right-side drawer.

Display:

Selected services

Price

Duration

Remove

Estimated total

Estimated total duration

Continue Browsing

Continue to Booking

Example:

Your Appointment

Signature Pedicure — $55 · 50 min
Gel Manicure — $45 · 45 min

Estimated Total: $100
Estimated Duration: 1 hr 35 min

Primary CTA:

Continue to Booking

On mobile, use a compact sticky bottom bar and bottom sheet instead of a large side drawer.

8. Services Page

Organize services into categories such as:

Manicure

Pedicure

Gel

Dip Powder

Acrylic

Gel-X

Nail Art

Add-ons

Each service card should ALWAYS show:

Service name

Short description

Price

Duration

+ Add to Appointment

On desktop, hover gently expands the card to reveal:

What's Included

Use only 4–6 short bullet points.

Example:

Nail shaping & cuticle care

Callus treatment

Sugar scrub

Relaxing massage

Hot towel

Polish

Keep expanded card heights consistent to minimize layout jumping.

Do not reorder cards.

On mobile, tap the card to expand/collapse What's Included.

Only the Add to Appointment button should select the service.

All selections must use the same existing Your Appointment state.

9. Gallery

Design the Gallery primarily for visual inspiration.

Use large high-quality images and filters such as:

All | Gel | Acrylic | French | Nail Art | Seasonal | Minimal | Pedicure

Desktop hover should show:

View Design

♡ Save to Appointment

Clicking View Design opens a clean lightbox/detail view with:

Large image

Design name

Category

Short description

Save to Appointment

Save Design

Allow the customer to save one primary nail design inspiration to the appointment.

After saving:

✓ Saved to Appointment

The design should appear inside the Appointment Tray with:

Thumbnail

Design name

Change

Remove

Important:

A saved design is only a visual reference.

It should NOT automatically add a price or paid service.

If appropriate, optionally suggest:

This design may require a Nail Art add-on.

with an optional:

+ Add Nail Art

Do not force it.

10. Booking Flow

When the customer clicks:

Continue to Booking

all previously selected services and saved nail inspiration must already be present.

The customer should never need to select the same service twice.

Use this flow:

Step 1 — Your Services

Show selected services.

Allow:

+ Add Additional Services

Display:

Service count

Estimated total

Estimated duration

Step 2 — Choose Technician

Allow:

Specific technician

Any Available Technician

Technician cards may show:

Photo

Name

Specialties

Step 3 — Date & Time

Display available dates and time slots.

Only show slots capable of handling the estimated service duration.

Step 4 — Customer Information

Ask for:

Name

Phone

Email

Optional notes

Do NOT require account creation.

Step 5 — Review

Show:

Services

Estimated price

Duration

Technician

Date

Time

Contact information

Nail design inspiration

Notes

CTA:

Confirm Appointment

Confirmation

Show:

Appointment confirmed

Date/time

Services

Technician

Salon address

Salon phone

Saved design if applicable

Include visual placeholders for future:

Reschedule

Cancel

SMS Reminder

Do not build real SMS/email infrastructure yet.

11. Multi-Service Requirement

The booking model must support:

One Customer → One Appointment → Multiple Services

Do NOT assume:

One Appointment = One Service

12. Group Booking Placeholder

Prepare for future group booking but do NOT build the scheduling engine yet.

Show a subtle option:

Booking for 2 or more people?

Group Booking

For now, it may display:

Group Booking is coming soon.

Do not yet build:

Multi-person scheduling

Multiple-tech availability

Group payment

Complex guest logic

13. Google Reviews

Replace generic testimonials with:

Loved by Our Clients

Use realistic placeholder Google-style reviews.

Show:

Customer first name

Star rating

Short review

Date

CTA:

Read More Reviews on Google

Real API integration is not required yet.

14. Visit Us

Create a section with:

Salon name

Address

Phone

Business hours

Google Maps-style map placeholder

Get Directions

Desktop:

Salon Information | Map

Mobile:

Stack vertically.

15. About / Why Choose Us

Keep this concise and focus on:

Cleanliness

Relaxation

Professionalism

Quality

Friendly technicians

Attention to detail

Avoid excessive marketing copy.

16. Technical Direction

Prefer a clean modern frontend stack such as:

React or Next.js

TypeScript

Tailwind CSS or equivalent

Lightweight shared state

localStorage for prototype persistence

Keep components modular so a real backend/database can be added later.

Separate:

Service data

Gallery data

Appointment state

Booking flow

UI components

Current scope is for one nail salon.

Design cleanly so it may later connect to:

Real availability

Customer database

Owner dashboard

POS

Payments

Technician commissions

SMS

Group appointments

SaaS

But do NOT build these now.

17. Do NOT Build Yet

Do not build:

Owner Portal

POS

Card processing

Payroll

Technician commission

Inventory

Loyalty program

Customer accounts

Multi-location

SaaS subscriptions

Multi-tenant architecture

AI assistant

Advanced authentication

Group scheduling engine

Keep V1 simple and functional.

Final UX Goal

The finished customer journey should feel like:

Discover Mojito Nail Salon

→ Explore Popular Services

→ Learn What Each Service Includes

→ Add Services Without Leaving the Page

→ Continue Browsing

→ Explore Nail Inspiration

→ Save a Design Reference

→ Open Your Appointment

→ Review Services + Design

→ Continue to Booking

→ Choose Technician

→ Choose Date & Time

→ Enter Contact Information

→ Review

→ Confirm

The guiding principle is:

Explore → Understand → Collect → Decide → Book

Customers should feel free to explore before committing to an appointment.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/77f85273-77cd-4038-9423-4133e3f5c60b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
