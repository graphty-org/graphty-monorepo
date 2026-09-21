# The spring-electrical preset integrates like ngraph: semi-implicit Euler with a unit speed clamp

Date: 2026-09-20
Decided by: the owner
Changes: `design/webgpu/webgpu-acceleration-plan.md` 7.20 line 2463, which calls the preset's
integrator "a `velocityVerlet` integrate variant with a 12n velocity buffer". The line is not
edited; this record replaces the integrator named there and keeps the velocity buffer, the option
names, the defaults and the force laws of that paragraph as they are.

## The decision

The spring-electrical integrate branch of the shared integrate kernel (`APPLY = 2` in
`webgpu-graph-algorithms/src/wgsl/fa2-integrate.wgsl.ts`) is ngraph's step, in ngraph's order:
subtract the drag `dragCoefficient * v` from the accumulated force, add `(timeStep / mass) * F` to
the velocity, clamp the velocity to unit speed when it exceeds 1, move the node by `timeStep * v`,
and skip a pinned node entirely. The velocity persists per node in the buffer slot the
ForceAtlas2 model uses for its previous force; the spring-electrical model names that buffer
`velocity` and binds it there, and compiles the kernel with the ForceAtlas2 swing text disabled so
nothing else writes the slot. The kinetic energy `0.5 * m * |v|^2` is summed over the free nodes in
the same pass and reported through `SpringElectricalStats.kineticEnergy`. Nothing else moves: the
Coulomb repulsion `gravity * m1 * m2 / r^3` along the pair vector, the Hooke spring
`springCoefficient * (r - springLength) / r` along the edge, the mass `1 + degree / 3`, and
ngraph's defaults are unchanged, and the exact-tier repulsion kernel carries the law as an
override the way the FR law rides beside it.

## Why

The G5 gate compares the preset against ngraph itself: design 13 row P5 asks that the preset
"settles within 1,000 steps on the 150-node / 250-edge 'Performance/Large Graph' story graph to
an edge-length distribution within 25% of ngraph's (ngraph run on the CPU in the test)". ngraph
does not integrate by velocity Verlet. Its generated integrator
(`ngraph.forcelayout/lib/codeGenerators/generateIntegrator.js`) is, per body and per step,
`velocity += (timeStep / mass) * force`, then `if (|velocity| > 1) velocity /= |velocity|`, then
`pos += timeStep * velocity`, with `if (body.isPinned) continue` above it. That is semi-implicit
Euler with a clamp. A Verlet step uses the force at two times and no clamp; its trajectory from
the same start under the same forces is a different trajectory, and the one-iteration oracle
comparison the phase runs against ngraph (`test/oracle/spring-electrical-ngraph.test.ts`, ngraph
with `theta: 0` so its tree is exact) would have nothing to agree with.

The clamp is not incidental. ngraph's default Coulomb constant is -12 on bodies of mass about 1
that start within a unit of each other; the first step's force on a fresh graph is large, and
the clamp is what stops the velocity, and with it the layout, from exploding on step one. The
design's own sentence names "ngraph's option names and defaults" and the integrator in the same
breath; taking ngraph's -12 without ngraph's clamp would not be ngraph's preset.

## What we are giving up, and why it is acceptable

The rejected argument was to implement a velocity-Verlet step. Design 7.20 line 2463 reads:

> radial law) and a `velocityVerlet` integrate variant with a 12n velocity

It is right that velocity Verlet is the better integrator for a physical simulation: it is
symplectic, second-order in the time step, and conserves energy over long runs where Euler
drifts. For a preset that is judged as a physical system, Verlet is the correct choice and this
record does not dispute it.

It is acceptable because the preset is not judged as a physical system; it is judged as a
stand-in for ngraph, by a gate that measures its distance from ngraph. Drag at 0.9 removes most
of the velocity every step, so the energy drift that distinguishes Euler from Verlet never
accumulates, and the 12n velocity buffer the design asked for exists either way. Should a Verlet
variant ever be wanted, it is one more value of the same `APPLY` override in the same kernel,
reading the same velocity buffer; nothing in the binding layout or the model interface would
change.

## What would reverse this

One condition, counted:

- The design's own comparison target for the preset changes from ngraph to a velocity-Verlet
  reference (a named implementation the gate compares against instead of `ngraph.forcelayout`).
  Then the integrator follows the target, as a new `APPLY` value with its own oracle stage,
  parity row and sabotage rows, and this record is superseded by the one that names the new
  target.
