import { useEffect, useRef } from 'react';
export function useControllableMachineProp(controlledValue, initialValue) {
    const didMountRef = useRef(false);
    const initialRef = useRef(initialValue);
    useEffect(() => {
        didMountRef.current = true;
    }, []);
    if (controlledValue !== undefined)
        return controlledValue;
    return didMountRef.current ? undefined : initialRef.current;
}
