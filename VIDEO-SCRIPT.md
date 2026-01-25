# JARP-MCP: 60-Second Demo Video Script

## Video: "Stop AI from Hallucinating Java APIs"

---

### [0:00-0:08] Hook - The Problem

**Visual:** Split screen - Left: Claude/Cursor chat showing wrong code. Right: Red error in IDE.

**Voiceover:**
"You know when your AI assistant suggests a method that doesn't exist?
Here's Claude claiming Spring's JpaRepository has a 'flush' parameter on saveAll...

**Visual:** Zoom in on the hallucinated code
`repository.saveAll(entities, true);` // WRONG!

**Voiceover:**
...yeah, that method doesn't exist. 5 minutes wasted."

---

### [0:08-0:18] The Solution

**Visual:** Screen recording - Installing jarp-mcp

```bash
npm install -g jarp-mcp
```

**Voiceover:**
"Meet JARP-MCP. It gives your AI X-ray vision into compiled Java code.
One command, and now Claude can actually see inside those JAR files."

---

### [0:18-0:35] The Demo

**Visual:** Same question to Claude, but with JARP-MCP enabled

**Voiceover:**
"Watch this. Same question: 'How do I use saveAll?'

**Visual:** Claude responds with correct code instantly
`<S extends T> List<S> saveAll(Iterable<S> entities);`

**Voiceover:**
"JARP-MCP just decompiled JpaRepository from my dependencies and showed Claude
the REAL method signature. Instantly. No manual copy-paste."

---

### [0:35-0:45] Use Cases

**Visual:** Quick montage of scenarios
- Spring Boot internals
- Apache Commons deprecation warnings
- Your internal company libraries

**Voiceover:**
"Works with Spring, Hibernate, Apache Commons - even your internal libraries.
If it's a JAR, JARP-MCP lets your AI read it."

---

### [0:45-0:60] Call to Action

**Visual:** Terminal with install command, GitHub URL

**Voiceover:**
"Stop hallucinating. Start decompiling.
Get JARP-MCP free on GitHub or npm.
Link in the description."

**Text on screen:**
```
npm install -g jarp-mcp
github.com/tersePrompts/jarp-mcp
```

---

## Bonus: 15-Second Twitter/LinkedIn Version

**Visual:** Screen recording showing the before/after comparison

**Voiceover:**
"Before: My AI hallucinates Java methods because it can't see compiled code.
After: JARP-MCP lets it decompile any dependency instantly.
Give your AI X-ray vision into Java JARs.
Link in bio."

---

## Production Notes

### Required Assets
- Screen recording of Claude/Cursor with wrong code (red errors)
- Screen recording of npm install
- Screen recording of Claude with JARP-MCP (correct code)
- Logo/text overlays

### Style
- Fast cuts
- Highlight text in yellow/red
- Minimal narration
- Let the visual comparison do the work

### Music
- Tech/bright background music
- "Wrong" moments = buzzer/error sound
- "Right" moments = success chime

### Thumbnail
Split face:
- Left: 🤖❌ (AI failing)
- Right: 🤖✨ (AI with JARP-MCP)
- Text: "Stop AI Hallucinations"
