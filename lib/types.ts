import type { Branch, PaymentStatus, Role, Stage } from "@/lib/theme";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  booking_link: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  client_name: string;
  branch: Branch | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  stage: Stage;
  lost_reason: string | null;
  owner: string[];
  salesperson: string[];
  source: string | null;
  value: number | null;
  end_date: string | null;
  target_date: string | null;
  scheduled_call: string | null;
  notes: string | null;

  build: boolean;
  build_value: number | null;
  payment_status: PaymentStatus | null;
  build_end_date: string | null;

  subscription: boolean;
  subscription_value: number | null;
  deliver_date: string | null;

  commission_rate: number;

  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;

  created_at: string;
  updated_at: string;
};

export type ProjectTaskStatus = "Not Started" | "In Progress" | "Done";

export type ProjectTask = {
  id: string;
  project_id: string;
  task_name: string;
  owner: string | null;
  due_date: string | null;
  status: ProjectTaskStatus;
  notes: string | null;
  created_at: string;
};

export type Transaction = {
  id: string;
  project_id: string | null;
  amount: number;
  date: string;
  payer: string | null;
  payee: string | null;
  notes: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  name: string;
  source: string | null;
  contact_info: string | null;
  notes: string | null;
  created_at: string;
};

export type Contact = {
  id: string;
  project_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  stage: Stage | null;
  created_at: string;
};

export function isOverdue(project: Pick<Project, "target_date" | "stage">) {
  if (!project.target_date) return false;
  if (
    project.stage === "Complete" ||
    project.stage === "Subscriber" ||
    project.stage === "Lost"
  ) {
    return false;
  }
  return new Date(project.target_date) < new Date(new Date().toDateString());
}

export function isTaskOverdue(task: Pick<ProjectTask, "due_date" | "status">) {
  if (!task.due_date || task.status === "Done") return false;
  return new Date(task.due_date) < new Date(new Date().toDateString());
}
