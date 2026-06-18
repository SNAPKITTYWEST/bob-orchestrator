-- ════════════════════════════════════════════════════════
-- BOB Contract Body — bob_contract.adb
-- SnapKitty Collective / BOB Sovereign Orchestrator
-- ════════════════════════════════════════════════════════
-- The enforcement layer. Every gate is fully specified here.
-- No ambiguity. No fallthrough. DENIED is the default.
-- The JS bridge (ada_gate.mjs) implements identical semantics.

package body BOB_Contract is

   -- ── Trust helpers ────────────────────────────────────────

   function Trust_Rank (T : Trust_Level) return Natural is
   begin
      case T is
         when NONE     => return 0;
         when LOW      => return 1;
         when MEDIUM   => return 2;
         when HIGH     => return 3;
         when SOVEREIGN => return 4;
      end case;
   end Trust_Rank;

   function Trust_At_Least (Agent : Trust_Level; Required : Trust_Level) return Boolean is
   begin
      return Trust_Rank (Agent) >= Trust_Rank (Required);
   end Trust_At_Least;

   -- ── Shorthand constructors ────────────────────────────────

   function Allow (Reason : String) return Contract_Outcome is
   begin
      return Make_Outcome (ALLOWED, Reason);
   end Allow;

   function Deny (Reason : String) return Contract_Outcome is
   begin
      return Make_Outcome (DENIED, Reason);
   end Deny;

   -- ── Gate 1: Can_Invoke_HolyC ─────────────────────────────

   function Can_Invoke_HolyC (
      Class : Agent_Class;
      Mode  : HolyC_Mode
   ) return Contract_Outcome is
   begin
      if Mode = DISABLED then
         return Deny ("HolyC DISABLED: BOB_HOLYC_MODE=DISABLED or no sandbox present");
      end if;

      if Mode = QEMU_SANDBOX then
         if Class = SENTINEL then
            return Allow ("SENTINEL may invoke HolyC in QEMU_SANDBOX");
         else
            return Deny ("QEMU_SANDBOX requires SENTINEL class; " &
                         Agent_Class'Image (Class) & " is not authorized");
         end if;
      end if;

      -- HOLYC_SIM mode
      case Class is
         when SENTINEL  => return Allow ("SENTINEL may invoke HolyC in HOLYC_SIM");
         when BUILDER   => return Allow ("BUILDER may invoke HolyC in HOLYC_SIM");
         when ORACLE    => return Deny  ("ORACLE is read-only: HolyC execution denied");
         when ARCHIVIST => return Deny  ("ARCHIVIST does not execute code: use BUILDER");
         when BERSERKER => return Deny  ("BERSERKER red-team mode: HolyC denied in sim (use QEMU)");
      end case;
   end Can_Invoke_HolyC;

   -- ── Gate 2: Can_Write_WORM ───────────────────────────────

   function Can_Write_WORM (
      Class : Agent_Class;
      Trust : Trust_Level
   ) return Contract_Outcome is
   begin
      if not Trust_At_Least (Trust, MEDIUM) then
         return Deny ("Trust " & Trust_Level'Image (Trust) &
                      " below MEDIUM: WORM write denied");
      end if;

      if Class = ORACLE then
         return Deny ("ORACLE is constitutionally read-only: WORM write denied");
      end if;

      return Allow (Agent_Class'Image (Class) & " with trust " &
                    Trust_Level'Image (Trust) & " may write WORM");
   end Can_Write_WORM;

   -- ── Gate 3: Can_Call_Ollama ──────────────────────────────

   function Can_Call_Ollama (
      Class : Agent_Class;
      Trust : Trust_Level
   ) return Contract_Outcome is
   begin
      if not Trust_At_Least (Trust, MEDIUM) then
         return Deny ("Trust " & Trust_Level'Image (Trust) &
                      " below MEDIUM: Ollama call denied");
      end if;

      -- All classes with sufficient trust may call LLM as subcomponent
      -- LLM is a tool; the orchestrator gate controls access, not class restrictions
      return Allow (Agent_Class'Image (Class) & " with trust " &
                    Trust_Level'Image (Trust) & " may call Ollama");
   end Can_Call_Ollama;

   -- ── Gate 4: Can_Invoke_Agent ─────────────────────────────

   function Can_Invoke_Agent (
      Class : Agent_Class;
      Trust : Trust_Level
   ) return Contract_Outcome is
   begin
      if not Trust_At_Least (Trust, HIGH) then
         return Deny ("Trust " & Trust_Level'Image (Trust) &
                      " below HIGH: agent delegation denied");
      end if;

      case Class is
         when SENTINEL  => return Allow ("SENTINEL may delegate to agents");
         when BUILDER   => return Allow ("BUILDER may delegate to agents");
         when ARCHIVIST => return Allow ("ARCHIVIST may delegate read tasks");
         when ORACLE    => return Deny  ("ORACLE cannot delegate: read-only");
         when BERSERKER => return Deny  ("BERSERKER cannot delegate: adversarial class isolation");
      end case;
   end Can_Invoke_Agent;

   -- ── Gate 5: Can_Run_QEMU ─────────────────────────────────

   function Can_Run_QEMU (
      Class : Agent_Class;
      Mode  : HolyC_Mode
   ) return Contract_Outcome is
   begin
      if Mode /= QEMU_SANDBOX then
         return Deny ("Can_Run_QEMU requires QEMU_SANDBOX mode (current: " &
                      HolyC_Mode'Image (Mode) & ")");
      end if;

      if Class /= SENTINEL then
         return Deny ("Only SENTINEL may control the QEMU VM boundary; " &
                      Agent_Class'Image (Class) & " is not authorized");
      end if;

      return Allow ("SENTINEL in QEMU_SANDBOX mode: VM boundary authorized");
   end Can_Run_QEMU;

   -- ── Gate 6: Can_Mutate_State ─────────────────────────────

   function Can_Mutate_State (
      Class : Agent_Class;
      Trust : Trust_Level
   ) return Contract_Outcome is
   begin
      if not Trust_At_Least (Trust, HIGH) then
         return Deny ("Trust " & Trust_Level'Image (Trust) &
                      " below HIGH: state mutation denied");
      end if;

      case Class is
         when SENTINEL  => return Allow ("SENTINEL may mutate SSM state");
         when BUILDER   => return Allow ("BUILDER may mutate SSM state (artifact creation)");
         when ORACLE    => return Deny  ("ORACLE is constitutionally read-only: mutation denied");
         when ARCHIVIST => return Deny  ("ARCHIVIST indexes but does not mutate state");
         when BERSERKER => return Deny  ("BERSERKER may not mutate state: isolation required");
      end case;
   end Can_Mutate_State;

end BOB_Contract;
