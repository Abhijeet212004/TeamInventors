import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Generate a unique invite code
function generateInviteCode(): string {
  return crypto.randomBytes(5).toString('base64url').toUpperCase();
}

// Create a new bubble
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { name, icon, color, type } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!name || !icon || !color) {
      return res.status(400).json({
        success: false,
        message: 'Name, icon, and color are required',
      });
    }

    // Validate type
    if (type && !['PERMANENT', 'TEMPORARY'].includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either PERMANENT or TEMPORARY',
      });
    }

    // Generate unique invite code
    let inviteCode: string;
    let isUnique = false;
    while (!isUnique) {
      inviteCode = generateInviteCode();
      const existing = await prisma.bubble.findUnique({
        where: { inviteCode },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    // Create the bubble
    const bubble = await prisma.bubble.create({
      data: {
        name,
        icon,
        color,
        type: type ? type.toUpperCase() : 'PERMANENT',
        inviteCode: inviteCode!,
        creatorId: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Automatically add the creator as a member (with duplicate check)
    const existingMembership = await prisma.bubbleMember.findFirst({
      where: {
        bubbleId: bubble.id,
        userId: userId,
      },
    });

    if (!existingMembership) {
      await prisma.bubbleMember.create({
        data: {
          bubbleId: bubble.id,
          userId: userId,
        },
      });
    }

    // Generate invite link
    const inviteLink = `https://alertmate.app/join/${bubble.inviteCode}`;

    res.status(201).json({
      success: true,
      data: {
        ...bubble,
        inviteLink,
      },
      message: 'Bubble created successfully',
    });
  } catch (error) {
    console.error('Error creating bubble:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bubble',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get all bubbles for the authenticated user
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const bubbles = await prisma.bubble.findMany({
      where: {
        OR: [
          { creatorId: userId }, // Bubbles created by the user
          { members: { some: { userId } } }, // Bubbles user is a member of
        ],
        isActive: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: bubbles,
    });
  } catch (error) {
    console.error('Error fetching bubbles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bubbles',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get a specific bubble by ID
router.get('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const bubble = await prisma.bubble.findFirst({
      where: {
        id,
        OR: [
          { creatorId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!bubble) {
      return res.status(404).json({
        success: false,
        message: 'Bubble not found',
      });
    }

    res.json({
      success: true,
      data: bubble,
    });
  } catch (error) {
    console.error('Error fetching bubble:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bubble',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get bubble members with their live locations
router.get('/:id/members/locations', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify user is a member of this bubble
    const bubble = await prisma.bubble.findFirst({
      where: {
        id,
        OR: [
          { creatorId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!bubble) {
      return res.status(404).json({
        success: false,
        message: 'Bubble not found or you are not a member',
      });
    }

    // Get tracking data for all members
    const memberIds = bubble.members.map(m => m.userId);
    const trackingData = await prisma.userTracking.findMany({
      where: {
        userId: { in: memberIds },
      },
    });

    // Combine member info with tracking data
    const membersWithLocations = bubble.members.map(member => {
      const tracking = trackingData.find(t => t.userId === member.userId);
      return {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        phone: member.user.phone,
        tracking: tracking || null,
      };
    });

    res.json({
      success: true,
      data: {
        bubbleId: bubble.id,
        bubbleName: bubble.name,
        members: membersWithLocations,
      },
    });
  } catch (error) {
    console.error('Error fetching member locations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching member locations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete a bubble (only creator can delete)
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check if user is the creator
    const bubble = await prisma.bubble.findFirst({
      where: {
        id,
        creatorId: userId,
      },
    });

    if (!bubble) {
      return res.status(404).json({
        success: false,
        message: 'Bubble not found or you do not have permission to delete it',
      });
    }

    // Soft delete by setting isActive to false
    await prisma.bubble.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Bubble deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting bubble:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bubble',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Join a bubble using invite code
router.post('/join', authenticateToken, async (req: any, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.userId;

    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        message: 'Invite code is required',
      });
    }

    // Find the bubble by invite code
    const bubble = await prisma.bubble.findUnique({
      where: {
        inviteCode: inviteCode.trim().toUpperCase(),
      },
      include: {
        members: true,
      },
    });

    if (!bubble) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invite code',
      });
    }

    if (!bubble.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This tracking group is no longer active',
      });
    }

    // Check if user is already a member
    const existingMember = bubble.members.find(m => m.userId === userId);
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this tracking group',
      });
    }

    // Add user as a member
    await prisma.bubbleMember.create({
      data: {
        bubbleId: bubble.id,
        userId: userId,
      },
    });

    // Fetch updated bubble with members
    const updatedBubble = await prisma.bubble.findUnique({
      where: { id: bubble.id },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Successfully joined tracking group',
      data: updatedBubble,
    });
  } catch (error) {
    console.error('Error joining bubble:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining tracking group',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
