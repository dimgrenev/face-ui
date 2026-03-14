import { useCallback, useState } from 'react';
export function useControllableOpenState(open, defaultOpen = false, onOpenChange) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = open !== undefined;
    const value = isControlled ? open : uncontrolledOpen;
    const setValue = useCallback((nextOpen) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen);
        }
        onOpenChange === null || onOpenChange === void 0 ? void 0 : onOpenChange({ open: nextOpen });
    }, [isControlled, onOpenChange]);
    return [value, setValue];
}
