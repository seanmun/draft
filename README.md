# Draft Day Trades

## Overview

Draft Day Trades is a web application for creating and participating in sports draft confidence pools. Users can create leagues for various sports drafts (NFL, NBA, etc.), predict the players that will be selected, assign confidence points to their picks, and compete with friends.

The application features real-time scoring during draft night, with league commissioners acting as "oracles" to input the actual picks as they happen.

## Features

- **Google Authentication**: Simple and secure login via Google accounts
- **League Management**: Create and join leagues for different sports drafts
- **Multi-Sport Support**: NFL, NBA, WNBA, NHL, and MLB draft support
- **Player Database**: Import players via CSV for different sports and draft years
- **Confidence Pool System**: Assign confidence points (1-32) to your draft predictions
- **Real-Time Updates**: Live leaderboard updates as draft picks come in
- **Mobile Responsive**: Fully responsive design for all device sizes

## Tech Stack

### Frontend
- **React.js** - UI library for building interactive components
- **Next.js 15** - React framework for server-rendered applications
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **TypeScript** - Type-safe JavaScript for improved development experience

### Backend
- **Firebase Authentication** - User management and Google sign-in
- **Firebase Firestore** - NoSQL database for storing leagues, players, and predictions
- **Next.js API Routes** - Serverless functions for backend operations

### Deployment
- **Vercel** - Hosting platform for Next.js applications
- **GitHub** - Source code management

## Project Structure
draft/
├── src/                  # Source files
│   ├── app/              # Next.js App Router pages
│   │   ├── leagues/      # League-related pages
│   │   ├── import-players/ # Player import page
│   │   └── manage-players/ # Player management page
│   ├── components/       # Reusable UI components
│   │   ├── auth/         # Authentication components
│   │   ├── layout/       # Layout components
│   │   └── leagues/      # League-related components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utility functions and Firebase config
└── public/               # Static assets

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase account

### Installation

1. Clone the repository
git clone https://github.com/yourusername/draft-day-trades.git
cd draft-day-trades

2. Install dependencies
npm install

3. Create a `.env.local` file with your Firebase credentials
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

4. Run the development server
npm run dev

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

The application is deployed on Vercel and can be accessed at [draftdaytrades.com](https://draftdaytrades.com).

## License

[MIT](LICENSE)

## Future Enhancements

- Email notifications for league invites and results
- Web3 wallet integration for authentication
- Historical draft data access
- Advanced statistics and analytics
- Mock draft simulation tools