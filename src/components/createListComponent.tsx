// @flow

import memoizeOne from 'memoize-one';
import {
  defineComponent,
  h as createElement,
  onMounted,
  onUnmounted,
  reactive,
  VNode, watch,
  watchEffect
} from 'vue';
import {cancelTimeout, requestTimeout} from './timer';
import { getScrollbarSize, getRTLOffsetType } from './domHelpers';

import type {TimeoutID} from './timer';
import {CSSDirection} from "./createGridComponent";

export type ScrollToAlign = 'auto' | 'smart' | 'center' | 'start' | 'end';

type itemSize = number | ((index: number) => number);
// TODO Deprecate directions "horizontal" and "vertical"
type Direction = 'ltr' | 'rtl' | 'horizontal' | 'vertical';
type Layout = 'horizontal' | 'vertical';

type RenderComponentProps<T> = {
  data: T,
  index: number,
  isScrolling?: boolean,
  style: Object,
};
type RenderComponent<T> = any;

export type ScrollDirection = 'forward' | 'backward';

type onItemsRenderedCallback = ({
                                  overscanStartIndex,
                                  overscanStopIndex,
                                  visibleStartIndex,
                                  visibleStopIndex,
                                }: {
  overscanStartIndex: number,
  overscanStopIndex: number,
  visibleStartIndex: number,
  visibleStopIndex: number,
}) => void;
type onScrollCallback = ({
                           scrollDirection,
                           scrollOffset,
                           scrollUpdateWasRequested,
                         }: {
  scrollDirection: ScrollDirection,
  scrollOffset: number,
  scrollUpdateWasRequested: boolean,
}) => void;

type ScrollEvent = any;
type ItemStyleCache = { [index: number]: Object };

type OuterProps = {
  children: VNode,
  className: string | void,
  onScroll: (e: ScrollEvent) => void
  style: {
    [key: string]: any,
  },
};

type InnerProps = {
  children: VNode,
  style: {
    [key: string]: any,
  },
};

export type Props<T> = {
  children: RenderComponent<T>,
  className?: string,
  direction: Direction | CSSDirection,
  height: number | string,
  initialScrollOffset?: number,
  innerRef?: any,
  innerElementType?: string | any,
  innerTagName?: string, // deprecated
  itemCount: number,
  itemData: T,
  itemKey?: (index: number, data: T) => any,
  itemSize: itemSize,
  layout: Layout,
  onItemsRendered?: onItemsRenderedCallback,
  onScroll?: onScrollCallback,
  outerRef?: any,
  outerElementType?: string | any,
  outerTagName?: string, // deprecated
  overscanCount: number,
  style?: Object,
  useIsScrolling: boolean,
  width: number | string,
};

type State = {
  instance: any,
  isScrolling: boolean,
  scrollDirection: ScrollDirection,
  scrollOffset: number,
  scrollUpdateWasRequested: boolean,
};

type GetItemOffset = (
  props: Props<any>,
  index: number,
  instanceProps: any
) => number;
type GetItemSize = (
  props: Props<any>,
  index: number,
  instanceProps: any
) => number;
type GetEstimatedTotalSize = (props: Props<any>, instanceProps: any) => number;
type GetOffsetForIndexAndAlignment = (
  props: Props<any>,
  index: number,
  align: ScrollToAlign,
  scrollOffset: number,
  instanceProps: any,
  scrollbarSize: number
) => number;
type GetStartIndexForOffset = (
  props: Props<any>,
  offset: number,
  instanceProps: any
) => number;
type GetStopIndexForStartIndex = (
  props: Props<any>,
  startIndex: number,
  scrollOffset: number,
  instanceProps: any
) => number;
type InitInstanceProps = (props: Props<any>, instance: any) => any;
type ValidateProps = (props: Props<any>) => void;

const IS_SCROLLING_DEBOUNCE_INTERVAL = 150;

const defaultItemKey = (index: number, data: any) => index;

// In DEV mode, this Set helps us only log a warning once per component instance.
// This avoids spamming the console every time a render happens.
let devWarningsDirection: any = null;
let devWarningsTagName: any = null;

// import.meta.env.DEV
if (false) {
  if (typeof window !== 'undefined' && typeof window.WeakSet !== 'undefined') {
    devWarningsDirection = new WeakSet();
    devWarningsTagName = new WeakSet();
  }
}

