# Project Overview — DevFlow (Developer Project Coordination & Delivery Management System)

## About the Project

DevFlow is a web-based project coordination and delivery management platform designed specifically for software development teams. The platform helps teams organize software projects by dividing them into modular components, assigning clear ownership, tracking progress percentages, monitoring deadlines, and providing real-time visibility into project completion status.

The primary goal of DevFlow is to eliminate responsibility confusion, reduce development delays, improve accountability, and ensure software projects are integrated smoothly and delivered on time. Unlike traditional generic task management systems, DevFlow focuses specifically on software development workflows, module ownership, and delivery risk assessment.

---

## The Problem It Solves

Software development teams frequently face execution challenges:

* **Unclear Ownership:** Multiple developers work on the same system, but responsibilities for specific modules (e.g., Authentication, Billing, reporting) overlap or are ambiguous.
* **Poor Progress Visibility:** Team leads and project managers cannot easily determine completion percentages or exact progress status, causing integration conflicts.
* **Delayed Deliveries:** Delays are often detected too late because progress is not monitored consistently against remaining time.
* **Code Integration Conflicts:** Developers work in silos without aligning their API structures, database schemas, or frontend/backend implementations, leading to massive rework.
* **Lack of Accountability:** Project leaders lack simple dashboards to see who is progressing, who is blocked, and which modules are falling behind schedule.

---

## Pages

```
/                         → Homepage (Features, workflow preview, getting started)
/login                    → Auth page (Email signup/login, Google & GitHub OAuth)
/dashboard                → Overarching workspace overview (All projects, active status, system activity)
/projects                 → Projects list page (Displaying status and overview of all projects)
/projects/new             → Project creation form
/projects/[id]            → Project dashboard (Progress indicators, team, active modules, health alerts, activity feed)
/projects/[id]/modules/new → Add a new module to a project
/projects/[id]/modules/[mid] → Module detail page (Description, owner, status, deadline, blocker logs, and technical notes)
/profile                  → Profile settings & role management (Developer, Team Lead, Project Manager)
```

---

## Navigation

Top navbar. Clean, professional, and minimal. Three main navigation links:

```
Dashboard    Projects    Profile
```

---

## Core User Flows

### 1. Registration & Authentication
* User registers or signs in using Better Auth (Email/Password, Google OAuth, or GitHub OAuth).
* New user sets their role (Developer, Team Lead, or Project Manager) in their Profile.

### 2. Project Creation & Team Setup
* A Team Lead or Project Manager creates a new project, entering the Project Name, Description, Start Date, End Date, Priority, and adding Team Members.
* The Project Dashboard is initialized, displaying 0% progress and showing all metrics on track.

### 3. Module Definition & Assignment
* The project scope is broken down into Modules (e.g., Authentication, database schema, payment integration).
* Each module is configured with: Name, Description, Assigned Developer, Progress percentage (0-100%), Status, and Deadline.
* Developers are assigned specific module ownership to enforce strict accountability.

### 4. Progress Updates & Status Control
* Assigned developers regularly update completion percentages (0-100%) and select the corresponding state:
  * `Not Started`
  * `In Progress`
  * `Review`
  * `Completed`
  * `Blocked`
* The system automatically recalculates the overall project progress based on average module progress.

### 5. Blocker Reporting
* If a developer is stuck, they update the module state to `Blocked` and submit a Blocker Report detailing what they are waiting for (e.g., "Waiting for API endpoint from Backend", "Waiting for Database migration").
* The blocker is immediately flagged red on both the Project Dashboard and the Main Dashboard to alert managers.

### 6. Technical Notes & Knowledge Base
* Each module contains a dedicated Notes & Documentation area where developers document:
  * Technical Notes: Database tables affected, API endpoints, business logic rules.
  * Implementation Notes: Setup steps or design decisions.
* This acts as a localized knowledge base, preventing integration friction.

### 7. Real-Time Activity Feed
* Any status updates, progress increments, module creations, or blocker reports automatically publish to the project's real-time Activity Feed (e.g., "Abraham updated Clients Module progress to 75%").

### 8. Project Health Monitoring (Schedule Performance)
* The system continuously monitors progress relative to elapsed time:
  * If $\text{Time Used} > \text{Progress} + 20\%$ (e.g. 70% of time used, but project progress is only 30%), the project status transitions to 🔴 High Risk.
  * System alerts the team immediately on the dashboard.

---

## Features In Scope

* **Better Auth:** Secure login, signup, logout, and Google/GitHub OAuth integrations.
* **Role-Based Access Control (RBAC):** Developer, Team Lead, and Project Manager roles with appropriate action permissions.
* **Project Dashboard:** Overview of active projects, overall completion rates, team lists, deadlines, and risk badges.
* **Module Management:** Creation, updating, and developer assignment for module-level tracking.
* **Module Progress States:** Clear states (`Not Started`, `In Progress`, `Review`, `Completed`, `Blocked`).
* **Deadline Management Indicators:** Real-time evaluation of deadlines (🟢 `On Track`, 🟡 `Due Soon` - within 3 days, 🔴 `Overdue`).
* **Blocker Logging:** Reporting mechanism for blockers that updates the status in real time.
* **Activity Log:** Event logging database table that records all major updates and shows them on a live activity feed.
* **Technical Notes Section:** Markdown/rich text areas for API endpoints, database schemas, and logic logs inside each module.
* **Project Health Algorithm:** Automated formula assessing if a project is 🟢 `On Track`, 🟡 `At Risk`, or 🔴 `High Risk`.

---

## Features Out of Scope

* **GitHub Integration:** Syncing git commits, branches, or Pull Requests directly to modules.
* **Team Performance Reports:** Complex analytical PDF exports or performance reviews.
* **Notification System:** Sending external email, Slack, or SMS push notifications when deadlines are missed or blockers are logged.
* **Calendar & Gantt View:** Visual timelines and calendar schedule dragging.
* **Sprint Management:** Complete Agile sprint boards, story points, and backlog management.
* **AI Requirements Analyzer:** Auto-generating project modules from uploaded text documents.
* **AI Risk Prediction:** Predictive delays modeled on team velocity.
* **Payment/Subscription System:** Single-tenant team space, no multi-tier SaaS billing components.

---

## Success Criteria

* A user can log in, create a project, define 3 modules, and assign them to team members in under 3 minutes.
* Progress updates dynamically recalculate parent project metrics correctly.
* The Project Health algorithm correctly marks slow-moving projects as `High Risk` in real time.
* Blocker alerts are prominent and instantly visible to Team Leads on the main dashboard.
* Technical documentation inside modules is readable and acts as a central workspace reference.
* The real-time activity feed displays all updates in chronological order.
* Next.js pages load in under 2 seconds.
* Responsive layouts support both desktop and tablet screens cleanly.
