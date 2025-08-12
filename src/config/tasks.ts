// Task Configuration - Define available automation tasks
import { TaskType } from "./api";

export const TASK_TYPES: TaskType[] = [
  {
    name: "approve_batches",
    display_name: "Approve Batches",
    description: "Automatically approve batches in the Naipunyam portal",
    params: [
      {
        name: "remark",
        type: "text",
        label: "Approval Remark",
        placeholder: "Enter approval remark (optional)",
        required: false,
      },
      {
        name: "batch_count",
        type: "number",
        label: "Number of Batches",
        placeholder: "Enter number of batches to approve",
        required: false,
        validation: {
          min: 1,
          max: 100,
        },
      },
    ],
  },
  {
    name: "generate_certificates",
    display_name: "Generate Certificates",
    description: "Generate certificates for completed batches",
    params: [
      {
        name: "batch_id",
        type: "text",
        label: "Batch ID",
        placeholder: "Enter batch ID",
        required: true,
      },
      {
        name: "template",
        type: "text",
        label: "Certificate Template",
        placeholder: "Enter template name (optional)",
        required: false,
      },
    ],
  },
  {
    name: "download_reports",
    display_name: "Download Reports",
    description: "Download reports from the system",
    params: [
      {
        name: "report_type",
        type: "text",
        label: "Report Type",
        placeholder: "Enter report type (e.g., attendance, progress)",
        required: true,
      },
      {
        name: "date_range",
        type: "text",
        label: "Date Range",
        placeholder: "Enter date range (e.g., 2024-01-01 to 2024-01-31)",
        required: false,
      },
    ],
  },
  {
    name: "update_expenses",
    display_name: "Update Expenses",
    description: "Update expenses in Google Sheets",
    params: [
      {
        name: "sheet_url",
        type: "url",
        label: "Google Sheet URL",
        placeholder: "Enter Google Sheet URL",
        required: true,
      },
      {
        name: "data",
        type: "textarea",
        label: "Expense Data",
        placeholder: "Enter expense data (JSON format)",
        required: true,
      },
    ],
  },
  {
    name: "backup_data",
    display_name: "Backup Data",
    description: "Create system data backup",
    params: [
      {
        name: "backup_type",
        type: "text",
        label: "Backup Type",
        placeholder: "Enter backup type (full, incremental)",
        required: false,
      },
    ],
  },
];

// Get task type by name
export const getTaskType = (name: string): TaskType | undefined => {
  return TASK_TYPES.find(task => task.name === name);
};

// Get task display name
export const getTaskDisplayName = (name: string): string => {
  const taskType = getTaskType(name);
  return taskType?.display_name || name;
};