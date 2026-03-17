# CHANGELOG

## [2026-03-11] - Initial commit - PRANITRA ERP Tool v1.0
- Description: Initial commit - PRANITRA ERP Tool v1.0
- Lines Added: 0
- Lines Deleted: 0
- Lines Modified: 0
- Files Changed: (initial commit)

## [2026-03-12] - Disable OTP - will re-enable after email setup
- Description: Disable OTP - will re-enable after email setup
- Lines Added: 0
- Lines Deleted: 111
- Lines Modified: 81
- Files Changed: backend/src/controllers/authController.js

## [2026-03-12] - Fix login flow - handle OTP disabled mode
- Description: Fix login flow - handle OTP disabled mode
- Lines Added: 17
- Lines Deleted: 0
- Lines Modified: 13
- Files Changed: frontend/src/store/authStore.js

## [2026-03-12] - Fix login - skip OTP when disabled
- Description: Fix login - skip OTP when disabled
- Lines Added: 4
- Lines Deleted: 0
- Lines Modified: 4
- Files Changed: frontend/src/pages/LoginPage.jsx

## [2026-03-12] - Fix auth - correct token structure and revoked field
- Description: Fix auth - correct token structure and revoked field
- Lines Added: 34
- Lines Deleted: 0
- Lines Modified: 90
- Files Changed: backend/src/controllers/authController.js

## [2026-03-12] - Fix auth store - workspaces from correct response field
- Description: Fix auth store - workspaces from correct response field
- Lines Added: 0
- Lines Deleted: 1
- Lines Modified: 11
- Files Changed: frontend/src/store/authStore.js

## [2026-03-14] - LOP Tab update
- Description: LOP Tab update
- Lines Added: 28778
- Lines Deleted: 0
- Lines Modified: 19
- Files Changed: .claude/settings.local.json, USAHA_Deploy.spec, backend/package-lock.json, backend/package.json, backend/src/config/migrate.js, backend/src/config/seed.js, backend/src/controllers/holidayController.js, backend/src/controllers/lopController.js, backend/src/routes/holidays.js, backend/src/routes/lop.js, backend/src/server.js, backend/src/utils/workingDays.js, build/USAHA_Deploy/Analysis-00.toc, build/USAHA_Deploy/EXE-00.toc, build/USAHA_Deploy/PKG-00.toc, build/USAHA_Deploy/PYZ-00.pyz, build/USAHA_Deploy/PYZ-00.toc, build/USAHA_Deploy/USAHA_Deploy.pkg, build/USAHA_Deploy/base_library.zip, build/USAHA_Deploy/localpycs/pyimod01_archive.pyc, build/USAHA_Deploy/localpycs/pyimod02_importers.pyc, build/USAHA_Deploy/localpycs/pyimod03_ctypes.pyc, build/USAHA_Deploy/localpycs/pyimod04_pywin32.pyc, build/USAHA_Deploy/localpycs/struct.pyc, build/USAHA_Deploy/warn-USAHA_Deploy.txt, build/USAHA_Deploy/xref-USAHA_Deploy.html, build_exe.bat, build_exe_v2.bat, deploy.py, frontend/src/App.jsx, frontend/src/pages/AdminPage.jsx, frontend/src/pages/ProjectDetailPage.jsx, frontend/src/styles/globals.css

## [2026-03-15] - MFA updation
- Description: MFA updation
- Lines Added: 5
- Lines Deleted: 1
- Lines Modified: 28
- Files Changed: .env.example, backend/package.json, backend/src/services/emailService.js

## [2026-03-15] - MFA updation
- Description: MFA updation
- Lines Added: 1266
- Lines Deleted: 0
- Lines Modified: 11
- Files Changed: .claude/settings.local.json, backend/package-lock.json

## [2026-03-15] - Fix project detail page crash
- Description: Fix project detail page crash
- Lines Added: 2
- Lines Deleted: 0
- Lines Modified: 0
- Files Changed: frontend/src/pages/ProjectDetailPage.jsx

