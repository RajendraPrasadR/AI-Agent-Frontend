// WebSocket Service for Real-time Task Updates
import { API_CONFIG, ENDPOINTS, Task } from '@/config/api';
import { ApiService } from './api';
import toast from 'react-hot-toast';

export type WebSocketEventType = 'status' | 'progress' | 'log' | 'completed' | 'failed';

export interface WebSocketMessage {
  type: WebSocketEventType;
  task_id: string;
  data: any;
  timestamp: string;
}

export interface TaskUpdateCallback {
  (taskId: string, updates: Partial<Task>): void;
}

export interface LogCallback {
  (taskId: string, log: string): void;
}

export class WebSocketService {
  private connections: Map<string, WebSocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private maxReconnectAttempts = 5;
  
  private taskUpdateCallbacks: TaskUpdateCallback[] = [];
  private logCallbacks: LogCallback[] = [];

  // Subscribe to task updates
  onTaskUpdate(callback: TaskUpdateCallback): () => void {
    this.taskUpdateCallbacks.push(callback);
    return () => {
      const index = this.taskUpdateCallbacks.indexOf(callback);
      if (index >= 0) {
        this.taskUpdateCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to log updates
  onLog(callback: LogCallback): () => void {
    this.logCallbacks.push(callback);
    return () => {
      const index = this.logCallbacks.indexOf(callback);
      if (index >= 0) {
        this.logCallbacks.splice(index, 1);
      }
    };
  }

  // Connect to task WebSocket
  connectToTask(taskId: string): void {
    if (this.connections.has(taskId)) {
      return; // Already connected
    }

    const wsUrl = `${API_CONFIG.WEBSOCKET_URL}${ENDPOINTS.WEBSOCKET}${taskId}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log(`WebSocket connected for task ${taskId}`);
        this.connections.set(taskId, ws);
        this.reconnectAttempts.delete(taskId);
        
        // Clear any existing polling for this task
        this.stopPolling(taskId);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed for task ${taskId}:`, event.code, event.reason);
        this.connections.delete(taskId);
        
        // Attempt reconnection if not intentionally closed
        if (event.code !== 1000) {
          this.handleReconnection(taskId);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for task ${taskId}:`, error);
        this.handleReconnection(taskId);
      };

    } catch (error) {
      console.error(`Failed to create WebSocket for task ${taskId}:`, error);
      this.fallbackToPolling(taskId);
    }
  }

  // Handle WebSocket message
  private handleWebSocketMessage(message: WebSocketMessage): void {
    const { type, task_id, data } = message;

    switch (type) {
      case 'status':
        this.notifyTaskUpdate(task_id, { 
          status: data.status,
          progress: data.progress,
        });
        break;

      case 'progress':
        this.notifyTaskUpdate(task_id, { 
          progress: data.progress 
        });
        break;

      case 'log':
        this.notifyLog(task_id, data.message);
        break;

      case 'completed':
        this.notifyTaskUpdate(task_id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: data.result,
          progress: 100,
        });
        toast.success(`Task completed: ${data.message || 'Success'}`);
        this.disconnect(task_id);
        break;

      case 'failed':
        this.notifyTaskUpdate(task_id, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: data.error,
        });
        toast.error(`Task failed: ${data.error || 'Unknown error'}`);
        this.disconnect(task_id);
        break;

      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  }

  // Handle reconnection with exponential backoff
  private handleReconnection(taskId: string): void {
    const attempts = this.reconnectAttempts.get(taskId) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.warn(`Max reconnection attempts reached for task ${taskId}, falling back to polling`);
      this.fallbackToPolling(taskId);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Max 30 seconds
    this.reconnectAttempts.set(taskId, attempts + 1);

    setTimeout(() => {
      console.log(`Attempting to reconnect WebSocket for task ${taskId} (attempt ${attempts + 1})`);
      this.connectToTask(taskId);
    }, delay);
  }

  // Fallback to polling when WebSocket fails
  private fallbackToPolling(taskId: string): void {
    if (this.pollingIntervals.has(taskId)) {
      return; // Already polling
    }

    console.log(`Starting polling fallback for task ${taskId}`);
    
    const interval = setInterval(async () => {
      try {
        const status = await ApiService.getTaskStatus(taskId);
        
        this.notifyTaskUpdate(taskId, status);

        // Stop polling if task is completed or failed
        if (status.status === 'completed' || status.status === 'failed') {
          this.stopPolling(taskId);
        }
      } catch (error) {
        console.error(`Polling error for task ${taskId}:`, error);
      }
    }, API_CONFIG.POLLING_INTERVAL);

    this.pollingIntervals.set(taskId, interval);
  }

  // Stop polling for a task
  private stopPolling(taskId: string): void {
    const interval = this.pollingIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(taskId);
      console.log(`Stopped polling for task ${taskId}`);
    }
  }

  // Disconnect from task
  disconnect(taskId: string): void {
    const ws = this.connections.get(taskId);
    if (ws) {
      ws.close(1000, 'Intentional disconnect');
      this.connections.delete(taskId);
    }
    
    this.stopPolling(taskId);
    this.reconnectAttempts.delete(taskId);
  }

  // Disconnect all connections
  disconnectAll(): void {
    for (const taskId of this.connections.keys()) {
      this.disconnect(taskId);
    }
  }

  // Notify task update callbacks
  private notifyTaskUpdate(taskId: string, updates: Partial<Task>): void {
    this.taskUpdateCallbacks.forEach(callback => {
      try {
        callback(taskId, updates);
      } catch (error) {
        console.error('Error in task update callback:', error);
      }
    });

    // Also update localStorage
    ApiService.updateTaskInHistory(taskId, updates);
  }

  // Notify log callbacks
  private notifyLog(taskId: string, log: string): void {
    this.logCallbacks.forEach(callback => {
      try {
        callback(taskId, log);
      } catch (error) {
        console.error('Error in log callback:', error);
      }
    });
  }

  // Get connection status
  isConnected(taskId: string): boolean {
    const ws = this.connections.get(taskId);
    return ws?.readyState === WebSocket.OPEN;
  }

  // Get all active connections
  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();