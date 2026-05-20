# Brochure

## Overview

Welcome to Brochure, a modern web application that transforms public websites into clean, printable brochures.

Brochure is built for fast content repurposing. Paste a website URL, generate a polished brochure preview, switch between output styles, and print or save the result as a PDF. Whether you want a quick one-page flyer or a smarter AI-assisted brochure, the app keeps the process simple and efficient.

## Features of Brochure

- Website to Brochure Conversion: Turn any public web page into a structured brochure in seconds.
- Fast Flyer Mode: Generate a clean single-page brochure layout directly from extracted page content.
- Smart Brochure Mode: Create a richer brochure using AI-assisted content selection and expanded page context.
- Optional AI Copy Refinement: Improve brochure messaging with Gemini-powered content enhancement.
- Live Brochure Preview: Review generated output instantly before printing or saving.
- Markdown Brochure Support: View smart brochure output in markdown format when available.
- Print-Ready Output: Print directly from the browser or export the brochure as a PDF.
- Saved Brochure Shelf: Store generated brochures locally for quick access later.
- Responsive Interface: Use the app comfortably across desktop and mobile screen sizes.
- Fetch Fallback Support: Handle websites that block direct requests with a text-based fallback flow.

## Tech Stack

Brochure uses modern web technologies for a fast and reliable experience:

- Frontend: Next.js 16, React 19
- Styling: Tailwind CSS 4
- Language: TypeScript
- AI Integration: Google Gemini API
- Content Parsing: Cheerio
- Validation: Zod
- Linting: ESLint

## Getting Started

To get started with Brochure, follow these simple steps:

### Clone the Repository

```bash
git clone <your-repository-url>
cd brochure-main
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

AI-powered brochure generation is optional. To enable it, create a `.env.local` file in the project root and add one of the following:

```env
GEMINI_API_KEY=your_api_key_here
```

You can also use:

```env
GOOGLE_API_KEY=your_api_key_here
```

or:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### Run the Application

Start the development server:

```bash
npm run dev
```

### Open in Your Browser

Visit:

```bash
http://localhost:3000
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the app for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint checks

## How It Works

1. Enter a public website URL.
2. Choose between flyer mode and smart brochure mode.
3. Optionally enable AI-powered refinement.
4. Preview the generated brochure.
5. Print it or save it as a PDF.

## Contact

For any inquiries or support, feel free to reach out at:

`sunayrevad2005@gmail.com`

Brochure makes it easy to turn website content into polished, presentation-ready brochures with minimal effort.
