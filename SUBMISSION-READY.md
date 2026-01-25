# JARP-MCP Submission - Ready to Post

## Click this link to create the issue:

https://github.com/modelcontextprotocol/servers/issues/new?title=Add%20JARP-MCP%20to%20community%20servers%20list&body=%23%23%20MCP%20Server%20Proposal%3A%20JARP-MCP%0A%0A**Description**%3A%0AJARP-MCP%20%28Java%20Archive%20Reader%20Protocol%29%20is%20an%20MCP%20server%20that%20gives%20AI%20agents%20instant%20access%20to%20decompiled%20Java%20code%20from%20Maven%2FGradle%20dependencies.%0A%0A**Problem%20it%20solves**%3A%0AAI%20assistants%20hallucinate%20Java%20API%20methods%20because%20they%20can%27t%20see%20compiled%20bytecode.%20JARP-MCP%20decompiles%20classes%20on-demand%20and%20feeds%20actual%20source%20to%20the%20AI.%0A%0A**Links**%3A%0A-%20Repository%3A%20https%3A%2F%2Fgithub.com%2FtersePrompts%2Fjarp-mcp%0A-%20npm%3A%20https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fjarp-mcp%0A-%20License%3A%20Apache-2.0%0A%0A**Key%20Features**%3A%0A-%20Scans%20Maven%20%26%20Gradle%20projects%0A-%20Decompiles%20using%20CFR%200.152%0A-%20Smart%20caching%20%28%3C100ms%20after%20first%20use%29%0A-%20Works%20with%20Claude%2C%20Cursor%2C%20Cline%0A%0A**Installation**%3A%0A%60%60%60%0Anpm%20install%20-g%20jarp-mcp%0A%60%60%60%0A%0A**Configuration**%3A%0A%60%60%60json%0A%7B%0A%20%20%22mcpServers%22%3A%20%7B%0A%20%20%20%20%22jarp-mcp%22%3A%20%7B%0A%20%20%20%20%20%20%22command%22%3A%20%22jarp-mcp%22%2C%0A%20%20%20%20%20%20%22args%22%3A%20%5B%22start%22%5D%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D%0A%60%60%60

---

## Or go to mcpservers.org (main directory):

https://mcpservers.org/submit

Fill in:
| Field | Value |
|-------|-------|
| Name | JARP-MCP |
| Description | Java Archive Reader Protocol for MCP. Give AI agents instant access to decompiled Java code from Maven/Gradle dependencies. |
| Repository | https://github.com/tersePrompts/jarp-mcp |
| npm | https://www.npmjs.com/package/jarp-mcp |
| Category | Development Tools |
| Tags | java, decompiler, maven, gradle, claude, cursor, ai |

---

## Alternative: Add to MobinX/awesome-mcp-list

https://github.com/MobinX/awesome-mcp-list/fork

Then add entry and create PR.
