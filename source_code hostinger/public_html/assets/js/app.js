const API_BASE = 'api/';

const app = {
    user: null,

    init: () => {
        app.checkSession();
        app.bindEvents();
    },

    bindEvents: () => {
        document.getElementById('login-form')?.addEventListener('submit', app.handleLogin);
        document.getElementById('logout-btn')?.addEventListener('click', app.handleLogout);
        document.getElementById('issue-form')?.addEventListener('submit', app.handleIssueInfraction);
    },

    checkSession: () => {
        const user = localStorage.getItem('sentinel_user');
        if (user) {
            app.user = JSON.parse(user);
            app.showDashboard();
        } else {
            app.showLogin();
        }
    },

    handleLogin: async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(API_BASE + 'login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                app.user = data.user;
                localStorage.setItem('sentinel_user', JSON.stringify(app.user));
                app.showDashboard();
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    },

    handleLogout: () => {
        app.user = null;
        localStorage.removeItem('sentinel_user');
        // Optional: Call backend logout if needed to clear PHP session
        app.showLogin();
    },

    showLogin: () => {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('dashboard-screen').classList.add('hidden');
    },

    showDashboard: () => {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        
        document.getElementById('user-name').textContent = app.user.full_name;
        document.getElementById('user-role').textContent = app.user.role.toUpperCase();

        // Render role-specific views
        app.renderRoleView();
    },

    renderRoleView: () => {
        const role = app.user.role;
        const content = document.getElementById('dashboard-content');
        content.innerHTML = ''; // Clear previous

        if (['teacher', 'prefect', 'adviser'].includes(role)) {
            app.renderIssuerView(content);
        } else if (role === 'student') {
            app.renderStudentView(content);
        }
        
        // Admin/Dev gets extra stats
        if (['adviser', 'prefect', 'developer'].includes(role)) {
            app.renderAdminStats(content);
        }
    },

    renderIssuerView: (container) => {
        const html = `
            <div class="card">
                <h3>Issue Infraction</h3>
                <form id="issue-form">
                    <input type="email" id="student-email" placeholder="Student Email" required>
                    <select id="type">
                        <option value="minor">Minor Offense</option>
                        <option value="major">Major Offense</option>
                    </select>
                    <input type="text" id="offense" placeholder="Offense Title" required>
                    <input type="number" id="points" value="1" min="1" required>
                    <textarea id="description" placeholder="Description"></textarea>
                    <button type="submit">Issue Infraction</button>
                </form>
            </div>
        `;
        container.innerHTML += html;
        // Re-bind dynamic form
        setTimeout(() => {
            document.getElementById('issue-form').addEventListener('submit', app.handleIssueInfraction);
        }, 0);
    },

    handleIssueInfraction: async (e) => {
        e.preventDefault();
        const data = {
            student_email: document.getElementById('student-email').value,
            type: document.getElementById('type').value,
            offense: document.getElementById('offense').value,
            points: document.getElementById('points').value,
            description: document.getElementById('description').value
        };

        try {
            const res = await fetch(API_BASE + 'issue_infraction.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                alert('Infraction Issued');
                e.target.reset();
                if (app.user.role !== 'student') app.loadRecentInfractions(); // Refresh list if visible
            } else {
                alert(result.error);
            }
        } catch (err) {
            alert('Error issuing infraction');
        }
    },

    renderStudentView: (container) => {
        // Fetch student's own infractions
        // For now, just a placeholder or fetch logic
        container.innerHTML += `<div class="card"><h3>My Record</h3><p>Loading...</p></div>`;
        // TODO: Implement fetch logic for student view
    },

    renderAdminStats: async (container) => {
        try {
            const res = await fetch(API_BASE + 'admin.php?action=stats');
            const stats = await res.json();
            
            const html = `
                <div class="card">
                    <h3>System Overview</h3>
                    <p>Total Infractions: <strong>${stats.total_infractions}</strong></p>
                    <p>Pending Responses: <strong>${stats.pending_infractions}</strong></p>
                </div>
                <div class="card" id="recent-list">
                    <h3>Recent Activity</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Student</th>
                                <th>Offense</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="infraction-table-body"></tbody>
                    </table>
                </div>
            `;
            container.innerHTML += html;
            app.loadRecentInfractions();
        } catch (err) {
            console.error('Failed to load stats');
        }
    },

    loadRecentInfractions: async () => {
        try {
            const res = await fetch(API_BASE + 'admin.php?action=recent_infractions');
            const data = await res.json();
            const tbody = document.getElementById('infraction-table-body');
            if (!tbody) return;

            tbody.innerHTML = data.infractions.map(i => `
                <tr>
                    <td>${new Date(i.date_issued).toLocaleDateString()}</td>
                    <td>${i.student_name}</td>
                    <td>${i.offense} <span class="badge ${i.points > 5 ? 'major' : 'minor'}">${i.points}pts</span></td>
                    <td><span class="badge ${i.resolved == 1 ? 'resolved' : 'pending'}">${i.resolved == 1 ? 'Resolved' : 'Pending'}</span></td>
                </tr>
            `).join('');
        } catch (err) {
            console.error(err);
        }
    }
};

document.addEventListener('DOMContentLoaded', app.init);
