// 멀티플레이 연결 계층.
// claude.ai 아티팩트 안: window.claude.use("room") (실시간 presence)
// 그 밖(GitHub Pages 등): Trystero(WebRTC P2P, Nostr 시그널링)로 같은 인터페이스를 흉내 낸다.
import { joinRoom, selfId } from 'trystero/nostr';

export async function connectNet() {
  let room = null;
  try {
    if (window.claude && window.claude.use) room = await window.claude.use('room');
  } catch { room = null; }
  if (room) return { kind: 'claude', room, voice: null };
  const p2p = p2pRoom();
  return p2p ? { kind: 'p2p', room: p2p, voice: p2p.voice } : null;
}

function p2pRoom() {
  if (!window.RTCPeerConnection) return null;
  const roomName = location.hash.replace(/^#/, '').replace(/[^a-z0-9-]/gi, '').slice(0, 32) || 'campfire';
  let r;
  try { r = joinRoom({ appId: 'byeolbit-campground-3dmap-v2' }, roomName); } catch { return null; }
  const act = r.makeAction('pres');
  const faceAct = r.makeAction('face'); // 얼굴 사진은 따로, 바뀔 때만 보낸다
  let myFace = null;
  const others = new Map();
  const mine = {};
  let me = Object.freeze({ peer: selfId, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: {}, updatedAt: Date.now() });
  const peerFns = [];
  let snapshot = Object.freeze([me]);
  const rebuild = () => { snapshot = Object.freeze([me, ...others.values()]); };
  const fire = (ch) => {
    rebuild();
    const c = { peers: snapshot, joined: ch.joined || [], left: ch.left || [], updated: ch.updated || [] };
    peerFns.forEach((f) => { try { f(c); } catch (e) { console.error(e); } });
  };
  const mk = (id, presence) => Object.freeze({ peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: Object.freeze(presence || {}), updatedAt: Date.now() });

  // ---- 음성 ----
  let localStream = null;
  const streamFns = [];
  r.onPeerStream = (stream, peerId) => streamFns.forEach((f) => f(peerId, stream));

  r.onPeerJoin = (id) => {
    if (!others.has(id)) { const p = mk(id, {}); others.set(id, p); fire({ joined: [p] }); }
    if (Object.keys(mine).length) act.send(mine, { target: id }).catch(() => {});
    if (myFace) faceAct.send(myFace, { target: id }).catch(() => {});
    if (localStream) { try { r.addStream(localStream, { target: id }); } catch {} }
  };
  r.onPeerLeave = (id) => {
    const p = others.get(id); if (!p) return;
    others.delete(id); fire({ left: [p] });
    streamFns.forEach((f) => f(id, null));
  };
  act.onMessage = (data, ctx) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    const id = ctx && ctx.peerId; if (typeof id !== 'string') return;
    const prev = others.get(id); const keep = prev ? { face: prev.presence.face, hair: prev.presence.hair } : {};
    const p = mk(id, { ...data, ...keep }); others.set(id, p);
    fire(prev ? { updated: [p] } : { joined: [p] });
  };
  faceAct.onMessage = (data, ctx) => {
    const id = ctx && ctx.peerId; if (typeof id !== 'string' || !data || typeof data !== 'object') return;
    const prev = others.get(id);
    const p = mk(id, { ...(prev ? prev.presence : {}), face: typeof data.face === 'string' ? data.face : '', hair: typeof data.hair === 'string' ? data.hair : '' });
    others.set(id, p); fire(prev ? { updated: [p] } : { joined: [p] });
  };
  setInterval(() => { if (Object.keys(mine).length && others.size) act.send(mine).catch(() => {}); }, 3000);
  addEventListener('pagehide', () => { r.leave().catch(() => {}); });

  const voice = {
    async start() {
      if (localStream) return true;
      localStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      try { r.addStream(localStream); } catch {}
      return true;
    },
    stop() {
      if (!localStream) return;
      try { r.removeStream(localStream); } catch {}
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    },
    get active() { return !!localStream; },
    onStream(fn) { streamFns.push(fn); },
  };

  return {
    voice,
    connected: () => true,
    peers: () => snapshot,
    onConnection(fn) { queueMicrotask(() => fn(true)); return () => {}; },
    onPeers(fn) { peerFns.push(fn); queueMicrotask(() => fn({ peers: snapshot, joined: snapshot, left: [], updated: [] })); return () => {}; },
    presence(patch) {
      if ('face' in patch) {
        myFace = { face: patch.face || '', hair: patch.hair || '' };
        if (others.size) faceAct.send(myFace).catch(() => {});
        patch = { ...patch }; delete patch.face; delete patch.hair;
      }
      for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; }
      me = Object.freeze({ ...me, presence: Object.freeze({ ...mine }), updatedAt: Date.now() });
      rebuild();
      return others.size ? act.send(mine).catch(() => {}) : Promise.resolve();
    },
  };
}
