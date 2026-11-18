// Fake data for "Brightwave Inc.", a fictional company.
// Tickets are kept in memory, so they reset when the server restarts.

export const employees = [
  { id: 'E001', name: 'Amira Haddad',   email: 'amira.haddad@brightwave.example',   department: 'Engineering', title: 'Backend Developer' },
  { id: 'E002', name: 'Lucas Martin',   email: 'lucas.martin@brightwave.example',   department: 'Engineering', title: 'Engineering Manager' },
  { id: 'E003', name: 'Sofia Rossi',    email: 'sofia.rossi@brightwave.example',    department: 'Finance',     title: 'Accountant' },
  { id: 'E004', name: 'Karim Nassar',   email: 'karim.nassar@brightwave.example',   department: 'Sales',       title: 'Account Executive' },
  { id: 'E005', name: 'Emma Dubois',    email: 'emma.dubois@brightwave.example',    department: 'HR',          title: 'HR Partner' },
  { id: 'E006', name: 'Noah Schneider', email: 'noah.schneider@brightwave.example', department: 'IT',          title: 'IT Support Lead' },
];

export const tickets = [
  { id: 'T-1001', employeeId: 'E003', title: 'Cannot sign in to the expense app with SSO', priority: 'high',   status: 'open',        createdAt: '2026-11-16' },
  { id: 'T-1002', employeeId: 'E004', title: 'Laptop battery drains in 2 hours',           priority: 'medium', status: 'in_progress', createdAt: '2026-11-14' },
  { id: 'T-1003', employeeId: 'E001', title: 'Need access to the staging database',        priority: 'low',    status: 'open',        createdAt: '2026-11-17' },
  { id: 'T-1004', employeeId: 'E005', title: 'Printer on floor 2 is jammed',               priority: 'low',    status: 'closed',      createdAt: '2026-11-10', resolution: 'Cleared the paper tray.' },
];

export const slaPolicy = `# Brightwave IT Helpdesk – Service Level Agreement

| Priority | Use it when                                                   | First response | Target fix |
|----------|---------------------------------------------------------------|----------------|------------|
| high     | Someone cannot work at all (login broken, laptop dead, outage) | 1 hour         | 4 hours    |
| medium   | Work is slowed down but there is a workaround                  | 4 hours        | 2 days     |
| low      | Requests and small annoyances (access requests, printers)      | 1 day          | 5 days     |

Rules:
- Login and SSO problems are always **high** priority.
- Access requests (databases, shared drives, new apps) need the employee's manager to approve them, so they are **low** priority until approved.
- Before you open a new ticket, check that the employee does not already have an open ticket for the same problem.
`;
