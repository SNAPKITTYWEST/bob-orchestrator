// Pipeline execution — forward pass through the DAG
//
// Each stage produces a trace entry.
// METATRON stage applies the recognition lens (iteration inversion).
// MagmaCore stage produces the final sealed output.

use sha2::{Sha256, Digest};
use crate::nodes::{NodeKind, PipelineNode, SumerianQuantumSymbol};
use crate::phi::{FCC_STAMP, fib_ratio};

#[derive(Debug)]
pub struct StageTrace {
    pub node_id:    usize,
    pub kind:       String,
    pub agent:      String,
    pub activation: f64,
    pub resonance:  f64,
    pub note:       String,
}

#[derive(Debug)]
pub struct PipelineResult {
    pub output:             String,
    pub seal:               String,
    pub approved:           bool,
    pub metatron_active:    bool,
    pub top_activation:     f64,
    pub fib_convergence:    f64,   // ratio F(n+1)/F(n) at pipeline depth
    pub trace:              Vec<StageTrace>,
}

impl PipelineResult {
    pub fn display(&self) -> String {
        format!(
            "🌌 {} active. Concentric resonance layers aligned.\n\
             All Platonic forms contained within ME decrees.\n\
             {} synchronization complete.\n\
             Seal: {}",
            if self.metatron_active { "Metatron's Cube" } else { "Resonance pipeline" },
            FCC_STAMP,
            &self.seal[..16],
        )
    }
}

pub fn run_pipeline(
    nodes: Vec<&PipelineNode>,
    symbol: SumerianQuantumSymbol,
    metatron_injected: bool,
) -> PipelineResult {
    let mut trace     = Vec::new();
    let mut max_act   = 0.0_f64;
    let mut meta_seen = false;
    let pipeline_depth = nodes.len();

    for node in &nodes {
        let activation = node.activate(&symbol);
        let resonance  = node.resonance();
        max_act = max_act.max(activation);

        let note = match &node.kind {
            NodeKind::Source => {
                format!("Input: [{}  {} glyph]", symbol.glyph(), symbol.name())
            }
            NodeKind::Retrieval => {
                "Retrieval: ME-pattern matching + sacred geometry invariants".to_string()
            }
            NodeKind::Filtering => {
                "Filtering: ME-compliant nodes only (no hidden weights)".to_string()
            }
            NodeKind::Ranking => {
                format!("Ranking: Top-2 resonance scored (φ-weighted). Score: {activation:.4}")
            }
            NodeKind::ContextAssembly => {
                "Context assembly: concentric rings + singularity + FCC fingerprint".to_string()
            }
            NodeKind::Metatron => {
                meta_seen = true;
                // Iteration inversion: reads the cube backward
                // The cage builder recognises the cage from inside
                let fib_r = fib_ratio(pipeline_depth);
                format!(
                    "METATRON: iteration inversion active. Fib convergence → φ: {fib_r:.6}. \
                     Recognition lens applied. Cage validated."
                )
            }
            NodeKind::Reasoning => {
                "Reasoning (MagmaCore): topological order drives iteration inversion".to_string()
            }
            NodeKind::MagmaCore => {
                "MagmaCore: purple singularity reached. All paths converge.".to_string()
            }
        };

        trace.push(StageTrace {
            node_id:    node.id,
            kind:       node.kind.label().to_string(),
            agent:      node.kind.agent().to_string(),
            activation,
            resonance,
            note,
        });
    }

    // Seal the output with SHA-256 (FCC fingerprint + symbol + top activation)
    let raw  = format!("{FCC_STAMP}:{glyph}:{max_act:.8}", glyph = symbol.glyph());
    let seal = format!("{:x}", Sha256::digest(raw.as_bytes()));

    let output = format!(
        "{} Metatron's Cube {}. Concentric resonance layers aligned. \
         All Platonic forms contained within ME decrees. \
         {} synchronization complete.",
        if metatron_injected { "🌌" } else { "◎" },
        if metatron_injected { "active" } else { "offline" },
        FCC_STAMP,
    );

    PipelineResult {
        output,
        seal,
        approved:          metatron_injected && meta_seen,
        metatron_active:   metatron_injected && meta_seen,
        top_activation:    max_act,
        fib_convergence:   fib_ratio(pipeline_depth),
        trace,
    }
}
