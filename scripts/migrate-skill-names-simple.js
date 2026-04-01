#!/usr/bin/env node

/**
 * Simple migration script using the backend's database connection
 * Usage: node scripts/migrate-skill-names-simple.js
 */

const { PrismaClient } = require('../apps/backend/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function migrateSkillNames() {
  try {
    console.log('Starting skill names migration...');
    
    // Get all skills with 'skill:' prefix
    const skills = await prisma.registrySkill.findMany({
      where: {
        name: {
          startsWith: 'skill:'
        }
      }
    });
    
    console.log(`Found ${skills.length} skills to migrate`);
    
    // Update each skill name
    for (const skill of skills) {
      const newName = skill.name.replace('skill:', 'skills_');
      await prisma.registrySkill.update({
        where: { id: skill.id },
        data: { name: newName }
      });
      console.log(`Updated: ${skill.name} -> ${newName}`);
    }
    
    console.log('Migration completed successfully!');
    
    // Verify the changes
    const updatedSkills = await prisma.registrySkill.findMany({
      where: {
        name: {
          startsWith: 'skills_'
        }
      }
    });
    
    console.log(`Verified: ${updatedSkills.length} skills now have 'skills_' prefix`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateSkillNames();
