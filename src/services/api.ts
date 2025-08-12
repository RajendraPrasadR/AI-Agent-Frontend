// API Service for AI Agent Dashboard
import axios, { AxiosResponse } from 'axios';
import { API_CONFIG, ENDPOINTS, Task, TaskType, TaskStatus } from '@/config/api';
import { TASK_TYPES } from '@/config/tasks';
import toast from 'react-hot-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_CONFIG.API_KEY,
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'API request failed';
    console.error('API Error:', error);
    toast.error(`API Error: ${message}`);
    throw error;
  }
);

export class ApiService {
  // Get available task types
  static async getTaskTypes(): Promise<TaskType[]> {
    try {
      const response = await api.get(ENDPOINTS.TASKS);
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch task types from API, using fallback config');
      return TASK_TYPES; // Fallback to local config
    }
  }

  // Start a new task
  static async startTask(taskType: string, params: Record<string, any>): Promise<Task> {
    const response = await api.post(ENDPOINTS.START_TASK, {
      task_type: taskType,
      params,
    });
    
    const task: Task = {
      id: response.data.task_id,
      name: taskType,
      status: 'pending',
      created_at: new Date().toISOString(),
      params,
    };

    // Store in localStorage for persistence
    this.saveTaskToHistory(task);
    
    toast.success(`Task "${taskType}" started successfully`);
    return task;
  }

  // Get task status
  static async getTaskStatus(taskId: string): Promise<Partial<Task>> {
    const response = await api.get(`${ENDPOINTS.STATUS}${taskId}`);
    return response.data;
  }

  // Get task result
  static async getTaskResult(taskId: string): Promise<any> {
    const response = await api.get(`${ENDPOINTS.RESULT}${taskId}`);
    return response.data;
  }

  // Get task history (with fallback to localStorage)
  static async getTaskHistory(): Promise<Task[]> {
    try {
      const response = await api.get(ENDPOINTS.HISTORY);
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch task history from API, using local storage');
      return this.getLocalTaskHistory();
    }
  }

  // Local storage helpers
  static saveTaskToHistory(task: Task): void {
    const history = this.getLocalTaskHistory();
    const existingIndex = history.findIndex(t => t.id === task.id);
    
    if (existingIndex >= 0) {
      history[existingIndex] = { ...history[existingIndex], ...task };
    } else {
      history.unshift(task);
    }
    
    // Keep only last 100 tasks
    const trimmedHistory = history.slice(0, 100);
    localStorage.setItem('taskHistory', JSON.stringify(trimmedHistory));
  }

  static getLocalTaskHistory(): Task[] {
    try {
      const history = localStorage.getItem('taskHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Failed to parse task history from localStorage:', error);
      return [];
    }
  }

  static updateTaskInHistory(taskId: string, updates: Partial<Task>): void {
    const history = this.getLocalTaskHistory();
    const taskIndex = history.findIndex(t => t.id === taskId);
    
    if (taskIndex >= 0) {
      history[taskIndex] = { ...history[taskIndex], ...updates };
      localStorage.setItem('taskHistory', JSON.stringify(history));
    }
  }

  // Build static file URL
  static getStaticFileUrl(filename: string): string {
    return `${API_CONFIG.BASE_URL}${ENDPOINTS.STATIC}${filename}`;
  }

  // Download file
  static async downloadFile(filename: string): Promise<void> {
    const url = this.getStaticFileUrl(filename);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      toast.error(`Failed to download ${filename}`);
      throw error;
    }
  }
}
