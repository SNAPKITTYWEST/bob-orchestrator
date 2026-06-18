%% ════════════════════════════════════════════════════════
%% BOB Sovereign Kernel — Prolog Reasoning Engine
%% SnapKitty Collective
%% ════════════════════════════════════════════════════════
%% This is the logic layer. Lean 4 proves THAT something is valid.
%% Ada enforces THAT constraints are met at runtime.
%% Prolog REASONS ABOUT which path to take given the current state.
%%
%% The three-layer stack:
%%   Lean 4 → formal proof obligations (compile-time)
%%   Ada     → contract enforcement (execution-time)
%%   Prolog  → dynamic reasoning (query-time)

:- module(sovereign_kernel, [
    agent_class/2,
    capability_permitted/3,
    trust_level/2,
    trust_satisfies/2,
    gate_advance/3,
    injection_admissible/1,
    route_token/3,
    select_agent/4
]).

%% ── Agent class definitions ──────────────────────────────

agent_class(sentinel,  sovereign).
agent_class(oracle,    high).
agent_class(builder,   high).
agent_class(archivist, high).
agent_class(berserker, medium).

%% ── Trust hierarchy ──────────────────────────────────────

trust_level(none,     0).
trust_level(low,      1).
trust_level(medium,   2).
trust_level(high,     3).
trust_level(sovereign, 4).

trust_satisfies(AgentTrust, Required) :-
    trust_level(AgentTrust, AV),
    trust_level(Required,   RV),
    AV >= RV.

%% ── Capability permissions ───────────────────────────────
%% Format: capability_permitted(AgentClass, Capability, Reason)

capability_permitted(sentinel,  write,         'SENTINEL may write — constitutional enforcer').
capability_permitted(sentinel,  read,          'SENTINEL may read — constitutional enforcer').
capability_permitted(sentinel,  block,         'SENTINEL may block — constitutional enforcer').
capability_permitted(sentinel,  seal,          'SENTINEL may seal — constitutional enforcer').

capability_permitted(oracle,    read,          'ORACLE is read-only by constitution').
capability_permitted(oracle,    analyze,       'ORACLE may analyze').
capability_permitted(oracle,    pattern_match, 'ORACLE may pattern match').

capability_permitted(builder,   write,         'BUILDER creates artifacts').
capability_permitted(builder,   read,          'BUILDER reads context').
capability_permitted(builder,   generate,      'BUILDER generates').
capability_permitted(builder,   seal,          'BUILDER seals completed artifacts').

capability_permitted(archivist, read,          'ARCHIVIST reads everything').
capability_permitted(archivist, index,         'ARCHIVIST indexes').
capability_permitted(archivist, provenance,    'ARCHIVIST traces lineage').

capability_permitted(berserker, inject,        'BERSERKER tests injections').
capability_permitted(berserker, red_team,      'BERSERKER adversarial testing').
capability_permitted(berserker, read,          'BERSERKER reads to attack').

%% ── State advance gate ───────────────────────────────────
%% gate_advance(+Agent, +InjectionValid, -Result)
%% Result: permitted | blocked(Reason)

gate_advance(Agent, _, blocked('Agent trust below MEDIUM')) :-
    agent_class(Agent, Trust),
    \+ trust_satisfies(Trust, medium).

gate_advance(oracle, _, blocked('ORACLE is read-only: write advance blocked')).

gate_advance(_, false, blocked('Injection proof is invalid: state frozen')).

gate_advance(Agent, true, permitted(Agent)) :-
    agent_class(Agent, Trust),
    trust_satisfies(Trust, medium),
    Agent \= oracle.

%% ── Injection admissibility ──────────────────────────────
%% injection_admissible(+Injection)
%% Injection = injection(ProofHash, ContractHash, WormSeal, Valid)

injection_admissible(injection(PH, CH, WS, true)) :-
    atom_length(PH, 64),
    atom_length(CH, 64),
    atom_length(WS, L),
    L > 0.

%% ── Token routing (for LLM output parsing) ───────────────
%% route_token(+Token, +InThink, -Route)
%% Route: reasoning | output | toggle_open | toggle_close

route_token('<think>', false, toggle_open).
route_token('</think>', true, toggle_close).
route_token(_, true,  reasoning).
route_token(_, false, output).

%% ── Agent selection logic ────────────────────────────────
%% select_agent(+Task, +Context, +AvailableAgents, -BestAgent)

select_agent(security_check, _, Agents, sentinel) :-
    member(sentinel, Agents), !.

select_agent(read_only_analysis, _, Agents, oracle) :-
    member(oracle, Agents), !.

select_agent(code_generation, _, Agents, builder) :-
    member(builder, Agents), !.

select_agent(memory_recall, _, Agents, archivist) :-
    member(archivist, Agents), !.

select_agent(adversarial_test, _, Agents, berserker) :-
    member(berserker, Agents), !.

select_agent(_, _, [H|_], H).  % fallback: first available

%% ── BOB state machine ────────────────────────────────────

:- dynamic bob_state/2.       % bob_state(Key, Value)
:- dynamic worm_event/3.      % worm_event(Seal, Label, Payload)

bob_set(Key, Value) :-
    retractall(bob_state(Key, _)),
    assert(bob_state(Key, Value)).

bob_get(Key, Value) :-
    bob_state(Key, Value), !.
bob_get(_, undefined).

%% ── Lean 4 obligation check (bridge stub) ────────────────
%% In production: calls lean --run to verify theorem
%% Here: structural validation

lean_obligation_satisfied(Theorem) :-
    atom_length(Theorem, L),
    L > 10,       % non-trivial theorem
    \+ Theorem = ''.  % not empty
