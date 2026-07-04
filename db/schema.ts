import { relations, sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
    image: text('image'),
    role: text('role').$defaultFn(() => 'student').notNull(), // student | company | admin
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});

export const session = pgTable("session", {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable("account", {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
});

export const students = pgTable("students", {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
    srn: text('srn').unique(), // student registration number
    srnValid: boolean('srn_valid').$defaultFn(() => false),
    phone: text('phone'),
    email: text('email').notNull(),
    location: text('location'),
    preferredLocations: text('preferred_locations').array().$defaultFn(() => []),
    bio: text('bio'),
    aboutMe: text('about_me'),
    headline: text('headline'),
    cgpa: text('cgpa'), // CGPA out of 10
    degree: text('degree'), // BTech | MTech | MCA
    course: text('course'), // CSE | ECE | EEE | AIML
    education: jsonb('education').$defaultFn(() => []),
    experience: jsonb('experience').$defaultFn(() => []),
    projects: jsonb('projects').$defaultFn(() => []),
    certifications: jsonb('certifications').$defaultFn(() => []),
    achievements: jsonb('achievements').$defaultFn(() => []),
    skills: text('skills').array().$defaultFn(() => []),
    githubUrl: text('github_url'),
    linkedinUrl: text('linkedin_url'),
    portfolioUrl: text('portfolio_url'),
    leetcodeUrl: text('leetcode_url'),
    otherPlatforms: jsonb('other_platforms').$defaultFn(() => ({})),
    analytics: jsonb('analytics').$defaultFn(() => ({ profileViews: 0, applications: 0 })),
    placedIntern: boolean('placed_intern').$defaultFn(() => false),
    placedFte: boolean('placed_fte').$defaultFn(() => false),
    resumeUrl: text('resume_url'), // Kept for backward compatibility
    resumes: jsonb('resumes').$defaultFn(() => []), // Array of {label: string, url: string, uploadedAt: string}
    status: text('status').$defaultFn(() => 'pending').notNull(), // pending | approved | rejected | banned
    adminNote: text('admin_note'),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
    statusCreatedAtIdx: index('idx_students_status_created_at').on(table.status, table.createdAt.desc())
}));

export const studentRelations = relations(students, ({ one }) => ({
    user: one(user, {
        fields: [students.userId],
        references: [user.id]
    })
}));

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

export const companies = pgTable("companies", {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    logoUrl: text('logo_url'),
    websiteUrl: text('website_url'),
    location: text('location'),
    about: text('about'),
    industry: text('industry'),
    size: text('size'), // e.g., "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone'),
    linkedinUrl: text('linkedin_url'),
    twitterUrl: text('twitter_url'),
    foundedYear: text('founded_year'),
    specialties: text('specialties').array().$defaultFn(() => []),
    benefits: jsonb('benefits').$defaultFn(() => []), // Array of benefit strings
    culture: text('culture'), // Description of company culture
    techStack: text('tech_stack').array().$defaultFn(() => []),
    officeLocations: jsonb('office_locations').$defaultFn(() => []), // Array of {city, country, address}
    verified: boolean('verified').$defaultFn(() => false).notNull(),
    status: text('status').$defaultFn(() => 'pending').notNull(), // pending | approved | rejected | banned
    adminNote: text('admin_note'),
    analytics: jsonb('analytics').$defaultFn(() => ({ profileViews: 0, jobPosts: 0, applications: 0 })),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
    statusCreatedAtIdx: index('idx_companies_status_created_at').on(table.status, table.createdAt.desc())
}));

