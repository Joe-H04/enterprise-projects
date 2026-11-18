// Project 4 — a simple MCP server (Model Context Protocol)
//
// An MCP server gives an AI app (Claude Code, Claude Desktop, ...) three kinds of things:
//   1. TOOLS     – functions the model can call       (find_employee, list_tickets, ...)
//   2. RESOURCES – read-only data the app can load    (helpdesk://policies/sla)
//   3. PROMPTS   – ready-made prompt templates        (triage)
//
// It talks over STDIO: the app starts `node server.js` and sends JSON-RPC messages
// through stdin/stdout. That is why we must NEVER console.log() here: anything
// printed to stdout would break the protocol. Use console.error() for logs.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { employees, tickets, slaPolicy } from './data.js';

const server = new McpServer({ name: 'brightwave-helpdesk', version: '1.0.0' });

// Small helpers: every tool returns a list of content blocks (here, one text block).
const reply = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (message) => ({ content: [{ type: 'text', text: message }], isError: true });
const findById = (id) => employees.find((e) => e.id === id.toUpperCase());

// ---------- 1. TOOLS ----------
// The description and the input schema (zod) are what the model reads to decide
// WHEN to call a tool and WHAT arguments to pass. Write them for the model.

server.registerTool(
  'find_employee',
  {
    title: 'Find employee',
    description: 'Search the company directory by name, email or department. Returns matching employees with their id.',
    inputSchema: { query: z.string().min(1).describe('Part of a name, an email, or a department, e.g. "sofia" or "Finance"') },
    annotations: { readOnlyHint: true },
  },
  async ({ query }) => {
    const q = query.toLowerCase();
    const matches = employees.filter((e) =>
      [e.name, e.email, e.department].some((field) => field.toLowerCase().includes(q)));
    return matches.length ? reply(matches) : fail(`No employee matches "${query}".`);
  },
);

server.registerTool(
  'list_tickets',
  {
    title: 'List helpdesk tickets',
    description: 'List IT helpdesk tickets. You can filter by status and/or by employee id.',
    inputSchema: {
      status: z.enum(['open', 'in_progress', 'closed']).optional().describe('Only tickets with this status'),
      employee_id: z.string().optional().describe('Only tickets opened by this employee, e.g. "E003"'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ status, employee_id }) => {
    const result = tickets.filter((t) =>
      (!status || t.status === status) &&
      (!employee_id || t.employeeId === employee_id.toUpperCase()));
    return reply(result);
  },
);

server.registerTool(
  'create_ticket',
  {
    title: 'Create helpdesk ticket',
    description: 'Open a new IT helpdesk ticket for an employee. Read the SLA policy resource to pick the priority.',
    inputSchema: {
      employee_id: z.string().describe('Id of the employee with the problem, e.g. "E003". Use find_employee to get it.'),
      title: z.string().min(5).max(120).describe('Short summary of the problem'),
      priority: z.enum(['low', 'medium', 'high']),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ employee_id, title, priority }) => {
    const employee = findById(employee_id);
    if (!employee) return fail(`Unknown employee id "${employee_id}". Use find_employee first.`);

    const ticket = {
      id: `T-${1001 + tickets.length}`,
      employeeId: employee.id,
      title,
      priority,
      status: 'open',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    tickets.push(ticket);
    console.error(`[helpdesk] created ${ticket.id} for ${employee.name}`); // stderr, not stdout!
    return reply(ticket);
  },
);

server.registerTool(
  'close_ticket',
  {
    title: 'Close helpdesk ticket',
    description: 'Mark a ticket as closed and record how it was fixed.',
    inputSchema: {
      ticket_id: z.string().describe('e.g. "T-1001"'),
      resolution: z.string().min(3).describe('What was done to fix it'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  async ({ ticket_id, resolution }) => {
    const ticket = tickets.find((t) => t.id === ticket_id.toUpperCase());
    if (!ticket) return fail(`Ticket "${ticket_id}" does not exist.`);
    ticket.status = 'closed';
    ticket.resolution = resolution;
    return reply(ticket);
  },
);

// ---------- 2. RESOURCES ----------
// Read-only context identified by a URI. The app (or the user) decides when to load it.

server.registerResource(
  'sla-policy',
  'helpdesk://policies/sla',
  {
    title: 'Helpdesk SLA policy',
    description: 'How to choose a ticket priority, and the response times for each priority',
    mimeType: 'text/markdown',
  },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: slaPolicy }] }),
);

// ---------- 3. PROMPTS ----------
// A reusable prompt template. In Claude Code it shows up as a slash command:
//   /mcp__helpdesk__triage

server.registerPrompt(
  'triage',
  {
    title: 'Triage an IT problem',
    description: 'Turn a problem reported by an employee into a correctly prioritized ticket',
    argsSchema: {
      employee: z.string().describe('Name or email of the employee'),
      problem: z.string().describe('What the employee says is wrong'),
    },
  },
  ({ employee, problem }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text:
          `Employee "${employee}" reports this problem: "${problem}".\n\n` +
          '1. Use find_employee to get their id.\n' +
          '2. Read the SLA policy (helpdesk://policies/sla) and use it to choose a priority.\n' +
          '3. Use list_tickets to check whether they already have an open ticket for the same problem.\n' +
          '4. If not, use create_ticket. Then tell me the ticket id, the priority you chose and why.',
      },
    }],
  }),
);

// ---------- start ----------
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[helpdesk] MCP server running on stdio');
