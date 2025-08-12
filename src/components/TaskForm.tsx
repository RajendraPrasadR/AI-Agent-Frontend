// Task Form Component - Dynamic form for triggering tasks
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Settings, AlertCircle } from 'lucide-react';
import { TaskType, TaskParam } from '@/config/api';
import { TASK_TYPES } from '@/config/tasks';

interface TaskFormProps {
  taskTypes: TaskType[];
  onSubmit: (taskType: string, params: Record<string, any>) => Promise<any>;
  isSubmitting?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  taskTypes = TASK_TYPES,
  onSubmit,
  isSubmitting = false,
}) => {
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | null>(null);

  // Create dynamic schema based on selected task type
  const createSchema = (taskType: TaskType | null) => {
    if (!taskType) return z.object({});

    const schemaFields: Record<string, z.ZodTypeAny> = {};

    taskType.params.forEach((param) => {
      let fieldSchema: z.ZodTypeAny;

      switch (param.type) {
        case 'number':
          let numberSchema = z.coerce.number();
          if (param.validation?.min !== undefined) {
            numberSchema = numberSchema.min(param.validation.min);
          }
          if (param.validation?.max !== undefined) {
            numberSchema = numberSchema.max(param.validation.max);
          }
          fieldSchema = numberSchema;
          break;

        case 'url':
          fieldSchema = z.string().url('Please enter a valid URL');
          break;

        case 'text':
        case 'textarea':
        default:
          let stringSchema = z.string();
          if (param.validation?.pattern) {
            stringSchema = stringSchema.regex(
              new RegExp(param.validation.pattern),
              'Invalid format'
            );
          }
          fieldSchema = stringSchema;
          break;
      }

      if (!param.required) {
        fieldSchema = fieldSchema.optional().or(z.literal(''));
      }

      schemaFields[param.name] = fieldSchema;
    });

    return z.object(schemaFields);
  };

  const form = useForm<Record<string, any>>({
    resolver: zodResolver(createSchema(selectedTaskType)),
    defaultValues: {},
  });

  const handleTaskTypeChange = (taskTypeName: string) => {
    const taskType = taskTypes.find(t => t.name === taskTypeName) || null;
    setSelectedTaskType(taskType);
    form.reset(); // Reset form when task type changes
  };

  const handleSubmit = async (values: Record<string, any>) => {
    if (!selectedTaskType) return;

    // Clean up empty values
    const cleanedValues = Object.entries(values).reduce((acc, [key, value]) => {
      if (value !== '' && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    await onSubmit(selectedTaskType.name, cleanedValues);
    form.reset();
  };

  const renderFormField = (param: TaskParam) => {
    return (
      <FormField
        key={param.name}
        control={form.control}
        name={param.name}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              {param.label}
              {param.required && (
                <Badge variant="destructive" className="text-xs">
                  Required
                </Badge>
              )}
            </FormLabel>
            <FormControl>
              {param.type === 'textarea' ? (
                <Textarea
                  placeholder={param.placeholder}
                  className="min-h-[100px]"
                  {...field}
                />
              ) : (
                <Input
                  type={param.type === 'number' ? 'number' : 'text'}
                  placeholder={param.placeholder}
                  {...field}
                />
              )}
            </FormControl>
            {param.validation && (
              <FormDescription className="text-xs">
                {param.validation.min !== undefined && param.validation.max !== undefined && (
                  `Range: ${param.validation.min} - ${param.validation.max}`
                )}
                {param.validation.pattern && (
                  `Pattern: ${param.validation.pattern}`
                )}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Card className="w-full bg-gradient-to-br from-card to-card/95 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Start New Task
        </CardTitle>
        <CardDescription>
          Select a task type and provide the required parameters to start automation.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Task Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Task Type</label>
          <Select onValueChange={handleTaskTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a task type..." />
            </SelectTrigger>
            <SelectContent>
              {taskTypes.map((taskType) => (
                <SelectItem key={taskType.name} value={taskType.name}>
                  <div className="flex flex-col">
                    <span className="font-medium">{taskType.display_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {taskType.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Parameter Form */}
        {selectedTaskType && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {selectedTaskType.params.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    Configure parameters for {selectedTaskType.display_name}
                  </div>
                  
                  {selectedTaskType.params.map(renderFormField)}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No parameters required for this task.
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Starting Task...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Task
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};