## [2026-03-15] - Login page redesign, user onboarding flow, navbar dropdown fix
- Description: Login page redesign, user onboarding flow, navbar dropdown fix
- Lines Added: 1343
- Lines Deleted: 4
- Lines Modified: 156
- Files Changed: .claude/settings.local.json, backend/package-lock.json, backend/package.json, backend/src/config/migrate-must-reset.js, backend/src/config/migrate-totp.js, backend/src/controllers/authController.js, backend/src/controllers/usersController.js, backend/src/routes/settings.js, backend/src/routes/totp.js, backend/src/server.js, backend/src/services/totpService.js, frontend/src/App.jsx, frontend/src/components/layout/AppShell.jsx, frontend/src/pages/AdminPage.jsx, frontend/src/pages/ForceResetPasswordPage.jsx, frontend/src/pages/LoginPage.jsx, frontend/src/pages/MfaSetupPage.jsx, frontend/src/pages/MfaVerifyPage.jsx, frontend/src/pages/OtpPage.jsx, frontend/src/store/authStore.js

## [2026-03-15] - Branding customisation, project layout fixes, workspace page cleanup
- Description: Branding customisation, project layout fixes, workspace page cleanup
- Lines Added: 73
- Lines Deleted: 0
- Lines Modified: 124
- Files Changed: backend/src/routes/settings.js, frontend/src/App.jsx, frontend/src/pages/AdminPage.jsx, frontend/src/pages/GanttPage.jsx, frontend/src/pages/LoginPage.jsx, frontend/src/pages/ProjectDetailPage.jsx, frontend/src/pages/WorkspacePage.jsx, frontend/src/styles/globals.css

## [2026-03-15] - Project initiation wizard with sections and software selection
- Description: Project initiation wizard with sections and software selection
- Lines Added: 431
- Lines Deleted: 0
- Lines Modified: 84
- Files Changed: .claude/settings.local.json, backend/src/config/migrate-milestones-commercial.js, backend/src/config/migrate-project-fields.js, backend/src/controllers/projectsController.js, frontend/src/pages/ProjectDetailPage.jsx, frontend/src/pages/ProjectsPage.jsx

## [2026-03-15] - User management enhancement with bulk upload
- Description: User management enhancement with bulk upload
- Lines Added: 437
- Lines Deleted: 0
- Lines Modified: 33
- Files Changed: backend/src/config/migrate-user-fields.js, backend/src/controllers/usersController.js, backend/src/routes/users.js, frontend/src/pages/AdminPage.jsx

## [2026-03-15] - Navbar branding, footer, admin panel restriction, remove nav duplication
- Description: Navbar branding, footer, admin panel restriction, remove nav duplication
- Lines Added: 40
- Lines Deleted: 0
- Lines Modified: 27
- Files Changed: frontend/src/App.jsx, frontend/src/components/layout/AppShell.jsx, frontend/src/pages/ForceResetPasswordPage.jsx, frontend/src/pages/MfaVerifyPage.jsx, frontend/src/pages/OtpPage.jsx, frontend/src/pages/SettingsPage.jsx, frontend/src/styles/globals.css

## [2026-03-15] - Fix Admin Panel visibility for admin and super user roles
- Description: Fix Admin Panel visibility for admin and super user roles
- Lines Added: 0
- Lines Deleted: 8
- Lines Modified: 5
- Files Changed: frontend/src/components/layout/AppShell.jsx

## [2026-03-16] - Workspace access control, super user role, user management enhancements
- Description: Workspace access control, super user role, user management enhancements
- Lines Added: 228
- Lines Deleted: 0
- Lines Modified: 119
- Files Changed: .claude/settings.local.json, backend/src/controllers/authController.js, backend/src/controllers/projectsController.js, backend/src/controllers/usersController.js, backend/src/middleware/auth.js, backend/src/routes/projects.js, backend/src/routes/totp.js, backend/src/routes/users.js, backend/src/routes/workspaces.js, frontend/src/components/layout/AppShell.jsx, frontend/src/pages/AdminPage.jsx, frontend/src/pages/LoginPage.jsx, frontend/src/pages/MfaVerifyPage.jsx, frontend/src/pages/OtpPage.jsx, frontend/src/pages/ProjectsPage.jsx, frontend/src/pages/WorkspacePage.jsx, frontend/src/store/authStore.js

## [2026-03-16] - Add lop-sections migration and fix missing tables
- Description: Add lop-sections migration and fix missing tables
- Lines Added: 80
- Lines Deleted: 0
- Lines Modified: 0
- Files Changed: backend/src/config/migrate-lop-sections.js

## [2026-03-16] - Fix auth controller - select-workspace 500 error and related bugs
- Description: Fix auth controller - select-workspace 500 error and related bugs
- Lines Added: 12
- Lines Deleted: 0
- Lines Modified: 12
- Files Changed: .claude/settings.local.json, backend/src/controllers/authController.js

