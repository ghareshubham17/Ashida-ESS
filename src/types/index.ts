// TypeScript type definitions and interfaces
// Export all your types from this file

export interface User {
  employee_id: string;
  employee_name: string;
  email: string;
  api_key: string;
  api_secret: string;
  device_id: string;
  app_id: string;
  require_password_reset: boolean;
}

export interface ApiResponse<T = any> {
  message?: T;
  data?: T;
  error?: string;
}

// Employee related types
export interface Employee {
  name: string;
  employee_name: string;
  user_id: string;
  status: string;
}

export interface EmployeeCheckin {
  name: string;
  employee: string;
  time: string;
  log_type: 'IN' | 'OUT';
  creation: string;
  device_id?: string;
}

// Quick Action types
export interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

// Greeting types
export interface GreetingIcon {
  name: string;
  color: string;
}

// Update/Notification types
export interface Update {
  name: string;
  subject: string;
  content: string;
  creation: string;
  user: string;
}

// Add more shared types here
