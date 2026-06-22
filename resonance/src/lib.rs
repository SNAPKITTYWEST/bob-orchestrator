// ResonanceGraph — sovereign DAG pipeline engine
// FCC-φ-∂-2026 · Ahmad Parr canonical
//
// Architecture mirrors the Metatron's Cube:
//   Concentric rings = execution layers (topo order)
//   Edges = directed dependencies
//   Purple singularity = MagmaCore (the sink)
//   METATRON node = recognition layer — injected into the cube

pub mod phi;
pub mod nodes;
pub mod graph;
pub mod pipeline;

pub use graph::{ResonanceGraph, GraphError};
pub use nodes::{SumerianQuantumSymbol, NodeKind, PipelineNode};
pub use pipeline::PipelineResult;