export const companyRelations = relations(companies, ({ one }) => ({
    user: one(user, {
        fields: [companies.userId],
        references: [user.id]
    })
}));

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export const jobs = pgTable("jobs", {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    type: text('type').notNull(), // internship | full-time
    location: text('location').notNull(),
    cgpaCutoff: text('cgpa_cutoff'), // Minimum CGPA required
    eligibleCourses: text('eligible_courses').array().$defaultFn(() => []), // Array of eligible courses (CSE, ECE, etc.)
    eligibleDegrees: text('eligible_degrees').array().$defaultFn(() => []), // Array of eligible degrees (BTech, MTech, MCA)
    jdUrl: text('jd_url'), // Job description PDF URL
    aboutRole: jsonb('about_role'), // Rich text content (Tiptap JSON)
    salary: text('salary'), // Salary range or package
    skills: text('skills').array().$defaultFn(() => []), // Required skills
    benefits: text('benefits').array().$defaultFn(() => []), // Job benefits
    deadline: timestamp('deadline'), // Application deadline
    status: text('status').$defaultFn(() => 'active').notNull(), // active | stopped
    analytics: jsonb('analytics').$defaultFn(() => ({ views: 0, applications: 0 })),
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
    companyIdIdx: index('idx_jobs_company_id').on(table.companyId),
    statusCreatedAtIdx: index('idx_jobs_status_created_at').on(table.status, table.createdAt.desc())
}));

export const jobRelations = relations(jobs, ({ one }) => ({
    company: one(companies, {
        fields: [jobs.companyId],
        references: [companies.id]
    })
}));

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

export const applications = pgTable("applications", {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
    status: text('status').$defaultFn(() => 'pending').notNull(), // pending | oa | interview_round_1 | interview_round_2 | interview_round_3 | selected | rejected
    appliedAt: timestamp('applied_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    // Snapshot of student data at time of application
    studentCgpa: text('student_cgpa'),
    studentCourse: text('student_course'),
    studentDegree: text('student_degree'),
    coverLetter: text('cover_letter'),
    resumeUrl: text('resume_url'), // Specific resume used for this application
    resumeLabel: text('resume_label'), // Label of the resume chosen by student
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
    jobIdIdx: index('idx_applications_job_id').on(table.jobId),
    studentIdIdx: index('idx_applications_student_id').on(table.studentId),
    jobStudentUniqueIdx: index('idx_applications_job_student').on(table.jobId, table.studentId)
}));

// Interview Schedules
export const interviews = pgTable("interviews", {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    round: text('round').notNull(), // oa | round_1 | round_2 | round_3 | hr
    scheduledAt: timestamp('scheduled_at').notNull(),
    duration: text('duration'), // e.g., "60 minutes", "1 hour"
    location: text('location'), // e.g., "Virtual - Google Meet", "Bangalore Office"
    meetingLink: text('meeting_link'),
    interviewers: text('interviewers').array().$defaultFn(() => []), // Names of interviewers
    notes: text('notes'), // Company notes about the interview
    status: text('status').$defaultFn(() => 'scheduled').notNull(), // scheduled | completed | cancelled | rescheduled
    feedback: text('feedback'), // Post-interview feedback
    result: text('result'), // passed | failed | pending
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
    applicationIdIdx: index('idx_interviews_application_id').on(table.applicationId),
    scheduledAtIdx: index('idx_interviews_scheduled_at').on(table.scheduledAt)
}));

export const applicationRelations = relations(applications, ({ one, many }) => ({
    job: one(jobs, {
        fields: [applications.jobId],
        references: [jobs.id]
    }),
    student: one(students, {
        fields: [applications.studentId],
        references: [students.id]
    }),
    interviews: many(interviews)
}));

export const interviewRelations = relations(interviews, ({ one }) => ({
    application: one(applications, {
        fields: [interviews.applicationId],
        references: [applications.id]
    })
}));

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;

// AI Query History Table
export const aiQueries = pgTable("ai_queries", {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // student | company | admin
    query: text('query').notNull(), // Natural language query
    generatedSql: text('generated_sql'), // SQL generated by AI
    results: jsonb('results'), // Query results stored as JSON
    insights: text('insights'), // Natural language insights generated
    chartType: text('chart_type'), // Type of chart to display
    isTemplate: boolean('is_template').$defaultFn(() => false), // Whether this was from a template
    executionTime: text('execution_time'), // How long query took
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
    userIdIdx: index('idx_ai_queries_user_id').on(table.userId),
    roleIdx: index('idx_ai_queries_role').on(table.role),
    createdAtIdx: index('idx_ai_queries_created_at').on(table.createdAt)
}));

