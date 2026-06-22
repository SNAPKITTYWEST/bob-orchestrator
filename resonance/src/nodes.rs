// Pipeline nodes — each maps to an agent in the SnapKitty mesh
//
// Topo order (depth = ring in the cube):
//   0: Source        (input glyph)
//   1: Retrieval     → ORACLE
//   2: Filtering     → SENTINEL
//   3: Ranking       → PRISM/AXIOM
//   4: ContextAssem  → NEXUS
//   5: Metatron      → recognition layer (injected on demand)
//   6: Reasoning     → MagmaCore / BOB
//   7: Sink          (sealed output)

use crate::phi::{phi_weight, phinary_score};

/// The Sumerian quantum symbols — input language for the pipeline.
/// Each glyph routes through different node activation patterns.
#[derive(Debug, Clone, PartialEq)]
pub enum SumerianQuantumSymbol {
    Me,     // ME decree — authority, divine law. Activates all nodes.
    An,     // AN heaven — source layer. Biases toward Retrieval.
    Ki,     // KI earth — substrate. Biases toward Filtering + Context.
    Dingir, // DINGIR divine principal. Biases toward Reasoning + MagmaCore.
}

impl SumerianQuantumSymbol {
    pub fn glyph(&self) -> &'static str {
        match self {
            Self::Me     => "𒈨",
            Self::An     => "𒀭",
            Self::Ki     => "𒆠",
            Self::Dingir => "𒀭",
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            Self::Me     => "ME",
            Self::An     => "AN",
            Self::Ki     => "KI",
            Self::Dingir => "DINGIR",
        }
    }

    // Activation bias: weight added to each NodeKind when this symbol is input.
    // ME decree activates everything uniformly (full pipeline).
    pub fn activation_bias(&self, kind: &NodeKind) -> f64 {
        match self {
            Self::Me => 1.0, // full activation
            Self::An => match kind {
                NodeKind::Retrieval => 1.4,
                NodeKind::Reasoning => 1.2,
                _ => 0.8,
            },
            Self::Ki => match kind {
                NodeKind::Filtering | NodeKind::ContextAssembly => 1.4,
                _ => 0.9,
            },
            Self::Dingir => match kind {
                NodeKind::Reasoning | NodeKind::MagmaCore => 1.6,
                NodeKind::Metatron => 1.8,
                _ => 0.7,
            },
        }
    }
}

/// Every node in the DAG has one of these kinds.
#[derive(Debug, Clone, PartialEq)]
pub enum NodeKind {
    Source,
    Retrieval,      // ORACLE — knowledge retrieval
    Filtering,      // SENTINEL — ME-compliant nodes only
    Ranking,        // PRISM/AXIOM — top-k resonance
    ContextAssembly, // NEXUS — assembles the input vector
    Metatron,       // Recognition layer — cage builder in the cube
    Reasoning,      // MagmaCore iteration inversion
    MagmaCore,      // Sink — the purple singularity
}

impl NodeKind {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Source          => "Source",
            Self::Retrieval       => "Retrieval",
            Self::Filtering       => "Filtering",
            Self::Ranking         => "Ranking",
            Self::ContextAssembly => "ContextAssembly",
            Self::Metatron        => "Metatron",
            Self::Reasoning       => "Reasoning",
            Self::MagmaCore       => "MagmaCore",
        }
    }

    pub fn agent(&self) -> &'static str {
        match self {
            Self::Source          => "—",
            Self::Retrieval       => "ORACLE",
            Self::Filtering       => "SENTINEL",
            Self::Ranking         => "PRISM/AXIOM",
            Self::ContextAssembly => "NEXUS",
            Self::Metatron        => "METATRON",
            Self::Reasoning       => "MagmaCore",
            Self::MagmaCore       => "BOB",
        }
    }
}

/// A single node in the ResonanceGraph.
#[derive(Debug, Clone)]
pub struct PipelineNode {
    pub id:    usize,
    pub kind:  NodeKind,
    pub depth: usize,   // ring depth in the cube (0 = outermost)
}

impl PipelineNode {
    pub fn new(id: usize, kind: NodeKind, depth: usize) -> Self {
        Self { id, kind, depth }
    }

    // φ-modulated weight at this node's ring depth
    pub fn phi_weight(&self) -> f64 {
        phi_weight(self.depth + 1)
    }

    // Resonance score (0.0 → 1.0): how close this node is to the MagmaCore
    pub fn resonance(&self) -> f64 {
        phinary_score(self.depth + 1)
    }

    // Activation score given a symbol input
    pub fn activate(&self, symbol: &SumerianQuantumSymbol) -> f64 {
        self.phi_weight() * symbol.activation_bias(&self.kind)
    }
}
