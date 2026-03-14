import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Media — unified image, video, and audio renderer.
 *
 * `<Media type="image" src="/photo.jpg" alt="A photo" />`
 * `<Media type="video" src="/clip.mp4" controls />`
 * `<Media type="audio" src="/track.mp3" controls />`
 */
import { forwardRef, useState } from 'react';
import { createAnatomy } from '../assets/anatomy';
import { cn } from '../assets/utils';
// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
export const mediaAnatomy = createAnatomy('media').parts('root', 'element', 'fallback');
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const Media = forwardRef(function Media(props, ref) {
    const { type = 'image', src, alt = '', variant = 'default', lazy = false, loading, decoding, poster, controls, autoPlay, loop, muted, width, height, objectFit, fallback, onError, onLoad, className, id, role, title, tabIndex, style, } = props;
    const [hasError, setHasError] = useState(false);
    const handleError = () => {
        setHasError(true);
        onError === null || onError === void 0 ? void 0 : onError();
    };
    const sizeStyle = Object.assign(Object.assign({}, (objectFit ? { objectFit } : {})), (type === 'image'
        ? {
            width: '100%',
            height: height != null ? '100%' : 'auto',
            display: 'block',
        }
        : {}));
    const wrapperStyle = Object.assign(Object.assign(Object.assign({}, (style || {})), (width != null ? { width } : {})), (height != null ? { height } : {}));
    const renderElement = () => {
        var _a, _b;
        if (hasError && fallback) {
            return (_jsx("div", Object.assign({}, mediaAnatomy.getPartAttrs('fallback'), { children: fallback })));
        }
        switch (type) {
            case 'video':
                return (_jsx("video", Object.assign({}, mediaAnatomy.getPartAttrs('element'), { src: src, poster: poster, controls: controls, autoPlay: autoPlay, loop: loop, muted: muted, style: sizeStyle, onError: handleError, onLoadedData: onLoad, title: title })));
            case 'audio':
                return (_jsx("audio", Object.assign({}, mediaAnatomy.getPartAttrs('element'), { src: src, controls: controls, autoPlay: autoPlay, loop: loop, muted: muted, onError: handleError, onLoadedData: onLoad, title: title })));
            case 'image':
            default:
                return (_jsx("img", Object.assign({}, mediaAnatomy.getPartAttrs('element'), { src: src, alt: alt, style: sizeStyle, onError: handleError, onLoad: onLoad, loading: (_a = loading) !== null && _a !== void 0 ? _a : (lazy ? 'lazy' : undefined), decoding: (_b = decoding) !== null && _b !== void 0 ? _b : 'async', className: cn('uf-image', `uf-image--${variant}`), title: title })));
        }
    };
    return (_jsx("div", Object.assign({ ref: ref }, mediaAnatomy.getPartAttrs('root'), { "data-type": type, "data-error": hasError || undefined, className: cn('uf-media', className), id: id, role: role, title: title, tabIndex: tabIndex, style: wrapperStyle, children: renderElement() })));
});
