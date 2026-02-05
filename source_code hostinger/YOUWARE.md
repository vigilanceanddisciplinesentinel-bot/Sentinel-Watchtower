# SENTINEL WATCHTOWER - Digital Infraction Tracking System

## Project Overview
Sentinel Watchtower is a secure, school-wide digital infraction tracking system designed for shared hosting environments (specifically Hostinger).

## Deployment Architecture (AUTHORITATIVE)
- **Target Environment**: Shared Hosting (Hostinger)
- **Backend**: Pure PHP (No frameworks, no Composer)
- **Database**: MySQL (Import via `database.sql`)
- **Frontend**: Plain HTML, CSS, Vanilla JavaScript (No build tools)
- **File Structure**: `public_html/` is the root.

## File Structure
```
public_html/
 ├─ index.html          # SPA Entry Point
 ├─ assets/
 │   ├─ css/style.css   # Global Styles
 │   ├─ js/app.js       # Frontend Logic (SPA)
 │   └─ images/
 ├─ api/                # PHP API Endpoints
 │   ├─ login.php
 │   ├─ issue_infraction.php
 │   ├─ respond.php
 │   └─ admin.php
 ├─ config/
 │   └─ db.php          # Database Connection
 └─ database.sql        # Full Schema Import
```

## Installation Instructions
1. **Database Setup**:
   - Create a MySQL database on Hostinger.
   - Import `public_html/database.sql` using phpMyAdmin.
   - Update `public_html/config/db.php` with your database credentials.

2. **File Upload**:
   - Upload the contents of `public_html/` directly to your server's `public_html` folder.

3. **Access**:
   - Navigate to your domain. The system should be live immediately.

## Roles & Permissions
- **Student**: View own infractions, submit responses.
- **Teacher/Adviser/Prefect**: Issue infractions.
- **Developer/Admin**: View all infractions, system stats.

## Development Rules
- **NO** Node.js, NPM, or Build Steps.
- **NO** External dependencies (unless CDN).
- **NO** Frameworks (Laravel, React, Vue, etc.).
- Keep logic simple and optimized for shared hosting resources.
