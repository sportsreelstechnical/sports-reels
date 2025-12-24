# Design Guidelines: Player Compliance & Visa Eligibility Platform

## Design Approach: Material Design System

**Rationale:** This enterprise compliance platform requires information-dense layouts, clear data hierarchy, and professional credibility. Material Design provides robust patterns for dashboards, data tables, forms, and status indicators essential for legal/immigration documentation.

## Core Design Principles

1. **Data Clarity First:** All compliance scores, player statistics, and eligibility metrics must be immediately scannable
2. **Trust & Professionalism:** Clean, authoritative design befitting legal documentation and embassy verification
3. **Role-Based Clarity:** Visual differentiation between Sporting Director, Legal, Scout, and Coach views
4. **Status-Driven Design:** Color-coded system (Green/Yellow/Red) as primary visual language

---

## Typography System

**Primary Font:** Roboto (via Google Fonts CDN)
**Secondary Font:** Roboto Condensed (for data tables/compact areas)

**Hierarchy:**
- Page Titles: text-3xl font-medium (Sporting Director Dashboard, Player Profile)
- Section Headers: text-xl font-medium (Visa Eligibility Score, Performance Data)
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Data Labels: text-sm font-medium uppercase tracking-wide text-gray-600
- Data Values: text-lg font-semibold
- Table Headers: text-xs font-bold uppercase tracking-wider
- Table Cells: text-sm font-normal
- Meta Information: text-xs text-gray-500

---

## Layout System

**Spacing Units:** Consistent use of Tailwind units: **2, 4, 6, 8, 12, 16**
- Component padding: p-4, p-6, p-8
- Section margins: mb-6, mb-8, mb-12
- Grid gaps: gap-4, gap-6
- Card spacing: p-6

**Container Strategy:**
- Dashboard Shell: Full viewport with fixed sidebar (w-64) + main content area
- Content Max-Width: max-w-7xl mx-auto px-6
- Card Containers: Contained width with consistent padding
- Data Tables: Full-width within content area, horizontally scrollable on mobile

**Grid Patterns:**
- Player Cards Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Dashboard Stats: grid-cols-2 md:grid-cols-4 gap-4
- Form Layouts: grid-cols-1 md:grid-cols-2 gap-6
- Video Gallery: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

---

## Component Library

### Navigation & Shell
- **Sidebar Navigation:** Fixed left sidebar (w-64) with role-based menu items, user profile at top, nested sub-navigation for complex sections
- **Top Bar:** Contains breadcrumbs, global search, notification bell (embassy alerts), user dropdown
- **Tab Navigation:** For multi-view sections (Player Overview, Performance Data, Videos, Compliance Reports)

### Data Display
- **Stat Cards:** Elevated cards with large numeric values, labels, trend indicators (↑↓)
- **Data Tables:** Sortable columns, row hover states, action buttons in rightmost column, sticky headers for long tables
- **Status Badges:** Rounded-full px-3 py-1 text-xs font-semibold (Green: bg-green-100 text-green-800, Yellow: bg-yellow-100 text-yellow-800, Red: bg-red-100 text-red-800)
- **Progress Indicators:** Linear bars for visa eligibility scores with color zones
- **Timeline:** Vertical timeline for player history, international caps, transfer events

### Forms & Input
- **Form Fields:** Material-style with floating labels, border-b-2 underline style, focus states with color shift
- **File Upload Zones:** Dashed border areas for video uploads, drag-and-drop visual feedback
- **Multi-Select:** Checkbox groups for team sheets, data partner selection
- **Date Pickers:** Calendar overlay for match dates, report date ranges
- **Search Filters:** Collapsible filter panel with checkboxes, range sliders

### Player Management
- **Player Profile Header:** Large card with player photo (left), name/position/nationality, eligibility score badge (prominent), quick actions (Generate Report, Share)
- **Performance Dashboard:** Grid of metric cards (Minutes Played, National Caps, Continental Games, GPS Data Points)
- **Eligibility Scorecard:** Visual breakdown showing Schengen/UK GBE/US P-1/O-1 scores with explanatory tooltips

### Scouting Dashboard
- **Player Comparison Table:** Side-by-side view of multiple players with inline eligibility indicators
- **Due Diligence Checklist:** Interactive checklist with completion percentage
- **Club Connection Interface:** Chat-style messaging panel for club-to-club discussions

### Video Management
- **Video Grid:** Thumbnail previews with play overlay, match date, team sheet badge
- **Video Player Modal:** Full-screen overlay with match metadata sidebar, annotation tools
- **Integration Status:** Connected data partner badges (Wyscout, Transfermarkt, Veo)

### Report Generation
- **Report Builder:** Step-by-step wizard (Select Player → Choose Data Range → Configure Sections → Generate)
- **Report Preview:** PDF-style preview with print layout
- **Timestamp Display:** Clear timestamp with timezone on all generated reports

### Embassy Verification
- **Notification Center:** List view of pending verifications with priority flags
- **Verification Detail:** Full consular summary view with approval/rejection workflow
- **Audit Trail:** Timestamped log of all embassy interactions

### Role-Based Access
- **Permission Toggles:** Visual toggles for sharing data with Legal/Scout/Coach roles
- **Access History:** Table showing who accessed player data and when

---

## Interactions & Micro-animations

**Minimal Animation Policy:**
- Card hover: subtle elevation increase (shadow transition)
- Button clicks: slight scale feedback (scale-95 on active)
- Notification badge: gentle pulse on new embassy alerts
- Loading states: spinner for data fetches, skeleton screens for tables
- NO scroll animations, NO page transitions, NO decorative motion

---

## Visual Hierarchy Patterns

1. **Primary Actions:** Solid buttons (Generate Report, Upload Video, Share Profile)
2. **Secondary Actions:** Outlined buttons (Cancel, View Details)
3. **Tertiary Actions:** Text links with underline on hover
4. **Destructive Actions:** Red outlined buttons (Delete, Revoke Access)

**Information Density:**
- Dashboard view: High density with multiple cards/stats visible
- Player profile: Medium density with breathing room around key data
- Forms: Lower density with clear field spacing

---

## Accessibility Standards

- WCAG AA contrast ratios for all text and status indicators
- Keyboard navigation for all interactive elements
- Focus visible states (ring-2 ring-blue-500)
- Screen reader labels for all icon-only buttons
- Form validation with clear error messages below fields

---

## Icons

**Library:** Material Icons (via Google Fonts CDN)
**Usage:**
- Navigation items: Paired with text labels
- Status indicators: Checkmark (approved), warning triangle (yellow), X (red)
- Actions: Upload, download, share, edit, delete icons
- Data types: Trophy (caps), clock (minutes), medical cross, GPS marker

---

## Special Considerations

**Color-Coded Compliance System:**
- Use green/yellow/red consistently across all compliance indicators
- Never rely on color alone - pair with text labels and icons
- Provide tooltips explaining score thresholds

**Multi-Language Support:**
- Design with expandable text containers (player names, club names vary widely)
- Date formats should accommodate different regional standards

**Data Privacy:**
- Visual indicators when viewing sensitive medical/biometric data
- Watermarks on generated consular reports with "CONFIDENTIAL" badge