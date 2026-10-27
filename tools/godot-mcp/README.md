# godot-mcp: Claude ↔ Godot editor connector

Lets Claude (Claude Code, Claude Desktop, or any MCP client) look at and edit a project that is open in the **Godot 4.2+ editor**.

```
Claude ──MCP (stdio)──> server.js ──TCP 127.0.0.1:6550──> Claude Bridge plugin (inside the Godot editor)
```

- `addons/claude_bridge/` is a Godot editor plugin. It listens on localhost only and runs requests on the editor's main thread. Scene edits go through the editor's undo/redo, so Ctrl+Z works.
- `server.js` is the MCP server. It needs Node 18+ and has no npm dependencies.

## Setup

1. Copy `addons/claude_bridge` into your Godot project (as `res://addons/claude_bridge`).
2. In Godot, go to **Project > Project Settings > Plugins** and enable **Claude Bridge**. The Output panel should say `Claude Bridge listening on 127.0.0.1:6550`.
3. Register the MCP server with your client:

   **Claude Code**
   ```sh
   claude mcp add godot -- node /absolute/path/to/tools/godot-mcp/server.js
   ```
   **Claude Desktop** (`claude_desktop_config.json`)
   ```json
   { "mcpServers": { "godot": { "command": "node", "args": ["/absolute/path/to/tools/godot-mcp/server.js"] } } }
   ```

The MCP client must run on the same machine as the Godot editor (for example Claude Code or Claude Desktop on your computer). A cloud session can't reach your local editor.

## Tools

| Tool | What it does |
|---|---|
| `godot_get_editor_state` | Project, Godot version, edited/open scenes, selection, whether the game is running |
| `godot_get_scene_tree` | Node tree of the edited scene |
| `godot_get_node` | Inspector properties, script, children and groups of a node |
| `godot_set_property` | Set a property (undoable) |
| `godot_add_node` / `godot_delete_node` | Add a built-in type, a `class_name` type or an instanced `.tscn` / delete a node (undoable) |
| `godot_select_nodes` | Select nodes and show them in the inspector |
| `godot_new_scene` / `godot_open_scene` / `godot_save_scene` | Scene files |
| `godot_list_files` / `godot_read_file` / `godot_write_file` | Text files under `res://` (writing reloads already-loaded scripts) |
| `godot_validate_script` | Check that GDScript compiles |
| `godot_list_node_types` | Node classes you can create, plus project `class_name` scripts |
| `godot_run_project` / `godot_stop_project` | Play the main scene, the current scene, or a given scene |
| `godot_screenshot` | Image of the 2D/3D viewport or the whole editor |
| `godot_execute` | Run arbitrary GDScript in the editor (**off by default**) |

Property values are JSON. Numbers, bools and strings pass through unchanged. Vectors and colors can be arrays (`[10, 20]`) or Godot syntax (`"Vector2(10, 20)"`, `"Color(1, 0, 0)"`). A resource is given as its `"res://..."` path.

## Settings and security

The plugin adds three project settings. To see them, turn on **Advanced Settings** in Project Settings.

- `claude_bridge/port` (6550). If you change it, set `GODOT_PORT` for `server.js` to match.
- `claude_bridge/token`. If set, every request must carry it. Give `server.js` the same value as `GODOT_TOKEN`.
- `claude_bridge/allow_execute` (off). Turns on `godot_execute`, which can do anything the editor can, including deleting files outside the project.

The plugin binds to 127.0.0.1 only. File tools are restricted to `res://`: `..` is rejected and `.godot/` can't be written. Any other program on your machine can still connect to the port, so set a token if that matters to you.

Other `server.js` environment variables: `GODOT_HOST` (127.0.0.1) and `GODOT_TIMEOUT_MS` (15000).

## Tests

```sh
node test/mock.js                     # MCP server against a fake bridge, no Godot needed
node test/e2e.js /path/to/godot       # real headless Godot editor + plugin + server, ~35 checks
```

`e2e.js` creates a throwaway project, starts `godot --headless --editor` with the plugin enabled, and exercises every tool except screenshot (there is no rendering when headless) and running the game.

## Limits

- Godot 4.2 or newer (it uses the `EditorInterface` singleton). Godot 3 is not supported.
- The editor's Output log is not readable from a plugin in 4.2–4.4, so script error details only show up in Godot.
- One edited scene at a time: tools act on the scene tab that is currently active.
