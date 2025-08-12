// Task Details Modal - View task logs, results, and screenshots
import React from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Clock,
  User,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Task } from '@/config/api';
import { getTaskDisplayName } from '@/config/tasks';
import { ApiService } from '@/services/api';

interface TaskDetailsProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  taskLogs?: string[];
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({
  task,
  isOpen,
  onClose,
  taskLogs = [],
}) => {
  if (!task) return null;

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'running':
        return (
          <div className="h-5 w-5 rounded-full border-2 border-warning border-t-transparent animate-spin" />
        );
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'failed':
        return 'bg-destructive';
      case 'running':
        return 'bg-warning';
      default:
        return 'bg-muted';
    }
  };

  const handleDownloadFile = (filename: string) => {
    ApiService.downloadFile(filename);
  };

  const handleViewScreenshot = (screenshot: string) => {
    const url = ApiService.getStaticFileUrl(screenshot);
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getStatusIcon(task.status)}
            <div>
              <div className="text-lg">{getTaskDisplayName(task.name)}</div>
              <div className="text-sm text-muted-foreground font-normal">
                ID: {task.id}
              </div>
            </div>
            <Badge 
              variant="secondary"
              className={`${getStatusColor(task.status)} text-white ml-auto`}
            >
              {task.status.toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <span className="text-sm">{formatDateTime(task.created_at)}</span>
                    </div>
                    {task.started_at && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Started:</span>
                        <span className="text-sm">{formatDateTime(task.started_at)}</span>
                      </div>
                    )}
                    {task.completed_at && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Completed:</span>
                        <span className="text-sm">{formatDateTime(task.completed_at)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.progress !== undefined ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Progress
                          </span>
                          <span className="text-sm font-medium">
                            {Math.round(task.progress)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(task.progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No progress information available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {task.error && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Error Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-destructive">{task.error}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="flex-1">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Task Logs ({taskLogs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full pb-6">
                  <ScrollArea className="h-full w-full rounded border bg-muted/20 p-4">
                    {taskLogs.length > 0 ? (
                      <div className="space-y-2">
                        {taskLogs.map((log, index) => (
                          <div key={index} className="text-sm font-mono">
                            <span className="text-muted-foreground mr-2">
                              [{new Date().toLocaleTimeString()}]
                            </span>
                            {log}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No logs available
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="flex-1">
              <div className="space-y-4 h-full">
                {task.result?.message && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Result Message</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{task.result.message}</p>
                    </CardContent>
                  </Card>
                )}

                {task.result?.screenshot && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Screenshot
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewScreenshot(task.result!.screenshot!)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Screenshot
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadFile(task.result!.screenshot!)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {task.result?.files && task.result.files.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Generated Files ({task.result.files.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {task.result.files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <span className="text-sm font-mono">{file}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadFile(file)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!task.result && (
                  <Card>
                    <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                      No results available
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Parameters Tab */}
            <TabsContent value="parameters" className="flex-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Task Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {task.params && Object.keys(task.params).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(task.params).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-muted-foreground">
                              {key}:
                            </span>
                            <span className="text-sm max-w-md text-right break-words">
                              {typeof value === 'object' 
                                ? JSON.stringify(value, null, 2)
                                : String(value)
                              }
                            </span>
                          </div>
                          <Separator className="my-2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No parameters provided
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};