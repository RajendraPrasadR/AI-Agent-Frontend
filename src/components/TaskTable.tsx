// Task Table Component - Display and filter task history
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Eye, 
  Download, 
  RefreshCw, 
  Search,
  Calendar,
  Filter,
} from 'lucide-react';
import { Task, TaskStatus } from '@/config/api';
import { getTaskDisplayName } from '@/config/tasks';

interface TaskTableProps {
  tasks: Task[];
  onViewDetails: (task: Task) => void;
  onRetryTask: (task: Task) => void;
  onDownloadFile: (filename: string) => void;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-status-pending',
  running: 'bg-status-running',
  completed: 'bg-status-success',
  failed: 'bg-status-failed',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onViewDetails,
  onRetryTask,
  onDownloadFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = 
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getTaskDisplayName(task.name).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      
      const matchesDate = !dateFilter || 
        task.created_at.startsWith(dateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [tasks, searchQuery, statusFilter, dateFilter]);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const formatDuration = (start?: string, end?: string) => {
    if (!start) return '-';
    if (!end) return 'Running...';
    
    try {
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      const duration = Math.round((endTime - startTime) / 1000);
      
      if (duration < 60) return `${duration}s`;
      if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
      return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
    } catch {
      return '-';
    }
  };

  return (
    <Card className="w-full bg-gradient-to-br from-card to-card/95 shadow-card">
      <CardHeader className="space-y-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Task History ({filteredTasks.length})
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-[150px]"
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No tasks found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div>
                        <div className="font-medium">{getTaskDisplayName(task.name)}</div>
                        <div className="text-sm text-muted-foreground">{task.id}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={`${STATUS_COLORS[task.status]} text-white`}
                      >
                        {STATUS_LABELS[task.status]}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-sm">
                      {formatDateTime(task.created_at)}
                    </TableCell>
                    
                    <TableCell className="text-sm">
                      {formatDuration(task.started_at, task.completed_at)}
                    </TableCell>
                    
                    <TableCell>
                      {task.progress !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(task.progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(task.progress)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(task)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {task.result?.files && task.result.files.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDownloadFile(task.result!.files![0])}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {(task.status === 'failed' || task.status === 'completed') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRetryTask(task)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};