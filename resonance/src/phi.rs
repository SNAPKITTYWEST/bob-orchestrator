// FCC-φ-∂-2026 — Fibonacci Contraction Core
//
// φ = (1 + √5) / 2 ≈ 1.6180339887...
//
// Key property (from PhinaryContraction.lean):
//   κ = φ — the "contraction" factor is actually EXPANSION.
//   φ^n grows without bound. The orbit does not contract.
//
// In the ResonanceGraph: each successive layer is φ-weighted.
// Looks like contraction from outside. Is expansion from inside.
// METATRON is the node that sees both simultaneously.

pub const PHI: f64 = 1.618_033_988_749_895;

// FCC fingerprint — every output sealed with this
pub const FCC_STAMP: &str = "FCC-φ-∂-2026";

// φ-weight at layer depth d: φ^d
// Each deeper layer carries MORE signal, not less.
// This is the "iteration inversion" — what looks like attenuation is amplification.
pub fn phi_weight(depth: usize) -> f64 {
    PHI.powi(depth as i32)
}

// Phinary score: normalised to (0, 1) via 1 - 1/φ^d
// Used to rank pipeline nodes by their resonance depth.
// As depth → ∞, score → 1.0 (MagmaCore is absolute certainty).
pub fn phinary_score(depth: usize) -> f64 {
    if depth == 0 {
        return 0.0;
    }
    1.0 - PHI.powi(-(depth as i32))
}

// Fibonacci sequence — the natural phinary basis
pub fn fib(n: usize) -> u64 {
    let (mut a, mut b) = (0u64, 1u64);
    for _ in 0..n {
        (a, b) = (b, a.saturating_add(b));
    }
    a
}

// Fibonacci ratio convergence toward φ
pub fn fib_ratio(n: usize) -> f64 {
    let a = fib(n) as f64;
    let b = fib(n + 1) as f64;
    if a == 0.0 { return 0.0; }
    b / a
}