export const aiQueriesRelations = relations(aiQueries, ({ one }) => ({
    user: one(user, {
        fields: [aiQueries.userId],
        references: [user.id]
    })
}));

export type AIQuery = typeof aiQueries.$inferSelect;
export type InsertAIQuery = typeof aiQueries.$inferInsert;

// Query Templates Table
export const queryTemplates = pgTable("query_templates", {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    role: text('role').notNull(), // student | company | admin
    category: text('category').notNull(), // e.g., "Profile Analysis", "Job Insights", etc.
    name: text('name').notNull(), // Display name for the template
    description: text('description').notNull(), // What this query does
    prompt: text('prompt').notNull(), // The prompt to send to AI
    chartType: text('chart_type'), // bar | line | pie | radar | funnel | table
    isActive: boolean('is_active').$defaultFn(() => true).notNull(),
    sortOrder: text('sort_order').$defaultFn(() => '0'), // For ordering templates in UI
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
    roleIdx: index('idx_query_templates_role').on(table.role),
    categoryIdx: index('idx_query_templates_category').on(table.category)
}));

export type QueryTemplate = typeof queryTemplates.$inferSelect;
export type InsertQueryTemplate = typeof queryTemplates.$inferInsert;

// ATS Scans Table - Resume analysis history
export const atsScans = pgTable("ats_scans", {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
    resumeUrl: text('resume_url').notNull(),
    resumeLabel: text('resume_label'),
    score: text('score').notNull(), // Score out of 100
    analysis: jsonb('analysis').notNull(), // Full Gemini analysis
    jobDescription: text('job_description'), // Optional JD
    matchedKeywords: text('matched_keywords').array().$defaultFn(() => []), // Keywords found
    missingKeywords: text('missing_keywords').array().$defaultFn(() => []), // Keywords missing
    suggestions: jsonb('suggestions').$defaultFn(() => []), // Improvement suggestions
    createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
    studentIdIdx: index('idx_ats_scans_student').on(table.studentId),
    createdAtIdx: index('idx_ats_scans_created').on(table.createdAt.desc())
}));

export const atsScansRelations = relations(atsScans, ({ one }) => ({
    student: one(students, {
        fields: [atsScans.studentId],
        references: [students.id]
    })
}));

export type ATSScan = typeof atsScans.$inferSelect;
export type InsertATSScan = typeof atsScans.$inferInsert;

// Profile Suggestions Cache Table
export const profileSuggestions = pgTable("profile_suggestions", {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    studentId: text('student_id').notNull().unique().references(() => students.id, { onDelete: 'cascade' }),
    suggestions: jsonb('suggestions').notNull(), // Array of suggestion objects
    lastGenerated: timestamp('last_generated').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
    updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => ({
    studentIdIdx: index('idx_profile_suggestions_student').on(table.studentId)
}));

export const profileSuggestionsRelations = relations(profileSuggestions, ({ one }) => ({
    student: one(students, {
        fields: [profileSuggestions.studentId],
        references: [students.id]
    })
}));

export type ProfileSuggestion = typeof profileSuggestions.$inferSelect;
export type InsertProfileSuggestion = typeof profileSuggestions.$inferInsert;

export const schema = { 
    user, 
    session, 
    account, 
    verification, 
    students, 
    studentRelations, 
    companies, 
    companyRelations,
    jobs,
    jobRelations,
    applications,
    applicationRelations,
    aiQueries,
    aiQueriesRelations,
    queryTemplates,
    atsScans,
    atsScansRelations,
    profileSuggestions,
    profileSuggestionsRelations
};