## [2026-03-16] - Auto migrations on deploy, Settings panel restructure
- Description: Auto migrations on deploy, Settings panel restructure
- Lines Added: 116
- Lines Deleted: 0
- Lines Modified: 5697
- Files Changed: .claude/settings.local.json, backend/src/config/migrate-runner.js, build/USAHA_Deploy/Analysis-00.toc, build/USAHA_Deploy/EXE-00.toc, build/USAHA_Deploy/PKG-00.toc, build/USAHA_Deploy/USAHA_Deploy.pkg, build/USAHA_Deploy/base_library.zip, build/USAHA_Deploy/localpycs/pyimod02_importers.pyc, build/USAHA_Deploy/localpycs/pyimod04_pywin32.pyc, deploy.py, frontend/src/components/layout/AppShell.jsx, frontend/src/pages/AdminPage.jsx

## [2026-03-16] - Zoho HR sync, HR employees panel, file service with WEBP compression and storage dashboard
- Description: Zoho HR sync, HR employees panel, file service with WEBP compression and storage dashboard
- Lines Added: 1354
- Lines Deleted: 0
- Lines Modified: 59
- Files Changed: .claude/settings.local.json, backend/package.json, backend/src/config/migrate-file-optimisation.js, backend/src/config/migrate-runner.js, backend/src/config/migrate-zoho-sync.js, backend/src/controllers/adminController.js, backend/src/controllers/filesController.js, backend/src/routes/admin.js, backend/src/routes/holidays.js, backend/src/routes/settings.js, backend/src/routes/zoho.js, backend/src/server.js, backend/src/services/cleanupService.js, backend/src/services/fileService.js, backend/src/services/zohoService.js, backend/src/utils/scheduler.js, docker-compose.yml, frontend/src/pages/AdminPage.jsx, frontend/src/pages/HREmployeesPage.jsx

## [2026-03-16] - Roles update, workspace-level module configuration for dynamic sidebar nav
- Description: Roles update, workspace-level module configuration for dynamic sidebar nav
- Lines Added: 110
- Lines Deleted: 0
- Lines Modified: 20
- Files Changed: .claude/settings.local.json, backend/src/config/migrate-runner.js, backend/src/config/migrate-workspace-modules.js, backend/src/config/migrate.js, backend/src/config/seed.js, backend/src/controllers/authController.js, backend/src/routes/workspaces.js, frontend/src/App.jsx, frontend/src/components/layout/AppShell.jsx, frontend/src/pages/AdminPage.jsx

## [2026-03-16] - Update code
- Description: Update code
- Lines Added: 26654
- Lines Deleted: 0
- Lines Modified: 18
- Files Changed: .claude/settings.local.json, USAHA-Deploy.spec, build/USAHA-Deploy/Analysis-00.toc, build/USAHA-Deploy/EXE-00.toc, build/USAHA-Deploy/PKG-00.toc, build/USAHA-Deploy/PYZ-00.pyz, build/USAHA-Deploy/PYZ-00.toc, build/USAHA-Deploy/USAHA-Deploy.pkg, build/USAHA-Deploy/base_library.zip, build/USAHA-Deploy/localpycs/pyimod01_archive.pyc, build/USAHA-Deploy/localpycs/pyimod02_importers.pyc, build/USAHA-Deploy/localpycs/pyimod03_ctypes.pyc, build/USAHA-Deploy/localpycs/pyimod04_pywin32.pyc, build/USAHA-Deploy/localpycs/struct.pyc, build/USAHA-Deploy/warn-USAHA-Deploy.txt, build/USAHA-Deploy/xref-USAHA-Deploy.html, deploy.py

## [2026-03-16] - update package-lock.json with sharp dependencies
- Description: update package-lock.json with sharp dependencies
- Lines Added: 458
- Lines Deleted: 0
- Lines Modified: 0
- Files Changed: backend/package-lock.json

## [2026-03-16] - dynamic time greeting and workspace modules admin panel
- Description: dynamic time greeting and workspace modules admin panel
- Lines Added: 5
- Lines Deleted: 0
- Lines Modified: 40
- Files Changed: frontend/src/pages/AdminPage.jsx, frontend/src/pages/DashboardPage.jsx

## [2026-03-16] - admin role can access workspace management in any workspace
- Description: admin role can access workspace management in any workspace
- Lines Added: 1
- Lines Deleted: 0
- Lines Modified: 2
- Files Changed: frontend/src/pages/AdminPage.jsx

