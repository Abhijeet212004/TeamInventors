import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import pdf from 'pdf-parse';

const router = Router();
const prisma = new PrismaClient();

// Initialize AI Clients Lazily
let openai: OpenAI;
let pinecone: Pinecone;
let index: any;

function getAI() {
    if (!openai) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (!pinecone) {
        pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
        index = pinecone.index('medical-rag');
    }
    return { openai, index };
}

// Helper: Get Embedding
async function getEmbedding(text: string) {
    const { openai } = getAI();
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });
    return response.data[0].embedding;
}

// --- Doctor Routes ---

// Check if email belongs to a doctor
router.post('/doctor/check', async (req, res) => {
    const { email } = req.body;
    try {
        const doctor = await prisma.doctor.findUnique({ where: { email } });
        res.json({ isDoctor: !!doctor, doctor });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check doctor status' });
    }
});

// Doctor Login (Simple email check for now as per schema)
router.post('/doctor/login', async (req, res) => {
    const { username, password } = req.body; // username is treated as email
    try {
        // In a real app, we would check password. 
        // Since Doctor model has no password, we just check if email exists.
        const doctor = await prisma.doctor.findUnique({
            where: { email: username }
        });

        if (doctor) {
            res.json({ success: true, doctor });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// --- Patient Routes ---

// Get Medical Profile
router.get('/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const profile = await prisma.medicalProfile.findUnique({
            where: { userId },
            include: {
                reports: true,
                user: { select: { name: true } } // Fetch user name
            }
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Flatten response
        res.json({
            ...profile,
            name: profile.user?.name || 'Unknown',
            gender: profile.gender || 'Not Specified'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Create/Update Medical Profile
router.post('/profile', async (req, res) => {
    const { userId, bloodType, allergies, conditions, medications, height, weight, gender, reports } = req.body;

    try {
        // 1. Upsert Profile
        const profile = await prisma.medicalProfile.upsert({
            where: { userId },
            update: { bloodType, allergies, conditions, medications, height, weight, gender },
            create: { userId, bloodType, allergies, conditions, medications, height, weight, gender }
        });

        // 2. Process Reports (if any)
        if (reports && reports.trim()) {
            const embedding = await getEmbedding(reports);
            const { index } = getAI();

            // Save to DB
            const report = await prisma.medicalReport.create({
                data: {
                    profileId: profile.id,
                    content: reports,
                    embedding: JSON.stringify(embedding)
                }
            });

            // Save to Pinecone
            await index.upsert([{
                id: report.id,
                values: embedding,
                metadata: {
                    patientId: userId,
                    content: reports
                }
            }]);
        }

        res.json(profile);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save profile' });
    }
});


// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer
const upload = multer({ storage: multer.memoryStorage() });

// ... (Previous code) ...

// Add a new Medical Report (with File Upload)
router.post('/report', upload.single('file'), async (req: any, res: any) => {
    const { userId, title, content } = req.body;
    const file = req.file;

    try {
        // 1. Get Profile
        const profile = await prisma.medicalProfile.findUnique({ where: { userId } });
        if (!profile) {
            return res.status(404).json({ error: 'Medical profile not found. Create profile first.' });
        }

        let finalContent = content || '';
        let fileUrl = '';

        // 2. Process File (if provided)
        if (file) {
            // Upload to Cloudinary
            const b64 = Buffer.from(file.buffer).toString('base64');
            let dataURI = "data:" + file.mimetype + ";base64," + b64;

            const uploadRes = await cloudinary.uploader.upload(dataURI, {
                resource_type: "auto",
                folder: "medical_reports"
            });

            fileUrl = uploadRes.secure_url;


            // Extract Text if PDF
            if (file.mimetype === 'application/pdf') {
                try {
                    const pdfData = await pdf(file.buffer);
                    const text = pdfData.text.trim();
                    console.log(`[PDF Parse] Filename: ${file.originalname}, Text Length: ${text.length}`);

                    if (text.length === 0) {
                        finalContent += `\n\n[PDF Uploaded - Warning: No text extracted. This might be a scanned image PDF.]`;
                    } else {
                        finalContent += `\n\n[Extracted from PDF]:\n${text}`;
                    }
                } catch (e: any) {
                    console.error("PDF Parse Error:", e);
                    finalContent += `\n\n[PDF Uploaded - Text Extraction Failed: ${e.message || 'Unknown error'}]`;
                }
            } else if (file.mimetype.startsWith('image/')) {
                finalContent += `\n\n[Image Report Uploaded: ${fileUrl}]`;
                // TODO: Add OCR here if needed later
            }
        }

        if (!finalContent.trim()) {
            return res.status(400).json({ error: 'Please provide text content or a file.' });
        }

        // 3. Embed Content
        console.log('[Embedding] Content preview:', finalContent.substring(0, 100) + '...');
        const embedding = await getEmbedding(finalContent);
        const { index } = getAI();

        // 4. Save to DB
        const report = await prisma.medicalReport.create({
            data: {
                profileId: profile.id,
                content: `Title: ${title}\n\n${finalContent}`,
                fileUrl: fileUrl || null,
                embedding: JSON.stringify(embedding)
            } as any
        });

        // 5. Save to Pinecone
        await index.upsert([{
            id: report.id,
            values: embedding,
            metadata: {
                patientId: userId,
                content: `Title: ${title}\n\n${finalContent}`,
                fileUrl: fileUrl
            }
        }]);

        res.json({ ...report, fileUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add report' });
    }
});

// --- RAG Chat Route ---

router.post('/chat', async (req, res) => {
    const { patientId, question } = req.body;

    try {
        const { openai, index } = getAI();

        // 1. Get Question Embedding
        const questionEmbedding = await getEmbedding(question);

        // 2. Search Pinecone
        console.log(`[RAG] Searching for patientId: ${patientId}`);
        const searchResults = await index.query({
            vector: questionEmbedding,
            topK: 5, // Increased from 3 to 5 to get more context
            filter: { patientId: patientId },
            includeMetadata: true
        });

        console.log(`[RAG] Found ${searchResults.matches.length} matches`);
        searchResults.matches.forEach((m: any, i: number) => {
            console.log(`[Match ${i}] Score: ${m.score}, ID: ${m.id}`);
        });

        const context = searchResults.matches.map((match: any) => match.metadata?.content).join('\n\n');
        console.log('[RAG] Context sent to GPT:', context);

        // 3. Fetch Patient Profile for basic context
        const profile = await prisma.medicalProfile.findUnique({ where: { userId: patientId } });
        const profileContext = `
            Patient Profile:
            Blood Type: ${profile?.bloodType}
            Allergies: ${profile?.allergies}
            Conditions: ${profile?.conditions}
            Medications: ${profile?.medications}
        `;

        // 4. Ask GPT-4
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are an advanced AI medical assistant designed to support doctors. Your goal is to analyze patient records, medical reports, and profiles to provide clinical insights. \n\nGuidelines:\n1. **Professional Tone:** Respond in a concise, professional medical manner suitable for a physician.\n2. **Synthesize Information:** When asked general questions like 'what problems does the user have?', summarize all active conditions, recent reports, and relevant medical history found in the context.\n3. **Source Referencing:** If possible, mention which report or date a specific finding comes from (e.g., 'According to the blood test on [Date]...').\n4. **Unreadable Content:** If the context contains file names (like PDFs) but no extracted text, explicitly state: 'I see a document named [Filename], but I cannot read its content. It might be a scanned image.'\n5. **Unknowns:** If the information is not in the provided context, state clearly: 'The available records do not contain information about [Topic].'\n\nAlways prioritize patient safety and accuracy based strictly on the provided context." },
                { role: "user", content: `Patient Context:\n${profileContext}\n\nMedical Reports & Documents:\n${context}\n\nDoctor's Question: ${question}` }
            ]
        });

        res.json({ answer: completion.choices[0].message.content });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate answer' });
    }
});

export default router;
