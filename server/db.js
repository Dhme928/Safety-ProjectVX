import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Users table with roles and authentication
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(100) UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        password_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'safety_officer',
        area VARCHAR(255),
        position VARCHAR(255),
        avatar_url TEXT,
        total_points INTEGER DEFAULT 0,
        current_level VARCHAR(50) DEFAULT 'Bronze',
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_activity_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Points events tracking
      CREATE TABLE IF NOT EXISTS points_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        event_type VARCHAR(50) NOT NULL,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        points INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Badges and achievements definitions
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255),
        name_ur VARCHAR(255),
        description_en TEXT,
        description_ar TEXT,
        description_ur TEXT,
        icon VARCHAR(100),
        color VARCHAR(50),
        points_required INTEGER DEFAULT 0,
        condition_type VARCHAR(100),
        condition_value INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- User badges (many-to-many)
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        badge_id INTEGER REFERENCES badges(id),
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_id)
      );

      -- Daily challenges
      CREATE TABLE IF NOT EXISTS daily_challenges (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255),
        title_ur VARCHAR(255),
        description_en TEXT,
        description_ar TEXT,
        description_ur TEXT,
        points INTEGER DEFAULT 10,
        challenge_type VARCHAR(100),
        target_count INTEGER DEFAULT 1,
        requires_photo BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- User challenge completions
      CREATE TABLE IF NOT EXISTS challenge_completions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        challenge_id INTEGER REFERENCES daily_challenges(id),
        evidence_urls JSONB DEFAULT '[]',
        notes TEXT,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified BOOLEAN DEFAULT false,
        verified_by INTEGER REFERENCES users(id),
        UNIQUE(user_id, challenge_id)
      );

      -- Employee of the month awards
      CREATE TABLE IF NOT EXISTS monthly_awards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_points INTEGER,
        observations_count INTEGER DEFAULT 0,
        permits_count INTEGER DEFAULT 0,
        challenges_count INTEGER DEFAULT 0,
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(month, year)
      );

      -- News and announcements
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255),
        title_ur VARCHAR(255),
        content_en TEXT,
        content_ar TEXT,
        content_ur TEXT,
        category VARCHAR(100) DEFAULT 'general',
        priority VARCHAR(50) DEFAULT 'normal',
        image_url TEXT,
        is_pinned BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Incidents and near-misses
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        incident_number VARCHAR(100),
        date DATE DEFAULT CURRENT_DATE,
        time TIME DEFAULT CURRENT_TIME,
        reporter_id INTEGER REFERENCES users(id),
        reporter_name VARCHAR(255),
        area VARCHAR(255),
        incident_type VARCHAR(100),
        severity VARCHAR(50),
        description TEXT,
        immediate_actions TEXT,
        root_cause TEXT,
        corrective_actions TEXT,
        persons_involved TEXT,
        injuries_description TEXT,
        property_damage TEXT,
        evidence_urls JSONB DEFAULT '[]',
        status VARCHAR(100) DEFAULT 'Open',
        investigated_by INTEGER REFERENCES users(id),
        closed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Daily inspection checklists
      CREATE TABLE IF NOT EXISTS inspection_templates (
        id SERIAL PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255),
        name_ur VARCHAR(255),
        category VARCHAR(100),
        items JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Completed inspections
      CREATE TABLE IF NOT EXISTS inspections (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES inspection_templates(id),
        inspector_id INTEGER REFERENCES users(id),
        inspector_name VARCHAR(255),
        date DATE DEFAULT CURRENT_DATE,
        area VARCHAR(255),
        shift VARCHAR(50),
        responses JSONB NOT NULL,
        overall_status VARCHAR(50),
        notes TEXT,
        evidence_urls JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Shift handover notes
      CREATE TABLE IF NOT EXISTS shift_handovers (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER REFERENCES users(id),
        from_user_name VARCHAR(255),
        to_user_name VARCHAR(255),
        date DATE DEFAULT CURRENT_DATE,
        shift_from VARCHAR(50),
        shift_to VARCHAR(50),
        area VARCHAR(255),
        pending_tasks TEXT,
        completed_tasks TEXT,
        safety_concerns TEXT,
        equipment_status TEXT,
        notes TEXT,
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_by INTEGER REFERENCES users(id),
        acknowledged_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Training and certifications
      CREATE TABLE IF NOT EXISTS certifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        user_name VARCHAR(255),
        certification_type VARCHAR(255) NOT NULL,
        certification_number VARCHAR(100),
        issuing_authority VARCHAR(255),
        issue_date DATE,
        expiry_date DATE,
        certificate_url TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Contractor sign-ins
      CREATE TABLE IF NOT EXISTS contractor_signins (
        id SERIAL PRIMARY KEY,
        contractor_name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        id_number VARCHAR(100),
        phone VARCHAR(50),
        purpose TEXT,
        area VARCHAR(255),
        host_name VARCHAR(255),
        sign_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sign_out_time TIMESTAMP,
        safety_briefing_completed BOOLEAN DEFAULT false,
        ppe_verified BOOLEAN DEFAULT false,
        badge_number VARCHAR(50),
        vehicle_plate VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Original tables
      CREATE TABLE IF NOT EXISTS observations (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50),
        date DATE DEFAULT CURRENT_DATE,
        time TIME DEFAULT CURRENT_TIME,
        user_id INTEGER REFERENCES users(id),
        reporter_name VARCHAR(255),
        reporter_id VARCHAR(100),
        reporter_position VARCHAR(255),
        area VARCHAR(255),
        observation_type VARCHAR(100),
        observation_class VARCHAR(100),
        description TEXT,
        direct_cause VARCHAR(255),
        root_cause TEXT,
        equipment VARCHAR(255),
        likelihood VARCHAR(50),
        severity VARCHAR(50),
        risk_level VARCHAR(50),
        status VARCHAR(100) DEFAULT 'Open',
        corrective_action TEXT,
        evidence_urls JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permits (
        id SERIAL PRIMARY KEY,
        permit_number VARCHAR(100),
        date DATE DEFAULT CURRENT_DATE,
        user_id INTEGER REFERENCES users(id),
        area VARCHAR(255),
        permit_type VARCHAR(100),
        receiver_name VARCHAR(255),
        project VARCHAR(255),
        work_description TEXT,
        issues TEXT,
        corrective_actions TEXT,
        permit_file_url TEXT,
        evidence_urls JSONB DEFAULT '[]',
        status VARCHAR(100) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS equipment (
        id SERIAL PRIMARY KEY,
        asset_number VARCHAR(100),
        equipment_type VARCHAR(255),
        owner VARCHAR(255),
        area VARCHAR(255),
        internal_inspection_date DATE,
        third_party_inspection_date DATE,
        last_maintenance_date DATE,
        status VARCHAR(100) DEFAULT 'Active',
        certificate_url TEXT,
        image_url TEXT,
        evidence_urls JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS toolbox_talks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        document_url TEXT,
        description TEXT,
        conducted_by INTEGER REFERENCES users(id),
        conducted_by_name VARCHAR(255),
        attendees_count INTEGER DEFAULT 0,
        date DATE DEFAULT CURRENT_DATE,
        area VARCHAR(255),
        evidence_urls JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS jsa_documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        document_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS csm_documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        document_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_observations_date ON observations(date);
      CREATE INDEX IF NOT EXISTS idx_observations_area ON observations(area);
      CREATE INDEX IF NOT EXISTS idx_observations_status ON observations(status);
      CREATE INDEX IF NOT EXISTS idx_permits_date ON permits(date);
      CREATE INDEX IF NOT EXISTS idx_permits_area ON permits(area);
      CREATE INDEX IF NOT EXISTS idx_equipment_area ON equipment(area);
      CREATE INDEX IF NOT EXISTS idx_points_user ON points_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_points_date ON points_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(date);
      CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
      CREATE INDEX IF NOT EXISTS idx_news_active ON news(is_active);
      CREATE INDEX IF NOT EXISTS idx_certifications_expiry ON certifications(expiry_date);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    // Migration: Add missing columns to existing tables
    const migrations = [
      "ALTER TABLE observations ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)",
      "ALTER TABLE permits ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)",
      "ALTER TABLE equipment ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'",
      "ALTER TABLE toolbox_talks ADD COLUMN IF NOT EXISTS conducted_by INTEGER REFERENCES users(id)",
      "ALTER TABLE toolbox_talks ADD COLUMN IF NOT EXISTS conducted_by_name VARCHAR(255)",
      "ALTER TABLE toolbox_talks ADD COLUMN IF NOT EXISTS attendees_count INTEGER DEFAULT 0",
      "ALTER TABLE toolbox_talks ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE",
      "ALTER TABLE toolbox_talks ADD COLUMN IF NOT EXISTS area VARCHAR(255)",
      "ALTER TABLE toolbox_talks ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'"
    ];
    
    for (const migration of migrations) {
      try {
        await client.query(migration);
      } catch (err) {
        // Ignore errors for columns that already exist
      }
    }

    // Create indexes on user_id columns after migration
    try {
      await client.query("CREATE INDEX IF NOT EXISTS idx_observations_user ON observations(user_id)");
      await client.query("CREATE INDEX IF NOT EXISTS idx_permits_user ON permits(user_id)");
    } catch (err) {
      // Ignore if already exists
    }
    
    // Insert default badges
    await client.query(`
      INSERT INTO badges (code, name_en, name_ar, name_ur, description_en, icon, color, condition_type, condition_value)
      VALUES 
        ('first_observation', 'First Observation', 'أول ملاحظة', 'پہلا مشاہدہ', 'Submitted your first safety observation', 'fa-eye', '#10b981', 'observations', 1),
        ('hazard_hunter', 'Hazard Hunter', 'صياد المخاطر', 'خطرے کا شکاری', 'Reported 10 hazards', 'fa-search', '#f59e0b', 'observations', 10),
        ('safety_champion', 'Safety Champion', 'بطل السلامة', 'سیفٹی چیمپئن', 'Earned 100 points', 'fa-trophy', '#eab308', 'points', 100),
        ('perfect_week', 'Perfect Week', 'أسبوع مثالي', 'کامل ہفتہ', '7 day activity streak', 'fa-calendar-check', '#8b5cf6', 'streak', 7),
        ('team_player', 'Team Player', 'لاعب فريق', 'ٹیم پلیئر', 'Completed 5 daily challenges', 'fa-users', '#06b6d4', 'challenges', 5),
        ('permit_pro', 'Permit Pro', 'محترف التصاريح', 'پرمٹ پرو', 'Processed 20 permits', 'fa-clipboard-check', '#3b82f6', 'permits', 20),
        ('century_club', 'Century Club', 'نادي المئة', 'سو کلب', 'Earned 500 points', 'fa-star', '#f97316', 'points', 500),
        ('legend', 'Safety Legend', 'أسطورة السلامة', 'سیفٹی لیجنڈ', 'Earned 1000 points', 'fa-crown', '#dc2626', 'points', 1000)
      ON CONFLICT (code) DO NOTHING
    `);

    // Insert default admin user
    await client.query(`
      INSERT INTO users (employee_id, name, email, role, password_hash, is_active)
      VALUES ('ADMIN001', 'System Admin', 'admin@saudisg.com', 'admin', 'admin123', true)
      ON CONFLICT (employee_id) DO NOTHING
    `);

    // Insert sample daily challenges
    await client.query(`
      INSERT INTO daily_challenges (title_en, title_ar, title_ur, description_en, points, challenge_type, requires_photo)
      VALUES 
        ('Morning Safety Walk', 'جولة السلامة الصباحية', 'صبح کی سیفٹی واک', 'Complete a safety walkthrough of your area and report any hazards', 15, 'inspection', true),
        ('PPE Check', 'فحص معدات الحماية', 'PPE چیک', 'Verify all workers in your area are wearing proper PPE', 10, 'compliance', true),
        ('Toolbox Talk', 'محادثة صندوق الأدوات', 'ٹول باکس ٹاک', 'Conduct a 5-minute safety briefing with your team', 20, 'training', true),
        ('Housekeeping Hero', 'بطل النظافة', 'صفائی ہیرو', 'Identify and fix 3 housekeeping issues', 12, 'housekeeping', true),
        ('Fire Safety Check', 'فحص السلامة من الحريق', 'آگ سیفٹی چیک', 'Inspect fire extinguishers in your zone', 15, 'inspection', true)
      ON CONFLICT DO NOTHING
    `);

    // Insert default inspection template
    await client.query(`
      INSERT INTO inspection_templates (name_en, name_ar, name_ur, category, items)
      VALUES (
        'Daily Pre-Shift Inspection',
        'فحص ما قبل الوردية اليومي',
        'روزانہ پری شفٹ معائنہ',
        'general',
        '[
          {"id": 1, "text_en": "Work area is clean and organized", "text_ar": "منطقة العمل نظيفة ومنظمة", "text_ur": "کام کی جگہ صاف اور منظم ہے"},
          {"id": 2, "text_en": "All workers wearing required PPE", "text_ar": "جميع العمال يرتدون معدات الحماية المطلوبة", "text_ur": "تمام ورکرز مطلوبہ PPE پہنے ہوئے ہیں"},
          {"id": 3, "text_en": "Emergency exits are clear", "text_ar": "مخارج الطوارئ واضحة", "text_ur": "ایمرجنسی راستے صاف ہیں"},
          {"id": 4, "text_en": "Fire extinguishers accessible", "text_ar": "طفايات الحريق متاحة", "text_ur": "فائر ایکسٹنگوشر قابل رسائی ہیں"},
          {"id": 5, "text_en": "First aid kit is stocked", "text_ar": "صندوق الإسعافات الأولية مجهز", "text_ur": "فرسٹ ایڈ کٹ مکمل ہے"},
          {"id": 6, "text_en": "Tools and equipment in good condition", "text_ar": "الأدوات والمعدات في حالة جيدة", "text_ur": "اوزار اور آلات اچھی حالت میں ہیں"},
          {"id": 7, "text_en": "Proper signage displayed", "text_ar": "اللافتات المناسبة معروضة", "text_ur": "مناسب سائن بورڈز لگے ہیں"},
          {"id": 8, "text_en": "No slip/trip hazards", "text_ar": "لا توجد مخاطر انزلاق/تعثر", "text_ur": "پھسلنے/ٹھوکر کے خطرات نہیں"}
        ]'::jsonb
      )
      ON CONFLICT DO NOTHING
    `);

    // Insert sample news
    await client.query(`
      INSERT INTO news (title_en, title_ar, title_ur, content_en, category, priority, is_pinned)
      VALUES 
        ('Safety Alert: Heat Stress Prevention', 'تنبيه السلامة: الوقاية من الإجهاد الحراري', 'سیفٹی الرٹ: گرمی سے بچاؤ', 'With rising temperatures, ensure all workers take regular breaks and stay hydrated. Report any signs of heat exhaustion immediately.', 'alert', 'high', true),
        ('New PPE Standards Effective Today', 'معايير PPE الجديدة سارية اليوم', 'نئے PPE معیارات آج سے نافذ', 'Updated PPE requirements are now in effect. All workers must comply with the new safety helmet and high-visibility vest standards.', 'update', 'normal', false),
        ('Monthly Safety Meeting - Dec 10', 'اجتماع السلامة الشهري - 10 ديسمبر', 'ماہانہ سیفٹی میٹنگ - 10 دسمبر', 'Join us for the monthly safety meeting to discuss Q4 safety performance and 2025 safety goals.', 'event', 'normal', false)
      ON CONFLICT DO NOTHING
    `);

    console.log('Database tables initialized successfully');
  } finally {
    client.release();
  }
}

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
  return res;
}

export default pool;
