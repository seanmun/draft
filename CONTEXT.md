# CONTEXT.md - Draft Day Trades Project

## Project Overview
Draft Day Trades is a web application for creating and participating in sports draft confidence pools. Users can create leagues for various sports drafts (NFL, NBA, etc.), predict draft picks, assign confidence points to those picks, and compete with friends.

## Current Status
- The application is deployed and live at draftdaytrades.com
- Google Authentication is working
- League creation and joining functionality is implemented
- Player database with CSV import is complete
- Draft prediction interface with confidence points is implemented

## Tech Stack
- **Frontend**: React 19, Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore)
- **Deployment**: Vercel
- **Source Control**: GitHub

## Project Structure
- `/src/app/` - Next.js App Router pages
- `/src/components/` - Reusable React components
- `/src/lib/` - Utilities and Firebase configuration
- `/src/hooks/` - Custom React hooks

## Key Features Implemented
1. **Authentication**: Google sign-in via Firebase
2. **League Management**: Create/join leagues, manage memberships
3. **Player Database**: CSV import for draft-eligible players
4. **Draft Predictions**: Interface for selecting players and assigning confidence points
5. **Mobile Responsive Design**: Works on all screen sizes

## Next Features to Implement
1. **Leaderboard**: Real-time standings during draft night
2. **Oracle Interface**: Admin tools for inputting actual draft picks
3. **Notification System**: Email alerts for league invites and results

## Current Implementation Details

### Authentication
- Using Firebase Authentication with Google provider
- Protected routes redirect to login
- User profile information stored in Firestore

### League Management
- Leagues stored in Firestore
- League schema includes name, description, sport type, draft year, members
- League joining via invite codes

### Player Database
- Players imported via CSV upload
- Admin interface for managing player data
- Players associated with specific sports and draft years

### Prediction Interface
- Allows users to select players for each draft position
- Confidence points range from 1 to the total number of picks
- Mobile-responsive design with pick/team/player/points columns

## Technical Challenges
- Resolved React 19 compatibility issues with react-query
- Fixed deployment issues with ESLint by disabling checks during build
- Implemented workaround for CORS issues with external data fetching

## Important Notes
- Admin user ID: gT2kV06j0udPRzdPBd0jt82ufNk2
- Mock team data currently used for draft positions
- Future authentication methods may include email/password and Web3 wallets