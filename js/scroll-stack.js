/**
 * ScrollStack – GSAP + ScrollTrigger Implementation
 * ==================================================
 * Inspired by React Bits' ScrollStack component.
 *
 * Creates a card-stacking scroll effect using CSS sticky
 * positioning and GSAP ScrollTrigger for scale/blur animations.
 *
 * Usage:
 *   const stack = new ScrollStack('#container', { options });
 *   stack.destroy(); // cleanup on unmount
 *
 * Options (all optional):
 *   stackOffset        – px from viewport top where cards pin       (default: 80)
 *   itemStackDistance   – extra top offset per stacked card          (default: 14)
 *   itemDistance        – scroll distance (margin-bottom) per card   (default: 120)
 *   baseScale          – initial scale of each card                 (default: 1)
 *   itemScale          – minimum scale when fully stacked           (default: 0.92)
 *   blurAmount         – max blur for deeply-stacked items, in px   (default: 4)
 *   rotationAmount     – subtle rotation in degrees                 (default: 0)
 */

class ScrollStack {

  /** Default configuration */
  static defaults = {
    stackOffset: 80,
    itemStackDistance: 14,
    itemDistance: 120,
    baseScale: 1,
    itemScale: 0.92,
    blurAmount: 4,
    rotationAmount: 0,
  };

  /**
   * @param {string|HTMLElement} selector – CSS selector or DOM element
   * @param {Partial<typeof ScrollStack.defaults>} options
   */
  constructor(selector, options = {}) {
    this.container =
      typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;

    if (!this.container) {
      console.warn('[ScrollStack] Container not found:', selector);
      return;
    }

    this.options = { ...ScrollStack.defaults, ...options };
    this.items = [];
    this.ctx = null;

    this._init();
  }

  /* -------------------------------------------------------- */
  /*  Private – setup                                         */
  /* -------------------------------------------------------- */

  _init() {
    // Guard: GSAP and ScrollTrigger must be available
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('[ScrollStack] GSAP or ScrollTrigger not loaded.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    this.items = [...this.container.querySelectorAll('.scroll-stack-item')];
    if (!this.items.length) return;

    const {
      stackOffset,
      itemStackDistance,
      itemDistance,
      baseScale,
      itemScale,
      blurAmount,
      rotationAmount,
    } = this.options;

    const total = this.items.length;

    // Wrap all GSAP / ScrollTrigger work in a context → clean teardown
    this.ctx = gsap.context(() => {
      this.items.forEach((item, i) => {
        /* ---- Sticky position ---- */
        const topPos = stackOffset + i * itemStackDistance;

        item.style.position  = 'sticky';
        item.style.top       = topPos + 'px';
        item.style.zIndex    = i + 1;

        /* Margin-bottom = scroll distance between consecutive cards */
        item.style.marginBottom =
          i < total - 1 ? itemDistance + 'px' : '0';

        /* ---- Scale + Blur + Rotation animation ---- */
        /* When the *next* card scrolls in, the current card
           progressively scales down, blurs, and optionally rotates,
           giving the visual impression of being pushed back. */

        if (i < total - 1) {
          const depth    = total - 1 - i;           // layers above this card
          const maxDepth = Math.max(total - 1, 1);

          const scaleTarget =
            baseScale - depth * ((baseScale - itemScale) / maxDepth);

          const blurTarget = blurAmount * (depth / maxDepth);

          const rotTarget =
            rotationAmount > 0
              ? rotationAmount * (depth / maxDepth) * (i % 2 === 0 ? 1 : -1)
              : 0;

          gsap.fromTo(
            item,
            {
              scale: baseScale,
              filter: 'blur(0px)',
              rotation: 0,
            },
            {
              scale: scaleTarget,
              filter: 'blur(' + blurTarget + 'px)',
              rotation: rotTarget,
              ease: 'none',
              scrollTrigger: {
                trigger: this.items[i + 1],
                start: 'top bottom',
                end: 'top ' + (topPos + itemStackDistance + 60) + 'px',
                scrub: 0.5,
              },
            }
          );
        }
      });
    }, this.container);
  }

  /* -------------------------------------------------------- */
  /*  Public API                                              */
  /* -------------------------------------------------------- */

  /** Reverts all GSAP tweens and ScrollTriggers created by this instance. */
  destroy() {
    if (this.ctx) {
      this.ctx.revert();
      this.ctx = null;
    }
  }

  /** Re-initialise (e.g. after dynamic content changes). */
  refresh() {
    this.destroy();
    this._init();
  }
}
