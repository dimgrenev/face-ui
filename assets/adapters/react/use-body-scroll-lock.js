import { useEffect } from 'react';
export function useBodyScrollLock(locked) {
    useEffect(() => {
        if (!locked || typeof document === 'undefined')
            return;
        const bodyStyle = document.body.style;
        const previousOverflow = bodyStyle.overflow;
        const previousPaddingRight = bodyStyle.paddingRight;
        const previousTouchAction = bodyStyle.touchAction;
        const scrollbarCompensation = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
        bodyStyle.overflow = 'hidden';
        bodyStyle.touchAction = 'none';
        if (scrollbarCompensation > 0) {
            bodyStyle.paddingRight = `${scrollbarCompensation}px`;
        }
        return () => {
            bodyStyle.overflow = previousOverflow;
            bodyStyle.paddingRight = previousPaddingRight;
            bodyStyle.touchAction = previousTouchAction;
        };
    }, [locked]);
}
