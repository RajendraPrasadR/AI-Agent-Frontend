// API Configuration for AI Agent Dashboard
export const API_CONFIG = {
  BASE_URL: "http://127.0.0.1:8000",
  API_KEY: "your_secret_key", // Replace with actual API key
  WEBSOCKET_URL: "ws://127.0.0.1:8000",
  POLLING_INTERVAL: 5000, // 5 seconds fallback polling
  TIMEOUT: 30000, // 30 seconds
};

// API endpoints
export const ENDPOINTS = {
  TASKS: "/tasks/",
  START_TASK: "/start_task/",
  STATUS: "/status/",
  RESULT: "/result/",
  WEBSOCKET: "/ws/task/",
  STATIC: "/static/",
  HISTORY: "/tasks/history",
} as const;

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  params?: Record<string, any>;
  progress?: number;
  logs?: string[];
  error?: string;
  result?: {
    files?: string[];
    screenshot?: string;
    message?: string;
  };
}

export interface TaskType {
  name: string;
  display_name: string;
  description: string;
  params: TaskParam[];
}

export interface TaskParam {
  name: string;
  type: "text" | "textarea" | "number" | "url" | "file";
  label: string;
  placeholder?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}