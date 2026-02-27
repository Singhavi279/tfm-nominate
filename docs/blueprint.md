# **App Name**: Apex Nominations

## Core Features:

- User Authentication: Secure sign-up and sign-in via Google or Email/Password, facilitating access control to the nomination portal.
- Dynamic Form Rendering: Generates interactive nomination forms on-the-fly based on unique JSON configuration schemas retrieved from Firestore.
- Auto-Save Drafts: Automatically and periodically persists partial application data to Firestore, with debouncing to minimize database writes, enabling users to seamlessly resume applications.
- Category & Segment Selection: Allows users to browse and select specific award categories and segments, directing them to the appropriate dynamic nomination form.
- Secure Document Upload: Enables the secure upload of PDF files (maximum 10MB per file) to Cloud Storage, incorporating client-side format and size validation for an efficient user experience.
- Final Submission Processing: Gathers all submitted form data and references to uploaded PDF files, compiling them into a single, immutable submission record within Firestore, and clearing the draft.
- Form Configuration Uploader (Admin Tool): An administrative tool that uses reasoning to upload and manage JSON configuration files for new award categories into Firestore, automatically enabling new forms on the portal.

## Style Guidelines:

- Primary color: A rich, deep blue (#2673D9) that conveys trust, professionalism, and reliability. This provides strong contrast on light backgrounds.
- Background color: A very light, subtle blue-grey (#ECF0F4) offering a clean, expansive canvas that enhances readability of forms and text.
- Accent color: A bright, calming cyan (#89D2E6) to highlight interactive elements, calls to action, and important status indicators, providing a fresh and modern visual break.
- Headline font: 'Space Grotesk' (sans-serif) for a modern, structured, and technically inclined aesthetic in titles and key headings. Body font: 'Inter' (sans-serif) for excellent legibility and a neutral, objective feel within form fields and descriptive content.
- Utilize a consistent suite of clean, minimalist line icons to represent core actions like save, upload, submit, and navigation elements, ensuring clarity and intuitiveness across the portal.
- A responsive and adaptable layout, featuring a multi-column structure for desktop users to optimize content density, and transitioning to a streamlined single-column stacked presentation on mobile for accessibility and ease of use. Generous white space and clear visual segmentation will define distinct form sections.
- Implement subtle and rapid transition animations for form section navigation, status confirmations (e.g., auto-save complete), and interactive component feedback. These animations will be designed to enhance the user experience without causing distraction or delays.