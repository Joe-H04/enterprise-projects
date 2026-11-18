# Project 4: A Simple MCP Server (Node.js)

**MCP (Model Context Protocol)** is an open standard for connecting AI apps to outside tools and data.
You write a **server** once, and any MCP **client** (Claude Code, Claude Desktop, IDEs, ...) can use it.

This server is the IT helpdesk of a fictional company, *Brightwave Inc.* It shows the three things an MCP server can offer:

| MCP primitive | Who decides to use it | In this project |
|---------------|-----------------------|-----------------|
| **Tools** – functions with inputs | The **model** calls them when it needs to | `find_employee`, `list_tickets`, `create_ticket`, `close_ticket` |
| **Resources** – read-only data with a URI | The **app / user** attaches them as context | `helpdesk://policies/sla` (how to choose a ticket priority) |
| **Prompts** – reusable prompt templates | The **user** picks them, like a slash command | `triage` (turn a reported problem into a correct ticket) |

## How it works

```
Claude Code / Claude Desktop  (MCP client)
        │  starts `node server.js` as a child process
        │  JSON-RPC messages over stdin / stdout  ("stdio" transport)
        ▼
server.js  (MCP server) ──► data.js (employees + tickets, in memory)
```

1. The client starts the server and asks: *which tools, resources and prompts do you have?*
2. The server answers with each tool's **name, description and input schema** (written with `zod`).
3. When you ask Claude something like *"Sofia can't log in, open a ticket"*, Claude reads those
   descriptions, decides to call `find_employee` then `create_ticket`, and the client runs them on this server.

> Because stdout carries the protocol, the server must **never** use `console.log`. It logs with `console.error`.

## Run

```bash
npm install
npm run client     # test without any AI: lists everything and calls a few tools
npm run inspect    # opens the MCP Inspector in your browser to click through tools/resources/prompts
```

### Use it from Claude Code

Run this **from the folder where you use Claude Code** (by default the server is only registered
for that folder; add `--scope user` to make it available in every folder):

```bash
claude mcp add helpdesk -- node /absolute/path/to/4-mcp-server/server.js
```

Then start a **new** Claude Code session (servers load when a session starts) and try:

- *"Who works in Finance?"*
- *"Which helpdesk tickets are still open?"*
- *"Karim's VPN keeps disconnecting, open a ticket with the right priority."*
- `/mcp__helpdesk__triage` (the prompt template; it asks for the employee and the problem)

Type `/mcp` inside Claude Code to see the server's status. Remove it with `claude mcp remove helpdesk`.

### Use it from Claude Desktop

Settings → Developer → Edit Config, and add (use the absolute path to this folder):

```json
{
  "mcpServers": {
    "helpdesk": {
      "command": "node",
      "args": ["/absolute/path/to/4-mcp-server/server.js"]
    }
  }
}
```

Restart Claude Desktop. The tools appear under the tools icon in the chat box.

## Files

```
server.js   The MCP server: registers 4 tools, 1 resource and 1 prompt, then listens on stdio
data.js     Fake employees, tickets and the SLA policy (tickets reset when the server restarts)
client.js   A minimal MCP client used to test the server without Claude
```

## Ideas to extend it

- Save tickets to a JSON file or a database so they survive a restart.
- Add a resource template such as `helpdesk://tickets/{id}`.
- Serve it over HTTP (Streamable HTTP transport) instead of stdio so several users can share one server, and protect it with OAuth (see projects 2 and 3).