export default function createListComponent({
                                              getItemOffset,
                                              getEstimatedTotalSize,
                                              getItemSize,
                                              getOffsetForIndexAndAlignment,
                                              getStartIndexForOffset,
                                              getStopIndexForStartIndex,
                                              initInstanceProps,
                                              shouldResetStyleCacheOnItemSizeChange,
                                              validateProps,
                                            }: {
  getItemOffset: GetItemOffset,
  getEstimatedTotalSize: GetEstimatedTotalSize,
  getItemSize: GetItemSize,
  getOffsetForIndexAndAlignment: GetOffsetForIndexAndAlignment,
  getStartIndexForOffset: GetStartIndexForOffset,
  getStopIndexForStartIndex: GetStopIndexForStartIndex,
  initInstanceProps: InitInstanceProps,
  shouldResetStyleCacheOnItemSizeChange: boolean,
  validateProps: ValidateProps,
}) {
  return defineComponent({
    props: {
      className: String,
      height: Number,
      initialScrollOffset: Number,
      innerRef: Object,
      innerElementType: [String, Object, Function],
      innerTagName: String,
      itemCount: Number,
      itemKey: Function,
      itemSize: [Number, Function],
      onItemsRendered: Function,
      onScroll: Function,
      outerRef: [Object, Function],
      outerElementType: [String, Object, Function],
      outerTagName: String,
      style: [Object],
      width: [Number, String],
      direction: {
        type: String,
        default: 'ltr',
      },
      itemData: {
        type: [Object, Array],
        default: undefined,
      },
      layout: {
        type: String,
        default: 'vertical',
      },
      overscanCount: {
        type: Number,
        default: 2
      },
      useIsScrolling: {
        type: Boolean,
        default: false,
      },
    },
    setup: (props, {slots, expose}) => {
      let _instanceProps: any = initInstanceProps(props as any, {});
      let _outerRef: HTMLDivElement;
      let _resetIsScrollingTimeoutId: TimeoutID | null = null;

      const state = reactive<State>({
        instance: {},
        isScrolling: false,
        scrollDirection: 'forward',
        scrollOffset:
          typeof props.initialScrollOffset === 'number'
            ? props.initialScrollOffset
            : 0,
        scrollUpdateWasRequested: false,
      })


      let _callOnItemsRendered: (
        overscanStartIndex: number,
        overscanStopIndex: number,
        visibleStartIndex: number,
        visibleStopIndex: number
      ) => void;
      _callOnItemsRendered = memoizeOne(
        (
          overscanStartIndex: number,
          overscanStopIndex: number,
          visibleStartIndex: number,
          visibleStopIndex: number
        ) =>
          props.onItemsRendered && props.onItemsRendered({
            overscanStartIndex,
            overscanStopIndex,
            visibleStartIndex,
            visibleStopIndex,
          })
      );

      let _callOnScroll: (
        scrollDirection: ScrollDirection,
        scrollOffset: number,
        scrollUpdateWasRequested: boolean
      ) => void;
      _callOnScroll = memoizeOne(
        (
          scrollDirection: ScrollDirection,
          scrollOffset: number,
          scrollUpdateWasRequested: boolean
        ) =>
          props.onScroll && props.onScroll({
            scrollDirection,
            scrollOffset,
            scrollUpdateWasRequested,
          })
      );

      function _callPropsCallbacks() {
        if (typeof props.onItemsRendered === 'function') {
          const {itemCount} = props;
          if (itemCount && itemCount > 0) {
            const [
              overscanStartIndex,
              overscanStopIndex,
              visibleStartIndex,
              visibleStopIndex,
            ] = _getRangeToRender();
            _callOnItemsRendered(
              overscanStartIndex,
              overscanStopIndex,
              visibleStartIndex,
              visibleStopIndex
            );
          }
        }

        if (typeof props.onScroll === 'function') {
          const {
            scrollDirection,
            scrollOffset,
            scrollUpdateWasRequested,
          } = state;
          _callOnScroll(
            scrollDirection,
            scrollOffset,
            scrollUpdateWasRequested
          );
        }
      }

      // Lazily create and cache item styles while scrolling,
      // So that pure component sCU will prevent re-renders.
      // We maintain this cache, and pass a style prop rather than index,
      // So that List can clear cached styles and force item re-render if necessary.
      const _getItemStyle = (index: number): Object => {
        const {direction, itemSize, layout} = props;

        const itemStyleCache = _getItemStyleCache(
          shouldResetStyleCacheOnItemSizeChange && itemSize,
          shouldResetStyleCacheOnItemSizeChange && layout,
          shouldResetStyleCacheOnItemSizeChange && direction
        );

        let style;
        if (itemStyleCache.hasOwnProperty(index)) {
          style = itemStyleCache[index];
        } else {
          const offset = getItemOffset(props as any, index, _instanceProps);
          const size = getItemSize(props as any, index, _instanceProps);

          // TODO Deprecate direction "horizontal"
          const isHorizontal =
            direction === 'horizontal' || layout === 'horizontal';

          const isRtl = direction === 'rtl';
          const offsetHorizontal = isHorizontal ? offset : 0;
          itemStyleCache[index] = style = {
            position: 'absolute',
            left: isRtl ? undefined : offsetHorizontal + 'px',
            right: isRtl ? offsetHorizontal + 'px' : undefined,
            top: !isHorizontal ? offset + 'px' : 0,
            height: !isHorizontal ? size + 'px' : '100%',
            width: isHorizontal ? size + 'px' : '100%',
          };
        }

        return style;
      };

      const _getItemStyleCache: (_: any, __: any, ___: any) => ItemStyleCache = memoizeOne((_: any, __: any, ___: any) => ({}));

      function _getRangeToRender(): [number, number, number, number] {
        const {itemCount, overscanCount} = props;
        const {isScrolling, scrollDirection, scrollOffset} = state;

        if (itemCount === 0) {
          return [0, 0, 0, 0];
        }

        const startIndex = getStartIndexForOffset(
          props as any,
          scrollOffset,
          _instanceProps
        );
        const stopIndex = getStopIndexForStartIndex(
          props as any,
          startIndex,
          scrollOffset,
          _instanceProps
        );

        // Overscan by one item in each direction so that tab/focus works.
        // If there isn't at least one extra item, tab loops back around.
        const overscanBackward =
          !isScrolling || scrollDirection === 'backward'
            ? Math.max(1, overscanCount)
            : 1;
        const overscanForward =
          !isScrolling || scrollDirection === 'forward'
            ? Math.max(1, overscanCount)
            : 1;

        return [
          Math.max(0, startIndex - overscanBackward),
          // @ts-ignore
          Math.max(0, Math.min(itemCount - 1, stopIndex + overscanForward)),
          startIndex,
          stopIndex,
        ];
      }

      const _onScrollHorizontal = (event: ScrollEvent): void => {
        const {clientWidth, scrollLeft, scrollWidth} = event.currentTarget;
        if (state.scrollOffset !== scrollLeft) {

          const {direction} = props;

          let scrollOffset = scrollLeft;
          if (direction === 'rtl') {
            // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
            // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
            // It's also easier for this component if we convert offsets to the same format as they would be in for ltr.
            // So the simplest solution is to determine which browser behavior we're dealing with, and convert based on it.
            switch (getRTLOffsetType()) {
              case 'negative':
                scrollOffset = -scrollLeft;
                break;
              case 'positive-descending':
                scrollOffset = scrollWidth - clientWidth - scrollLeft;
                break;
            }
          }

          // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
          scrollOffset = Math.max(
            0,
            Math.min(scrollOffset, scrollWidth - clientWidth)
          );

          state.isScrolling = true
          state.scrollDirection = state.scrollOffset < scrollLeft ? 'forward' : 'backward'
          state.scrollOffset = scrollOffset
          state.scrollUpdateWasRequested = false
          _resetIsScrollingDebounced()
        }
      };

      const _onScrollVertical = (event: ScrollEvent): void => {
        const {clientHeight, scrollHeight, scrollTop} = event.currentTarget;
        if (state.scrollOffset !== scrollTop) {

          // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
          const scrollOffset = Math.max(
            0,
            Math.min(scrollTop, scrollHeight - clientHeight)
          );


          state.isScrolling = true
          state.scrollDirection = state.scrollOffset < scrollOffset ? 'forward' : 'backward'
          state.scrollOffset = scrollOffset
          state.scrollUpdateWasRequested = false
          _resetIsScrollingDebounced()

        }


      };

      const _outerRefSetter = (ref: any): void => {
        const {outerRef} = props;

        _outerRef = ref;

        if (typeof outerRef === 'function') {
          outerRef(ref);
        } else if (
          outerRef != null &&
          typeof outerRef === 'object' &&
          outerRef.hasOwnProperty('current')
        ) {
          outerRef.current = ref;
        }
      };

      const _resetIsScrollingDebounced = () => {
        if (_resetIsScrollingTimeoutId !== null) {
          cancelTimeout(_resetIsScrollingTimeoutId);
        }

        _resetIsScrollingTimeoutId = requestTimeout(
          _resetIsScrolling,
          IS_SCROLLING_DEBOUNCE_INTERVAL
        );
      };

      const _resetIsScrolling = () => {
        _resetIsScrollingTimeoutId = null;

        state.isScrolling = false
        _getItemStyleCache(-1, null, null);
      };

      function getDerivedStateFromProps(
        nextProps: Props<any>,
        prevState: State
      ): any {
        validateSharedProps(nextProps, prevState);
        validateProps(nextProps);
        return null;
      }

      function scrollTo(scrollOffset: number): void {
        scrollOffset = Math.max(0, scrollOffset);

        if (state.scrollOffset !== scrollOffset) {
          state.scrollDirection = state.scrollOffset < scrollOffset ? 'forward' : 'backward'
          state.scrollOffset = scrollOffset
          state.scrollUpdateWasRequested = true
          _resetIsScrollingDebounced()
        }
      }

      function scrollToItem(index: number, align: ScrollToAlign = 'auto'): void {
        const {itemCount, layout} = props;
        const {scrollOffset} = state;


        // The scrollbar size should be considered when scrolling an item into view, to ensure it's fully visible.
        // But we only need to account for its size when it's actually visible.
        // This is an edge case for lists; normally they only scroll in the dominant direction.
        let scrollbarSize = 0;
        if (_outerRef) {
          const outerRef = _outerRef;
          if (layout === 'vertical') {
            scrollbarSize =
              outerRef.scrollWidth > outerRef.clientWidth
                ? getScrollbarSize()
                : 0;
          } else {
            scrollbarSize =
              outerRef.scrollHeight > outerRef.clientHeight
                ? getScrollbarSize()
                : 0;
          }
        }

        if (itemCount) {
          index = Math.max(0, Math.min(index, itemCount - 1));

          scrollTo(
            getOffsetForIndexAndAlignment(
              props as any,
              index,
              align,
              scrollOffset,
              _instanceProps,
              scrollbarSize
            )
          );
        }
      }
      expose({
        scrollToItem
      })
      onMounted(() => {
        const {direction, initialScrollOffset, layout} = props;

        if (typeof initialScrollOffset === 'number' && _outerRef != null) {
          const outerRef = _outerRef;
          // TODO Deprecate direction "horizontal"
          if (direction === 'horizontal' || layout === 'horizontal') {
            outerRef.scrollLeft = initialScrollOffset;
          } else {
            outerRef.scrollTop = initialScrollOffset;
          }
        }

        _callPropsCallbacks();
      })

      watch([
        () => props.direction,
        () => props.layout,
        () => state.scrollOffset,
        () => state.scrollUpdateWasRequested,
      ], () => {
        const {direction, layout} = props;
        const {scrollOffset, scrollUpdateWasRequested} = state;

        if (scrollUpdateWasRequested && _outerRef != null) {
          const outerRef = _outerRef;

          // TODO Deprecate direction "horizontal"
          if (direction === 'horizontal' || layout === 'horizontal') {
            if (direction === 'rtl') {
              // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
              // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
              // So we need to determine which browser behavior we're dealing with, and mimic it.
              switch (getRTLOffsetType()) {
                case 'negative':
                  outerRef.scrollLeft = -scrollOffset;
                  break;
                case 'positive-ascending':
                  outerRef.scrollLeft = scrollOffset;
                  break;
                default:
                  const {clientWidth, scrollWidth} = outerRef;
                  outerRef.scrollLeft = scrollWidth - clientWidth - scrollOffset;
                  break;
              }
            } else {
              outerRef.scrollLeft = scrollOffset;
            }
          } else {
            outerRef.scrollTop = scrollOffset;
          }
        }

        _callPropsCallbacks();
      })
      onUnmounted(() => {

        if (_resetIsScrollingTimeoutId !== null) {
          cancelTimeout(_resetIsScrollingTimeoutId);
        }
      })


      return () => {
        // const children = slots.default ? slots.default() : null
        const {
          className,
          direction,
          height,
          innerRef,
          innerElementType,
          innerTagName,
          itemCount,
          itemData,
          itemKey = defaultItemKey,
          layout,
          outerElementType,
          outerTagName,
          style,
          useIsScrolling,
          width,
        } = props;
        const {isScrolling} = state;

        // TODO Deprecate direction "horizontal"
        const isHorizontal =
          direction === 'horizontal' || layout === 'horizontal';

        const onScroll = isHorizontal
          ? _onScrollHorizontal
          : _onScrollVertical;

        const [startIndex, stopIndex] = _getRangeToRender();

        const items:VNode[] = [];
        if (itemCount && itemCount > 0) {
          for (let index = startIndex; index <= stopIndex; index++) {
            let props_ = {
              data: itemData,
              key: itemKey(index, itemData),
              index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: _getItemStyle(index),
            }
            items.push(
              createElement(slots.default ? slots.default(props_)[0] : '', props_)
            );
          }
        }

        // Read this value AFTER items have been created,
        // So their actual sizes (if variable) are taken into consideration.
        const estimatedTotalSize = getEstimatedTotalSize(
          props as any,
          _instanceProps
        );

        const inner = [createElement(innerElementType || innerTagName || 'div', {
          ref: () => innerRef ? innerRef.value : undefined,
          style: {
            height: isHorizontal ? '100%' : estimatedTotalSize + 'px',
            pointerEvents: isScrolling ? 'none' : undefined,
            width: isHorizontal ? estimatedTotalSize + 'px' : '100%',
          },
        }, typeof (innerElementType || innerTagName || 'div') === 'string'?items:()=>items)]
        return createElement(
          (outerElementType || outerTagName || 'div') as any,
          {
            className,
            onScroll,
            ref: _outerRefSetter,
            style: {
              position: 'relative',
              height: height + 'px',
              width: width + 'px',
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch',
              willChange: 'transform',
              direction,
              ...style,
            },
          },
          typeof (outerElementType || outerTagName || 'div') === 'string'?inner:()=>inner
        );
      }
    }
  })
}

