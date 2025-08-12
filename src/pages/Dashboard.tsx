// Main Dashboard Page - AI Agent Task Management Interface
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import {
  Bot,
  Activity,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  Users,
  TrendingUp,
} from 'lucide-react';

// Components
import { TaskTable } from '@/components/TaskTable';
import { TaskForm } from '@/components/TaskForm';
import { TaskDetails } from '@/components/TaskDetails';
import { Analytics } from '@/components/Analytics';

// Services
import { ApiService } from '@/services/api';
import { webSocketService, WebSocketService } from '@/services/websocket';
import { Task, TaskType } from '@/config/api';
import { TASK_TYPES } from '@/config/tasks';

const Dashboard: React.FC = () => {
  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>(TASK_TYPES);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskLogs, setTaskLogs] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // Load initial data
  useEffect(() => {
    loadTaskHistory();
    loadTaskTypes();
    
    // Set up WebSocket event listeners
    const unsubscribeTaskUpdate = webSocketService.onTaskUpdate(handleTaskUpdate);
    const unsubscribeLog = webSocketService.onLog(handleLogUpdate);

    return () => {
      unsubscribeTaskUpdate();
      unsubscribeLog();
      webSocketService.disconnectAll();
    };
  }, []);

  // Load task history
  const loadTaskHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const history = await ApiService.getTaskHistory();
      setTasks(history);
      
      // Connect to WebSocket for running tasks
      const runningTasks = history.filter(task => 
        task.status === 'running' || task.status === 'pending'
      );
      
      runningTasks.forEach(task => {
        webSocketService.connectToTask(task.id);
      });
      
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to load task history:', error);
      toast.error('Failed to load task history');
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load available task types
  const loadTaskTypes = useCallback(async () => {
    try {
      const types = await ApiService.getTaskTypes();
      setTaskTypes(types);
    } catch (error) {
      console.warn('Using fallback task types:', error);
      // Keep using TASK_TYPES fallback
    }
  }, []);

  // Handle task updates from WebSocket
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, ...updates }
          : task
      )
    );

    // Update selected task if it's currently viewed
    setSelectedTask(prevSelected => 
      prevSelected && prevSelected.id === taskId
        ? { ...prevSelected, ...updates }
        : prevSelected
    );
  }, []);

  // Handle log updates from WebSocket
  const handleLogUpdate = useCallback((taskId: string, log: string) => {
    setTaskLogs(prevLogs => ({
      ...prevLogs,
      [taskId]: [...(prevLogs[taskId] || []), log]
    }));
  }, []);

  // Start a new task
  const handleStartTask = useCallback(async (taskType: string, params: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const task = await ApiService.startTask(taskType, params);
      
      // Add to tasks list
      setTasks(prevTasks => [task, ...prevTasks]);
      
      // Connect to WebSocket for real-time updates
      webSocketService.connectToTask(task.id);
      
      toast.success(`Task "${taskType}" started successfully`);
      
      return task;
    } catch (error) {
      console.error('Failed to start task:', error);
      throw error; // Re-throw to let form handle it
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // View task details
  const handleViewDetails = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  // Retry a failed task
  const handleRetryTask = useCallback(async (task: Task) => {
    if (task.params) {
      await handleStartTask(task.name, task.params);
    } else {
      toast.error('Cannot retry task: No parameters available');
    }
  }, [handleStartTask]);

  // Download file
  const handleDownloadFile = useCallback(async (filename: string) => {
    try {
      await ApiService.downloadFile(filename);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, []);

  // Refresh data
  const handleRefresh = useCallback(() => {
    loadTaskHistory();
    loadTaskTypes();
  }, [loadTaskHistory, loadTaskTypes]);

  // Get status counts for quick stats
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
      
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    AI Agent Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Automation Task Management
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {connectionStatus === 'connected' ? (
                  <Wifi className="h-4 w-4 text-success" />
                ) : (
                  <WifiOff className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm">
                  {connectionStatus === 'connected' ? 'Connected' : 'Offline'}
                </span>
              </div>
              
              {/* Quick Stats */}
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="secondary" className="bg-status-success text-white">
                  ✓ {statusCounts.completed || 0}
                </Badge>
                <Badge variant="secondary" className="bg-status-running text-white">
                  ⏳ {statusCounts.running || 0}
                </Badge>
                <Badge variant="secondary" className="bg-status-failed text-white">
                  ✗ {statusCounts.failed || 0}
                </Badge>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="tasks">New Task</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Quick Stats Cards */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tasks.length}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statusCounts.completed || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Successfully finished
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Running</CardTitle>
                  <Users className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statusCounts.running || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently active
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <Settings className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statusCounts.failed || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Need attention
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Task Table */}
            <TaskTable
              tasks={tasks}
              onViewDetails={handleViewDetails}
              onRetryTask={handleRetryTask}
              onDownloadFile={handleDownloadFile}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Analytics tasks={tasks} />
          </TabsContent>

          {/* New Task Tab */}
          <TabsContent value="tasks">
            <div className="max-w-2xl mx-auto">
              <TaskForm
                taskTypes={taskTypes}
                onSubmit={handleStartTask}
                isSubmitting={isSubmitting}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Task Details Modal */}
      <TaskDetails
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        taskLogs={selectedTask ? taskLogs[selectedTask.id] : []}
      />
    </div>
  );
};

export default Dashboard;
