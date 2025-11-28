import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const doctorEmail = 'doctor@hospital.com';

    const doctor = await prisma.doctor.upsert({
        where: { email: doctorEmail },
        update: {},
        create: {
            email: doctorEmail,
            name: 'Dr. Smith',
            specialty: 'General Physician',
            hospital: 'City Hospital'
        },
    });

    // Also create a User record so they don't get asked for their name
    const doctorUser = await prisma.user.upsert({
        where: { email: doctorEmail },
        update: {},
        create: {
            email: doctorEmail,
            phone: '9876543210',
            name: 'Dr. Smith',
            role: 'USER', // Role in User table is USER, but they are in Doctor table too
            isActive: true,
            qrCode: 'DOCTOR_QR_CODE' // Placeholder
        }
    });

    console.log({ doctor, doctorUser });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
