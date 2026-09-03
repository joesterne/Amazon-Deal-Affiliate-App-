# Affiliate Price Drop Scanner

A full-stack application that scans Amazon for price drops and clearance deals in specific categories, built with React, Node.js/Express, and the Gemini API.

## Features

* **AI-Powered Scanning**: Uses the Gemini API with Google Search Grounding to find live deals on Amazon.
* **Smart Categorization**: Automatically categorizes products by department and generates concise descriptions.
* **Custom Thresholds**: Set a minimum discount percentage to ensure you only find the best deals.
* **Target Price Alerts**: Set custom price drop alerts for specific products and receive notifications.
* **Price Trend Analysis**: View simulated 30-day historical price fluctuations for discovered deals using interactive charts.
* **Affiliate Integration**: Automatically appends your Amazon Affiliate tag to the generated product links.
* **Google Workspace Sync**: 
    * Exports scanned deals directly to a new **Google Sheet**.
    * Creates a reminder in **Google Tasks** to review deals and schedule your blog posts or social media content.
* **Professional Design**: Features a sleek, responsive dashboard built with Tailwind CSS.

## Getting Started

### Prerequisites

You will need a Gemini API key to run the AI scanner.

1. Copy `.env.example` to `.env`.
2. Add your Gemini API key:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   ```

### Running the App

Install the project dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## Tech Stack

* **Frontend**: React, Vite, Tailwind CSS, Lucide React, Recharts
* **Backend**: Node.js, Express
* **AI Engine**: Google Gemini API (gemini-3.5-flash with Search Grounding)
* **Auth & Integrations**: Firebase Authentication, Google Workspace APIs (Sheets & Tasks)