## [2026-03-16] - ignore duplicate refresh token on workspace select
- Description: ignore duplicate refresh token on workspace select
- Lines Added: 0
- Lines Deleted: 0
- Lines Modified: 1
- Files Changed: backend/src/controllers/authController.js

## [2026-03-16] - always show workspace switcher in topbar
- Description: always show workspace switcher in topbar
- Lines Added: 0
- Lines Deleted: 0
- Lines Modified: 2
- Files Changed: frontend/src/components/layout/AppShell.jsx

## [2026-03-16] - all 4 workspaces with auto-assignment for super_user and admin roles
- Description: all 4 workspaces with auto-assignment for super_user and admin roles
- Lines Added: 15
- Lines Deleted: 0
- Lines Modified: 7
- Files Changed: backend/src/config/seed.js

## [2026-03-16] - INR currency formatting and seed workspace conflict fix
- Description: INR currency formatting and seed workspace conflict fix
- Lines Added: 0
- Lines Deleted: 0
- Lines Modified: 12
- Files Changed: backend/src/config/seed.js, frontend/src/pages/ProjectDetailPage.jsx, frontend/src/pages/ProjectsPage.jsx, frontend/src/pages/ReportsPage.jsx, frontend/src/pages/ResourcesPage.jsx

## [2026-03-16] - serve uploads via nginx and compress all uploaded images to WebP using sharp
- Description: serve uploads via nginx and compress all uploaded images to WebP using sharp
- Lines Added: 1
- Lines Deleted: 0
- Lines Modified: 11
- Files Changed: backend/src/server.js, backend/src/services/fileService.js, nginx/nginx.conf

## [2026-03-16] - login page company name larger and right-aligned
- Description: login page company name larger and right-aligned
- Lines Added: 0
- Lines Deleted: 0
- Lines Modified: 3
- Files Changed: frontend/src/pages/LoginPage.jsx

## [2026-03-16] - login page company name 40px and right-aligned
- Description: login page company name 40px and right-aligned
- Lines Added: 0
- Lines Deleted: 0
- Lines Modified: 1
- Files Changed: frontend/src/pages/LoginPage.jsx

## [2026-03-16] - login page usaha black, footer green band, NEUK NET-TECH red
- Description: login page usaha black, footer green band, NEUK NET-TECH red
- Lines Added: 0
- Lines Deleted: 0
- Lines Modified: 3
- Files Changed: frontend/src/pages/LoginPage.jsx

## [2026-03-16] - login page usaha black, footer green band, NEUK NET-TECH red - 2
- Description: login page usaha black, footer green band, NEUK NET-TECH red - 2
- Lines Added: 0
- Lines Deleted: 0
- Lines Modified: 3
- Files Changed: frontend/src/pages/LoginPage.jsx

## [2026-03-16] - server storage widget on IT workspace Resources page
- Description: server storage widget on IT workspace Resources page
- Lines Added: 33
- Lines Deleted: 0
- Lines Modified: 2
- Files Changed: frontend/src/pages/ResourcesPage.jsx

## [2026-03-16] - IT workspace Resources page with all 5 system monitoring widgets
- Description: IT workspace Resources page with all 5 system monitoring widgets
- Lines Added: 178
- Lines Deleted: 0
- Lines Modified: 21
- Files Changed: backend/src/controllers/adminController.js, backend/src/routes/admin.js, frontend/src/pages/ResourcesPage.jsx

## [2026-03-16] - Engineering workspace Resources page with team utilisation, skills and project allocation widgets
- Description: Engineering workspace Resources page with team utilisation, skills and project allocation widgets
- Lines Added: 117
- Lines Deleted: 0
- Lines Modified: 0
- Files Changed: backend/src/controllers/adminController.js, backend/src/routes/admin.js, frontend/src/pages/ResourcesPage.jsx

## [2026-03-16] - workspace dropdown options visible with dark background
- Description: workspace dropdown options visible with dark background
- Lines Added: 2
- Lines Deleted: 0
- Lines Modified: 1
- Files Changed: frontend/src/components/layout/AppShell.jsx

## [2026-03-16] - Associates page in HR sidebar and weekly Zoho sync scheduler
- Description: Associates page in HR sidebar and weekly Zoho sync scheduler
- Lines Added: 14
- Lines Deleted: 0
- Lines Modified: 0
- Files Changed: backend/src/utils/scheduler.js, frontend/src/App.jsx, frontend/src/components/layout/AppShell.jsx, frontend/src/pages/AdminPage.jsx

