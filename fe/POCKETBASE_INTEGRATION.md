# PocketBase Integration for Frontend

This document explains the PocketBase SDK integration for the frontend task management system.

## Overview

The frontend has been fully integrated with PocketBase to provide real-time task management capabilities. All task operations (Create, Read, Update, Delete) are now handled through PocketBase instead of mock data.

## Components Implemented

### 1. PocketBase Client Configuration (`/src/lib/pocketbase.ts`)

- Single PocketBase client instance
- Auto-cancellation enabled for requests
- Authentication state persistence to localStorage
- Type definitions for TaskRecord and UserRecord

### 2. Enhanced Task Schema (`/src/features/tasks/data/schema.ts`)

- Comprehensive task schema with all required fields
- Support for task status: `todo`, `in_progress`, `done`, `canceled`, `backlog`
- Support for task priority: `low`, `medium`, `high`
- Create and update schemas for form validation
- Filter schema for querying tasks

### 3. Tasks API Service (`/src/features/tasks/api/tasks-api.ts`)

- Complete CRUD operations for tasks
- Real-time subscriptions for live updates
- Advanced filtering and pagination support
- Task statistics aggregation
- Error handling and data transformation

### 4. Enhanced Tasks Provider (`/src/features/tasks/components/tasks-provider.tsx`)

- React Query integration for data fetching and caching
- Real-time updates using PocketBase subscriptions
- Loading and error states
- Optimistic updates with cache invalidation
- Toast notifications for user feedback

### 5. Updated Task Components

- **Tasks Index** (`/src/features/tasks/index.tsx`): Updated to use provider data
- **Tasks Dialogs** (`/src/features/tasks/components/tasks-dialogs.tsx`): Real delete functionality
- **Tasks Mutate Drawer** (`/src/features/tasks/components/tasks-mutate-drawer.tsx`): Full CRUD form handling

## Environment Configuration

Create a `.env.local` file in the frontend directory:

```env
VITE_POCKETBASE_URL=http://localhost:8090
```

## Task Model Structure

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'canceled' | 'backlog';
  priority: 'low' | 'medium' | 'high';
  label?: string;
  assignee?: string;
  due_date?: string;
  created?: string;
  updated?: string;
}
```

## Key Features

### 1. Real-time Updates

- Automatic data synchronization across all connected clients
- Live notifications for task changes
- Instant UI updates without page refresh

### 2. Advanced Filtering

- Search by title or description
- Filter by status, priority, assignee, or label
- Sorting and pagination support

### 3. Optimistic Updates

- Immediate UI feedback for user actions
- Automatic cache invalidation and refetching
- Error rollback with toast notifications

### 4. Type Safety

- Full TypeScript integration
- Zod schema validation for forms
- Type-safe API calls

## Usage Examples

### Using the Tasks Provider

```typescript
import { useTasks } from '@/features/tasks/components/tasks-provider';

function MyComponent() {
  const { 
    tasks, 
    isLoading, 
    error, 
    createTask, 
    updateTask, 
    deleteTask,
    filters,
    setFilters 
  } = useTasks();

  // Use the data and methods
}
```

### Creating a Task

```typescript
const { createTask } = useTasks();

const handleCreate = async () => {
  await createTask({
    title: 'New Task',
    description: 'Task description',
    status: 'todo',
    priority: 'high',
    label: 'feature',
    assignee: 'John Doe',
    due_date: '2024-01-01T00:00:00Z'
  });
};
```

### Filtering Tasks

```typescript
const { setFilters } = useTasks();

const handleFilter = () => {
  setFilters({
    status: 'in_progress',
    priority: 'high',
    search: 'bug fix',
    page: 1,
    perPage: 20
  });
};
```

## Backend Requirements

Ensure your PocketBase backend has a `tasks` collection with the following fields:

- `title` (text, required)
- `description` (text, optional)
- `status` (select, options: todo, in_progress, done, canceled, backlog)
- `priority` (select, options: low, medium, high)
- `label` (text, optional)
- `assignee` (text, optional)
- `due_date` (date, optional)

## Development Workflow

1. **Start PocketBase backend**: `cd be && ./pocketbase serve`
2. **Start frontend**: `cd fe && npm run dev`
3. **Access the application**: `http://localhost:5173`

## Error Handling

All API errors are handled gracefully with:

- Toast notifications for user feedback
- Console logging for debugging
- Automatic retry mechanisms where appropriate
- Fallback UI states for error conditions

## Performance Optimizations

- **React Query caching**: Reduces unnecessary API calls
- **Optimistic updates**: Immediate UI feedback
- **Pagination**: Handles large datasets efficiently
- **Real-time subscriptions**: Minimal data transfer

## Future Enhancements

Potential improvements that can be added:

- Task comments and attachments
- Task dependencies and relationships
- Advanced search with full-text indexing
- Task templates and批量操作
- Export/import functionality
- Advanced user permissions

## Troubleshooting

### Common Issues

1. **Connection errors**: Check PocketBase URL in `.env.local`
2. **Authentication issues**: Verify user permissions in PocketBase
3. **Real-time not working**: Ensure WebSocket connection is established
4. **Form validation errors**: Check Zod schema definitions

### Debug Mode

Enable debug logging by setting:

```env
VITE_POCKETBASE_DEBUG=true
```

This will log all API calls and real-time events to the console.
