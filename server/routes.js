import { query } from './db.js';
import { upload } from './upload.js';

export function registerRoutes(app) {
  
  app.post('/api/upload', upload.array('files', 5), (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      
      const urls = req.files.map(file => `/uploads/${file.filename}`);
      res.json({ urls });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  // ==================== USER & AUTH ROUTES ====================
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { employee_id, password } = req.body;
      const result = await query(
        'SELECT * FROM users WHERE employee_id = $1 AND password_hash = $2 AND is_active = true',
        [employee_id, password]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const user = result.rows[0];
      delete user.password_hash;
      
      await query(
        'UPDATE users SET last_activity_date = CURRENT_DATE WHERE id = $1',
        [user.id]
      );
      
      res.json({ user, message: 'Login successful' });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { employee_id, name, email, phone, password, area, position } = req.body;
      
      const existing = await query('SELECT id FROM users WHERE employee_id = $1', [employee_id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Employee ID already exists' });
      }
      
      const result = await query(`
        INSERT INTO users (employee_id, name, email, phone, password_hash, area, position)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, employee_id, name, email, role, area, position, total_points, current_level
      `, [employee_id, name, email, phone, password, area, position]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const { role, area, search } = req.query;
      let queryText = 'SELECT id, employee_id, name, email, role, area, position, total_points, current_level, current_streak, avatar_url, is_active, created_at FROM users WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (role) {
        queryText += ` AND role = $${paramIndex++}`;
        params.push(role);
      }
      if (area) {
        queryText += ` AND area = $${paramIndex++}`;
        params.push(area);
      }
      if (search) {
        queryText += ` AND (name ILIKE $${paramIndex} OR employee_id ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY name';
      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query(
        'SELECT id, employee_id, name, email, phone, role, area, position, total_points, current_level, current_streak, longest_streak, avatar_url, created_at FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const badges = await query(`
        SELECT b.* FROM badges b
        JOIN user_badges ub ON b.id = ub.badge_id
        WHERE ub.user_id = $1
        ORDER BY ub.earned_at DESC
      `, [id]);
      
      const recentPoints = await query(`
        SELECT * FROM points_events
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `, [id]);
      
      res.json({
        ...result.rows[0],
        badges: badges.rows,
        recentPoints: recentPoints.rows
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, area, position, avatar_url } = req.body;
      
      const result = await query(`
        UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email),
        phone = COALESCE($3, phone), area = COALESCE($4, area),
        position = COALESCE($5, position), avatar_url = COALESCE($6, avatar_url),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id, employee_id, name, email, role, area, position, total_points, current_level
      `, [name, email, phone, area, position, avatar_url, id]);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // ==================== POINTS & GAMIFICATION ROUTES ====================

  async function updateUserLevel(userId) {
    const result = await query('SELECT total_points FROM users WHERE id = $1', [userId]);
    const points = result.rows[0]?.total_points || 0;
    
    let level = 'Bronze';
    if (points >= 1000) level = 'Platinum';
    else if (points >= 500) level = 'Gold';
    else if (points >= 200) level = 'Silver';
    
    await query('UPDATE users SET current_level = $1 WHERE id = $2', [level, userId]);
    return level;
  }

  async function updateStreak(userId) {
    const result = await query(`
      SELECT last_activity_date, current_streak, longest_streak FROM users WHERE id = $1
    `, [userId]);
    
    const user = result.rows[0];
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = user?.last_activity_date?.toISOString().split('T')[0];
    
    let newStreak = 1;
    if (lastActivity) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActivity === yesterdayStr) {
        newStreak = (user.current_streak || 0) + 1;
      } else if (lastActivity === today) {
        newStreak = user.current_streak || 1;
      }
    }
    
    const longestStreak = Math.max(newStreak, user?.longest_streak || 0);
    
    await query(`
      UPDATE users SET current_streak = $1, longest_streak = $2, last_activity_date = CURRENT_DATE
      WHERE id = $3
    `, [newStreak, longestStreak, userId]);
    
    return newStreak;
  }

  async function checkAndAwardBadges(userId) {
    const user = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user.rows.length) return [];
    
    const userData = user.rows[0];
    const newBadges = [];
    
    const obsCount = await query('SELECT COUNT(*) FROM observations WHERE user_id = $1', [userId]);
    const permitCount = await query('SELECT COUNT(*) FROM permits WHERE user_id = $1', [userId]);
    const challengeCount = await query('SELECT COUNT(*) FROM challenge_completions WHERE user_id = $1', [userId]);
    
    const badges = await query('SELECT * FROM badges WHERE is_active = true');
    
    for (const badge of badges.rows) {
      const hasBadge = await query(
        'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
        [userId, badge.id]
      );
      
      if (hasBadge.rows.length > 0) continue;
      
      let earned = false;
      
      switch (badge.condition_type) {
        case 'observations':
          earned = parseInt(obsCount.rows[0].count) >= badge.condition_value;
          break;
        case 'permits':
          earned = parseInt(permitCount.rows[0].count) >= badge.condition_value;
          break;
        case 'points':
          earned = userData.total_points >= badge.condition_value;
          break;
        case 'streak':
          earned = userData.current_streak >= badge.condition_value;
          break;
        case 'challenges':
          earned = parseInt(challengeCount.rows[0].count) >= badge.condition_value;
          break;
      }
      
      if (earned) {
        await query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)', [userId, badge.id]);
        newBadges.push(badge);
      }
    }
    
    return newBadges;
  }

  app.post('/api/points/award', async (req, res) => {
    try {
      const { user_id, event_type, reference_type, reference_id, points, description } = req.body;
      
      await query(`
        INSERT INTO points_events (user_id, event_type, reference_type, reference_id, points, description)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [user_id, event_type, reference_type, reference_id, points, description]);
      
      await query('UPDATE users SET total_points = total_points + $1 WHERE id = $2', [points, user_id]);
      
      const newLevel = await updateUserLevel(user_id);
      const streak = await updateStreak(user_id);
      const newBadges = await checkAndAwardBadges(user_id);
      
      res.json({ 
        success: true, 
        points_awarded: points,
        new_level: newLevel,
        streak: streak,
        new_badges: newBadges
      });
    } catch (error) {
      console.error('Error awarding points:', error);
      res.status(500).json({ error: 'Failed to award points' });
    }
  });

  app.get('/api/points/history/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;
      
      const result = await query(`
        SELECT * FROM points_events
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, parseInt(limit)]);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching points history:', error);
      res.status(500).json({ error: 'Failed to fetch points history' });
    }
  });

  // ==================== LEADERBOARD ROUTES ====================

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const { period = 'all', limit = 10 } = req.query;
      
      let result;
      if (period === 'monthly') {
        result = await query(`
          SELECT u.id, u.employee_id, u.name, u.area, u.avatar_url, u.current_level,
            COALESCE(SUM(pe.points), 0) as monthly_points
          FROM users u
          LEFT JOIN points_events pe ON u.id = pe.user_id
            AND pe.created_at >= date_trunc('month', CURRENT_DATE)
          WHERE u.is_active = true AND u.role != 'admin'
          GROUP BY u.id
          ORDER BY monthly_points DESC
          LIMIT $1
        `, [parseInt(limit)]);
      } else {
        result = await query(`
          SELECT id, employee_id, name, area, avatar_url, current_level, total_points
          FROM users
          WHERE is_active = true AND role != 'admin'
          ORDER BY total_points DESC
          LIMIT $1
        `, [parseInt(limit)]);
      }
      
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  app.get('/api/employee-of-month', async (req, res) => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      let result = await query(`
        SELECT ma.*, u.name, u.employee_id, u.avatar_url, u.current_level
        FROM monthly_awards ma
        JOIN users u ON ma.user_id = u.id
        WHERE ma.month = $1 AND ma.year = $2
      `, [currentMonth, currentYear]);
      
      if (result.rows.length === 0) {
        const topUser = await query(`
          SELECT u.id, u.name, u.employee_id, u.avatar_url, u.current_level,
            COALESCE(SUM(pe.points), 0) as monthly_points,
            (SELECT COUNT(*) FROM observations WHERE user_id = u.id AND date >= date_trunc('month', CURRENT_DATE)) as obs_count,
            (SELECT COUNT(*) FROM permits WHERE user_id = u.id AND date >= date_trunc('month', CURRENT_DATE)) as permit_count,
            (SELECT COUNT(*) FROM challenge_completions WHERE user_id = u.id AND completed_at >= date_trunc('month', CURRENT_DATE)) as challenge_count
          FROM users u
          LEFT JOIN points_events pe ON u.id = pe.user_id
            AND pe.created_at >= date_trunc('month', CURRENT_DATE)
          WHERE u.is_active = true AND u.role != 'admin'
          GROUP BY u.id
          ORDER BY monthly_points DESC
          LIMIT 1
        `);
        
        if (topUser.rows.length > 0) {
          const top = topUser.rows[0];
          await query(`
            INSERT INTO monthly_awards (user_id, month, year, total_points, observations_count, permits_count, challenges_count)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (month, year) DO UPDATE SET
              user_id = $1, total_points = $4, observations_count = $5, permits_count = $6, challenges_count = $7
          `, [top.id, currentMonth, currentYear, top.monthly_points, top.obs_count, top.permit_count, top.challenge_count]);
          
          result = { rows: [{ ...top, month: currentMonth, year: currentYear }] };
        }
      }
      
      res.json(result.rows[0] || null);
    } catch (error) {
      console.error('Error fetching employee of month:', error);
      res.status(500).json({ error: 'Failed to fetch employee of month' });
    }
  });

  // ==================== BADGES ROUTES ====================

  app.get('/api/badges', async (req, res) => {
    try {
      const result = await query('SELECT * FROM badges WHERE is_active = true ORDER BY condition_value');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges' });
    }
  });

  app.get('/api/badges/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const earned = await query(`
        SELECT b.*, ub.earned_at FROM badges b
        JOIN user_badges ub ON b.id = ub.badge_id
        WHERE ub.user_id = $1
        ORDER BY ub.earned_at DESC
      `, [userId]);
      
      const all = await query('SELECT * FROM badges WHERE is_active = true ORDER BY condition_value');
      
      const earnedIds = earned.rows.map(b => b.id);
      const locked = all.rows.filter(b => !earnedIds.includes(b.id));
      
      res.json({ earned: earned.rows, locked });
    } catch (error) {
      console.error('Error fetching user badges:', error);
      res.status(500).json({ error: 'Failed to fetch user badges' });
    }
  });

  // ==================== DAILY CHALLENGES ROUTES ====================

  app.get('/api/challenges', async (req, res) => {
    try {
      const result = await query(`
        SELECT * FROM daily_challenges
        WHERE is_active = true
        ORDER BY points DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      res.status(500).json({ error: 'Failed to fetch challenges' });
    }
  });

  app.get('/api/challenges/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const today = new Date().toISOString().split('T')[0];
      
      const challenges = await query('SELECT * FROM daily_challenges WHERE is_active = true');
      
      const completions = await query(`
        SELECT challenge_id FROM challenge_completions
        WHERE user_id = $1 AND DATE(completed_at) = $2
      `, [userId, today]);
      
      const completedIds = completions.rows.map(c => c.challenge_id);
      
      const result = challenges.rows.map(c => ({
        ...c,
        completed: completedIds.includes(c.id)
      }));
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching user challenges:', error);
      res.status(500).json({ error: 'Failed to fetch user challenges' });
    }
  });

  app.post('/api/challenges/complete', async (req, res) => {
    try {
      const { user_id, challenge_id, evidence_urls, notes } = req.body;
      
      const challenge = await query('SELECT * FROM daily_challenges WHERE id = $1', [challenge_id]);
      if (!challenge.rows.length) {
        return res.status(404).json({ error: 'Challenge not found' });
      }
      
      const existing = await query(`
        SELECT id FROM challenge_completions
        WHERE user_id = $1 AND challenge_id = $2 AND DATE(completed_at) = CURRENT_DATE
      `, [user_id, challenge_id]);
      
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Challenge already completed today' });
      }
      
      if (challenge.rows[0].requires_photo && (!evidence_urls || evidence_urls.length === 0)) {
        return res.status(400).json({ error: 'Photo evidence required for this challenge' });
      }
      
      await query(`
        INSERT INTO challenge_completions (user_id, challenge_id, evidence_urls, notes)
        VALUES ($1, $2, $3, $4)
      `, [user_id, challenge_id, JSON.stringify(evidence_urls || []), notes]);
      
      const points = challenge.rows[0].points;
      await query(`
        INSERT INTO points_events (user_id, event_type, reference_type, reference_id, points, description)
        VALUES ($1, 'challenge', 'daily_challenges', $2, $3, $4)
      `, [user_id, challenge_id, points, `Completed: ${challenge.rows[0].title_en}`]);
      
      await query('UPDATE users SET total_points = total_points + $1 WHERE id = $2', [points, user_id]);
      
      const newLevel = await updateUserLevel(user_id);
      const streak = await updateStreak(user_id);
      const newBadges = await checkAndAwardBadges(user_id);
      
      res.json({
        success: true,
        points_awarded: points,
        new_level: newLevel,
        streak: streak,
        new_badges: newBadges
      });
    } catch (error) {
      console.error('Error completing challenge:', error);
      res.status(500).json({ error: 'Failed to complete challenge' });
    }
  });

  // ==================== NEWS & ANNOUNCEMENTS ROUTES ====================

  app.get('/api/news', async (req, res) => {
    try {
      const { category, limit = 20 } = req.query;
      let queryText = `
        SELECT n.*, u.name as author_name
        FROM news n
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.is_active = true AND (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
      `;
      const params = [];
      let paramIndex = 1;

      if (category) {
        queryText += ` AND n.category = $${paramIndex++}`;
        params.push(category);
      }

      queryText += ` ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit));

      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching news:', error);
      res.status(500).json({ error: 'Failed to fetch news' });
    }
  });

  app.post('/api/news', async (req, res) => {
    try {
      const { title_en, title_ar, title_ur, content_en, content_ar, content_ur, category, priority, image_url, is_pinned, expires_at, created_by } = req.body;
      
      const result = await query(`
        INSERT INTO news (title_en, title_ar, title_ur, content_en, content_ar, content_ur, category, priority, image_url, is_pinned, expires_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [title_en, title_ar, title_ur, content_en, content_ar, content_ur, category || 'general', priority || 'normal', image_url, is_pinned || false, expires_at, created_by]);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating news:', error);
      res.status(500).json({ error: 'Failed to create news' });
    }
  });

  app.put('/api/news/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title_en, title_ar, title_ur, content_en, content_ar, content_ur, category, priority, image_url, is_pinned, is_active, expires_at } = req.body;
      
      const result = await query(`
        UPDATE news SET
          title_en = COALESCE($1, title_en), title_ar = COALESCE($2, title_ar), title_ur = COALESCE($3, title_ur),
          content_en = COALESCE($4, content_en), content_ar = COALESCE($5, content_ar), content_ur = COALESCE($6, content_ur),
          category = COALESCE($7, category), priority = COALESCE($8, priority), image_url = COALESCE($9, image_url),
          is_pinned = COALESCE($10, is_pinned), is_active = COALESCE($11, is_active), expires_at = $12,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $13
        RETURNING *
      `, [title_en, title_ar, title_ur, content_en, content_ar, content_ur, category, priority, image_url, is_pinned, is_active, expires_at, id]);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating news:', error);
      res.status(500).json({ error: 'Failed to update news' });
    }
  });

  app.delete('/api/news/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await query('UPDATE news SET is_active = false WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting news:', error);
      res.status(500).json({ error: 'Failed to delete news' });
    }
  });

  // ==================== INCIDENT REPORTING ROUTES ====================

  app.get('/api/incidents', async (req, res) => {
    try {
      const { status, severity, area, search, limit = 50, offset = 0 } = req.query;
      let queryText = 'SELECT * FROM incidents WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (status) {
        queryText += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (severity) {
        queryText += ` AND severity = $${paramIndex++}`;
        params.push(severity);
      }
      if (area) {
        queryText += ` AND area = $${paramIndex++}`;
        params.push(area);
      }
      if (search) {
        queryText += ` AND (description ILIKE $${paramIndex} OR incident_number ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching incidents:', error);
      res.status(500).json({ error: 'Failed to fetch incidents' });
    }
  });

  app.get('/api/incidents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query('SELECT * FROM incidents WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching incident:', error);
      res.status(500).json({ error: 'Failed to fetch incident' });
    }
  });

  app.post('/api/incidents', async (req, res) => {
    try {
      const {
        reporter_id, reporter_name, area, incident_type, severity, description,
        immediate_actions, persons_involved, injuries_description, property_damage, evidence_urls
      } = req.body;

      const incident_number = `INC-${Date.now().toString(36).toUpperCase()}`;

      const result = await query(`
        INSERT INTO incidents (
          incident_number, reporter_id, reporter_name, area, incident_type, severity,
          description, immediate_actions, persons_involved, injuries_description,
          property_damage, evidence_urls
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        incident_number, reporter_id, reporter_name, area, incident_type, severity,
        description, immediate_actions, persons_involved, injuries_description,
        property_damage, JSON.stringify(evidence_urls || [])
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ error: 'Failed to create incident' });
    }
  });

  app.put('/api/incidents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, root_cause, corrective_actions, investigated_by } = req.body;
      
      let queryText = 'UPDATE incidents SET updated_at = CURRENT_TIMESTAMP';
      const params = [];
      let paramIndex = 1;

      if (status) {
        queryText += `, status = $${paramIndex++}`;
        params.push(status);
        if (status === 'Closed') {
          queryText += `, closed_at = CURRENT_TIMESTAMP`;
        }
      }
      if (root_cause) {
        queryText += `, root_cause = $${paramIndex++}`;
        params.push(root_cause);
      }
      if (corrective_actions) {
        queryText += `, corrective_actions = $${paramIndex++}`;
        params.push(corrective_actions);
      }
      if (investigated_by) {
        queryText += `, investigated_by = $${paramIndex++}`;
        params.push(investigated_by);
      }

      queryText += ` WHERE id = $${paramIndex} RETURNING *`;
      params.push(id);

      const result = await query(queryText, params);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({ error: 'Failed to update incident' });
    }
  });

  // ==================== INSPECTION CHECKLIST ROUTES ====================

  app.get('/api/inspection-templates', async (req, res) => {
    try {
      const result = await query('SELECT * FROM inspection_templates WHERE is_active = true ORDER BY name_en');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching inspection templates:', error);
      res.status(500).json({ error: 'Failed to fetch inspection templates' });
    }
  });

  app.get('/api/inspections', async (req, res) => {
    try {
      const { inspector_id, area, date, limit = 50 } = req.query;
      let queryText = `
        SELECT i.*, it.name_en as template_name
        FROM inspections i
        JOIN inspection_templates it ON i.template_id = it.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (inspector_id) {
        queryText += ` AND i.inspector_id = $${paramIndex++}`;
        params.push(inspector_id);
      }
      if (area) {
        queryText += ` AND i.area = $${paramIndex++}`;
        params.push(area);
      }
      if (date) {
        queryText += ` AND i.date = $${paramIndex++}`;
        params.push(date);
      }

      queryText += ` ORDER BY i.created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit));

      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      res.status(500).json({ error: 'Failed to fetch inspections' });
    }
  });

  app.post('/api/inspections', async (req, res) => {
    try {
      const { template_id, inspector_id, inspector_name, area, shift, responses, overall_status, notes, evidence_urls } = req.body;

      const result = await query(`
        INSERT INTO inspections (template_id, inspector_id, inspector_name, area, shift, responses, overall_status, notes, evidence_urls)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [template_id, inspector_id, inspector_name, area, shift, JSON.stringify(responses), overall_status, notes, JSON.stringify(evidence_urls || [])]);

      if (inspector_id) {
        await query(`
          INSERT INTO points_events (user_id, event_type, reference_type, reference_id, points, description)
          VALUES ($1, 'inspection', 'inspections', $2, 8, 'Completed daily inspection')
        `, [inspector_id, result.rows[0].id]);
        
        await query('UPDATE users SET total_points = total_points + 8 WHERE id = $1', [inspector_id]);
        await updateUserLevel(inspector_id);
        await updateStreak(inspector_id);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating inspection:', error);
      res.status(500).json({ error: 'Failed to create inspection' });
    }
  });

  // ==================== SHIFT HANDOVER ROUTES ====================

  app.get('/api/handovers', async (req, res) => {
    try {
      const { area, date, limit = 20 } = req.query;
      let queryText = 'SELECT * FROM shift_handovers WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (area) {
        queryText += ` AND area = $${paramIndex++}`;
        params.push(area);
      }
      if (date) {
        queryText += ` AND date = $${paramIndex++}`;
        params.push(date);
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit));

      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching handovers:', error);
      res.status(500).json({ error: 'Failed to fetch handovers' });
    }
  });

  app.post('/api/handovers', async (req, res) => {
    try {
      const {
        from_user_id, from_user_name, to_user_name, shift_from, shift_to, area,
        pending_tasks, completed_tasks, safety_concerns, equipment_status, notes
      } = req.body;

      const result = await query(`
        INSERT INTO shift_handovers (
          from_user_id, from_user_name, to_user_name, shift_from, shift_to, area,
          pending_tasks, completed_tasks, safety_concerns, equipment_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [from_user_id, from_user_name, to_user_name, shift_from, shift_to, area,
          pending_tasks, completed_tasks, safety_concerns, equipment_status, notes]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating handover:', error);
      res.status(500).json({ error: 'Failed to create handover' });
    }
  });

  app.put('/api/handovers/:id/acknowledge', async (req, res) => {
    try {
      const { id } = req.params;
      const { acknowledged_by } = req.body;
      
      const result = await query(`
        UPDATE shift_handovers
        SET acknowledged = true, acknowledged_by = $1, acknowledged_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [acknowledged_by, id]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error acknowledging handover:', error);
      res.status(500).json({ error: 'Failed to acknowledge handover' });
    }
  });

  // ==================== CERTIFICATIONS ROUTES ====================

  app.get('/api/certifications', async (req, res) => {
    try {
      const { user_id, status, expiring_soon } = req.query;
      let queryText = 'SELECT * FROM certifications WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (user_id) {
        queryText += ` AND user_id = $${paramIndex++}`;
        params.push(user_id);
      }
      if (status) {
        queryText += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (expiring_soon === 'true') {
        queryText += ` AND expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND expiry_date >= CURRENT_DATE`;
      }

      queryText += ' ORDER BY expiry_date';
      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      res.status(500).json({ error: 'Failed to fetch certifications' });
    }
  });

  app.post('/api/certifications', async (req, res) => {
    try {
      const {
        user_id, user_name, certification_type, certification_number,
        issuing_authority, issue_date, expiry_date, certificate_url, notes
      } = req.body;

      const result = await query(`
        INSERT INTO certifications (
          user_id, user_name, certification_type, certification_number,
          issuing_authority, issue_date, expiry_date, certificate_url, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [user_id, user_name, certification_type, certification_number,
          issuing_authority, issue_date, expiry_date, certificate_url, notes]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating certification:', error);
      res.status(500).json({ error: 'Failed to create certification' });
    }
  });

  // ==================== CONTRACTOR SIGN-IN ROUTES ====================

  app.get('/api/contractors', async (req, res) => {
    try {
      const { date, on_site } = req.query;
      let queryText = 'SELECT * FROM contractor_signins WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (date) {
        queryText += ` AND DATE(sign_in_time) = $${paramIndex++}`;
        params.push(date);
      }
      if (on_site === 'true') {
        queryText += ' AND sign_out_time IS NULL';
      }

      queryText += ' ORDER BY sign_in_time DESC';
      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching contractors:', error);
      res.status(500).json({ error: 'Failed to fetch contractors' });
    }
  });

  app.post('/api/contractors/signin', async (req, res) => {
    try {
      const {
        contractor_name, company, id_number, phone, purpose, area,
        host_name, safety_briefing_completed, ppe_verified, badge_number, vehicle_plate, notes
      } = req.body;

      const result = await query(`
        INSERT INTO contractor_signins (
          contractor_name, company, id_number, phone, purpose, area,
          host_name, safety_briefing_completed, ppe_verified, badge_number, vehicle_plate, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [contractor_name, company, id_number, phone, purpose, area,
          host_name, safety_briefing_completed || false, ppe_verified || false, badge_number, vehicle_plate, notes]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error signing in contractor:', error);
      res.status(500).json({ error: 'Failed to sign in contractor' });
    }
  });

  app.put('/api/contractors/:id/signout', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await query(`
        UPDATE contractor_signins
        SET sign_out_time = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error signing out contractor:', error);
      res.status(500).json({ error: 'Failed to sign out contractor' });
    }
  });

  // ==================== ENHANCED STATS ROUTES ====================
  
  app.get('/api/stats', async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const obsToday = await query(
        'SELECT COUNT(*) as count FROM observations WHERE date = $1',
        [today]
      );
      const permitsToday = await query(
        'SELECT COUNT(*) as count FROM permits WHERE date = $1',
        [today]
      );
      const obsTotal = await query('SELECT COUNT(*) as count FROM observations');
      const permitsTotal = await query('SELECT COUNT(*) as count FROM permits');
      const equipmentTotal = await query('SELECT COUNT(*) as count FROM equipment');
      
      const obsThisMonth = await query(`
        SELECT COUNT(*) as count FROM observations 
        WHERE date >= date_trunc('month', CURRENT_DATE)
      `);
      
      const topAreas = await query(`
        SELECT area, COUNT(*) as count 
        FROM observations 
        WHERE area IS NOT NULL AND area != ''
        GROUP BY area 
        ORDER BY count DESC 
        LIMIT 5
      `);
      
      const topCauses = await query(`
        SELECT direct_cause, COUNT(*) as count 
        FROM observations 
        WHERE direct_cause IS NOT NULL AND direct_cause != ''
        GROUP BY direct_cause 
        ORDER BY count DESC 
        LIMIT 5
      `);

      const riskDistribution = await query(`
        SELECT risk_level, COUNT(*) as count 
        FROM observations 
        WHERE risk_level IS NOT NULL AND risk_level != ''
        GROUP BY risk_level
      `);

      const incidentsOpen = await query(`SELECT COUNT(*) as count FROM incidents WHERE status = 'Open'`);
      const contractorsOnSite = await query(`SELECT COUNT(*) as count FROM contractor_signins WHERE sign_out_time IS NULL`);
      const expiringCerts = await query(`
        SELECT COUNT(*) as count FROM certifications 
        WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND expiry_date >= CURRENT_DATE
      `);
      const expiringEquipment = await query(`
        SELECT COUNT(*) as count FROM equipment 
        WHERE (internal_inspection_date <= CURRENT_DATE + INTERVAL '14 days' AND internal_inspection_date >= CURRENT_DATE)
        OR (third_party_inspection_date <= CURRENT_DATE + INTERVAL '14 days' AND third_party_inspection_date >= CURRENT_DATE)
      `);

      res.json({
        observationsToday: parseInt(obsToday.rows[0].count),
        permitsToday: parseInt(permitsToday.rows[0].count),
        observationsTotal: parseInt(obsTotal.rows[0].count),
        permitsTotal: parseInt(permitsTotal.rows[0].count),
        equipmentTotal: parseInt(equipmentTotal.rows[0].count),
        observationsThisMonth: parseInt(obsThisMonth.rows[0].count),
        topAreas: topAreas.rows,
        topCauses: topCauses.rows,
        riskDistribution: riskDistribution.rows,
        incidentsOpen: parseInt(incidentsOpen.rows[0].count),
        contractorsOnSite: parseInt(contractorsOnSite.rows[0].count),
        expiringCertifications: parseInt(expiringCerts.rows[0].count),
        expiringEquipmentInspections: parseInt(expiringEquipment.rows[0].count)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // ==================== ORIGINAL ROUTES (Enhanced) ====================

  app.get('/api/observations', async (req, res) => {
    try {
      const { area, status, risk_level, search, limit = 50, offset = 0 } = req.query;
      let queryText = 'SELECT * FROM observations WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (area) {
        queryText += ` AND area = $${paramIndex++}`;
        params.push(area);
      }
      if (status) {
        queryText += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (risk_level) {
        queryText += ` AND risk_level = $${paramIndex++}`;
        params.push(risk_level);
      }
      if (search) {
        queryText += ` AND (description ILIKE $${paramIndex} OR reporter_name ILIKE $${paramIndex} OR area ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching observations:', error);
      res.status(500).json({ error: 'Failed to fetch observations' });
    }
  });

  app.get('/api/observations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query('SELECT * FROM observations WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Observation not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching observation:', error);
      res.status(500).json({ error: 'Failed to fetch observation' });
    }
  });

  app.post('/api/observations', async (req, res) => {
    try {
      const {
        user_id, reporter_name, reporter_id, reporter_position, area, observation_type,
        observation_class, description, direct_cause, root_cause, equipment,
        likelihood, severity, risk_level, corrective_action, evidence_urls
      } = req.body;

      const code = `OBS-${Date.now().toString(36).toUpperCase()}`;

      const result = await query(`
        INSERT INTO observations (
          code, user_id, reporter_name, reporter_id, reporter_position, area, observation_type,
          observation_class, description, direct_cause, root_cause, equipment,
          likelihood, severity, risk_level, corrective_action, evidence_urls
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        code, user_id, reporter_name, reporter_id, reporter_position, area, observation_type,
        observation_class, description, direct_cause, root_cause, equipment,
        likelihood, severity, risk_level, corrective_action, JSON.stringify(evidence_urls || [])
      ]);

      if (user_id) {
        await query(`
          INSERT INTO points_events (user_id, event_type, reference_type, reference_id, points, description)
          VALUES ($1, 'observation', 'observations', $2, 10, 'Submitted safety observation')
        `, [user_id, result.rows[0].id]);
        
        await query('UPDATE users SET total_points = total_points + 10 WHERE id = $1', [user_id]);
        await updateUserLevel(user_id);
        await updateStreak(user_id);
        await checkAndAwardBadges(user_id);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating observation:', error);
      res.status(500).json({ error: 'Failed to create observation' });
    }
  });

  app.put('/api/observations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, corrective_action } = req.body;
      
      const result = await query(`
        UPDATE observations
        SET status = COALESCE($1, status), corrective_action = COALESCE($2, corrective_action), updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `, [status, corrective_action, id]);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating observation:', error);
      res.status(500).json({ error: 'Failed to update observation' });
    }
  });

  app.delete('/api/observations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await query('DELETE FROM observations WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting observation:', error);
      res.status(500).json({ error: 'Failed to delete observation' });
    }
  });

  app.get('/api/permits', async (req, res) => {
    try {
      const { area, permit_type, status, search, limit = 50, offset = 0 } = req.query;
      let queryText = 'SELECT * FROM permits WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (area) {
        queryText += ` AND area = $${paramIndex++}`;
        params.push(area);
      }
      if (permit_type) {
        queryText += ` AND permit_type = $${paramIndex++}`;
        params.push(permit_type);
      }
      if (status) {
        queryText += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (search) {
        queryText += ` AND (permit_number ILIKE $${paramIndex} OR work_description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching permits:', error);
      res.status(500).json({ error: 'Failed to fetch permits' });
    }
  });

  app.get('/api/permits/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query('SELECT * FROM permits WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Permit not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching permit:', error);
      res.status(500).json({ error: 'Failed to fetch permit' });
    }
  });

  app.post('/api/permits', async (req, res) => {
    try {
      const {
        user_id, permit_number, area, permit_type, receiver_name, project,
        work_description, issues, corrective_actions, permit_file_url, evidence_urls
      } = req.body;

      const result = await query(`
        INSERT INTO permits (
          user_id, permit_number, area, permit_type, receiver_name, project,
          work_description, issues, corrective_actions, permit_file_url, evidence_urls
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        user_id, permit_number || `PER-${Date.now().toString(36).toUpperCase()}`,
        area, permit_type, receiver_name, project,
        work_description, issues, corrective_actions, permit_file_url,
        JSON.stringify(evidence_urls || [])
      ]);

      if (user_id) {
        await query(`
          INSERT INTO points_events (user_id, event_type, reference_type, reference_id, points, description)
          VALUES ($1, 'permit', 'permits', $2, 8, 'Processed work permit')
        `, [user_id, result.rows[0].id]);
        
        await query('UPDATE users SET total_points = total_points + 8 WHERE id = $1', [user_id]);
        await updateUserLevel(user_id);
        await updateStreak(user_id);
        await checkAndAwardBadges(user_id);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating permit:', error);
      res.status(500).json({ error: 'Failed to create permit' });
    }
  });

  app.put('/api/permits/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, issues, corrective_actions } = req.body;
      
      const result = await query(`
        UPDATE permits
        SET status = COALESCE($1, status), issues = COALESCE($2, issues), 
            corrective_actions = COALESCE($3, corrective_actions), updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [status, issues, corrective_actions, id]);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating permit:', error);
      res.status(500).json({ error: 'Failed to update permit' });
    }
  });

  app.delete('/api/permits/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await query('DELETE FROM permits WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting permit:', error);
      res.status(500).json({ error: 'Failed to delete permit' });
    }
  });

  app.get('/api/equipment', async (req, res) => {
    try {
      const { area, status, equipment_type, search, limit = 50, offset = 0 } = req.query;
      let queryText = 'SELECT * FROM equipment WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (area) {
        queryText += ` AND area = $${paramIndex++}`;
        params.push(area);
      }
      if (status) {
        queryText += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (equipment_type) {
        queryText += ` AND equipment_type = $${paramIndex++}`;
        params.push(equipment_type);
      }
      if (search) {
        queryText += ` AND (asset_number ILIKE $${paramIndex} OR equipment_type ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      res.status(500).json({ error: 'Failed to fetch equipment' });
    }
  });

  app.get('/api/equipment/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await query('SELECT * FROM equipment WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      res.status(500).json({ error: 'Failed to fetch equipment' });
    }
  });

  app.post('/api/equipment', async (req, res) => {
    try {
      const {
        asset_number, equipment_type, owner, area,
        internal_inspection_date, third_party_inspection_date,
        last_maintenance_date, status, certificate_url, image_url, evidence_urls, notes
      } = req.body;

      const result = await query(`
        INSERT INTO equipment (
          asset_number, equipment_type, owner, area,
          internal_inspection_date, third_party_inspection_date,
          last_maintenance_date, status, certificate_url, image_url, evidence_urls, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        asset_number || `EQP-${Date.now().toString(36).toUpperCase()}`,
        equipment_type, owner, area,
        internal_inspection_date || null, third_party_inspection_date || null,
        last_maintenance_date || null, status || 'Active',
        certificate_url, image_url, JSON.stringify(evidence_urls || []), notes
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating equipment:', error);
      res.status(500).json({ error: 'Failed to create equipment' });
    }
  });

  app.put('/api/equipment/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, internal_inspection_date, third_party_inspection_date, last_maintenance_date, notes } = req.body;
      
      const result = await query(`
        UPDATE equipment
        SET status = COALESCE($1, status),
            internal_inspection_date = COALESCE($2, internal_inspection_date),
            third_party_inspection_date = COALESCE($3, third_party_inspection_date),
            last_maintenance_date = COALESCE($4, last_maintenance_date),
            notes = COALESCE($5, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [status, internal_inspection_date, third_party_inspection_date, last_maintenance_date, notes, id]);
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating equipment:', error);
      res.status(500).json({ error: 'Failed to update equipment' });
    }
  });

  app.delete('/api/equipment/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await query('DELETE FROM equipment WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting equipment:', error);
      res.status(500).json({ error: 'Failed to delete equipment' });
    }
  });

  app.get('/api/equipment/expiring', async (req, res) => {
    try {
      const { days = 14 } = req.query;
      const result = await query(`
        SELECT * FROM equipment
        WHERE (internal_inspection_date <= CURRENT_DATE + $1::integer * INTERVAL '1 day' AND internal_inspection_date >= CURRENT_DATE)
        OR (third_party_inspection_date <= CURRENT_DATE + $1::integer * INTERVAL '1 day' AND third_party_inspection_date >= CURRENT_DATE)
        ORDER BY LEAST(COALESCE(internal_inspection_date, '9999-12-31'), COALESCE(third_party_inspection_date, '9999-12-31'))
      `, [parseInt(days)]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching expiring equipment:', error);
      res.status(500).json({ error: 'Failed to fetch expiring equipment' });
    }
  });

  app.get('/api/toolbox-talks', async (req, res) => {
    try {
      const { search, category } = req.query;
      let queryText = 'SELECT * FROM toolbox_talks WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (search) {
        queryText += ` AND title ILIKE $${paramIndex++}`;
        params.push(`%${search}%`);
      }
      if (category) {
        queryText += ` AND category = $${paramIndex++}`;
        params.push(category);
      }

      queryText += ' ORDER BY created_at DESC';
      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching toolbox talks:', error);
      res.status(500).json({ error: 'Failed to fetch toolbox talks' });
    }
  });

  app.post('/api/toolbox-talks', async (req, res) => {
    try {
      const { title, category, document_url, description, conducted_by, conducted_by_name, attendees_count, area, evidence_urls } = req.body;

      const result = await query(`
        INSERT INTO toolbox_talks (title, category, document_url, description, conducted_by, conducted_by_name, attendees_count, area, evidence_urls)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [title, category, document_url, description, conducted_by, conducted_by_name, attendees_count || 0, area, JSON.stringify(evidence_urls || [])]);

      if (conducted_by) {
        await query(`
          INSERT INTO points_events (user_id, event_type, reference_type, reference_id, points, description)
          VALUES ($1, 'toolbox_talk', 'toolbox_talks', $2, 12, 'Conducted toolbox talk')
        `, [conducted_by, result.rows[0].id]);
        
        await query('UPDATE users SET total_points = total_points + 12 WHERE id = $1', [conducted_by]);
        await updateUserLevel(conducted_by);
        await updateStreak(conducted_by);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating toolbox talk:', error);
      res.status(500).json({ error: 'Failed to create toolbox talk' });
    }
  });

  app.get('/api/jsa-documents', async (req, res) => {
    try {
      const { search } = req.query;
      let queryText = 'SELECT * FROM jsa_documents';
      const params = [];

      if (search) {
        queryText += ' WHERE title ILIKE $1';
        params.push(`%${search}%`);
      }

      queryText += ' ORDER BY title';
      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching JSA documents:', error);
      res.status(500).json({ error: 'Failed to fetch JSA documents' });
    }
  });

  app.get('/api/csm-documents', async (req, res) => {
    try {
      const { search } = req.query;
      let queryText = 'SELECT * FROM csm_documents';
      const params = [];

      if (search) {
        queryText += ' WHERE title ILIKE $1';
        params.push(`%${search}%`);
      }

      queryText += ' ORDER BY title';
      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching CSM documents:', error);
      res.status(500).json({ error: 'Failed to fetch CSM documents' });
    }
  });

  app.get('/api/areas', async (req, res) => {
    try {
      const result = await query(`
        SELECT DISTINCT area FROM (
          SELECT area FROM observations WHERE area IS NOT NULL AND area != ''
          UNION
          SELECT area FROM permits WHERE area IS NOT NULL AND area != ''
          UNION
          SELECT area FROM equipment WHERE area IS NOT NULL AND area != ''
        ) as areas ORDER BY area
      `);
      res.json(result.rows.map(r => r.area));
    } catch (error) {
      console.error('Error fetching areas:', error);
      res.status(500).json({ error: 'Failed to fetch areas' });
    }
  });

  // ==================== ANALYTICS ROUTES ====================

  app.get('/api/analytics/trends', async (req, res) => {
    try {
      const { days = 30 } = req.query;
      
      const observations = await query(`
        SELECT DATE(date) as day, COUNT(*) as count
        FROM observations
        WHERE date >= CURRENT_DATE - $1::integer
        GROUP BY DATE(date)
        ORDER BY day
      `, [parseInt(days)]);

      const permits = await query(`
        SELECT DATE(date) as day, COUNT(*) as count
        FROM permits
        WHERE date >= CURRENT_DATE - $1::integer
        GROUP BY DATE(date)
        ORDER BY day
      `, [parseInt(days)]);

      const incidents = await query(`
        SELECT DATE(date) as day, COUNT(*) as count
        FROM incidents
        WHERE date >= CURRENT_DATE - $1::integer
        GROUP BY DATE(date)
        ORDER BY day
      `, [parseInt(days)]);

      res.json({
        observations: observations.rows,
        permits: permits.rows,
        incidents: incidents.rows
      });
    } catch (error) {
      console.error('Error fetching analytics trends:', error);
      res.status(500).json({ error: 'Failed to fetch analytics trends' });
    }
  });

  app.get('/api/analytics/risk-breakdown', async (req, res) => {
    try {
      const byArea = await query(`
        SELECT area, risk_level, COUNT(*) as count
        FROM observations
        WHERE area IS NOT NULL AND risk_level IS NOT NULL
        GROUP BY area, risk_level
        ORDER BY area, risk_level
      `);

      const byType = await query(`
        SELECT observation_type, risk_level, COUNT(*) as count
        FROM observations
        WHERE observation_type IS NOT NULL AND risk_level IS NOT NULL
        GROUP BY observation_type, risk_level
        ORDER BY observation_type, risk_level
      `);

      const byCause = await query(`
        SELECT direct_cause, COUNT(*) as count
        FROM observations
        WHERE direct_cause IS NOT NULL AND direct_cause != ''
        GROUP BY direct_cause
        ORDER BY count DESC
        LIMIT 10
      `);

      res.json({
        byArea: byArea.rows,
        byType: byType.rows,
        byCause: byCause.rows
      });
    } catch (error) {
      console.error('Error fetching risk breakdown:', error);
      res.status(500).json({ error: 'Failed to fetch risk breakdown' });
    }
  });

  // ==================== GOOGLE SHEETS IMPORT ROUTES ====================

  app.get('/api/import/observations', async (req, res) => {
    try {
      const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXlN-sE-IkQJLMaVOvRGSBYNLsDvwZTD15w7rarTIXBGoacF0C5_eiI7OmFs__zA8jtlwhy0ULLZ8N/pub?output=csv';
      
      const response = await fetch(sheetUrl, { redirect: 'follow' });
      const csvText = await response.text();
      
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const observations = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = parseCSVLine(lines[i]);
        if (values.length < 10) continue;
        
        const obs = {
          code: values[0] || `OBS-${i}`,
          date: parseDate(values[1]),
          day: values[2],
          group_number: values[3],
          observation_type: values[4],
          observation_class: values[5],
          type_detail: values[6],
          injury_status: values[7],
          injury_type: values[8],
          description: values[9],
          reporter_name: values[10] || 'N/A',
          reporter_id: values[11] || 'N/A',
          reporter_position: values[12],
          direct_cause: values[13],
          root_cause: values[14],
          equipment: values[15],
          area: values[16],
          likelihood: parseInt(values[17]) || 1,
          severity: parseInt(values[18]) || 1,
          ra_rate: parseInt(values[19]) || 1,
          risk_level: values[20] || 'Low',
          status: values[21] || 'Open',
          gi_number: values[22],
          comments: values[23],
          evidence_urls: parsePhotoUrls(values[24])
        };
        
        if (obs.description && obs.description.trim()) {
          observations.push(obs);
        }
      }
      
      for (const obs of observations) {
        const existing = await query('SELECT id FROM observations WHERE code = $1', [obs.code]);
        
        if (existing.rows.length === 0) {
          await query(`
            INSERT INTO observations (
              code, date, reporter_name, reporter_id, reporter_position, area, observation_type,
              observation_class, description, direct_cause, root_cause, equipment,
              likelihood, severity, risk_level, corrective_action, evidence_urls, status, comments
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          `, [
            obs.code, obs.date, obs.reporter_name, obs.reporter_id, obs.reporter_position,
            obs.area, obs.observation_type, obs.observation_class, obs.description,
            obs.direct_cause, obs.root_cause, obs.equipment, obs.likelihood, obs.severity,
            obs.risk_level, obs.gi_number, JSON.stringify(obs.evidence_urls), obs.status, obs.comments
          ]);
        }
      }
      
      res.json({ success: true, imported: observations.length, message: `Imported ${observations.length} observations from Google Sheets` });
    } catch (error) {
      console.error('Error importing observations:', error);
      res.status(500).json({ error: 'Failed to import observations', details: error.message });
    }
  });

  app.get('/api/import/permits', async (req, res) => {
    try {
      const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2D8IOXDcrOpuD1u4moykgT8tNxtsUGIcPjZkwN8gnuwgHCEz4eCh9_5n83vhYoraB4YSkm9YAda17/pub?output=csv';
      
      const response = await fetch(sheetUrl, { redirect: 'follow' });
      const csvText = await response.text();
      
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const permits = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = parseCSVLine(lines[i]);
        if (values.length < 8) continue;
        
        const permit = {
          timestamp: values[0],
          email: values[1],
          date: parseDate(values[2]),
          area: values[3],
          receiver_name: values[4],
          project: values[5],
          permit_type: values[6],
          permit_number: values[7],
          description: values[8],
          corrective_actions: values[9],
          remarks: values[10],
          permit_photo: values[11],
          work_photos: values[12],
          confirmation: values[13]
        };
        
        permits.push(permit);
      }
      
      for (const permit of permits) {
        if (!permit.permit_number) continue;
        
        const existing = await query('SELECT id FROM permits WHERE permit_number = $1', [permit.permit_number]);
        
        if (existing.rows.length === 0) {
          const photos = [];
          if (permit.permit_photo) photos.push(permit.permit_photo);
          if (permit.work_photos) photos.push(permit.work_photos);
          
          await query(`
            INSERT INTO permits (
              permit_number, date, receiver_name, area, permit_type, project,
              description, corrective_actions, evidence_urls, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            permit.permit_number, permit.date, permit.receiver_name, permit.area,
            permit.permit_type, permit.project, permit.description, permit.corrective_actions,
            JSON.stringify(photos), 'Open'
          ]);
        }
      }
      
      res.json({ success: true, imported: permits.length, message: `Imported ${permits.length} permits from Google Sheets` });
    } catch (error) {
      console.error('Error importing permits:', error);
      res.status(500).json({ error: 'Failed to import permits', details: error.message });
    }
  });

  function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    return values.map(v => v.replace(/^"|"$/g, ''));
  }

  function parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    dateStr = dateStr.replace(/"/g, '').trim();
    
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        let year = parts[2] || parts[0];
        let month = parts[0];
        let day = parts[1];
        
        if (dateStr.match(/^\d{4}/)) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
        }
        
        if (year.length === 2) year = '20' + year;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return dateStr;
  }

  function parsePhotoUrls(photoStr) {
    if (!photoStr) return [];
    
    const photos = [];
    const parts = photoStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
      if (part.includes('drive.google.com')) {
        const match = part.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) {
          photos.push(`https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`);
        }
      } else if (part.match(/\.(jpg|jpeg|png|gif)$/i)) {
        photos.push(`/uploads/${part}`);
      } else if (part.length > 5) {
        photos.push(part);
      }
    }
    
    return photos;
  }

  // ==================== EMERGENCY CONTACTS ====================
  
  app.get('/api/emergency-contacts', async (req, res) => {
    const contacts = [
      { name: 'Emergency (Saudi Arabia)', number: '911', icon: 'phone-volume', type: 'emergency' },
      { name: 'Fire Department', number: '998', icon: 'fire-extinguisher', type: 'emergency' },
      { name: 'Ambulance', number: '997', icon: 'ambulance', type: 'emergency' },
      { name: 'Traffic Police', number: '993', icon: 'car-crash', type: 'emergency' },
      { name: 'Safety Office - CAT Project', number: '+966-XXX-XXXX', icon: 'hard-hat', type: 'safety' },
      { name: 'HSE Manager', number: '+966-XXX-XXXX', icon: 'user-tie', type: 'safety' },
      { name: 'Site Supervisor', number: '+966-XXX-XXXX', icon: 'user-shield', type: 'site' },
      { name: 'Medical Center', number: '+966-XXX-XXXX', icon: 'hospital', type: 'medical' },
      { name: 'Security Control Room', number: '+966-XXX-XXXX', icon: 'shield-alt', type: 'security' }
    ];
    res.json(contacts);
  });

  // ==================== LIBRARY DOCUMENTS ====================

  app.get('/api/library/documents', async (req, res) => {
    const { category } = req.query;
    
    const documents = [
      // TBT Documents
      { id: 1, title: 'Heat Stress Prevention', category: 'tbt', description: 'Toolbox talk on preventing heat-related illness', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'temperature-high' },
      { id: 2, title: 'PPE Requirements', category: 'tbt', description: 'Personal Protective Equipment guidelines', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'hard-hat' },
      { id: 3, title: 'Working at Heights', category: 'tbt', description: 'Safety procedures for elevated work', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'arrow-up' },
      { id: 4, title: 'Hot Work Safety', category: 'tbt', description: 'Welding and cutting safety procedures', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'fire' },
      { id: 5, title: 'Lifting Operations', category: 'tbt', description: 'Crane and rigging safety', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'weight-hanging' },
      { id: 6, title: 'Confined Space Entry', category: 'tbt', description: 'Procedures for entering confined spaces', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'door-open' },
      { id: 7, title: 'Electrical Safety', category: 'tbt', description: 'Electrical hazard prevention', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'bolt' },
      { id: 8, title: 'Housekeeping', category: 'tbt', description: 'Workplace organization and cleanliness', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'broom' },
      
      // JSA Documents
      { id: 20, title: 'Crane Operation JSA', category: 'jsa', description: 'Job Safety Analysis for crane operations', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'industry' },
      { id: 21, title: 'Excavation Work JSA', category: 'jsa', description: 'Job Safety Analysis for excavation', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'tractor' },
      { id: 22, title: 'Welding Operations JSA', category: 'jsa', description: 'Job Safety Analysis for welding work', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'fire' },
      { id: 23, title: 'Scaffolding Work JSA', category: 'jsa', description: 'Job Safety Analysis for scaffolding', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'building' },
      { id: 24, title: 'Material Handling JSA', category: 'jsa', description: 'Job Safety Analysis for manual handling', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'boxes' },
      
      // CSM Documents  
      { id: 40, title: 'CSM 5th Edition - Chapter 1', category: 'csm', description: 'Contractor Safety Management Overview', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'book' },
      { id: 41, title: 'CSM 5th Edition - Chapter 2', category: 'csm', description: 'Safety Organization Requirements', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'book' },
      { id: 42, title: 'CSM 5th Edition - Chapter 3', category: 'csm', description: 'Hazard Assessment and Control', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'book' },
      { id: 43, title: 'SAES-P-111', category: 'csm', description: 'Lifting Equipment Requirements', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'file-alt' },
      { id: 44, title: 'GI Standards', category: 'csm', description: 'General Instructions for Safety', url: 'https://drive.google.com/file/d/XXXXX/view', icon: 'file-alt' }
    ];
    
    if (category) {
      res.json(documents.filter(d => d.category === category));
    } else {
      res.json(documents);
    }
  });
}
