import { Request, Response } from 'express';
import { SosService } from './sos.service';

export class SosController {
    private sosService: SosService;

    constructor() {
        this.sosService = new SosService();
    }

    sendAlert = async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const { latitude, longitude } = req.body;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            if (!latitude || !longitude) {
                return res.status(400).json({ success: false, message: 'Location required' });
            }

            const result = await this.sosService.sendSosAlert(userId, latitude, longitude);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('Error sending SOS alert:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    };
}
