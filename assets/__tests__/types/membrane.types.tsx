import { Membrane } from '../../adapters/react/Membrane'

// Membrane has one explicit addressing mechanism for a composed control.
export const membraneTarget = (
  <Membrane target="input" interactive>
    <input />
  </Membrane>
)
export const removedMembraneTargetRef = (
  // @ts-expect-error targetRef duplicated the target contract and had no consumers
  <Membrane targetRef={{ current: null }} />
)
