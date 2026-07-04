-- Create student profile for users who don't have one
INSERT INTO students (id, user_id, email, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  u.id,
  u.email,
  'pending',
  NOW(),
  NOW()
FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM students s WHERE s.user_id = u.id
)
AND u.role != 'admin';
