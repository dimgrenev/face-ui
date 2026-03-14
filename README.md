# @userface/face-ui-react

Branded React component library for the Userface ecosystem.

## Install

```bash
npm install @userface/face-ui-react react react-dom
```

## Usage

```tsx
import '@userface/face-ui-react/assets/styles/index.css';
import { Button } from '@userface/face-ui-react/Button/Button';

export function Example() {
  return <Button text="Button" />;
}
```

`face.json` component contracts are published alongside component modules, and `uf.runtime` is exported as a runtime contract entrypoint for preview tooling.
