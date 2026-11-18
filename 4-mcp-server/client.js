// A tiny MCP CLIENT that tests server.js without Claude.
// It does what Claude Code / Claude Desktop do behind the scenes:
// start the server as a child process, then list and call its tools over stdio.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({ command: 'node', args: ['server.js'] });
const client = new Client({ name: 'test-client', version: '1.0.0' });
await client.connect(transport);

const text = (result) => result.content.map((c) => c.text).join('\n');

console.log('--- tools ---');
const { tools } = await client.listTools();
for (const tool of tools) console.log(`• ${tool.name}: ${tool.description}`);

console.log('\n--- resources ---');
const { resources } = await client.listResources();
for (const r of resources) console.log(`• ${r.uri}  (${r.title})`);

console.log('\n--- prompts ---');
const { prompts } = await client.listPrompts();
for (const p of prompts) console.log(`• ${p.name}: ${p.description}`);

console.log('\n--- call find_employee({ query: "sofia" }) ---');
console.log(text(await client.callTool({ name: 'find_employee', arguments: { query: 'sofia' } })));

console.log('\n--- call create_ticket(...) ---');
console.log(text(await client.callTool({
  name: 'create_ticket',
  arguments: { employee_id: 'E004', title: 'VPN disconnects every 10 minutes', priority: 'medium' },
})));

console.log('\n--- call list_tickets({ status: "open" }) ---');
console.log(text(await client.callTool({ name: 'list_tickets', arguments: { status: 'open' } })));

console.log('\n--- call with a bad id (tool error) ---');
const bad = await client.callTool({ name: 'close_ticket', arguments: { ticket_id: 'T-9999', resolution: 'n/a' } });
console.log(`isError=${bad.isError}:`, text(bad));

console.log('\n--- read resource helpdesk://policies/sla (first 3 lines) ---');
const sla = await client.readResource({ uri: 'helpdesk://policies/sla' });
console.log(sla.contents[0].text.split('\n').slice(0, 3).join('\n'));

await client.close();
