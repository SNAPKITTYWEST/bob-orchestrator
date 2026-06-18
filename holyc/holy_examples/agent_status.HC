// Agent Status Report
// Queries current agent, verifies trust, seals report into WORM.

Print("AGENT STATUS REPORT\n");
Print("-------------------\n");

AgentStatus();

U64 read_ok  = TrustCheck("read");
U64 write_ok = TrustCheck("write");
U64 seal_ok  = TrustCheck("seal");

Print("CAPABILITIES:\n");

if(read_ok) {
  Print("  [OK]  read\n");
}

if(write_ok) {
  Print("  [OK]  write\n");
}

if(seal_ok) {
  Print("  [OK]  seal\n");
  WormSeal("AGENT_STATUS_OK");
  Print("STATUS SEALED INTO WORM\n");
}

Print("REPORT COMPLETE\n");