## [2026-03-16] - hr_employees count query remove invalid orderBy
- Description: hr_employees count query remove invalid orderBy
- Lines Added: 11
- Lines Deleted: 0
- Lines Modified: 1
- Files Changed: backend/src/routes/zoho.js

## [2026-03-16] - zoho sync handle flat array response format
- Description: zoho sync handle flat array response format
- Lines Added: 7
- Lines Deleted: 0
- Lines Modified: 3
- Files Changed: backend/src/services/zohoService.js

## [2026-03-16] - add tooltips to all interactive elements across the application
- Description: add tooltips to all interactive elements across the application
- Lines Added: 7
- Lines Deleted: 0
- Lines Modified: 24
- Files Changed: frontend/src/components/layout/AppShell.jsx, frontend/src/pages/AdminPage.jsx, frontend/src/pages/DashboardPage.jsx, frontend/src/pages/HREmployeesPage.jsx, frontend/src/pages/ProjectsPage.jsx, frontend/src/pages/ResourcesPage.jsx

## [2026-03-16] - redesign dashboard with daily quote, meetings, to-do, notes and collapsible projects sidebar
- Description: redesign dashboard with daily quote, meetings, to-do, notes and collapsible projects sidebar
- Lines Added: 199
- Lines Deleted: 0
- Lines Modified: 103
- Files Changed: frontend/src/components/layout/AppShell.jsx, frontend/src/pages/DashboardPage.jsx

## [2026-03-16] - fix quote loading via backend proxy and restore greeting emoji
- Description: fix quote loading via backend proxy and restore greeting emoji
- Lines Added: 29
- Lines Deleted: 2
- Lines Modified: 6
- Files Changed: backend/src/routes/dashboard.js, backend/src/server.js, frontend/src/pages/DashboardPage.jsx

## [2026-03-17] - add microsoft outlook oauth for calendar integration
- Description: add microsoft outlook oauth for calendar integration
- Lines Added: 107
- Lines Deleted: 0
- Lines Modified: 16
- Files Changed: backend/src/routes/dashboard.js, backend/src/routes/outlook.js, backend/src/server.js, frontend/src/pages/DashboardPage.jsx

## [2026-03-17] - move dashboard todos and notes to database
- Description: move dashboard todos and notes to database
- Lines Added: 159
- Lines Deleted: 0
- Lines Modified: 19
- Files Changed: backend/src/config/migrate-dashboard.js, backend/src/config/migrate-runner.js, backend/src/routes/dashboard.js, frontend/src/pages/DashboardPage.jsx

## [2026-03-17] - fix outlook oauth middleware and dashboard migration syntax
- Description: fix outlook oauth middleware and dashboard migration syntax
- Lines Added: 1
- Lines Deleted: 0
- Lines Modified: 1
- Files Changed: backend/src/config/migrate-dashboard.js, backend/src/server.js

## [2026-03-17] - add CHANGELOG.md reconstructed from git history
- Description: Created CHANGELOG.md at project root with all historical commits reconstructed from git log, including per-commit line stats and files changed
- Lines Added: 345
- Lines Deleted: 0
- Lines Modified: 0
- Files Changed: CHANGELOG.md

## [2026-03-17] - add backend/.env.example with all environment variables
- Description: Created backend/.env.example listing every environment variable the app uses, with empty or placeholder values for developer onboarding. Also removed the old root-level .env.example.
- Lines Added: 43
- Lines Deleted: 37
- Lines Modified: 0
- Files Changed: backend/.env.example, .env.example, CHANGELOG.md

## [2026-03-17] - add Microsoft Outlook OAuth env vars to docker-compose
- Description: Added MS_CLIENT_ID, MS_TENANT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI to docker-compose.yml api service environment section
- Lines Added: 4
- Lines Deleted: 0
- Lines Modified: 0
- Files Changed: docker-compose.yml, CHANGELOG.md

## [2026-03-17] - fix max-files typo in docker-compose logging config
- Description: Renamed max-files to max-file (singular) in all 4 service logging options — the correct Docker json-file driver option name
- Lines Added: 0
- Lines Deleted: 0
- Lines Modified: 4
- Files Changed: docker-compose.yml, CHANGELOG.md

