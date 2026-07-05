import { makeAutoObservable } from 'mobx';
import { parseProgram } from '../core/parser/parser';
import type { ParseError } from '../core/parser/errors';
import type { Instruction } from '../core/parser/ast';
import {
  createInitialSnapshot, runtimeInstructions, stepNonMeasure, stepMeasure,
  sampleOutcome, measurementRequest, countPriorMeasurements,
  type Snapshot, type MeasurementMode,
} from '../core/debug/interpreter';
import { EXAMPLES, getExample } from '../core/examples';
import { encodeState, decodeState, saveToLocalStorage, loadFromLocalStorage, type SerializedState } from '../core/serialize';
import type { EquationFormat } from '../core/analysis/formats';

export type DebuggerStatus = 'IDLE' | 'READY' | 'PAUSED' | 'RUNNING' | 'AWAITING_MEASUREMENT' | 'DONE';
export type BottomTab = 'STATEVECTOR' | 'ENT_GRAPH' | 'CLASSICAL' | 'LOG';
export type EditorTab = 'EDITOR' | 'TIMELINE';

export interface PendingMeasurement { qubit: number; bit: number; p1: number; line: number; }
export interface ContextMenuState { x: number; y: number; instr: Instruction; }

type StepResult = 'ok' | 'awaiting' | 'done';

export class DebuggerStore {
  source = '';
  seed = 1337;
  measurementMode: MeasurementMode = 'SAMPLE';
  breakpoints = new Set<number>();

  history: Snapshot[] = [];
  cursor = 0;
  status: DebuggerStatus = 'IDLE';

  program: Instruction[] = [];
  numQubits = 0;
  numBits = 0;
  parseErrors: ParseError[] = [];
  parseWarnings: ParseError[] = [];

  pending: PendingMeasurement | null = null;
  log: string[] = [];
  equationFormats = new Map<number, EquationFormat>();
  bottomTab: BottomTab = 'STATEVECTOR';
  editorTab: EditorTab = 'EDITOR';
  contextMenu: ContextMenuState | null = null;
  selectedExampleId: string | null = null;
  private rerollCounter = 0;
  private hydrating = false;

  constructor() {
    // deep observability matters here: breakpoints/history/log/equationFormats are mutated
    // in place (.add/.delete/.push/.set) rather than reassigned, so they must be deep-observable
    // Set/Map/Array wrappers for those mutations to notify observers.
    makeAutoObservable(this);
  }

  // ---------- derived ----------

  get runtimeProgram(): Instruction[] {
    return runtimeInstructions(this.program);
  }

  get current(): Snapshot | null {
    return this.history[this.cursor] ?? null;
  }

  get canStepBack(): boolean {
    return this.cursor > 0;
  }

  get canStepForward(): boolean {
    return this.status === 'PAUSED' || this.status === 'READY';
  }

  get currentLine(): number | null {
    const rt = this.runtimeProgram;
    return rt[this.cursor]?.line ?? null;
  }

  get serialized(): SerializedState {
    return {
      source: this.source,
      seed: this.seed,
      measurementMode: this.measurementMode,
      breakpoints: Array.from(this.breakpoints),
      exampleId: this.selectedExampleId ?? undefined,
    };
  }

  get shareParam(): string {
    return encodeState(this.serialized);
  }

  // ---------- source / config ----------

  setSource(src: string): void {
    this.source = src;
    if (!this.hydrating) this.selectedExampleId = null;
    this.reparseAndReset();
  }

  setSeed(seed: number): void {
    this.seed = seed >>> 0;
    this.reparseAndReset();
  }

  setMeasurementMode(mode: MeasurementMode): void {
    this.measurementMode = mode;
  }

  toggleBreakpoint(line: number): void {
    if (this.breakpoints.has(line)) this.breakpoints.delete(line);
    else this.breakpoints.add(line);
  }

