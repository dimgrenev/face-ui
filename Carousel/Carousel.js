import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * Carousel — multi-slide content display.
 *
 * Uses core carousel machine + Face UI primitives:
 * - Button for nav and indicators
 * - Card/Text for primitive slide content fallback
 */
import { forwardRef, Children, isValidElement } from 'react';
import { useMachine } from '../assets/adapters/react/use-machine';
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop';
import { carouselMachine, connectCarousel } from '../assets/machines/carousel.machine';
import { cn } from '../assets/utils';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Text } from '../Text/Text';
import { Icon } from '../Icon/Icon';
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Carousel = forwardRef(function Carousel(props, ref) {
    const { children, loop = false, autoPlay = false, autoPlayInterval = 3000, orientation = 'horizontal', slidesPerView = 1, index, defaultIndex = 0, onIndexChange, className, } = props;
    const providedSlides = Children.toArray(children);
    const slides = providedSlides.length > 0
        ? providedSlides
        : ['Build faster', 'Compose interfaces', 'Ship clean UI'];
    const total = slides.length;
    const clampedSlidesPerView = Math.max(1, Math.floor(slidesPerView));
    const machineIndex = useControllableMachineProp(typeof index === 'number' ? index : undefined, typeof defaultIndex === 'number' ? defaultIndex : 0);
    const { state, send } = useMachine(carouselMachine, {
        index: machineIndex,
        total,
        loop,
        autoPlay,
        autoPlayInterval,
        orientation,
        slidesPerView: clampedSlidesPerView,
        onIndexChange: onIndexChange !== null && onIndexChange !== void 0 ? onIndexChange : null,
    });
    const api = connectCarousel(state, send);
    const axis = orientation === 'vertical' ? 'Y' : 'X';
    const stepPercent = 100 / clampedSlidesPerView;
    const trackTransform = `translate${axis}(-${api.index * stepPercent}%)`;
    const rootStyle = {
        '--uf-carousel-slides-per-view': String(clampedSlidesPerView),
    };
    const renderSlide = (slide, slideIndex) => {
        if (isValidElement(slide))
            return slide;
        return (_jsx(Card, { membrane: false, className: "uf-carousel-slideCard", children: _jsxs("div", { className: "uf-carousel-slideCardBody", children: [_jsxs(Text, { as: "div", membrane: false, className: "uf-carousel-slideTitle", children: ["Slide ", slideIndex + 1] }), _jsx(Text, { as: "div", membrane: false, variant: "muted", children: String(slide) })] }) }));
    };
    return (_jsx("div", Object.assign({ ref: ref }, api.getRootProps(), { style: rootStyle, className: cn('uf-carousel', className), children: _jsx("span", { className: "uf-membrane uf-membrane--full", children: _jsxs("div", Object.assign({}, api.getViewportProps(), { children: [_jsx("div", { className: "uf-carousel-track", style: { transform: trackTransform }, children: slides.map((slide, i) => (_jsx("div", Object.assign({}, api.getSlideProps(i), { children: renderSlide(slide, i) }), i))) }), _jsxs("div", { className: "uf-carousel-controls", children: [_jsx(Button, Object.assign({}, api.getPrevProps(), { icon: _jsx(Icon, { name: "left", size: 16 }), iconOnly: true, fullWidth: false, variant: "ghost", className: "uf-carousel-nav uf-carousel-navPrev" })), _jsx("div", Object.assign({}, api.getIndicatorProps(), { className: "uf-carousel-indicators", children: slides.map((_, i) => (_jsx(Button, Object.assign({}, api.getIndicatorItemProps(i), { icon: _jsx("span", { className: "uf-carousel-indicatorDot", "aria-hidden": "true" }), iconOnly: true, fullWidth: false, variant: "ghost", className: "uf-carousel-indicatorButton" }), i))) })), _jsx(Button, Object.assign({}, api.getNextProps(), { icon: _jsx(Icon, { name: "right", size: 16 }), iconOnly: true, fullWidth: false, variant: "ghost", className: "uf-carousel-nav uf-carousel-navNext" }))] })] })) }) })));
});
