-- ════════════════════════════════════════════════════════
-- BOB Contract Specification — bob_contract.ads
-- SnapKitty Collective / BOB Sovereign Orchestrator
-- ════════════════════════════════════════════════════════
-- Defines every capability gate for BOB sovereign operations.
-- This is the LAW. The .adb body is the ENFORCEMENT.
-- The ada_gate.mjs JS bridge enforces these semantics at runtime.
--
-- Contract result:
--   ALLOWED → operation may proceed
--   DENIED  → operation is blocked; caller must not proceed

with Ada.Strings.Unbounded; use Ada.Strings.Unbounded;

package BOB_Contract is

   -- ── Core types ───────────────────────────────────────────

   type Agent_Class is (SENTINEL, ORACLE, BUILDER, ARCHIVIST, BERSERKER);

   type Trust_Level is (NONE, LOW, MEDIUM, HIGH, SOVEREIGN)
     with Size => 3;

   type HolyC_Mode is (DISABLED, HOLYC_SIM, QEMU_SANDBOX);

   type Contract_Result is (ALLOWED, DENIED);

   type Denial_Reason is new Unbounded_String;

   type Contract_Outcome is record
      Result : Contract_Result;
      Reason : Unbounded_String;
   end record;

   -- ── Trust ordering ────────────────────────────────────────
   -- NONE < LOW < MEDIUM < HIGH < SOVEREIGN (Ada ordinal)

   function Trust_Rank (T : Trust_Level) return Natural;
   function Trust_At_Least (Agent : Trust_Level; Required : Trust_Level) return Boolean;

   -- ── Capability gates ──────────────────────────────────────

   -- Gate 1: Can agent invoke HolyC execution at all?
   -- Rules:
   --   DISABLED → always DENIED
   --   HOLYC_SIM → SENTINEL, BUILDER allowed; others DENIED
   --   QEMU_SANDBOX → SENTINEL only
   function Can_Invoke_HolyC (
      Class : Agent_Class;
      Mode  : HolyC_Mode
   ) return Contract_Outcome;

   -- Gate 2: Can agent write to the WORM chain?
   -- Rules:
   --   Trust < MEDIUM → DENIED
   --   ORACLE → DENIED (read-only by constitution)
   function Can_Write_WORM (
      Class : Agent_Class;
      Trust : Trust_Level
   ) return Contract_Outcome;

   -- Gate 3: Can agent call Ollama/Nemotron?
   -- Rules:
   --   Trust < MEDIUM → DENIED
   --   No class restriction (all classes with sufficient trust may call LLM as subcomponent)
   function Can_Call_Ollama (
      Class : Agent_Class;
      Trust : Trust_Level
   ) return Contract_Outcome;

   -- Gate 4: Can agent invoke another agent (spawn/delegate)?
   -- Rules:
   --   Trust < HIGH → DENIED
   --   Only SENTINEL, BUILDER, ARCHIVIST may delegate
   function Can_Invoke_Agent (
      Class : Agent_Class;
      Trust : Trust_Level
   ) return Contract_Outcome;

   -- Gate 5: Can agent launch QEMU sandbox?
   -- Rules:
   --   Mode must be QEMU_SANDBOX
   --   Class must be SENTINEL (only constitutional enforcer may control VM boundary)
   function Can_Run_QEMU (
      Class : Agent_Class;
      Mode  : HolyC_Mode
   ) return Contract_Outcome;

   -- Gate 6: Can agent mutate BOB's internal state (SSM hidden state)?
   -- Rules:
   --   Trust < HIGH → DENIED
   --   Only SENTINEL and BUILDER may mutate state
   --   ORACLE is constitutionally read-only
   function Can_Mutate_State (
      Class : Agent_Class;
      Trust : Trust_Level
   ) return Contract_Outcome;

private

   function Make_Outcome (
      R : Contract_Result;
      S : String
   ) return Contract_Outcome is
     ((Result => R, Reason => To_Unbounded_String (S)));

end BOB_Contract;