  reparseAndReset(): void {
    const result = parseProgram(this.source);
    this.history = [];
    this.cursor = 0;
    this.pending = null;
    if (!result.ok) {
      this.parseErrors = result.errors;
      this.parseWarnings = [];
      this.program = [];
      this.status = 'IDLE';
      return;
    }
    this.parseErrors = [];
    this.parseWarnings = result.warnings;
    this.program = result.program.instructions;
    this.numQubits = Math.max(1, result.program.numQubits);
    this.numBits = result.program.numBits;
    this.history = [createInitialSnapshot(this.numQubits, this.numBits, this.seed)];
    this.status = 'READY';
  }

  // ---------- stepping ----------

  private doStep(rt: Instruction[]): StepResult {
    if (this.cursor >= rt.length) return 'done';

    if (this.cursor < this.history.length - 1) {
      this.cursor++;
      return this.cursor >= rt.length ? 'done' : 'ok';
    }

    const instr = rt[this.cursor];
    const cur = this.history[this.cursor];

    if (instr.kind === 'measure') {
      const req = measurementRequest(cur.state, instr);
      if (this.measurementMode === 'ASK') {
        this.pending = { qubit: instr.qubit, bit: instr.bit, p1: req.p1, line: instr.line };
        return 'awaiting';
      }
      let outcome: 0 | 1;
      let rngState = cur.rngState;
      if (this.measurementMode === 'SAMPLE') {
        const sampled = sampleOutcome(cur, req.p1);
        outcome = sampled.outcome;
        rngState = sampled.rngState;
      } else {
        const idx = countPriorMeasurements(rt, this.cursor);
        outcome = this.measurementMode.fixed[idx] ?? 0;
      }
      const snap = stepMeasure(cur, instr, outcome);
      snap.rngState = rngState;
      this.history.push(snap);
      this.cursor++;
      this.appendLog(`MEASURE q${instr.qubit} -> c${instr.bit} = ${outcome} (p1=${req.p1.toFixed(3)})`);
    } else {
      const snap = stepNonMeasure(cur, instr);
      this.history.push(snap);
      this.cursor++;
    }
    return this.cursor >= rt.length ? 'done' : 'ok';
  }

  step(): void {
    if (this.status === 'DONE' || this.status === 'IDLE' || this.status === 'AWAITING_MEASUREMENT') return;
    const rt = this.runtimeProgram;
    const result = this.doStep(rt);
    this.status = result === 'awaiting' ? 'AWAITING_MEASUREMENT' : result === 'done' ? 'DONE' : 'PAUSED';
  }

  stepBack(): void {
    if (this.cursor > 0) {
      this.cursor--;
      this.pending = null;
      this.status = 'PAUSED';
    }
  }

  continueRun(maxSteps = 20000): void {
    if (this.status === 'DONE' || this.status === 'IDLE') return;
    this.status = 'RUNNING';
    const rt = this.runtimeProgram;
    let n = 0;
    while (n < maxSteps) {
      if (this.cursor >= rt.length) { this.status = 'DONE'; return; }
      const nextLine = rt[this.cursor].line;
      if (n > 0 && this.breakpoints.has(nextLine)) { this.status = 'PAUSED'; return; }
      const result = this.doStep(rt);
      n++;
      if (result === 'awaiting') { this.status = 'AWAITING_MEASUREMENT'; return; }
      if (result === 'done') { this.status = 'DONE'; return; }
    }
    this.status = 'PAUSED';
  }

  runToLine(line: number): void {
    const had = this.breakpoints.has(line);
    if (!had) this.breakpoints.add(line);
    this.continueRun();
    if (!had) this.breakpoints.delete(line);
  }

  chooseOutcome(outcome: 0 | 1): void {
    if (this.status !== 'AWAITING_MEASUREMENT' || !this.pending) return;
    const rt = this.runtimeProgram;
    const instr = rt[this.cursor];
    if (instr.kind !== 'measure') return;
    this.history.length = this.cursor + 1;
    const cur = this.history[this.cursor];
    const snap = stepMeasure(cur, instr, outcome);
    this.history.push(snap);
    this.cursor++;
    this.appendLog(`MEASURE (ASK) q${instr.qubit} -> c${instr.bit} = ${outcome}`);
    this.pending = null;
    this.status = this.cursor >= rt.length ? 'DONE' : 'PAUSED';
  }

