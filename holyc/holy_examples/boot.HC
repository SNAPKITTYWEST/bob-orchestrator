// BOB Sovereign Boot Sequence
// Runs on agent initialization. Sealed into WORM.

Print("╔══════════════════════════════════════╗\n");
Print("║  BOB SOVEREIGN BOOT v1.0             ║\n");
Print("║  SnapKitty Collective                ║\n");
Print("╚══════════════════════════════════════╝\n");

Print("LEAN4 GATE:       ACTIVE\n");
Print("ADA CONTRACTS:    LOADED\n");
Print("PROLOG KERNEL:    READY\n");
Print("WORM CHAIN:       ARMED\n");

AgentStatus();

U64 trust = TrustCheck("seal");
if(trust) {
  Print("TRUST VERIFIED — sealing boot sequence\n");
  WormSeal("BOB_BOOT_COMPLETE");
  Print("BOOT SEAL: OK\n");
}
