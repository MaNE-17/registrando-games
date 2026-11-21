// Controles via SDL3 (@kmamal/sdl). Roda num processo separado (utilityProcess):
// se o SDL travar ou faltar no PC, o app continua funcionando normalmente.
// Manda para o processo principal eventos simples: {t:'down'|'up', b:<botao>} e {t:'conn'|'disc'}.
process.env.SDL_JOYSTICK_ALLOW_BACKGROUND_EVENTS = '1';
process.env.SDL_HINT_JOYSTICK_ALLOW_BACKGROUND_EVENTS = '1';
const port = process.parentPort;
const send = m => { try { port.postMessage(m); } catch {} };

let sdl;
try { sdl = require('@kmamal/sdl'); }
catch (e) { send({ t: 'fail', err: String((e && e.message) || e) }); return; }

try { if (!sdl.gamepad.isAvailable()) { send({ t: 'fail', err: 'subsistema de controle do SDL indisponível' }); return; } }
catch (e) { send({ t: 'fail', err: String((e && e.message) || e) }); return; }

const v = sdl.info && sdl.info.version && sdl.info.version.runtime;
send({ t: 'ok', sdl: v ? `${v.major}.${v.minor}.${v.patch}` : '' });

const open = new Map();
const info = (d, p) => ({ id: d.id, name: d.name || 'Controle', type: d.type || '', south: (p && p.buttonLabels && p.buttonLabels.south) || '' });

function attach(d) {
  if (open.has(d.id)) return;
  let p;
  try { p = sdl.gamepad.openDevice(d); } catch { return; }
  open.set(d.id, p);
  const virt = {}; // botoes virtuais vindos dos analogicos/gatilhos
  const vset = (k, on) => { if (!!virt[k] === on) return; virt[k] = on; send({ t: on ? 'down' : 'up', b: k, ...info(d, p) }); };
  p.on('buttonDown', e => send({ t: 'down', b: e.button, ...info(d, p) }));
  p.on('buttonUp', e => send({ t: 'up', b: e.button, ...info(d, p) }));
  p.on('axisMotion', e => {
    const x = e.value, ON = 0.55, OFF = 0.3;
    switch (e.axis) {
      case 'leftStickX': if (x < -ON) vset('lsLeft', true); else if (x > -OFF) vset('lsLeft', false); if (x > ON) vset('lsRight', true); else if (x < OFF) vset('lsRight', false); break;
      case 'leftStickY': if (x < -ON) vset('lsUp', true); else if (x > -OFF) vset('lsUp', false); if (x > ON) vset('lsDown', true); else if (x < OFF) vset('lsDown', false); break;
      case 'rightStickY': if (x < -ON) vset('rsUp', true); else if (x > -OFF) vset('rsUp', false); if (x > ON) vset('rsDown', true); else if (x < OFF) vset('rsDown', false); break;
      case 'leftTrigger': if (x > ON) vset('lt', true); else if (x < OFF) vset('lt', false); break;
      case 'rightTrigger': if (x > ON) vset('rt', true); else if (x < OFF) vset('rt', false); break;
    }
  });
  p.on('close', () => { open.delete(d.id); send({ t: 'disc', ...info(d) }); });
  p.on('error', () => {});
  send({ t: 'conn', ...info(d, p) });
}

try { for (const d of sdl.gamepad.devices) attach(d); } catch {}
sdl.gamepad.on('deviceAdd', e => { if (e && e.device) attach(e.device); });
sdl.gamepad.on('deviceRemove', e => { const d = e && e.device; if (d && open.has(d.id)) { try { open.get(d.id).close(); } catch {} open.delete(d.id); } });
port.on('message', () => {}); // mantem o processo vivo
