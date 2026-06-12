/**
 * Pure field rotation — SPATIAL.md §3.1. The 3×3 matrix acts on the (X, Y, Z) channel triple
 * (W is rotation-invariant). Row-major: m[r][c], applied as X' = m00·X + m01·Y + m02·Z, etc.
 * Composition R = Rz(yaw) · Ry(pitch) · Rx(roll). Angles in radians.
 */

export type Mat3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
]

export const IDENTITY: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

function mul(a: Mat3, b: Mat3): Mat3 {
  const out: Mat3 = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      out[r]![c] = a[r]![0]! * b[0]![c]! + a[r]![1]! * b[1]![c]! + a[r]![2]! * b[2]![c]!
  return out
}

/** Acts on column vectors (X, Y, Z)ᵀ in the AmbiX frame (+x fwd, +y left, +z up). */
export function rotationMatrix(yaw: number, pitch: number, roll = 0): Mat3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  const cr = Math.cos(roll), sr = Math.sin(roll)
  const Rz: Mat3 = [
    [cy, -sy, 0],
    [sy, cy, 0],
    [0, 0, 1],
  ]
  const Ry: Mat3 = [
    [cp, 0, sp],
    [0, 1, 0],
    [-sp, 0, cp],
  ]
  const Rx: Mat3 = [
    [1, 0, 0],
    [0, cr, -sr],
    [0, sr, cr],
  ]
  return mul(mul(Rz, Ry), Rx)
}

export function applyMat3(m: Mat3, v: [number, number, number]): [number, number, number] {
  return [
    m[0]![0]! * v[0] + m[0]![1]! * v[1] + m[0]![2]! * v[2],
    m[1]![0]! * v[0] + m[1]![1]! * v[1] + m[1]![2]! * v[2],
    m[2]![0]! * v[0] + m[2]![1]! * v[1] + m[2]![2]! * v[2],
  ]
}

/**
 * Look semantics (SPATIAL.md §3.1): the field rotation is the INVERSE of the head's intrinsic
 * yaw-then-pitch rotation. Looking right by α (head Rz(−α)) and up by β (head Ry(−β)) gives
 * field R = (Rz(−α)·Ry(−β))⁻¹ = Ry(β)·Rz(α). The sign/composition decision lives here and
 * only here, pinned by tests: look right → right-side sources arrive frontward; look up →
 * overhead sources arrive frontward.
 */
export function lookMatrix(yawRight: number, pitchUp: number): Mat3 {
  const pitch = rotationMatrix(0, pitchUp, 0) // = Ry(pitchUp)
  const yaw = rotationMatrix(yawRight, 0, 0) //  = Rz(yawRight)
  return mul(pitch, yaw)
}
