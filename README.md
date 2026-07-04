# Task Manager API

A full-featured RESTful task management backend built with Node.js, Express, and MongoDB.

---

## Features

- **Auth** — Register, login, logout, refresh tokens, email verification, password reset/change
- **Users** — Profile management, avatar upload (Cloudinary), user search, account deletion
- **Workspaces** — Create/manage workspaces, invite/remove members, role management, invite codes
- **Projects** — Full CRUD with workspace-scoped permissions
- **Tasks** — Create/update/delete tasks with status, priority, due dates, and assignees
- **Comments** — Threaded comments on tasks
- **Dashboard** — Aggregated stats: workspaces, projects, tasks, overdue, upcoming deadlines, recent activity
- **Activity Logs** — Audit trail for all workspace events

---

## Tech Stack

| Package | Purpose |
|---|---|
| Express | HTTP framework |
| Mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | Access & refresh tokens |
| Zod | Request validation |
| Cloudinary + Multer | Avatar uploads |
| Nodemailer | Email (verification, password reset) |
| Helmet | Security headers |
| CORS | Cross-origin support |
| express-rate-limit | Rate limiting |
| Morgan | HTTP logging |

---

## Getting Started

### 1. Clone & Install

```bash
git clone <repo>
cd task-manager
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in your values in `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/task-manager
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@taskmanager.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_URL=http://localhost:3000
```

### 3. Run

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require:
```
Authorization: Bearer <accessToken>
```

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login |
| POST | `/auth/logout` | ✅ | Logout (revoke refresh token) |
| POST | `/auth/refresh-token` | ❌ | Get new access token |
| POST | `/auth/forgot-password` | ❌ | Send reset email |
| POST | `/auth/reset-password` | ❌ | Reset password with token |
| POST | `/auth/change-password` | ✅ | Change password |
| POST | `/auth/verify-email` | ❌ | Verify email address |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | ✅ | Get own profile |
| PATCH | `/users/me` | ✅ | Update profile |
| DELETE | `/users/me` | ✅ | Delete account |
| POST | `/users/me/avatar` | ✅ | Upload profile picture (multipart) |
| GET | `/users/search?q=` | ✅ | Search users |

### Workspaces

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/workspaces` | ✅ | Get my workspaces |
| POST | `/workspaces` | ✅ | Create workspace |
| GET | `/workspaces/:id` | ✅ | Get workspace |
| PATCH | `/workspaces/:id` | ✅ | Update workspace (OWNER/ADMIN) |
| DELETE | `/workspaces/:id` | ✅ | Delete workspace (OWNER) |
| POST | `/workspaces/join` | ✅ | Join via invite code |
| POST | `/workspaces/:id/leave` | ✅ | Leave workspace |
| POST | `/workspaces/:id/invite` | ✅ | Invite member (OWNER/ADMIN) |
| GET | `/workspaces/:id/members` | ✅ | List members |
| DELETE | `/workspaces/:id/members/:memberId` | ✅ | Remove member |
| PATCH | `/workspaces/:id/members/:memberId/role` | ✅ | Update member role (OWNER) |
| GET | `/workspaces/:id/activity-logs` | ✅ | Get activity log |

### Projects

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/workspaces/:id/projects` | ✅ | List projects |
| POST | `/workspaces/:id/projects` | ✅ | Create project |
| GET | `/projects/:projectId` | ✅ | Get project |
| PATCH | `/projects/:projectId` | ✅ | Update project (OWNER/ADMIN) |
| DELETE | `/projects/:projectId` | ✅ | Delete project (OWNER/ADMIN) |

### Tasks

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/projects/:projectId/tasks` | ✅ | List tasks (filterable) |
| POST | `/projects/:projectId/tasks` | ✅ | Create task |
| GET | `/tasks/:taskId` | ✅ | Get task |
| PATCH | `/tasks/:taskId` | ✅ | Update task |
| DELETE | `/tasks/:taskId` | ✅ | Delete task |

**Task filters** (query params): `status`, `priority`, `assigneeId`, `page`, `limit`

### Comments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/tasks/:taskId/comments` | ✅ | List comments |
| POST | `/tasks/:taskId/comments` | ✅ | Add comment |
| PATCH | `/comments/:commentId` | ✅ | Edit comment (author only) |
| DELETE | `/comments/:commentId` | ✅ | Delete comment (author or OWNER/ADMIN) |

### Dashboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | ✅ | Get dashboard stats |

---

## Data Models

### Roles & Permissions

| Action | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| Invite members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ |
| Update workspace | ✅ | ✅ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ✅ |
| Delete projects | ✅ | ✅ | ❌ |
| Create/edit tasks | ✅ | ✅ | ✅ |
| Delete any task | ✅ | ✅ | ❌ |
| Delete own task | ✅ | ✅ | ✅ |
| Change member roles | ✅ | ❌ | ❌ |

### Task Statuses
`TODO` → `IN_PROGRESS` → `REVIEW` → `DONE`

### Task Priorities
`LOW` | `MEDIUM` | `HIGH` | `URGENT`

---

## Project Structure

```
task-manager/
├── server.js              # Entry point
├── app.js                 # Express app, middleware, routes
├── config/
│   ├── db.js              # MongoDB connection
│   └── cloudinary.js      # Cloudinary config
├── models/
│   ├── User.js
│   ├── RefreshToken.js
│   ├── Workspace.js
│   ├── WorkspaceMember.js
│   ├── Project.js
│   ├── Task.js
│   ├── Comment.js
│   ├── Tag.js
│   └── ActivityLog.js
├── controllers/
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── workspace.controller.js
│   ├── project.controller.js
│   ├── task.controller.js
│   ├── comment.controller.js
│   └── dashboard.controller.js
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── workspace.routes.js
│   ├── project.routes.js
│   ├── projectStandalone.routes.js
│   ├── task.routes.js
│   ├── comment.routes.js
│   └── dashboard.routes.js
├── middleware/
│   ├── auth.js            # JWT authentication
│   └── errorHandler.js    # Global error handler
├── validators/
│   ├── auth.validators.js
│   ├── workspace.validators.js
│   └── project.validators.js
├── utils/
│   ├── jwt.js             # Token generation/verification
│   ├── email.js           # Nodemailer helpers
│   ├── response.js        # Standardized API responses
│   ├── activityLogger.js  # Activity log helper
│   └── upload.js          # Multer config
├── .env.example
└── package.json
```

---

## Response Format

All responses follow this shape:

```json
{
  "success": true,
  "message": "Success",
  "data": { ... }
}
```

Errors:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```
