import { PrismaClient, User, Role } from '@prisma/client';

const prisma = new PrismaClient();

export class AuthRepository {
  /**
   * Find user by phone number
   */
  async findUserByPhone(phone: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by QR code
   */
  async findUserByQRCode(qrCode: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { qrCode },
    });
  }

  /**
   * Create new user
   */
  async createUser(data: {
    phone: string;
    email?: string;
    qrCode: string;
    role?: Role;
  }): Promise<User> {
    return await prisma.user.create({
      data: {
        phone: data.phone,
        email: data.email || null,
        qrCode: data.qrCode,
        role: data.role || 'USER',
        isActive: true,
      },
    });
  }

  /**
   * Update user
   */
  async updateUser(
    id: string,
    data: {
      email?: string;
      isActive?: boolean;
      role?: Role;
      pushToken?: string;
    }
  ): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Update user's display name
   */
  async updateUserName(id: string, name: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { name },
    });
  }

  /**
   * Delete user (soft delete by setting isActive to false)
   */
  async deactivateUser(id: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const authRepository = new AuthRepository();
