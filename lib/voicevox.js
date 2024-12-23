import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class VoicevoxManager {
  static isRunning = false;

  static async startEngine() {
    if (this.isRunning) return;

    try {
      await execAsync('docker-compose up -d');
      this.isRunning = true;
      
      // Wait for the engine to fully start
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('Voicevox engine started successfully');
    } catch (error) {
      console.error('Failed to start Voicevox engine:', error);
      throw error;
    }
  }

  static async stopEngine() {
    if (!this.isRunning) return;

    try {
      await execAsync('docker-compose down');
      this.isRunning = false;
      console.log('Voicevox engine stopped successfully');
    } catch (error) {
      console.error('Failed to stop Voicevox engine:', error);
      throw error;
    }
  }
} 