## [2026-03-17] - fix Outlook OAuth redirect causing unintended logout
- Description: Changed OAuth button from window.location.href to window.location.assign with full URL to avoid axios interceptor interference. Added condition in axios 401 handler to skip refresh/logout for /auth/outlook requests.
- Lines Added: 1
- Lines Deleted: 0
- Lines Modified: 3
- Files Changed: frontend/src/pages/DashboardPage.jsx, frontend/src/services/api.js, CHANGELOG.md

## [2026-03-17] - replace nginx.conf with SSL termination and HTTPS redirect
- Description: Replaced nginx.conf entirely — added HTTPS server block with SSL certs, HTTP-to-HTTPS 301 redirect, set server_name to erp.pranitra.com, removed old security headers and cache directives in favour of simplified proxy config
- Lines Added: 28
- Lines Deleted: 75
- Lines Modified: 0
- Files Changed: nginx/nginx.conf, CHANGELOG.md

## [2026-03-17] - use popup window for Outlook OAuth instead of page redirect
- Description: OAuth flow now opens in a popup window. Backend callback returns an HTML page that posts the token to the parent via postMessage and closes itself. Frontend listens for the message event to receive the token. Main app never navigates away so the user stays logged in.
- Lines Added: 14
- Lines Deleted: 12
- Lines Modified: 3
- Files Changed: frontend/src/pages/DashboardPage.jsx, backend/src/routes/outlook.js, CHANGELOG.md

## [2026-03-17] - add migrate-dashboard-notes.js migration
- Description: New migration file that creates the dashboard_notes table if it does not already exist. Added to migration runner list after migrate-dashboard.js.
- Lines Added: 35
- Lines Deleted: 0
- Lines Modified: 1
- Files Changed: backend/src/config/migrate-dashboard-notes.js, backend/src/config/migrate-runner.js, CHANGELOG.md

## [2026-03-17] - fix dashboard migrations to use UUID for user_id
- Description: Changed user_id column from INTEGER to UUID in both migrate-dashboard.js (dashboard_todos) and migrate-dashboard-notes.js (dashboard_notes) to match the users table which uses uuid primary keys. Also removed duplicate dashboard_notes creation from migrate-dashboard.js since it is handled by the dedicated migrate-dashboard-notes.js.
- Lines Added: 0
- Lines Deleted: 16
- Lines Modified: 2
- Files Changed: backend/src/config/migrate-dashboard.js, backend/src/config/migrate-dashboard-notes.js, CHANGELOG.md

## [2026-03-17] - fix Outlook OAuth popup with origin check and popup reference close
- Description: Added left/top position to popup dimensions, added origin check in message listener, close popup via stored reference, and remove listener after token received.
- Lines Added: 7
- Lines Deleted: 1
- Lines Modified: 0
- Files Changed: frontend/src/pages/DashboardPage.jsx, CHANGELOG.md

## [2026-03-17] - move openOutlookPopup inside MeetingsCard to access setMsToken
- Description: Moved openOutlookPopup from module scope into MeetingsCard so it can call setMsToken directly. Removed the separate useEffect message listener that was duplicating the handler. Sync Outlook Tasks button now uses an inline window.open call.
- Lines Added: 0
- Lines Deleted: 9
- Lines Modified: 10
- Files Changed: frontend/src/pages/DashboardPage.jsx, CHANGELOG.md

## [2026-03-17] - sync docker-compose.yml with server version
- Description: Replaced docker-compose.yml with the exact version running on the server to eliminate recurring deploy conflicts. Removed service-level comments and blank lines between services to match server file exactly.
- Lines Added: 0
- Lines Deleted: 10
- Lines Modified: 0
- Files Changed: docker-compose.yml, CHANGELOG.md

## [2026-03-17] - add debug logging and env var validation to outlook OAuth handler
- Description: Added console.log for MS_CLIENT_ID, MS_TENANT_ID, MS_REDIRECT_URI at the start of the GET /api/auth/outlook handler. Added missing-var check that returns a plain text error instead of redirecting when any var is unset. Wrapped handler in try/catch with error logging.
- Lines Added: 20
- Lines Deleted: 6
- Lines Modified: 0
- Files Changed: backend/src/routes/outlook.js, CHANGELOG.md

## [2026-03-17] - discard server local changes before git pull in deploy tool
- Description: Added git checkout -- . before git pull in the SSH deploy command so any local server modifications are discarded before pulling, preventing deploy conflicts permanently.
- Lines Added: 1
- Lines Deleted: 0
- Lines Modified: 0
- Files Changed: deploy.py, CHANGELOG.md
