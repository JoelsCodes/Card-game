// End-to-end test: starts a headless Godot editor with the Claude Bridge plugin
// in a throwaway project, then talks MCP to server.js and checks each tool.
// Usage: node test/e2e.js /path/to/godot [work-dir]
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const GODOT = process.argv[2] || process.env.GODOT_BIN;
if (!GODOT) { console.error('usage: node test/e2e.js /path/to/godot [work-dir]'); process.exit(2); }
const ROOT = path.join(__dirname, '..');
const work = fs.mkdtempSync(path.join(process.argv[3] || os.tmpdir(), 'godot-mcp-'));
const proj = path.join(work, 'proj');
const PORT = 20000 + Math.floor(Math.random() * 20000);

fs.mkdirSync(path.join(proj, 'addons'), { recursive: true });
fs.cpSync(path.join(ROOT, 'addons', 'claude_bridge'), path.join(proj, 'addons', 'claude_bridge'), { recursive: true });
fs.writeFileSync(path.join(proj, 'project.godot'), `config_version=5

[application]
config/name="Bridge Test"

[editor_plugins]
enabled=PackedStringArray("res://addons/claude_bridge/plugin.cfg")
`);
fs.writeFileSync(path.join(proj, 'enemy.gd'), 'class_name Enemy\nextends CharacterBody2D\n@export var hp := 3\n');

let godotLog = '';
const godot = spawn(GODOT, ['--headless', '--editor', '--path', proj], { env: { ...process.env, CLAUDE_BRIDGE_PORT: String(PORT) } });
godot.stdout.on('data', (d) => { godotLog += d; });
godot.stderr.on('data', (d) => { godotLog += d; });