// NOTE: I considered further wrapping individual items with a pure ListItem component.
// This would avoid ever calling the render function for the same index more than once,
// But it would also add the overhead of a lot of components/fibers.
// I assume people already do this (render function returning a class component),
// So my doing it would just unnecessarily double the wrappers.

const validateSharedProps = (
  {
    children,
    direction,
    height,
    layout,
    innerTagName,
    outerTagName,
    width,
  }: Props<any>,
  {instance}: State
): void => {

  // import.meta.env.DEV
  if (false) {
    if (innerTagName != null || outerTagName != null) {
      if (devWarningsTagName && !devWarningsTagName.has(instance)) {
        devWarningsTagName.add(instance);
        console.warn(
          'The innerTagName and outerTagName props have been deprecated. ' +
          'Please use the innerElementType and outerElementType props instead.'
        );
      }
    }

    // TODO Deprecate direction "horizontal"
    const isHorizontal = direction === 'horizontal' || layout === 'horizontal';

    switch (direction) {
      case 'horizontal':
      case 'vertical':
        if (devWarningsDirection && !devWarningsDirection.has(instance)) {
          devWarningsDirection.add(instance);
          console.warn(
            'The direction prop should be either "ltr" (default) or "rtl". ' +
            'Please use the layout prop to specify "vertical" (default) or "horizontal" orientation.'
          );
        }
        break;
      case 'ltr':
      case 'rtl':
        // Valid values
        break;
      default:
        throw Error(
          'An invalid "direction" prop has been specified. ' +
          'Value should be either "ltr" or "rtl". ' +
          `"${direction}" was specified.`
        );
    }

    switch (layout) {
      case 'horizontal':
      case 'vertical':
        // Valid values
        break;
      default:
        throw Error(
          'An invalid "layout" prop has been specified. ' +
          'Value should be either "horizontal" or "vertical". ' +
          `"${layout}" was specified.`
        );
    }

    if (children == null) {
      throw Error(
        'An invalid "children" prop has been specified. ' +
        'Value should be a React component. ' +
        `"${children === null ? 'null' : typeof children}" was specified.`
      );
    }

    if (isHorizontal && typeof width !== 'number') {
      throw Error(
        'An invalid "width" prop has been specified. ' +
        'Horizontal lists must specify a number for width. ' +
        `"${width === null ? 'null' : typeof width}" was specified.`
      );
    } else if (!isHorizontal && typeof height !== 'number') {
      throw Error(
        'An invalid "height" prop has been specified. ' +
        'Vertical lists must specify a number for height. ' +
        `"${height === null ? 'null' : typeof height}" was specified.`
      );
    }
  }
};
