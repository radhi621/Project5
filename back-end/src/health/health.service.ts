import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  private startTime: number;

  constructor(@InjectConnection() private connection: Connection) {
    this.startTime = Date.now();
  }

  async getSystemHealth(): Promise<any> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const dbStatus = await this.getDatabaseStatus();
    const memoryUsage = process.memoryUsage();

    return {
      status: 'online',
      uptime: `${uptime}s`,
      database: dbStatus,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async getDatabaseStatus(): Promise<any> {
    try {
      const state = this.connection.readyState;
      const stateMap: { [key: number]: string } = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
      };

      if (!this.connection.db) {
        return {
          status: 'disconnected',
          responseTime: 'N/A',
          connections: 0,
        };
      }

      const adminDb = this.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();

      return {
        status: stateMap[state] || 'unknown',
        responseTime: serverStatus ? 'OK' : 'SLOW',
        connections: serverStatus?.connections?.current || 0,
      };
    } catch (error) {
      return {
        status: 'error',
        responseTime: 'ERROR',
        error: error.message,
      };
    }
  }

  async getResponseTimeMetrics(): Promise<any> {
    const startTime = Date.now();
    
    try {
      if (!this.connection.db) {
        return {
          database: 'error',
          status: 'offline',
          error: 'Database not connected',
        };
      }

      await this.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      return {
        database: `${responseTime}ms`,
        status: responseTime < 100 ? 'excellent' : responseTime < 300 ? 'good' : 'slow',
      };
    } catch (error) {
      return {
        database: 'error',
        status: 'offline',
        error: error.message,
      };
    }
  }

  async getStorageMetrics(): Promise<any> {
    try {
      if (!this.connection.db) {
        return {
          totalSize: 'unknown',
          error: 'Database not connected',
        };
      }

      const adminDb = this.connection.db.admin();
      const listDatabases = await adminDb.listDatabases();
      
      const currentDb = this.connection.db;
      const stats = await currentDb.stats();

      return {
        totalSize: `${Math.round(stats.dataSize / 1024 / 1024)}MB`,
        collections: stats.collections,
        indexes: stats.indexes,
        storageSize: `${Math.round(stats.storageSize / 1024 / 1024)}MB`,
        totalDatabases: listDatabases.databases.length,
      };
    } catch (error) {
      return {
        totalSize: 'unknown',
        error: error.message,
      };
    }
  }
}
