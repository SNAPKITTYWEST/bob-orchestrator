-- ════════════════════════════════════════════════════════
-- BOB Sovereign Runtime — Ada Contract Executor
-- SnapKitty Collective
-- ════════════════════════════════════════════════════════
-- This is the Ada runtime that enforces contracts at execution time.
-- It is not a generator — it is the law.
-- The JS bridge (bridge/ada-executor.mjs) calls these semantics.

with Ada.Text_IO;            use Ada.Text_IO;
with Ada.Strings.Unbounded;  use Ada.Strings.Unbounded;
with Ada.Containers.Vectors;

package BOB_Sovereign_Runtime is

   -- ── Types ──────────────────────────────────────────────

   type Trust_Level is (NONE, LOW, MEDIUM, HIGH, SOVEREIGN);

   type Agent_Class_Type is (SENTINEL, ORACLE, BUILDER, ARCHIVIST, BERSERKER);

   type Capability_Name is new String (1 .. 64);

   package Capability_Vectors is new Ada.Containers.Vectors
     (Index_Type => Positive, Element_Type => Unbounded_String);

   type Agent_Manifest is record
      ID           : Unbounded_String;
      Name         : Unbounded_String;
      Agent_Class  : Agent_Class_Type;
      Trust        : Trust_Level;
      Capabilities : Capability_Vectors.Vector;
      Worm_Seal    : Unbounded_String;
      Born_At      : Unbounded_String;
   end record;

   type SSM_Injection is record
      Proof_Hash    : Unbounded_String;   -- SHA-256 of Lean 4 proof
      Contract_Hash : Unbounded_String;   -- SHA-256 of Ada contract
      Worm_Seal     : Unbounded_String;   -- WORM chain event seal
      Dim           : Positive := 2048;
      Valid         : Boolean  := False;
   end record;

   type State_Transition is record
      From_State : Unbounded_String;
      To_State   : Unbounded_String;
      Agent      : Agent_Manifest;
      Injection  : SSM_Injection;
      Sealed     : Boolean := False;
   end record;

   -- ── Constitutional constraints ─────────────────────────
   -- These are the enforced invariants. Violations raise Constraint_Error.

   MINIMUM_HASH_LENGTH : constant := 64;

   SOVEREIGN_CLASSES : constant array (1 .. 1) of Agent_Class_Type :=
     (1 => SENTINEL);

   BLOCKED_FROM_WRITE : constant array (1 .. 1) of Agent_Class_Type :=
     (1 => ORACLE);

   -- ── Procedures ─────────────────────────────────────────

   procedure Verify_Capability (
      Manifest  : in  Agent_Manifest;
      Requested : in  String;
      Granted   : out Boolean
   );
   -- Returns Granted=True only if Requested is in Manifest.Capabilities.
   -- NEVER grants capability not in the manifest.

   procedure Validate_Injection (
      Injection : in  SSM_Injection;
      Valid     : out Boolean;
      Reason    : out Unbounded_String
   );
   -- Valid=True iff:
   --   Injection.Proof_Hash'Length = 64
   --   Injection.Contract_Hash'Length = 64
   --   Injection.Worm_Seal'Length > 0
   --   Injection.Valid = True

   procedure Gate_State_Advance (
      Transition : in out State_Transition;
      Permitted  : out Boolean;
      Reason     : out Unbounded_String
   );
   -- The gate fires iff:
   --   1. Agent trust >= MEDIUM
   --   2. Injection is valid (Validate_Injection)
   --   3. Agent is not a blocked class for the requested operation
   -- If not permitted, Transition.From_State is preserved (state frozen).

   function Trust_Meets_Threshold (
      Agent_Trust : in Trust_Level;
      Required    : in Trust_Level
   ) return Boolean;
   -- Returns True iff Agent_Trust >= Required in ordinal order.

   procedure Seal_Transition (
      Transition : in out State_Transition;
      Worm_Event : in  Unbounded_String
   );
   -- Marks Transition.Sealed = True and records the WORM event hash.

   -- ── WORM bridge ────────────────────────────────────────

   procedure Log_To_Worm (
      Label   : in String;
      Payload : in Unbounded_String;
      Seal    : out Unbounded_String
   );
   -- Calls the JS WORM bridge via FFI.
   -- In the JS runtime this is wormAppend().

