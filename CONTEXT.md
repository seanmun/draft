# CONTEXT.md - Draft Day Trades Project

## Project Overview
Draft Day Trades is a web application for creating and participating in sports draft confidence pools. Users can create leagues for various sports drafts (NFL, NBA, etc.), predict draft picks, assign confidence points to those picks, and compete with friends.

## Current Status
- The application is deployed and live at draftdaytrades.com
- Google Authentication is working
- League creation and joining functionality is implemented and fixed
- Player database with CSV import is complete
- Draft prediction interface with confidence points is implemented
- Mock draft tracking with expert accuracy scoring is live
- Individual expert mock draft pages with pick-by-pick analysis
- Real-time leaderboards during draft night

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
1. **Authentication**: Google sign-in and passwordless email via Firebase
2. **League Management**: Create/join leagues, manage memberships (FIXED league joining issues)
3. **Player Database**: CSV import for draft-eligible players
4. **Draft Predictions**: Interface for selecting players and assigning confidence points
5. **Mock Draft System**: Expert mock draft tracking with real-time accuracy scoring
6. **Individual Expert Pages**: Detailed mock draft analysis with pick-by-pick accuracy
7. **Real-time Leaderboards**: Live standings during draft night with winner showcases
8. **Oracle Interface**: Admin tools for inputting actual draft picks
9. **Mobile Responsive Design**: Works on all screen sizes
10. **SEO Optimization**: Structured data, meta tags, and expert-specific URLs

## Recently Completed Features
1. **Mock Draft Accuracy System**: 
   - Real-time scoring using confidence point system
   - Expert rankings and performance tracking
   - Realistic grading scale (30% = Pretty Good, 50% = Great, 70% = God Mode)

2. **Individual Expert Mock Draft Pages**:
   - URL structure: `/mock-drafts/[sport]/[year]/[expertSlug]`
   - Pick-by-pick analysis with correct/incorrect indicators
   - Detailed accuracy breakdowns and grading
   - SEO-optimized for expert name searches

3. **Fixed League Joining Issues**:
   - Resolved Firestore security rule conflicts
   - Fixed invite URL flow and authentication persistence
   - Updated league joining logic to work with new security rules

4. **Enhanced Mock Drafts Hub**:
   - Ranked row layout showing expert performance
   - Sort by accuracy or date functionality
   - Color-coded accuracy badges
   - Links to individual expert analysis pages

## Next Features to Implement
1. **Notification System**: Email alerts for league invites and results
2. **Expert Profile Pages**: Show all mock drafts by a specific expert across years
3. **Mock Draft Comparison Pages**: Head-to-head expert comparisons
4. **Enhanced SEO Pages**: Sport/year hub pages, player profile pages

## Current Implementation Details

### Authentication
- Using Firebase Authentication with Google provider and passwordless email
- Protected routes redirect to login
- User profile information stored in Firestore
- Session management for invite links during auth flow

### League Management
- Leagues stored in Firestore with proper security rules
- League schema includes name, description, sport type, draft year, members
- League joining via invite codes with proper URL structure
- Fixed: arrayUnion security rule issues resolved

### Player Database
- Players imported via CSV upload
- Admin interface for managing player data
- Players associated with specific sports and draft years

### Mock Draft System
- Mock drafts stored with sportscaster, version, picks array
- Real-time accuracy calculation against actual draft results
- Expert ranking system with realistic grading scale
- Individual pages for each expert's mock draft

### Oracle Interface
- Admin-only interface for inputting actual draft picks
- Real-time draft status controls (Live/Hidden, Completed/In Progress)
- Draft results stored in global draftResults collection
- Used for calculating mock draft accuracy and league leaderboards

### Prediction Interface
- Allows users to select players for each draft position
- Confidence points range from 1 to the total number of picks
- Mobile-responsive design with pick/team/player/points columns

### Leaderboard System
- Real-time standings during draft night
- Winner showcases when draft is completed
- Payment information display for league winners
- Admin notes for winner instructions

## Technical Challenges Resolved
- Fixed React 19 compatibility issues with react-query
- Fixed deployment issues with ESLint by disabling checks during build
- Resolved Firestore security rules for league joining
- Fixed TypeScript spread operator issues with Firestore data
- Implemented proper error handling for mock draft accuracy calculations

## SEO Implementation
- Individual expert pages with structured data
- Meta tags optimized for expert name searches
- Breadcrumb navigation and internal linking
- FAQ schemas for enhanced search results
- TrackableLinks for analytics and internal link tracking

## Important Notes
- Admin user ID: gT2kV06j0udPRzdPBd0jt82ufNk2
- Mock team data currently used for draft positions
- Expert URLs use slugified names (e.g., "Daniel Jeremiah" → "daniel-jeremiah")
- Grading scale: 30%+ = Pretty Good, 50%+ = Great, 70%+ = God Mode
- Future authentication methods may include Web3 wallets

## URL Structure
- `/mock-drafts` - Main hub with expert rankings
- `/mock-drafts/[sport]/[year]/[expertSlug]` - Individual expert analysis
- `/leagues/[leagueId]` - League overview and predictions
- `/leagues/[leagueId]/leaderboard` - Real-time standings
- `/manage-draft` - Admin oracle interface (admin only)
- `/manage-mock-drafts` - Admin mock draft import (admin only)