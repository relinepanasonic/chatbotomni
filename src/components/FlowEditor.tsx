'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACTIONS, CONDITIONS, NODE_LABEL, TRIGGERS, isCondition, isTrigger, planFlow, validateGraph, type FlowContext, type FlowEdge, type FlowNode, type Graph, type NodeType, type Port, type PlannedAction } from '@/lib/flow';
import { CHANNELS, type Agent, type FlowFull, type LeadSource } from '@/lib/types';

/**
 * The visual flow editor: boxes on a canvas joined by lines, like a workflow diagram. Drag a box by its title, draw a line from a round dot on the
 * right of a box to another box, click a box to set it up. "Try it" shows, live, what the flow would do for a sample message (nothing is sent).
 * The same rules as the server run here (lib/flow.ts), so what you see is what happens.
 */

const NODE_W = 232;
const NODE_H = 88;
const CANVAS_W = 2600;
const CANVAS_H = 1500;

const COLOR: Record<NodeType, string> = {
  trigger_new_lead: '#2f9bf0', trigger_keyword: '#2f9bf0',
  cond_source: '#f59e0b', cond_keyword: '#f59e0b', cond_hours: '#f59e0b', cond_client: '#f59e0b',
  act_send: '#16a37a', act_ai: '#0ea5a5', act_assign: '#14b8a6', act_assign_client_sales: '#14b8a6', act_handover: '#e0455b', act_note: '#8b7cf6',
};
const GROUP_TITLE = { trigger: 'Starts the flow', condition: 'Asks a question (yes / no)', action: 'Does something' } as const;
const portY = (p: Port) => (p === 'yes' ? 0.3 : p === 'no' ? 0.72 : 0.5);
const outPos = (n: FlowNode, p: Port) => ({ x: n.x + NODE_W, y: n.y + NODE_H * portY(p) });
const inPos = (n: FlowNode) => ({ x: n.x, y: n.y + NODE_H / 2 });
const curve = (a: { x: number; y: number }, b: { x: number; y: number }) => { const dx = Math.max(50, Math.abs(b.x - a.x) / 2); return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`; };
const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}...` : s);

function summary(n: FlowNode, agents: Agent[]): string {
  const d = n.data || {};
  switch (n.type) {
    case 'trigger_new_lead': return "A lead's first message in a chat";
    case 'trigger_keyword': case 'cond_keyword': return String(d.keywords || '').trim() ? clip(String(d.keywords), 56) : 'Add keywords';
    case 'cond_source': { const c = (Array.isArray(d.channels) ? d.channels : []).map((k: string) => CHANNELS.find((x) => x.key === k)?.label ?? k); return c.length ? c.join(', ') : d.sourceId ? 'One chosen ad' : 'Pick a channel'; }
    case 'cond_hours': return 'Yes = inside team hours';
    case 'cond_client': return 'Yes = the number is a client in the ERP';
    case 'act_send': return String(d.text || '').trim() ? clip(String(d.text), 70) : 'Write the message';
    case 'act_ai': return 'The AI answers from the AI Kamus';
    case 'act_assign': return d.userName || agents.find((a) => a.id === d.userId)?.name || 'Pick a salesperson';
    case 'act_assign_client_sales': return "The client's own salesperson";
    case 'act_handover': return String(d.reason || '').trim() ? clip(String(d.reason), 56) : 'The bot stops, a person continues';
    case 'act_note': return String(d.text || '').trim() ? clip(String(d.text), 70) : 'Write the note';
  }
}

const actionText = (a: PlannedAction, agents: Agent[]): string => {
  switch (a.kind) {
    case 'send': return `Sends: "${a.text}"`;
    case 'ai': return 'The AI answers (from the AI Kamus)';
    case 'assign': return `Gives the chat to ${a.userName || agents.find((x) => x.id === a.userId)?.name || 'a salesperson'}`;
    case 'assign_client_sales': return "Gives the chat to the client's salesperson";
    case 'handover': return `Hands over to a person: ${a.reason}`;
    case 'note': return `Adds a team note: "${a.text}"`;
  }
};