end BOB_Sovereign_Runtime;

package body BOB_Sovereign_Runtime is

   procedure Verify_Capability (
      Manifest  : in  Agent_Manifest;
      Requested : in  String;
      Granted   : out Boolean
   ) is
   begin
      Granted := False;
      for Cap of Manifest.Capabilities loop
         if To_String (Cap) = Requested then
            Granted := True;
            return;
         end if;
      end loop;
   end Verify_Capability;

   procedure Validate_Injection (
      Injection : in  SSM_Injection;
      Valid     : out Boolean;
      Reason    : out Unbounded_String
   ) is
   begin
      if not Injection.Valid then
         Valid  := False;
         Reason := To_Unbounded_String ("injection.Valid = False");
         return;
      end if;
      if Length (Injection.Proof_Hash) /= 64 then
         Valid  := False;
         Reason := To_Unbounded_String ("proof_hash must be 64-char SHA-256");
         return;
      end if;
      if Length (Injection.Contract_Hash) /= 64 then
         Valid  := False;
         Reason := To_Unbounded_String ("contract_hash must be 64-char SHA-256");
         return;
      end if;
      if Length (Injection.Worm_Seal) = 0 then
         Valid  := False;
         Reason := To_Unbounded_String ("worm_seal is required");
         return;
      end if;
      Valid  := True;
      Reason := To_Unbounded_String ("OK");
   end Validate_Injection;

   function Trust_Meets_Threshold (
      Agent_Trust : in Trust_Level;
      Required    : in Trust_Level
   ) return Boolean is
   begin
      return Trust_Level'Pos (Agent_Trust) >= Trust_Level'Pos (Required);
   end Trust_Meets_Threshold;

   procedure Gate_State_Advance (
      Transition : in out State_Transition;
      Permitted  : out Boolean;
      Reason     : out Unbounded_String
   ) is
      Inj_Valid  : Boolean;
      Inj_Reason : Unbounded_String;
   begin
      -- Gate 1: trust check
      if not Trust_Meets_Threshold (Transition.Agent.Trust, MEDIUM) then
         Permitted := False;
         Reason    := To_Unbounded_String ("Agent trust below MEDIUM");
         return;
      end if;

      -- Gate 2: injection validity
      Validate_Injection (Transition.Injection, Inj_Valid, Inj_Reason);
      if not Inj_Valid then
         Permitted := False;
         Reason    := Inj_Reason;
         return;
      end if;

      -- Gate 3: ORACLE cannot write
      if Transition.Agent.Agent_Class = ORACLE then
         Permitted := False;
         Reason    := To_Unbounded_String ("ORACLE class: read-only");
         return;
      end if;

      Permitted := True;
      Reason    := To_Unbounded_String ("ADVANCE_PERMITTED");
   end Gate_State_Advance;

   procedure Seal_Transition (
      Transition : in out State_Transition;
      Worm_Event : in  Unbounded_String
   ) is
   begin
      Transition.Sealed                  := True;
      Transition.Injection.Worm_Seal     := Worm_Event;
   end Seal_Transition;

   procedure Log_To_Worm (
      Label   : in String;
      Payload : in Unbounded_String;
      Seal    : out Unbounded_String
   ) is
   begin
      -- FFI stub — implemented in bridge/ada-executor.mjs
      Put_Line ("[WORM] " & Label & " :: " & To_String (Payload));
      Seal := To_Unbounded_String ("(seal-via-js-bridge)");
   end Log_To_Worm;

end BOB_Sovereign_Runtime;
