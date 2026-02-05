/**
 * ═══════════════════════════════════════════════════════════
 * SENTINEL WATCHTOWER - Backend API Server
 * School Disciplinary Tracking System
 * 
 * Developer: Paul Joaquin Cinco
 * Copyright © 2026 Paul Joaquin Cinco. All Rights Reserved.
 * 
 * NOTICE: This software is proprietary and confidential.
 * Unauthorized copying, modification, distribution, or use
 * of this software, via any medium, is strictly prohibited.
 * 
 * Contact: Paul Joaquin Cinco
 * Project Year: 2026
 * ═══════════════════════════════════════════════════════════
 */

import { Hono } from "hono";
import type { Client } from "@sdk/server-types";
import { tables } from "@generated";
import { eq, and, lt, like, desc, sql } from "drizzle-orm";

type AppUser = typeof tables.appUsers.$inferSelect;

// Copyright protection constants - Do not remove
const __DEVELOPER__ = "Paul Joaquin Cinco";
const __COPYRIGHT__ = "© 2026 Paul Joaquin Cinco";
const __PROJECT__ = "Sentinel Watchtower";

export async function createApp(
  edgespark: Client<typeof tables>
): Promise<Hono<any>> {
  const app = new Hono<{ Variables: { appUser: AppUser | null } }>();

  // Middleware to attach appUser to context if logged in
  app.use('*', async (c, next) => {
    const user = edgespark.auth.user;
    if (user) {
      const appUser = await edgespark.db.query.appUsers.findFirst({
        where: eq(tables.appUsers.id, user.id)
      });
      c.set('appUser', appUser || null);
    } else {
      c.set('appUser', null);
    }
    await next();
  });

  // Validate Invite Code (Public)
  app.post('/api/public/invites/validate', async (c) => {
    const { code } = await c.req.json();
    if (!code) return c.json({ error: "Code required" }, 400);

    const invite = await edgespark.db.query.inviteCodes.findFirst({
      where: sql`lower(${tables.inviteCodes.code}) = lower(${code})`
    });

    if (!invite) return c.json({ error: "Invalid code" }, 404);
    
    const now = Math.floor(Date.now() / 1000);
    if (invite.expiresAt < now) return c.json({ error: "Code expired" }, 400);
    if (invite.usedCount >= invite.maxUses) return c.json({ error: "Code fully used" }, 400);

    return c.json({ 
      valid: true, 
      role: invite.role, 
      section: invite.section 
    });
  });

  // Complete Profile (Auth Required)
  app.post('/api/auth/complete-profile', async (c) => {
    const user = edgespark.auth.user;
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const code = body.code;
    // Use provided fullName or fallback to auth user name
    const fullName = body.fullName || user.name;

    if (!code || !fullName) return c.json({ error: "Missing fields" }, 400);

    // Check if already has profile
    const existing = await edgespark.db.query.appUsers.findFirst({
      where: eq(tables.appUsers.id, user.id)
    });
    if (existing) return c.json({ error: "Profile already exists" }, 400);

    // Validate code again
    const invite = await edgespark.db.query.inviteCodes.findFirst({
      where: sql`lower(${tables.inviteCodes.code}) = lower(${code})`
    });

    if (!invite) return c.json({ error: "Invalid code" }, 404);
    const now = Math.floor(Date.now() / 1000);
    if (invite.expiresAt < now) return c.json({ error: "Code expired" }, 400);
    if (invite.usedCount >= invite.maxUses) return c.json({ error: "Code fully used" }, 400);

    // Create App User
    // Note: user.email is guaranteed if logged in via email auth
    if (!user.email) return c.json({ error: "Email required" }, 400);

    await edgespark.db.insert(tables.appUsers).values({
      id: user.id,
      email: user.email,
      fullName,
      role: invite.role,
      section: invite.section
    });

    // Update Invite Usage
    await edgespark.db.update(tables.inviteCodes)
      .set({ usedCount: invite.usedCount + 1 })
      .where(eq(tables.inviteCodes.id, invite.id));

    return c.json({ success: true });
  });

  // Get Current User Profile
  app.get('/api/me', async (c) => {
    const user = edgespark.auth.user;
    if (!user) return c.json({ user: null });
    
    const appUser = c.get('appUser');
    return c.json({ 
      user: {
        ...user,
        appUser: appUser || null
      }
    });
  });

  // Get System Statistics (Prefect/Developer only)
  app.get('/api/system/stats', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser || !['prefect', 'developer'].includes(appUser.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Count users by role
    const allUsers = await edgespark.db.select()
      .from(tables.appUsers);

    const stats = {
      students: allUsers.filter(u => u.role === 'student').length,
      teachers: allUsers.filter(u => u.role === 'teacher').length,
      advisers: allUsers.filter(u => u.role === 'adviser').length,
      prefects: allUsers.filter(u => u.role === 'prefect').length,
      total: allUsers.length
    };

    return c.json({ stats });
  });

  // Search All Users (Prefect/Developer only)
  app.get('/api/users/search', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser || !['prefect', 'developer'].includes(appUser.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const query = c.req.query('q');
    const roleFilter = c.req.query('role');
    
    if (!query || query.length < 2) {
      // Return all users if no query
      let users = await edgespark.db.select()
        .from(tables.appUsers)
        .limit(100);

      if (roleFilter && roleFilter !== 'all') {
        users = users.filter(u => u.role === roleFilter);
      }

      return c.json({ users });
    }

    // Search by name
    let users = await edgespark.db.select()
      .from(tables.appUsers)
      .where(like(tables.appUsers.fullName, `%${query}%`))
      .limit(100);

    if (roleFilter && roleFilter !== 'all') {
      users = users.filter(u => u.role === roleFilter);
    }

    return c.json({ users });
  });

  // Search Students (Teacher/Adviser/Prefect/Dev)
  app.get('/api/students/search', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser || !['teacher', 'adviser', 'prefect', 'developer'].includes(appUser.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const query = c.req.query('q');
    if (!query || query.length < 2) return c.json({ students: [] });

    // Search by name, email, or section
    const students = await edgespark.db.select()
      .from(tables.appUsers)
      .where(and(
        eq(tables.appUsers.role, 'student'),
        sql`(
          lower(${tables.appUsers.fullName}) LIKE lower(${`%${query}%`}) OR
          lower(${tables.appUsers.email}) LIKE lower(${`%${query}%`}) OR
          lower(${tables.appUsers.section}) LIKE lower(${`%${query}%`})
        )`
      ))
      .limit(50);

    return c.json({ students });
  });

  // Get Adviser Roster
  app.get('/api/adviser/roster', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser || appUser.role !== 'adviser') {
      return c.json({ error: "Forbidden" }, 403);
    }
    
    if (!appUser.section) {
      return c.json({ students: [] });
    }

    const students = await edgespark.db.select()
      .from(tables.appUsers)
      .where(and(
        eq(tables.appUsers.role, 'student'),
        eq(tables.appUsers.section, appUser.section)
      ));

    return c.json({ students });
  });

  // Create Infraction
  app.post('/api/infractions', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser || !['teacher', 'adviser', 'prefect', 'developer'].includes(appUser.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { studentId, type, offense, points, description } = await c.req.json();

    // Validate student exists
    const student = await edgespark.db.query.appUsers.findFirst({
      where: eq(tables.appUsers.id, studentId)
    });
    if (!student) return c.json({ error: "Student not found" }, 404);

    await edgespark.db.insert(tables.infractions).values({
      studentId,
      issuerId: appUser.id,
      type,
      offense,
      points,
      description
    });

    return c.json({ success: true });
  });

  // Get Infractions
  app.get('/api/infractions', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser) return c.json({ error: "Unauthorized" }, 401);

    const studentId = c.req.query('studentId');
    const search = c.req.query('search');
    const type = c.req.query('type');
    const limit = parseInt(c.req.query('limit') || '100');
    
    let whereClause;

    if (appUser.role === 'student') {
      whereClause = eq(tables.infractions.studentId, appUser.id);
    } else if (appUser.role === 'parent') {
      return c.json({ infractions: [] }); 
    } else if (appUser.role === 'adviser') {
      if (studentId) {
        whereClause = eq(tables.infractions.studentId, studentId);
      } else {
        return c.json({ error: "Student ID required for list" }, 400);
      }
    } else {
      // Prefect, Teacher, Developer - can view all
      if (studentId) {
        whereClause = eq(tables.infractions.studentId, studentId);
      } else {
        whereClause = undefined; 
      }
    }

    const infractions = await edgespark.db.query.infractions.findMany({
      where: whereClause,
      orderBy: [desc(tables.infractions.dateIssued)],
      limit: Math.min(limit, 500)
    });

    // Get related users
    const studentIds = [...new Set(infractions.map(i => i.studentId))];
    const issuerIds = [...new Set(infractions.map(i => i.issuerId))];
    const allUserIds = [...new Set([...studentIds, ...issuerIds])];

    const users = await edgespark.db.query.appUsers.findMany({
      where: sql`${tables.appUsers.id} IN (${sql.join(allUserIds.map(id => sql`${id}`), sql`, `)})`
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    let formattedInfractions = infractions.map(inf => ({
      id: inf.id,
      type: inf.type,
      offense: inf.offense,
      points: inf.points,
      description: inf.description,
      dateIssued: inf.dateIssued,
      studentResponse: inf.studentResponse,
      responseSubmittedAt: inf.responseSubmittedAt,
      studentExplanation: inf.studentExplanation,
      explanationSubmittedAt: inf.explanationSubmittedAt,
      resolved: inf.resolved,
      studentId: inf.studentId,
      studentName: userMap.get(inf.studentId)?.fullName || 'Unknown',
      studentSection: userMap.get(inf.studentId)?.section || 'N/A',
      issuerName: userMap.get(inf.issuerId)?.fullName || 'Unknown'
    }));

    // Apply search filter
    if (search && search.length > 0) {
      const searchLower = search.toLowerCase();
      formattedInfractions = formattedInfractions.filter(inf => 
        inf.studentName.toLowerCase().includes(searchLower) ||
        inf.studentSection.toLowerCase().includes(searchLower) ||
        inf.offense.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (type && type !== 'all') {
      formattedInfractions = formattedInfractions.filter(inf => inf.type === type);
    }

    return c.json({ infractions: formattedInfractions });
  });

  // Submit Student Explanation to Infraction (NEW)
  app.post('/api/infractions/:id/explanation', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser || appUser.role !== 'student') {
      return c.json({ error: "Forbidden" }, 403);
    }

    const infractionId = parseInt(c.req.param('id'));
    const { explanation } = await c.req.json();

    if (!explanation || explanation.trim().length === 0) {
      return c.json({ error: "Explanation cannot be empty" }, 400);
    }

    // Verify infraction belongs to student
    const infraction = await edgespark.db.query.infractions.findFirst({
      where: eq(tables.infractions.id, infractionId)
    });

    if (!infraction) {
      return c.json({ error: "Infraction not found" }, 404);
    }

    if (infraction.studentId !== appUser.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Check if already submitted
    if (infraction.explanationSubmittedAt) {
      return c.json({ error: "Explanation already submitted" }, 400);
    }

    // Update infraction with explanation
    await edgespark.db.update(tables.infractions)
      .set({ 
        studentExplanation: explanation,
        explanationSubmittedAt: Math.floor(Date.now() / 1000)
      })
      .where(eq(tables.infractions.id, infractionId));

    return c.json({ success: true });
  });

  // Submit Student Response to Infraction (LEGACY - kept for compatibility)
  app.post('/api/infractions/:id/response', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser || appUser.role !== 'student') {
      return c.json({ error: "Forbidden" }, 403);
    }

    const infractionId = parseInt(c.req.param('id'));
    const { response } = await c.req.json();

    if (!response || response.trim().length === 0) {
      return c.json({ error: "Response cannot be empty" }, 400);
    }

    // Verify infraction belongs to student
    const infraction = await edgespark.db.query.infractions.findFirst({
      where: eq(tables.infractions.id, infractionId)
    });

    if (!infraction) {
      return c.json({ error: "Infraction not found" }, 404);
    }

    if (infraction.studentId !== appUser.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Update infraction with response
    await edgespark.db.update(tables.infractions)
      .set({ 
        studentResponse: response,
        responseSubmittedAt: Math.floor(Date.now() / 1000)
      })
      .where(eq(tables.infractions.id, infractionId));

    // Audit log
    await edgespark.db.insert(tables.infractionResponseAudit).values({
      infractionId,
      studentId: appUser.id,
      responseText: response
    });

    return c.json({ success: true });
  });

  // Get Student Points Summary
  app.get('/api/students/:id/points', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser) return c.json({ error: "Unauthorized" }, 401);

    const studentId = c.req.param('id');

    // Permission check
    if (appUser.role === 'student' && appUser.id !== studentId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (appUser.role === 'adviser') {
      const student = await edgespark.db.query.appUsers.findFirst({
        where: eq(tables.appUsers.id, studentId)
      });
      if (!student || student.section !== appUser.section) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    const infractions = await edgespark.db.query.infractions.findMany({
      where: eq(tables.infractions.studentId, studentId)
    });

    // Only count unresolved infractions for active points
    const activePoints = infractions
      .filter(inf => !inf.resolved)
      .reduce((sum, inf) => sum + inf.points, 0);
    
    const totalInfractions = infractions.length;
    const resolvedCount = infractions.filter(inf => inf.resolved).length;

    return c.json({ 
      totalPoints: activePoints, 
      infractionCount: totalInfractions,
      resolvedCount,
      activeCount: totalInfractions - resolvedCount
    });
  });

  // Get Student Profile (for advisers/prefects/developers)
  app.get('/api/students/:id/profile', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser) return c.json({ error: "Unauthorized" }, 401);

    const studentId = c.req.param('id');

    // Permission check - only advisers, prefects, developers can view
    if (!['adviser', 'prefect', 'developer'].includes(appUser.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (appUser.role === 'adviser') {
      const student = await edgespark.db.query.appUsers.findFirst({
        where: eq(tables.appUsers.id, studentId)
      });
      if (!student || student.section !== appUser.section) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    // Get student details
    const student = await edgespark.db.query.appUsers.findFirst({
      where: eq(tables.appUsers.id, studentId)
    });

    if (!student) {
      return c.json({ error: "Student not found" }, 404);
    }

    // Get all infractions
    const infractions = await edgespark.db.query.infractions.findMany({
      where: eq(tables.infractions.studentId, studentId),
      orderBy: [desc(tables.infractions.dateIssued)]
    });

    // Get related users for issuer and resolver names
    const issuerIds = [...new Set(infractions.map(i => i.issuerId))];
    const resolverIds = [...new Set(infractions.filter(i => i.resolvedBy).map(i => i.resolvedBy!))];
    const allUserIds = [...new Set([...issuerIds, ...resolverIds])];

    const users = await edgespark.db.query.appUsers.findMany({
      where: sql`${tables.appUsers.id} IN (${sql.join(allUserIds.map(id => sql`${id}`), sql`, `)})`
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const formattedInfractions = infractions.map(inf => ({
      id: inf.id,
      type: inf.type,
      offense: inf.offense,
      points: inf.points,
      description: inf.description,
      dateIssued: inf.dateIssued,
      studentResponse: inf.studentResponse,
      responseSubmittedAt: inf.responseSubmittedAt,
      studentExplanation: inf.studentExplanation,
      explanationSubmittedAt: inf.explanationSubmittedAt,
      resolved: inf.resolved,
      resolvedBy: inf.resolvedBy ? userMap.get(inf.resolvedBy)?.fullName : null,
      resolvedAt: inf.resolvedAt,
      issuerName: userMap.get(inf.issuerId)?.fullName || 'Unknown'
    }));

    const activePoints = infractions
      .filter(inf => !inf.resolved)
      .reduce((sum, inf) => sum + inf.points, 0);

    return c.json({
      student: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        section: student.section,
        role: student.role
      },
      infractions: formattedInfractions,
      summary: {
        totalInfractions: infractions.length,
        activePoints,
        resolvedCount: infractions.filter(i => i.resolved).length,
        unresolvedCount: infractions.filter(i => !i.resolved).length
      }
    });
  });

  // Resolve Infraction
  app.patch('/api/infractions/:id/resolve', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser) return c.json({ error: "Unauthorized" }, 401);

    // Only advisers, prefects, developers can resolve
    if (!['adviser', 'prefect', 'developer'].includes(appUser.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const infractionId = parseInt(c.req.param('id'));

    const infraction = await edgespark.db.query.infractions.findFirst({
      where: eq(tables.infractions.id, infractionId)
    });

    if (!infraction) {
      return c.json({ error: "Infraction not found" }, 404);
    }

    if (infraction.resolved) {
      return c.json({ error: "Already resolved" }, 400);
    }

    // For advisers, check if student is in their section
    if (appUser.role === 'adviser') {
      const student = await edgespark.db.query.appUsers.findFirst({
        where: eq(tables.appUsers.id, infraction.studentId)
      });
      if (!student || student.section !== appUser.section) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    await edgespark.db.update(tables.infractions)
      .set({
        resolved: 1,
        resolvedBy: appUser.id,
        resolvedAt: Math.floor(Date.now() / 1000)
      })
      .where(eq(tables.infractions.id, infractionId));

    return c.json({ success: true });
  });

  // Generate Invite Code
  app.post('/api/invites/generate', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser) return c.json({ error: "Unauthorized" }, 401);

    let { role, section, maxUses, expiresInHours } = await c.req.json();

    // Validate maxUses
    if (maxUses && (maxUses < 1 || maxUses > 100)) {
      return c.json({ error: "maxUses must be between 1 and 100" }, 400);
    }

    // Permission Check
    if (appUser.role === 'developer') {
      // Can generate for ANY role
    } else if (appUser.role === 'prefect') {
      // Can generate for any role EXCEPT developer
      if (!['student', 'teacher', 'adviser', 'prefect'].includes(role)) {
        return c.json({ error: "Forbidden role" }, 403);
      }
    } else if (appUser.role === 'adviser') {
      // Can only generate for students
      if (role !== 'student') return c.json({ error: "Forbidden role" }, 403);
      // Force section to be adviser's own section
      section = appUser.section;
    } else {
      return c.json({ error: "Forbidden" }, 403);
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = Math.floor(Date.now() / 1000) + ((expiresInHours || 24) * 3600);

    await edgespark.db.insert(tables.inviteCodes).values({
      code,
      role,
      section,
      maxUses: maxUses || 10,
      expiresAt,
      createdBy: appUser.id
    });

    return c.json({ code });
  });

  // Get My Invite Codes
  app.get('/api/invites/my-codes', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser) return c.json({ error: "Unauthorized" }, 401);

    const codes = await edgespark.db.query.inviteCodes.findMany({
      where: eq(tables.inviteCodes.createdBy, appUser.id),
      orderBy: [desc(tables.inviteCodes.createdAt)]
    });

    const now = Math.floor(Date.now() / 1000);

    const formattedCodes = codes.map(c => ({
      id: c.id,
      code: c.code,
      role: c.role,
      section: c.section,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
      isExpired: c.expiresAt < now,
      isFull: c.usedCount >= c.maxUses,
      status: c.expiresAt < now ? 'expired' : (c.usedCount >= c.maxUses ? 'full' : 'active')
    }));

    return c.json({ codes: formattedCodes });
  });

  // Delete Invite Code
  app.delete('/api/invites/:id', async (c) => {
    const appUser = c.get('appUser');
    if (!appUser) return c.json({ error: "Unauthorized" }, 401);

    const codeId = parseInt(c.req.param('id'));

    // Verify the code belongs to the user
    const code = await edgespark.db.query.inviteCodes.findFirst({
      where: eq(tables.inviteCodes.id, codeId)
    });

    if (!code) {
      return c.json({ error: "Code not found" }, 404);
    }

    if (code.createdBy !== appUser.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await edgespark.db.delete(tables.inviteCodes)
      .where(eq(tables.inviteCodes.id, codeId));

    return c.json({ success: true });
  });

  return app;
}
