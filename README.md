# Ankit Portfolio

A React and Firebase portfolio website with an admin dashboard, project showcase, certificates, skills, contact messages, feedback, and community notes approval flow.

## Features

- Responsive personal portfolio built with React and Vite
- Firebase Authentication protected admin dashboard
- Firestore-backed profile, skills, projects, certificates, resources, messages, feedback, and user notes
- Community notes submission and approval workflow
- EmailJS notifications for approved, rejected, or deleted user notes
- Direct portfolio link included in note status emails
- Vercel-ready deployment setup

## Tech Stack

- React
- Vite
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- EmailJS
- React Router
- Framer Motion

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

On Windows PowerShell, if `npm` is blocked by execution policy, use:

```bash
npm.cmd run dev
npm.cmd run build
```

## Environment Variables

Create a `.env.local` file in the project root. All frontend environment variables must start with `VITE_`.

```env
VITE_FIREBASE_API
VITE_FIREBASE_AUTH_DOMAIN 
VITE_FIREBASE_PROJECT_ID 
VITE_FIREBASE_STORAGE_BUCKET 
VITE_FIREBASE_MESSAGING_SENDER_ 
VITE_FIREBASE_APP
VITE_FIREBASE_MEASUREMENT 

```

After changing `.env.local`, restart the Vite dev server.

## Firebase Setup

1. Create a Firebase project.
2. Enable Firebase Authentication.
3. Add an admin user in Firebase Authentication.
4. Create a Firestore database.
5. Add the Firebase web app config values to `.env.local`.

The app uses these Firestore collections:

- `profile`
- `skills`
- `projects`
- `certificates`
- `resources`
- `userNotes`
- `messages`
- `feedback`
- `noteMetrics`

## EmailJS Setup

The admin dashboard sends an email when a submitted note is approved, rejected, or deleted.

Configure these template variables in EmailJS:

```text
to_name
to_email
from_name
note_title
note_subject
note_status
custom_reply
portfolio_link
subject
message
```

The app also appends the portfolio notes link inside the `message` value. If approval is done from localhost, the email link will point to localhost. If approval is done from the live Vercel admin page, the email link will point to the live site.

## Admin Dashboard

Open the admin dashboard at:

```text
/admin
```

Login with the Firebase Authentication admin account. From the dashboard, you can manage:

- Profile content
- Skills
- Projects
- Certificates
- Notes and resources
- User-submitted notes
- Contact messages
- Feedback and ratings

## Deployment on Vercel

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add all `VITE_` environment variables in:

```text
Project Settings -> Environment Variables
```

4. Select the correct environment, usually `Production`.
5. Redeploy the project after adding or changing environment variables.

## Project Structure

```text
src/
  App.jsx        Main application, pages, admin dashboard, and UI logic
  App.css        Main styling
  firebase.js    Firebase initialization
  index.css      Global styles
```

## Scripts

```bash
npm run dev      # Start local development server
npm run build    # Build production files
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

