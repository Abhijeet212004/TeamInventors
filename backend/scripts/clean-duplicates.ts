import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicateMembers() {
  console.log('🔍 Checking for duplicate bubble members...\n');

  try {
    // Get all bubble members
    const allMembers = await prisma.bubbleMember.findMany({
      include: {
        bubble: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            phone: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc', // Keep the oldest membership
      },
    });

    // Group by bubbleId + userId
    const memberMap = new Map<string, any[]>();
    
    for (const member of allMembers) {
      const key = `${member.bubbleId}-${member.userId}`;
      if (!memberMap.has(key)) {
        memberMap.set(key, []);
      }
      memberMap.get(key)!.push(member);
    }

    // Find duplicates
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;

    for (const [, members] of memberMap.entries()) {
      if (members.length > 1) {
        duplicatesFound++;
        console.log(`📍 Found duplicate in bubble "${members[0].bubble.name}"`);
        console.log(`   User: ${members[0].user.phone || members[0].user.email}`);
        console.log(`   Total memberships: ${members.length}`);
        
        // Keep the first (oldest), delete the rest
        const toDelete = members.slice(1);
        
        for (const duplicate of toDelete) {
          await prisma.bubbleMember.delete({
            where: {
              id: duplicate.id,
            },
          });
          duplicatesRemoved++;
          console.log(`   ✅ Removed duplicate (ID: ${duplicate.id})`);
        }
        console.log('');
      }
    }

    if (duplicatesFound === 0) {
      console.log('✅ No duplicates found! Database is clean.\n');
    } else {
      console.log(`\n📊 Summary:`);
      console.log(`   Duplicate sets found: ${duplicatesFound}`);
      console.log(`   Duplicate records removed: ${duplicatesRemoved}`);
      console.log(`   ✅ Database cleaned!\n`);
    }

  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicateMembers();
