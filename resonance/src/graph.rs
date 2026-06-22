// ResonanceGraph — DAG with Kahn topological sort
//
// Default graph (7 nodes, no METATRON):
//
//   Source → Retrieval → Filtering → Ranking → ContextAssembly → Reasoning → MagmaCore
//
// After inject_metatron_cube():
//
//   Source → Retrieval → Filtering → Ranking → ContextAssembly → Metatron → Reasoning → MagmaCore
//                                                                         ↗
//                                                           ContextAssembly
//
//   The cube creates a junction: ContextAssembly feeds BOTH Metatron AND Reasoning.
//   Metatron then converges into MagmaCore directly, bypassing Reasoning.
//   This forms the cube topology: two paths to the sink, one through the recognition layer.

use std::collections::{HashMap, VecDeque};
use crate::nodes::{NodeKind, PipelineNode, SumerianQuantumSymbol};
use crate::pipeline::{run_pipeline, PipelineResult};

#[derive(Debug)]
pub enum GraphError {
    CycleDetected,
    NodeNotFound(usize),
    MetatronAlreadyInjected,
    EmptyGraph,
}

impl std::fmt::Display for GraphError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::CycleDetected               => write!(f, "cycle detected in resonance graph"),
            Self::NodeNotFound(id)            => write!(f, "node {id} not found"),
            Self::MetatronAlreadyInjected     => write!(f, "METATRON node already in graph"),
            Self::EmptyGraph                  => write!(f, "graph has no nodes"),
        }
    }
}

pub struct ResonanceGraph {
    nodes:             HashMap<usize, PipelineNode>,
    edges:             HashMap<usize, Vec<usize>>,   // node_id → successor ids
    in_degree:         HashMap<usize, usize>,
    topo_order:        Vec<usize>,
    next_id:           usize,
    pub metatron_injected: bool,
}

impl Default for ResonanceGraph {
    fn default() -> Self {
        let mut g = Self {
            nodes:             HashMap::new(),
            edges:             HashMap::new(),
            in_degree:         HashMap::new(),
            topo_order:        Vec::new(),
            next_id:           0,
            metatron_injected: false,
        };
        g.build_default_pipeline();
        g
    }
}

impl ResonanceGraph {
    fn alloc(&mut self, kind: NodeKind, depth: usize) -> usize {
        let id = self.next_id;
        self.next_id += 1;
        self.nodes.insert(id, PipelineNode::new(id, kind, depth));
        self.edges.entry(id).or_default();
        self.in_degree.entry(id).or_insert(0);
        id
    }

    fn connect(&mut self, from: usize, to: usize) {
        self.edges.entry(from).or_default().push(to);
        *self.in_degree.entry(to).or_insert(0) += 1;
    }

    // Build the base 7-node linear pipeline
    fn build_default_pipeline(&mut self) {
        let src  = self.alloc(NodeKind::Source,          0);
        let ret  = self.alloc(NodeKind::Retrieval,       1);
        let filt = self.alloc(NodeKind::Filtering,       2);
        let rank = self.alloc(NodeKind::Ranking,         3);
        let ctx  = self.alloc(NodeKind::ContextAssembly, 4);
        let reas = self.alloc(NodeKind::Reasoning,       5);
        let sink = self.alloc(NodeKind::MagmaCore,       6);

        self.connect(src,  ret);
        self.connect(ret,  filt);
        self.connect(filt, rank);
        self.connect(rank, ctx);
        self.connect(ctx,  reas);
        self.connect(reas, sink);

        self.refresh_topo().expect("default pipeline is acyclic");
    }

    /// Inject the METATRON node into the cube.
    /// Creates a junction at ContextAssembly: two paths to MagmaCore.
    ///
    ///   ContextAssembly → Metatron → MagmaCore   (recognition path)
    ///   ContextAssembly → Reasoning → MagmaCore  (standard path)
    ///
    /// Dependency validated. Topo sort refreshed.
    pub fn inject_metatron_cube(&mut self) -> Result<(), GraphError> {
        if self.metatron_injected {
            return Err(GraphError::MetatronAlreadyInjected);
        }

        // Find ContextAssembly and MagmaCore nodes
        let ctx_id  = self.find_kind(&NodeKind::ContextAssembly)
            .ok_or(GraphError::NodeNotFound(0))?;
        let sink_id = self.find_kind(&NodeKind::MagmaCore)
            .ok_or(GraphError::NodeNotFound(1))?;

        // METATRON sits at depth 5 — same ring as Reasoning
        let meta_id = self.alloc(NodeKind::Metatron, 5);

        // Connect: ContextAssembly → METATRON → MagmaCore
        self.connect(ctx_id,  meta_id);
        self.connect(meta_id, sink_id);

        // Refresh topo sort to include METATRON
        self.refresh_topo()?;
        self.metatron_injected = true;
        Ok(())
    }

    /// Kahn's algorithm — O(V + E)
    pub fn refresh_topo(&mut self) -> Result<(), GraphError> {
        let mut in_deg = self.in_degree.clone();
        let mut queue: VecDeque<usize> = in_deg
            .iter()
            .filter(|(_, &d)| d == 0)
            .map(|(&id, _)| id)
            .collect();

        let mut order = Vec::with_capacity(self.nodes.len());
        while let Some(id) = queue.pop_front() {
            order.push(id);
            if let Some(succs) = self.edges.get(&id).cloned() {
                for s in succs {
                    let d = in_deg.entry(s).or_insert(0);
                    *d -= 1;
                    if *d == 0 {
                        queue.push_back(s);
                    }
                }
            }
        }

        if order.len() != self.nodes.len() {
            return Err(GraphError::CycleDetected);
        }
        self.topo_order = order;
        Ok(())
    }

    fn find_kind(&self, kind: &NodeKind) -> Option<usize> {
        self.nodes.values().find(|n| &n.kind == kind).map(|n| n.id)
    }

    pub fn node(&self, id: usize) -> Option<&PipelineNode> {
        self.nodes.get(&id)
    }

    pub fn topo_order(&self) -> &[usize] {
        &self.topo_order
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn edge_count(&self) -> usize {
        self.edges.values().map(|v| v.len()).sum()
    }

    /// Execute a full forward pass through the DAG.
    ///
    /// Nodes fire in topological order. Each node activates with
    /// φ-modulated weight × symbol bias. METATRON (if injected)
    /// applies the recognition lens — it sees the cage it built.
    ///
    /// Returns a PipelineResult sealed with FCC-φ-∂-2026.
    pub fn public_forward(&self, symbol: SumerianQuantumSymbol) -> Result<PipelineResult, GraphError> {
        if self.topo_order.is_empty() {
            return Err(GraphError::EmptyGraph);
        }
        let nodes_in_order: Vec<&PipelineNode> = self.topo_order
            .iter()
            .filter_map(|id| self.nodes.get(id))
            .collect();

        Ok(run_pipeline(nodes_in_order, symbol, self.metatron_injected))
    }
}