function mcp(port) {
  const srv = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env: { ...process.env, GODOT_PORT: String(port) } });
  let buf = '', id = 0; const waiting = new Map();
  srv.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
      waiting.get(m.id)?.(m); waiting.delete(m.id);
    }
  });
  const rpc = (method, params) => new Promise((res) => { const n = ++id; waiting.set(n, res); srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n'); });
  const tool = async (name, args = {}) => {
    const r = (await rpc('tools/call', { name, arguments: args })).result;
    const text = r.content.find((c) => c.type === 'text')?.text;
    if (r.isError) return { error: text };
    return JSON.parse(text);
  };
  return { srv, rpc, tool };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0, live = null;
const ok = (cond, label) => { assert.ok(cond, label); passed++; console.log('  ok', label); };

(async () => {
  // Godot not up yet / wrong port: clean error, not a crash.
  const off = mcp(PORT + 1);
  const init = await off.rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '0' } });
  ok(init.result.serverInfo.name === 'godot-mcp', 'initialize');
  const list = await off.rpc('tools/list', {});
  ok(list.result.tools.length >= 19 && list.result.tools.every((t) => t.inputSchema.type === 'object'), `tools/list (${list.result.tools.length} tools)`);
  ok(/Could not reach the Godot editor/.test((await off.tool('godot_get_editor_state')).error), 'unreachable editor gives a helpful error');
  off.srv.kill();

  for (let t = 0; t < 240 && !godotLog.includes('Claude Bridge listening'); t++) await sleep(500);
  if (!godotLog.includes('Claude Bridge listening')) throw new Error('plugin never started:\n' + godotLog);
  const { srv, tool } = mcp(PORT);
  live = srv;

  const st = await tool('godot_get_editor_state');
  ok(st.project === 'Bridge Test' && /^4\./.test(st.godot), `editor state (Godot ${st.godot})`);
  ok(/no scene is open/.test((await tool('godot_get_scene_tree')).error), 'no scene open error');

  const ns = await tool('godot_new_scene', { path: 'res://scenes/main.tscn', root_type: 'Node2D' });
  ok(ns.created === 'res://scenes/main.tscn' && ns.root === 'Main', 'new_scene opens it');

  ok((await tool('godot_add_node', { type: 'Sprite2D', name: 'Hero', properties: { position: [100, 50] } })).path === 'Hero', 'add_node with properties');
  ok((await tool('godot_add_node', { parent: 'Hero', type: 'Label', properties: { text: 'hi' } })).path === 'Hero/Label', 'add_node under parent');
  ok((await tool('godot_add_node', { type: 'Enemy', name: 'Goblin' })).type === 'CharacterBody2D', 'add_node with class_name type');
  ok(/unknown Node type/.test((await tool('godot_add_node', { type: 'Nope' })).error), 'bad type rejected');

  ok((await tool('godot_set_property', { path: 'Hero', property: 'modulate', value: 'Color(1, 0, 0, 1)' })).value === 'Color(1, 0, 0, 1)', 'set_property Godot syntax');
  ok((await tool('godot_set_property', { path: 'Goblin', property: 'hp', value: 9 })).value === 9, 'set_property script export');
  ok((await tool('godot_set_property', { path: 'Hero/Label', property: 'position', value: [5, 6] })).value === 'Vector2(5, 6)', 'set_property array -> Vector2');
  ok(/no property/.test((await tool('godot_set_property', { path: 'Hero', property: 'bogus', value: 1 })).error), 'unknown property rejected');

  const node = await tool('godot_get_node', { path: 'Hero', filter: 'position' });
  ok(node.properties.position === 'Vector2(100, 50)' && node.children[0] === 'Label', 'get_node');

  const tree = await tool('godot_get_scene_tree');
  ok(tree.name === 'Main' && tree.children.map((c) => c.name).join() === 'Hero,Goblin' && tree.children[1].script === 'res://enemy.gd', 'get_scene_tree');

  ok((await tool('godot_delete_node', { path: 'Goblin' })).deleted === 'Goblin', 'delete_node');
  ok((await tool('godot_get_scene_tree')).children.length === 1, 'deleted node gone');
  ok(/scene root/.test((await tool('godot_delete_node', { path: '.' })).error), 'refuses to delete root');
  ok((await tool('godot_select_nodes', { paths: ['Hero/Label'] })).selected[0] === 'Hero/Label', 'select_nodes');
  ok((await tool('godot_get_editor_state')).selected[0] === 'Hero/Label', 'selection visible in state');

  const sv = await tool('godot_save_scene');
  ok(sv.saved === 'res://scenes/main.tscn', 'save_scene ' + JSON.stringify(sv));
  const saved = fs.readFileSync(path.join(proj, 'scenes', 'main.tscn'), 'utf8');
  ok(saved.includes('[node name="Hero" type="Sprite2D" parent="."]') && saved.includes('position = Vector2(100, 50)') && saved.includes('text = "hi"') && !saved.includes('Goblin'), 'saved .tscn content');

  ok((await tool('godot_write_file', { path: 'res://scripts/hero.gd', content: 'extends Sprite2D\nfunc _ready():\n\tprint("hero")\n' })).bytes > 0, 'write_file');
  ok((await tool('godot_read_file', { path: 'res://scripts/hero.gd' })).content.includes('print("hero")'), 'read_file');
  ok((await tool('godot_validate_script', { path: 'res://scripts/hero.gd' })).ok === true, 'validate_script ok');
  ok((await tool('godot_validate_script', { source: 'extends Node\nfunc f(:\n' })).ok === false, 'validate_script catches error');
  ok((await tool('godot_set_property', { path: 'Hero', property: 'script', value: 'res://scripts/hero.gd' })).value.path === 'res://scripts/hero.gd', 'attach script');
  const files = (await tool('godot_list_files', { extensions: ['gd', 'tscn'] })).files;
  ok(files.includes('res://scripts/hero.gd') && files.includes('res://scenes/main.tscn') && !files.some((f) => f.includes('/.godot/')), 'list_files');
  ok(/bad path/.test((await tool('godot_write_file', { path: 'res://../escape.txt', content: 'x' })).error), 'path traversal rejected');

  const types = await tool('godot_list_node_types', { base: 'Control', filter: 'button' });
  ok(types.types.includes('MenuButton') && !types.types.includes('Label'), 'list_node_types filters by base and text');
  ok((await tool('godot_list_node_types', { filter: 'enemy' })).script_classes[0].class === 'Enemy', 'list_node_types finds class_name scripts');

  ok(/disabled/.test((await tool('godot_execute', { code: 'return 1' })).error), 'execute off by default');
  ok(/no main scene/.test((await tool('godot_run_project')).error), 'run_project without main scene');
  ok((await tool('godot_open_scene', { path: 'res://scenes/main.tscn' })).edited_scene === 'res://scenes/main.tscn', 'open_scene');

  srv.kill();
  console.log(`\n${passed} checks passed`);
})().catch((e) => { console.error('FAIL:', e.message); process.exitCode = 1; })
  .finally(() => { live?.kill(); godot.kill(); fs.rmSync(work, { recursive: true, force: true }); });
