// Analytics Component - Charts and statistics for task performance
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Task } from '@/config/api';
import { getTaskDisplayName } from '@/config/tasks';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AnalyticsProps {
  tasks: Task[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ tasks }) => {
  // Calculate analytics data
  const analytics = useMemo(() => {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter tasks by time periods
    const recentTasks = tasks.filter(task => new Date(task.created_at) >= last7Days);
    const monthlyTasks = tasks.filter(task => new Date(task.created_at) >= last30Days);

    // Status counts
    const statusCounts = {
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      running: tasks.filter(t => t.status === 'running').length,
      pending: tasks.filter(t => t.status === 'pending').length,
    };

    // Task type counts
    const taskTypeCounts = tasks.reduce((acc, task) => {
      const displayName = getTaskDisplayName(task.name);
      acc[displayName] = (acc[displayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily completion data (last 7 days)
    const dailyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayTasks = tasks.filter(task => {
        const taskDate = new Date(task.created_at);
        return taskDate.toDateString() === date.toDateString();
      });
      
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completed: dayTasks.filter(t => t.status === 'completed').length,
        failed: dayTasks.filter(t => t.status === 'failed').length,
        total: dayTasks.length,
      };
    }).reverse();

    // Calculate success rate
    const completedTasks = statusCounts.completed;
    const totalFinished = completedTasks + statusCounts.failed;
    const successRate = totalFinished > 0 ? (completedTasks / totalFinished) * 100 : 0;

    // Average completion time
    const completedTasksWithTime = tasks.filter(t => 
      t.status === 'completed' && t.started_at && t.completed_at
    );
    
    const avgCompletionTime = completedTasksWithTime.length > 0
      ? completedTasksWithTime.reduce((sum, task) => {
          const start = new Date(task.started_at!).getTime();
          const end = new Date(task.completed_at!).getTime();
          return sum + (end - start);
        }, 0) / completedTasksWithTime.length
      : 0;

    return {
      statusCounts,
      taskTypeCounts,
      dailyData,
      successRate,
      avgCompletionTime,
      recentTasks: recentTasks.length,
      monthlyTasks: monthlyTasks.length,
    };
  }, [tasks]);

  // Chart configurations
  const dailyChartData = {
    labels: analytics.dailyData.map(d => d.date),
    datasets: [
      {
        label: 'Completed',
        data: analytics.dailyData.map(d => d.completed),
        backgroundColor: 'hsl(var(--success))',
        borderColor: 'hsl(var(--success))',
        borderWidth: 1,
      },
      {
        label: 'Failed',
        data: analytics.dailyData.map(d => d.failed),
        backgroundColor: 'hsl(var(--destructive))',
        borderColor: 'hsl(var(--destructive))',
        borderWidth: 1,
      },
    ],
  };

  const statusChartData = {
    labels: ['Completed', 'Failed', 'Running', 'Pending'],
    datasets: [
      {
        data: [
          analytics.statusCounts.completed,
          analytics.statusCounts.failed,
          analytics.statusCounts.running,
          analytics.statusCounts.pending,
        ],
        backgroundColor: [
          'hsl(var(--success))',
          'hsl(var(--destructive))',
          'hsl(var(--warning))',
          'hsl(var(--muted))',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-card/95 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.recentTasks} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/95 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.statusCounts.completed} completed tasks
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/95 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.avgCompletionTime > 0 
                ? formatTime(analytics.avgCompletionTime)
                : '-'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Average completion time
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/95 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.statusCounts.running + analytics.statusCounts.pending}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card className="bg-gradient-to-br from-card to-card/95 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Daily Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={dailyChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-gradient-to-br from-card to-card/95 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <Doughnut 
                data={statusChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }} 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Types Breakdown */}
      <Card className="bg-gradient-to-br from-card to-card/95 shadow-card">
        <CardHeader>
          <CardTitle>Most Used Task Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analytics.taskTypeCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([taskType, count]) => (
                <div key={taskType} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{taskType}</span>
                  <Badge variant="secondary">{count} tasks</Badge>
                </div>
              ))}
            {Object.keys(analytics.taskTypeCounts).length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No task types data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};