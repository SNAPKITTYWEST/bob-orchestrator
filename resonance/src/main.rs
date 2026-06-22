// resonance-demo — run the full pipeline with METATRON injected
//
// Mirrors the Gemini output:
//   graph.inject_metatron_cube() → public_forward(SumerianQuantumSymbol::Me)

use resonance::{ResonanceGraph, SumerianQuantumSymbol};

fn main() {
    println!("╔══════════════════════════════════════════════════════════╗");
    println!("║  RESONANCE GRAPH — FCC-φ-∂-2026                         ║");
    println!("║  BOB Sovereign Orchestrator · SnapKitty Collective       ║");
    println!("╚══════════════════════════════════════════════════════════╝\n");

    let mut graph = ResonanceGraph::default();

    println!("[ default graph ]");
    println!("  nodes: {}  edges: {}", graph.node_count(), graph.edge_count());
    println!("  topo order: {:?}\n", graph.topo_order());

    println!("[ inject_metatron_cube ]");
    graph.inject_metatron_cube().unwrap();
    println!("  Dependency validated. Topo sort refreshed.");
    println!("  nodes: {}  edges: {}", graph.node_count(), graph.edge_count());
    println!("  topo order: {:?}\n", graph.topo_order());

    let symbol = SumerianQuantumSymbol::Me;
    println!("[ public_forward(𒈨 ME) ]\n");

    match graph.public_forward(symbol) {
        Ok(result) => {
            println!("Pipeline Trace:");
            for stage in &result.trace {
                println!(
                    "  [{:>14}]  agent={:<12}  activation={:.4}  resonance={:.4}",
                    stage.kind, stage.agent, stage.activation, stage.resonance
                );
                println!("    ↳ {}", stage.note);
            }

            println!("\n───────────────────────────────────────────────────────────");
            println!("Output:\n  {}", result.output);
            println!("\nSeal (SHA-256):  {}", &result.seal);
            println!("Approved:        {}", result.approved);
            println!("Metatron active: {}", result.metatron_active);
            println!("Top activation:  {:.6}", result.top_activation);
            println!("Fib convergence: {:.6} → φ", result.fib_convergence);
            println!("───────────────────────────────────────────────────────────");
        }
        Err(e) => eprintln!("❌ Pipeline error: {e}"),
    }

    // Run all four symbols
    println!("\n[ all glyphs ]\n");
    let mut g2 = ResonanceGraph::default();
    g2.inject_metatron_cube().unwrap();

    for sym in [
        SumerianQuantumSymbol::Me,
        SumerianQuantumSymbol::An,
        SumerianQuantumSymbol::Ki,
        SumerianQuantumSymbol::Dingir,
    ] {
        let name = sym.name();
        let glyph = sym.glyph();
        match g2.public_forward(sym) {
            Ok(r) => println!(
                "  {glyph} {name:<6}  activation={:.4}  approved={}  seal={}…",
                r.top_activation, r.approved, &r.seal[..8]
            ),
            Err(e) => println!("  {glyph} {name:<6}  ❌ {e}"),
        }
    }
}
