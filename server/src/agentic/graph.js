/**
 * A minimal state-graph runtime.
 *
 * This is deliberately the same execution model LangGraph uses — named nodes
 * that transform a shared state object, and edges (static or conditional)
 * that decide what runs next — expressed in ~40 lines rather than pulled in
 * as a Python runtime. A four-node graph does not justify a second language
 * in the stack, but the vocabulary maps one-to-one if it ever needs to move.
 *
 *   const g = new StateGraph()
 *     .addNode('investigate', fn)
 *     .addEdge('investigate', 'act')
 *     .addConditionalEdge('act', state => state.done ? 'recommend' : 'investigate')
 *     .setEntry('investigate');
 */

export const END = '__end__';

export class StateGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.entry = null;
    this.maxSteps = 24;
  }

  addNode(name, fn) {
    this.nodes.set(name, fn);
    return this;
  }

  /** Unconditional transition: after `from` runs, `to` runs. */
  addEdge(from, to) {
    this.edges.set(from, () => to);
    return this;
  }

  /** Router: `fn(state)` returns the name of the next node, or END. */
  addConditionalEdge(from, fn) {
    this.edges.set(from, fn);
    return this;
  }

  setEntry(name) {
    this.entry = name;
    return this;
  }

  /**
   * Runs the graph to completion. Each node returns a partial state which is
   * merged in — nodes never mutate state directly, so the trace stays a clean
   * record of what each step contributed.
   */
  async run(initialState) {
    let state = { ...initialState };
    const trace = [];
    let current = this.entry;
    let steps = 0;

    while (current && current !== END) {
      if (steps++ >= this.maxSteps) {
        trace.push({ node: current, halted: 'max-steps-exceeded' });
        break;
      }

      const node = this.nodes.get(current);
      if (!node) throw new Error(`Graph has no node named "${current}"`);

      const started = Date.now();
      const patch = (await node(state)) ?? {};
      state = { ...state, ...patch };

      trace.push({
        node: current,
        ms: Date.now() - started,
        emitted: Object.keys(patch),
      });

      const route = this.edges.get(current);
      current = route ? route(state) : END;
    }

    return { state, trace };
  }
}
