import { prismaClient } from './src/index.js';
import bcrypt from 'bcryptjs';

async function hashExistingPasswords() {
  console.log('🔐 Hashing existing user passwords...');
  
  try {
    const users = await prismaClient.user.findMany();
    
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2)
      if (user.password.startsWith('$2')) {
        console.log(`✓ User ${user.email} already has hashed password`);
        continue;
      }
      
      // Hash the plain text password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await prismaClient.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      
      console.log(`✓ Updated password for ${user.email}`);
    }
    
    console.log('✅ All passwords hashed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prismaClient.$disconnect();
  }
}

hashExistingPasswords();
