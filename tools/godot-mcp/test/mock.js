// Tests server.js against a fake Claude Bridge (no Godot needed).
// Usage: node test/mock.js
'use strict';
const net = require('net');
const path = require('path');
const assert = require('assert');
const { spawn } = require('child_process');

const seen = [];
const bridge = net.createServer((c) => {
  let buf = '';
  c.setEncoding('utf8');
  c.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
      seen.push(m);
      if (m.token !== 'sekrit') { c.write(JSON.stringify({ id: m.id, error: 'bad or missing token' }) + '\n'); continue; }
      const out = {
        get_editor_state: { result: { project: 'Mock', godot: '4.3.stable', name: 'Ünïcode ✓' } },
        screenshot: { result: { png_base64: 'iVBORw0KGgo=', width: 2, height: 1 } },
        delete_node: { error: 'refusing to delete the scene root' },
      }[m.method];
      if (m.method === 'stop_project') continue; // never answers -> timeout
      // Split the reply across two writes to exercise line buffering.
      const s = JSON.stringify({ id: m.id, ...(out || { result: { echo: m.params } }) }) + '\n';
      c.write(s.slice(0, 7)); setTimeout(() => c.write(s.slice(7)), 5);
    }
  });
});

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed++; console.log('  ok', label); };

bridge.listen(0, '127.0.0.1', async () => {
  const port = bridge.address().port;
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')],
    { env: { ...process.env, GODOT_PORT: String(port), GODOT_TOKEN: 'sekrit', GODOT_TIMEOUT_MS: '300' } });
  let buf = '', id = 0; const waiting = new Map();
  srv.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); waiting.get(m.id)?.(m); waiting.delete(m.id); }
  });
  const rpc = (method, params) => new Promise((res) => { const n = ++id; waiting.set(n, res); srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n'); });
  const call = async (name, args) => (await rpc('tools/call', { name, arguments: args })).result;

  try {
    const init = await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {} });
    ok(init.result.protocolVersion === '2025-03-26' && init.result.capabilities.tools, 'initialize echoes protocol version');
    srv.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    ok((await rpc('ping')).result && (await rpc('nope')).error.code === -32601, 'ping / unknown method');
    const tools = (await rpc('tools/list')).result.tools;
    ok(new Set(tools.map((t) => t.name)).size === tools.length && tools.every((t) => t.name.startsWith('godot_') && t.description && t.inputSchema), 'tool definitions');

    const st = await call('godot_get_editor_state', {});
    ok(!st.isError && JSON.parse(st.content[0].text).name === 'Ünïcode ✓', 'result + unicode + split lines');
    const set = JSON.parse((await call('godot_set_property', { path: 'A', property: 'position', value: [1, 2] })).content[0].text);
    ok(set.echo.value[1] === 2 && seen.at(-1).method === 'set_property', 'args forwarded to bridge method');
    const del = await call('godot_delete_node', { path: '.' });
    ok(del.isError && /scene root/.test(del.content[0].text), 'bridge error -> isError');
    const shot = await call('godot_screenshot', {});
    ok(shot.content[0].type === 'image' && shot.content[0].mimeType === 'image/png', 'screenshot -> image content');
    const slow = await call('godot_stop_project', {});
    ok(slow.isError && /did not answer/.test(slow.content[0].text), 'timeout');
    ok((await rpc('tools/call', { name: 'bogus', arguments: {} })).error, 'unknown tool');
    ok(seen.every((m) => m.token === 'sekrit'), 'token sent');
    console.log(`\n${passed} checks passed`);
  } catch (e) { console.error('FAIL:', e.message); process.exitCode = 1; }
  srv.kill(); bridge.close();
});