const field = 'w-full rounded-lg border border-line bg-brand-softer px-3 py-2 text-[13px] outline-none focus:border-brand focus:bg-white';
const btnPrimary = 'inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-brand hover:text-brand-dark disabled:opacity-50';

interface Props {
  initial: FlowFull | null;
  agents: Agent[];
  sources: LeadSource[];
  canEdit: boolean;
  saving: boolean;
  error: string | null;
  warnings: string[];
  onSave: (v: { id?: string; name: string; description: string; active: boolean; graph: Graph }) => void;
  onClose: () => void;
}

export function FlowEditor({ initial, agents, sources, canEdit, saving, error, warnings, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? 'New flow');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [active, setActive] = useState(initial?.active ?? false);
  const [graph, setGraph] = useState<Graph>(initial?.graph ?? { nodes: [], edges: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ from: string; port: Port; x: number; y: number } | null>(null);
  const [panel, setPanel] = useState<'box' | 'try'>('box');
  const [test, setTest] = useState<{ message: string; isFirst: boolean; inHours: boolean; isClient: boolean; channel: string }>({ message: 'Halo kak, saya mau tanya paket', isFirst: true, inHours: true, isClient: false, channel: 'meta_ads' });
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const initialJson = useRef(JSON.stringify({ name: initial?.name ?? 'New flow', description: initial?.description ?? '', active: initial?.active ?? false, graph: initial?.graph ?? { nodes: [], edges: [] } }));
  const dirty = JSON.stringify({ name, description, active, graph }) !== initialJson.current;

  const validation = useMemo(() => validateGraph(graph), [graph]);
  const ctx: FlowContext = useMemo(() => ({ message: test.message, isFirst: test.isFirst, sourceChannel: test.channel || null, sourceId: null, inHours: test.inHours, isClient: test.isClient, leadName: 'Budi Santoso', persona: 'Fefe', company: 'Prof Toko Online' }), [test]);
  const plan = useMemo(() => planFlow(graph, ctx), [graph, ctx]);
  const onPath = useMemo(() => new Set(panel === 'try' && plan.matched ? plan.path : []), [panel, plan]);
  const answerOf = useMemo(() => new Map(panel === 'try' ? plan.decisions.map((d) => [d.nodeId, d.answer]) : []), [plan, panel]);

  const nodeById = useCallback((id: string) => graph.nodes.find((n) => n.id === id), [graph.nodes]);
  const sel = selected ? nodeById(selected) : undefined;

  // ------------------------------------------------ changing the drawing
  const patchNode = (id: string, patch: Partial<FlowNode>) => setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  const setData = (id: string, data: Record<string, any>) => setGraph((g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)) }));
  const removeNode = (id: string) => { setGraph((g) => ({ nodes: g.nodes.filter((n) => n.id !== id), edges: g.edges.filter((e) => e.from !== id && e.to !== id) })); setSelected(null); };
  const removeEdge = (id: string) => { setGraph((g) => ({ ...g, edges: g.edges.filter((e) => e.id !== id) })); setSelectedEdge(null); };

  const addNode = (type: NodeType) => {
    if (isTrigger(type) && graph.nodes.some((n) => isTrigger(n.type))) return;
    const el = scrollRef.current;
    const n = graph.nodes.length;
    const x = Math.round(((el?.scrollLeft ?? 0) + 60 + (n % 5) * 34) / 8) * 8;
    const y = Math.round(((el?.scrollTop ?? 0) + 50 + (n % 6) * 40) / 8) * 8;
    const node: FlowNode = { id: newId(), type, x, y, data: type === 'act_send' ? { text: '' } : {} };
    setGraph((g) => ({ ...g, nodes: [...g.nodes, node] })); setSelected(node.id); setSelectedEdge(null); setPanel('box');
  };

  const connect = (from: string, port: Port, to: string) => {
    const target = nodeById(to);
    if (!target || isTrigger(target.type) || from === to) return;
    setGraph((g) => ({ ...g, edges: [...g.edges.filter((e) => !(e.from === from && e.port === port)), { id: `${from}-${port}-${to}`, from, port, to }] }));
  };

  // ------------------------------------------------ pointer handling (drag a box, draw a line)
  const toCanvas = (clientX: number, clientY: number) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: clientX - r.left, y: clientY - r.top }; };

  const startDrag = (e: React.PointerEvent, n: FlowNode) => {
    if (!canEdit) return;
    const p = toCanvas(e.clientX, e.clientY);
    dragRef.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y };
    setSelected(n.id); setSelectedEdge(null); setPanel((x) => (x === 'try' ? 'try' : 'box'));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = toCanvas(e.clientX, e.clientY);
    patchNode(d.id, { x: Math.min(CANVAS_W - NODE_W, Math.max(0, Math.round((p.x - d.dx) / 8) * 8)), y: Math.min(CANVAS_H - NODE_H, Math.max(0, Math.round((p.y - d.dy) / 8) * 8)) });
  };
  const endDrag = () => { dragRef.current = null; };

  const startConnect = (e: React.PointerEvent, n: FlowNode, port: Port) => {
    if (!canEdit) return;
    e.stopPropagation(); e.preventDefault();
    const o = outPos(n, port);
    setConnecting({ from: n.id, port, x: o.x, y: o.y });
    const move = (ev: PointerEvent) => { const p = toCanvas(ev.clientX, ev.clientY); setConnecting((c) => (c ? { ...c, x: p.x, y: p.y } : c)); };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      const hit = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest('[data-node]') as HTMLElement | null;
      if (hit?.dataset.node) connect(n.id, port, hit.dataset.node);
      setConnecting(null);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!canEdit) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedEdge) removeEdge(selectedEdge); else if (selected) removeNode(selected); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const close = () => { if (dirty && !confirm('You have changes that are not saved. Leave without saving?')) return; onClose(); };
  const save = () => onSave({ id: initial?.id, name, description, active, graph });
  const canActivate = validation.errors.length === 0;

  return (
    <div className="flex h-dvh w-full flex-col bg-bg text-ink max-md:pb-14">
      {/* ------------------------------------------------ top bar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-2.5">
        <button onClick={close} className={btnGhost}>Back</button>
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} maxLength={80} aria-label="Flow name" className="min-w-0 flex-1 basis-48 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[16px] font-extrabold outline-none hover:border-line focus:border-brand" />
        <label className={`flex items-center gap-2 text-[12.5px] font-bold ${canEdit ? 'cursor-pointer' : 'opacity-60'}`} title={canActivate ? '' : 'Fix the problems first'}>
          <input type="checkbox" checked={active} disabled={!canEdit || (!active && !canActivate)} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#2f9bf0]" />
          {active ? 'ON: runs for new leads' : 'OFF'}
        </label>
        {canEdit && <button onClick={save} disabled={saving || !dirty || !name.trim()} className={btnPrimary}>{saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}</button>}
      </header>
      {(error || warnings.length > 0) && (
        <div className="space-y-1 border-b border-line bg-white px-4 py-2 text-[12.5px]">
          {error && <p role="alert" className="font-bold text-bad">{error}</p>}
          {warnings.map((w, i) => <p key={i} className="text-warn">{w}</p>)}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* ------------------------------------------------ palette */}
        <aside className="hidden w-[210px] shrink-0 overflow-y-auto border-r border-line bg-panel p-3 lg:block" aria-label="Boxes">
          {canEdit ? (
            <>
              {([['trigger', TRIGGERS], ['condition', CONDITIONS], ['action', ACTIONS]] as Array<[keyof typeof GROUP_TITLE, NodeType[]]>).map(([g, types]) => (
                <section key={g} className="mb-4">
                  <h3 className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">{GROUP_TITLE[g]}</h3>
                  <ul className="space-y-1.5">
                    {types.map((t) => {
                      const off = isTrigger(t) && graph.nodes.some((n) => isTrigger(n.type));
                      return (
                        <li key={t}>
                          <button onClick={() => addNode(t)} disabled={off} title={off ? 'A flow has one trigger' : 'Add this box'} className="flex w-full items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2 text-left text-[12.5px] font-semibold transition hover:border-brand disabled:opacity-40">
                            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: COLOR[t] }} />{NODE_LABEL[t]}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              <p className="text-[11px] leading-relaxed text-ink-soft">Click a box to add it. Drag a box by its title. Draw a line from the round dot on the right of a box to another box. Select and press Delete to remove.</p>
            </>
          ) : <p className="text-[12px] text-ink-soft">Only admins can change flows. You can look at this one and try it.</p>}
        </aside>

        {/* ------------------------------------------------ canvas */}
        <div ref={scrollRef} className="relative min-w-0 flex-1 overflow-auto bg-[#f4f9fe]" onPointerDown={() => { setSelected(null); setSelectedEdge(null); }}>
          <div ref={canvasRef} className="relative" style={{ width: CANVAS_W, height: CANVAS_H, backgroundImage: 'radial-gradient(#c9dcee 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            <svg className="absolute inset-0" width={CANVAS_W} height={CANVAS_H} aria-hidden="true">
              <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7fa6c9" /></marker></defs>
              {graph.edges.map((e) => {
                const a = nodeById(e.from), b = nodeById(e.to);
                if (!a || !b) return null;
                const p1 = outPos(a, e.port), p2 = inPos(b);
                const live = onPath.has(e.from) && onPath.has(e.to);
                const isSel = selectedEdge === e.id;
                const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                return (
                  <g key={e.id}>
                    <path d={curve(p1, p2)} fill="none" stroke="transparent" strokeWidth={14} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onPointerDown={(ev) => { ev.stopPropagation(); setSelectedEdge(e.id); setSelected(null); }} />
                    <path d={curve(p1, p2)} fill="none" stroke={isSel ? '#2f9bf0' : live ? '#16a37a' : e.port === 'no' ? '#e59a9a' : e.port === 'yes' ? '#7cc9a8' : '#7fa6c9'} strokeWidth={isSel || live ? 3 : 2} markerEnd="url(#arrow)" style={{ pointerEvents: 'none' }} />
                    {isSel && canEdit && (
                      <g style={{ cursor: 'pointer' }} onPointerDown={(ev) => { ev.stopPropagation(); removeEdge(e.id); }}>
                        <circle cx={mid.x} cy={mid.y} r={11} fill="#e0455b" /><text x={mid.x} y={mid.y + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">×</text>
                      </g>
                    )}
                  </g>
                );
              })}
              {connecting && (() => { const a = nodeById(connecting.from); if (!a) return null; return <path d={curve(outPos(a, connecting.port), { x: connecting.x, y: connecting.y })} fill="none" stroke="#2f9bf0" strokeWidth={2.5} strokeDasharray="6 5" style={{ pointerEvents: 'none' }} />; })()}
            </svg>

            {graph.nodes.map((n) => {
              const isSel = selected === n.id;
              const live = onPath.has(n.id);
              const ans = answerOf.get(n.id);
              return (
                <div key={n.id} data-node={n.id} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setSelected(n.id); setSelectedEdge(null); }}
                  className={`absolute select-none rounded-xl border bg-white shadow-[0_2px_6px_rgba(23,49,77,0.10)] ${isSel ? 'ring-2 ring-brand' : live ? 'ring-2 ring-ok' : ''}`}
                  style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H, borderColor: COLOR[n.type] }}>
                  <div onPointerDown={(e) => startDrag(e, n)} onPointerMove={moveDrag} onPointerUp={endDrag} className={`flex items-center justify-between rounded-t-[10px] px-2.5 py-1 text-[11.5px] font-extrabold text-white ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`} style={{ background: COLOR[n.type] }}>
                    <span className="truncate">{NODE_LABEL[n.type]}</span>
                    {ans && <span className={`ml-2 rounded-full px-1.5 text-[10px] ${ans === 'yes' ? 'bg-white/90 text-ok' : 'bg-white/90 text-bad'}`}>{ans === 'yes' ? 'YES' : 'NO'}</span>}
                  </div>
                  <p className="line-clamp-3 px-2.5 py-1.5 text-[12px] leading-snug text-ink-soft">{summary(n, agents)}</p>
                  {!isTrigger(n.type) && <span className="absolute -left-[7px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#7fa6c9]" aria-hidden="true" />}
                  {(isCondition(n.type) ? (['yes', 'no'] as Port[]) : (['out'] as Port[])).map((p) => (
                    <button key={p} onPointerDown={(e) => startConnect(e, n, p)} aria-label={p === 'out' ? 'Draw a line from this box' : `Draw the ${p} line`} title={p === 'out' ? 'Drag to another box' : `Drag the "${p}" line to another box`}
                      className={`absolute -right-[9px] flex h-[18px] w-[18px] -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[8px] font-extrabold text-white ${canEdit ? 'cursor-crosshair' : ''}`}
                      style={{ top: `${portY(p) * 100}%`, background: p === 'yes' ? '#16a37a' : p === 'no' ? '#e0455b' : '#2f9bf0' }}>{p === 'yes' ? 'Y' : p === 'no' ? 'N' : ''}</button>
                  ))}
                </div>
              );
            })}
            {graph.nodes.length === 0 && <p className="absolute left-10 top-10 max-w-sm rounded-xl bg-white p-4 text-[13px] text-ink-soft shadow">{canEdit ? 'The canvas is empty. Click "New lead writes" in the list on the left to add the trigger, then add more boxes and join them with lines.' : 'This flow is empty.'}</p>}
          </div>
        </div>

        {/* ------------------------------------------------ the box settings and "Try it" */}
        <aside className="hidden w-[320px] shrink-0 flex-col overflow-y-auto border-l border-line bg-panel md:flex" aria-label="Settings">
          <div className="grid grid-cols-2 gap-1 border-b border-line p-2 text-[12.5px] font-bold" role="tablist">
            <button role="tab" aria-selected={panel === 'box'} onClick={() => setPanel('box')} className={`rounded-lg px-2 py-1.5 ${panel === 'box' ? 'bg-brand text-white' : 'text-ink-soft hover:bg-brand-soft'}`}>This box</button>
            <button role="tab" aria-selected={panel === 'try'} onClick={() => setPanel('try')} className={`rounded-lg px-2 py-1.5 ${panel === 'try' ? 'bg-brand text-white' : 'text-ink-soft hover:bg-brand-soft'}`}>Try it</button>
          </div>

          {panel === 'box' && (
            <div className="space-y-3 p-4">
              <label className="block text-[12px] font-semibold text-ink-soft">What this flow is for<input className={`${field} mt-1`} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} maxLength={300} placeholder="Optional" /></label>
              <hr className="border-line" />
              {!sel && <p className="text-[12.5px] text-ink-soft">Click a box to set it up.</p>}
              {sel && <BoxSettings node={sel} agents={agents} sources={sources} canEdit={canEdit} setData={(d) => setData(sel.id, d)} onDelete={() => removeNode(sel.id)} />}
              <ProblemList errors={validation.errors} warnings={validation.warnings} />
            </div>
          )}

          {panel === 'try' && (
            <div className="space-y-3 p-4">
              <p className="text-[12.5px] text-ink-soft">Pretend a lead wrote. The path lights up in green on the canvas and nothing is sent.</p>
              <label className="block text-[12px] font-semibold text-ink-soft">The lead writes<textarea className={`${field} mt-1 h-20 resize-none`} value={test.message} onChange={(e) => setTest({ ...test, message: e.target.value })} /></label>
              <label className="block text-[12px] font-semibold text-ink-soft">The lead came from
                <select className={`${field} mt-1`} value={test.channel} onChange={(e) => setTest({ ...test, channel: e.target.value })}>
                  {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}<option value="unknown">No ad found</option>
                </select>
              </label>
              {([['isFirst', 'It is the first message of the chat'], ['inHours', 'The team is open now'], ['isClient', 'The number is an existing client']] as Array<['isFirst' | 'inHours' | 'isClient', string]>).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-[12.5px] font-semibold"><input type="checkbox" checked={test[k]} onChange={(e) => setTest({ ...test, [k]: e.target.checked })} className="h-4 w-4 accent-[#2f9bf0]" />{label}</label>
              ))}
              <hr className="border-line" />
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">What would happen</h3>
              {!plan.matched ? <p className="rounded-lg bg-[#eef2f6] px-3 py-2 text-[12.5px] text-ink-soft">This flow does not start for that message, so the normal bot answers as usual.</p> : (
                <>
                  <ol className="space-y-1.5">
                    {plan.actions.length === 0 && <li className="text-[12.5px] text-ink-soft">The flow starts but ends before any action.</li>}
                    {plan.actions.map((a, i) => <li key={i} className="rounded-lg border border-line bg-white px-3 py-2 text-[12.5px]"><span className="mr-1 font-extrabold text-brand-dark">{i + 1}.</span>{actionText(a, agents)}</li>)}
                  </ol>
                  <p className={`rounded-lg px-3 py-2 text-[12.5px] font-semibold ${plan.handled ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>{plan.handled ? 'The flow answers the lead, so the normal bot stays quiet.' : 'The flow does not answer the lead, so the normal bot still replies.'}</p>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
      <p className="border-t border-line bg-white px-4 py-1.5 text-[11px] text-ink-soft lg:hidden">Editing the drawing works best on a computer.</p>
    </div>
  );
}

function ProblemList({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (!errors.length && !warnings.length) return <p className="rounded-lg bg-ok-soft px-3 py-2 text-[12px] font-semibold text-ok">The drawing is complete.</p>;
  return (
    <ul className="space-y-1.5">
      {errors.map((e, i) => <li key={`e${i}`} className="rounded-lg bg-bad-soft px-3 py-1.5 text-[12px] text-bad">{e}</li>)}
      {warnings.map((w, i) => <li key={`w${i}`} className="rounded-lg bg-warn-soft px-3 py-1.5 text-[12px] text-[#7a4f06]">{w}</li>)}
    </ul>
  );
}

const VARS = ['{nama}', '{bot}', '{perusahaan}'];

function BoxSettings({ node, agents, sources, canEdit, setData, onDelete }: { node: FlowNode; agents: Agent[]; sources: LeadSource[]; canEdit: boolean; setData: (d: Record<string, any>) => void; onDelete: () => void }) {
  const d = node.data || {};
  const taRef = useRef<HTMLTextAreaElement>(null);
  const insert = (v: string) => { const el = taRef.current; const t = String(d.text ?? ''); const a = el?.selectionStart ?? t.length; setData({ text: t.slice(0, a) + v + t.slice(el?.selectionEnd ?? a) }); };
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-[13.5px] font-extrabold"><span className="h-3 w-3 rounded-sm" style={{ background: COLOR[node.type] }} />{NODE_LABEL[node.type]}</h3>

      {(node.type === 'trigger_keyword' || node.type === 'cond_keyword') && (
        <label className="block text-[12px] font-semibold text-ink-soft">Keywords (separate with commas)
          <textarea className={`${field} mt-1 h-20 resize-none`} value={d.keywords ?? ''} disabled={!canEdit} onChange={(e) => setData({ keywords: e.target.value })} placeholder="nego, tawar, diskon" />
          <span className="mt-1 block text-[11px] font-normal">Whole words only: &quot;nego&quot; matches &quot;bisa nego?&quot;, not &quot;negosiasi&quot;.</span>
        </label>
      )}
      {node.type === 'trigger_new_lead' && <p className="text-[12.5px] text-ink-soft">Starts when a new lead writes the first message of a chat. Keep one trigger per flow.</p>}

      {node.type === 'cond_source' && (
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-ink-soft">Yes when the lead came from:</p>
          {CHANNELS.map((c) => {
            const on = Array.isArray(d.channels) && d.channels.includes(c.key);
            return <label key={c.key} className="flex items-center gap-2 text-[12.5px] font-semibold"><input type="checkbox" disabled={!canEdit} checked={on} onChange={() => setData({ channels: on ? d.channels.filter((k: string) => k !== c.key) : [...(Array.isArray(d.channels) ? d.channels : []), c.key] })} className="h-4 w-4 accent-[#2f9bf0]" />{c.label}</label>;
          })}
          {sources.length > 0 && (
            <label className="block text-[12px] font-semibold text-ink-soft">or one particular ad
              <select className={`${field} mt-1`} value={d.sourceId ?? ''} disabled={!canEdit} onChange={(e) => setData({ sourceId: e.target.value || undefined })}>
                <option value="">Any ad of the channels above</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {node.type === 'cond_hours' && <p className="text-[12.5px] text-ink-soft">Yes when the team is open now (the hours are set in AI Kamus → Bot script &amp; settings). Otherwise No.</p>}
      {node.type === 'cond_client' && <p className="text-[12.5px] text-ink-soft">Yes when the lead&apos;s phone number belongs to a client in the ERP. Otherwise No.</p>}

      {(node.type === 'act_send' || node.type === 'act_note') && (
        <div>
          <label className="block text-[12px] font-semibold text-ink-soft">{node.type === 'act_send' ? 'Message to the lead' : 'Note for the team (the lead never sees it)'}
            <textarea ref={taRef} className={`${field} mt-1 h-32 resize-none`} value={d.text ?? ''} disabled={!canEdit} maxLength={1000} onChange={(e) => setData({ text: e.target.value })} />
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">Add:
            {VARS.map((v) => <button key={v} type="button" disabled={!canEdit} onClick={() => insert(v)} className="rounded-full bg-brand-soft px-2 py-0.5 font-bold text-brand-dark hover:bg-[#d4e9fb]">{v}</button>)}
          </div>
          <p className="mt-1 text-[11px] text-ink-soft">{'{nama}'} = the lead&apos;s first name, {'{bot}'} = the bot&apos;s name, {'{perusahaan}'} = the company.</p>
        </div>
      )}
      {node.type === 'act_ai' && <p className="text-[12.5px] text-ink-soft">The AI writes the reply from the AI Kamus (script and Sales Deck), the same as the normal bot. After this box the flow usually ends.</p>}
      {node.type === 'act_assign' && (
        <label className="block text-[12px] font-semibold text-ink-soft">Give the chat to
          <select className={`${field} mt-1`} value={d.userId ?? ''} disabled={!canEdit} onChange={(e) => setData({ userId: e.target.value, userName: agents.find((a) => a.id === e.target.value)?.name ?? '' })}>
            <option value="">Pick a person</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      )}
      {node.type === 'act_assign_client_sales' && <p className="text-[12.5px] text-ink-soft">Gives the chat to the salesperson named on the client in the ERP (matched by first name with the team). If none is found, nothing changes.</p>}
      {node.type === 'act_handover' && (
        <label className="block text-[12px] font-semibold text-ink-soft">Why (shown to the team)
          <input className={`${field} mt-1`} value={d.reason ?? ''} disabled={!canEdit} maxLength={120} onChange={(e) => setData({ reason: e.target.value })} placeholder="The lead wants to negotiate the price." />
          <span className="mt-1 block text-[11px] font-normal">The bot stops answering this chat. A salesperson takes over.</span>
        </label>
      )}
      {canEdit && <button onClick={onDelete} className={`${btnGhost} hover:!border-bad hover:!text-bad`}>Delete this box</button>}
    </div>
  );
}
