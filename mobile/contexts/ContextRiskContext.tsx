import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { contextRiskService } from '../services/ContextRiskService';
import { useSafetyCheck } from './SafetyCheckContext';

interface ContextRiskContextType {
    isMonitoring: boolean;
    startContextMonitoring: () => void;
    stopContextMonitoring: () => void;
    currentRiskScore: number;
}

const ContextRiskContext = createContext<ContextRiskContextType | undefined>(undefined);

export const ContextRiskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [currentRiskScore, setCurrentRiskScore] = useState(0);
    const timerRef = useRef<any>(null);
    const { triggerSOS } = useSafetyCheck();

    // Start monitoring when the component mounts (or based on user settings)
    // For now, we'll expose start/stop methods.

    useEffect(() => {
        // Auto-start monitoring when the provider mounts
        startContextMonitoring();
        
        return () => {
            stopContextMonitoring();
        };
    }, []);

    const startContextMonitoring = () => {
        if (isMonitoring) return;
        console.log("👁️ Context Risk Monitoring Started");
        setIsMonitoring(true);
        contextRiskService.startSensors();
        
        // Run assessment immediately, then every 10 seconds for testing
        runAssessment();
        timerRef.current = setInterval(runAssessment, 10 * 1000); 
    };

    const stopContextMonitoring = () => {
        console.log("👁️ Context Risk Monitoring Stopped");
        setIsMonitoring(false);
        contextRiskService.stopSensors();
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const runAssessment = async () => {
        // Don't run if app is in background (unless we have background fetch configured, which is complex)
        // For MVP, we assume foreground or active usage.
        if (AppState.currentState !== 'active') return;

        const result = await contextRiskService.assessRisk();
        
        if (result) {
            setCurrentRiskScore(result.riskScore);
            
            if (result.label === 1) {
                console.log("🚨 HIGH RISK DETECTED BY CONTEXT MODEL!");
                // Trigger SOS
                // We pass 'true' for stealth if needed, or false for countdown
                triggerSOS("High Environmental Risk Detected", false); 
                stopContextMonitoring(); // Stop monitoring to prevent loop
            }
        }
    };

    // Cleanup on unmount
    // useEffect(() => {
    //     return () => {
    //         stopContextMonitoring();
    //     };
    // }, []);

    return (
        <ContextRiskContext.Provider value={{
            isMonitoring,
            startContextMonitoring,
            stopContextMonitoring,
            currentRiskScore
        }}>
            {children}
        </ContextRiskContext.Provider>
    );
};

export const useContextRisk = () => {
    const context = useContext(ContextRiskContext);
    if (context === undefined) {
        throw new Error('useContextRisk must be used within a ContextRiskProvider');
    }
    return context;
};
