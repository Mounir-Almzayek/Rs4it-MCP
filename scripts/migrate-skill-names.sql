-- Migration script to update skill names from 'skill:' to 'skills_'
-- Run this in your database to update all existing skill names

UPDATE registry_skill 
SET name = REPLACE(name, 'skill:', 'skills_')
WHERE name LIKE 'skill:%';

-- Verify the changes
SELECT name FROM registry_skill WHERE name LIKE 'skills_%';