  rerollMeasurement(): void {
    const cur = this.history[this.cursor];
    if (!cur || !cur.lastOutcome) return;
    const prevIdx = this.cursor - 1;
    if (prevIdx < 0) return;
    const before = this.history[prevIdx];
    const rt = this.runtimeProgram;
    const instr = rt[prevIdx];
    if (instr.kind !== 'measure') return;
    const req = measurementRequest(before.state, instr);
    this.rerollCounter++;
    const perturbed: Snapshot = { ...before, rngState: (before.rngState + 0x9e3779b9 + this.rerollCounter * 2654435761) >>> 0 };
    const sampled = sampleOutcome(perturbed, req.p1);
    const snap = stepMeasure(before, instr, sampled.outcome);
    snap.rngState = sampled.rngState;
    this.history[this.cursor] = snap;
    this.history.length = this.cursor + 1;
    this.appendLog(`re-roll q${instr.qubit} -> c${instr.bit} = ${sampled.outcome}`);
  }

  resetRun(): void {
    if (this.history.length === 0) return;
    this.history.length = 1;
    this.cursor = 0;
    this.pending = null;
    this.status = this.program.length ? 'READY' : 'IDLE';
    this.appendLog('reset');
  }

  // ---------- examples ----------

  get examples() {
    return EXAMPLES;
  }

  loadExample(id: string): void {
    const ex = getExample(id);
    if (!ex) return;
    this.selectedExampleId = id;
    this.source = ex.source;
    this.seed = 1337;
    this.measurementMode = ex.measurementMode ?? 'SAMPLE';
    this.breakpoints.clear();
    ex.breakpoints.forEach((l) => this.breakpoints.add(l));
    this.reparseAndReset();
    this.appendLog(`example loaded: ${ex.name}`);
  }

  // ---------- misc UI state ----------

  appendLog(msg: string): void {
    this.log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (this.log.length > 500) this.log.shift();
  }

  cycleEquationFormat(qubit: number): void {
    const order: EquationFormat[] = ['cartesian', 'polar', 'angular'];
    const cur = this.equationFormats.get(qubit) ?? 'cartesian';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    this.equationFormats.set(qubit, next);
  }

  getEquationFormat(qubit: number): EquationFormat {
    return this.equationFormats.get(qubit) ?? 'cartesian';
  }

  openContextMenu(x: number, y: number, instr: Instruction): void {
    this.contextMenu = { x, y, instr };
  }

  closeContextMenu(): void {
    this.contextMenu = null;
  }

  setBottomTab(tab: BottomTab): void { this.bottomTab = tab; }
  setEditorTab(tab: EditorTab): void { this.editorTab = tab; }

  // ---------- serialization ----------

  hydrate(s: SerializedState): void {
    this.hydrating = true;
    this.source = s.source;
    this.seed = (s.seed ?? 1337) >>> 0;
    this.measurementMode = s.measurementMode ?? 'SAMPLE';
    this.breakpoints.clear();
    (s.breakpoints ?? []).forEach((l) => this.breakpoints.add(l));
    this.selectedExampleId = s.exampleId ?? null;
    this.reparseAndReset();
    this.hydrating = false;
  }

  /** Hydrates from URL param if present, else localStorage, else the first bundled example. */
  bootstrap(urlParam: string | null): void {
    if (urlParam) {
      const decoded = decodeState(urlParam);
      if (decoded) { this.hydrate(decoded); return; }
    }
    const saved = loadFromLocalStorage();
    if (saved) { this.hydrate(saved); return; }
    this.loadExample(EXAMPLES[0].id);
  }

  persist(): void {
    saveToLocalStorage(this.serialized);
  }
}

export const debuggerStore = new DebuggerStore();
