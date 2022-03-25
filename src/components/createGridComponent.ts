// @flow

import memoizeOne from 'memoize-one';
import {defineComponent, h as createElement, onMounted, onUnmounted, reactive, VNode, watch} from 'vue';
import {cancelTimeout, requestTimeout} from './timer';
import {getScrollbarSize, getRTLOffsetType} from './domHelpers';

import type {TimeoutID} from './timer';

type Direction = 'ltr' | 'rtl';
export type ScrollToAlign = 'auto' | 'smart' | 'center' | 'start' | 'end';

type itemSize = number | ((index: number) => number);

type RenderComponentProps<T> = {
  columnIndex: number,
  data: T,
  isScrolling?: boolean,
  rowIndex: number,
  style: Object,
};
export type RenderComponent<T> = any;

type ScrollDirection = 'forward' | 'backward';

type OnItemsRenderedCallback = (arg: {
  overscanColumnStartIndex: number,
  overscanColumnStopIndex: number,
  overscanRowStartIndex: number,
  overscanRowStopIndex: number,
  visibleColumnStartIndex: number,
  visibleColumnStopIndex: number,
  visibleRowStartIndex: number,
  visibleRowStopIndex: number,
}) => void;
type OnScrollCallback = (arg: {
  horizontalScrollDirection: ScrollDirection,
  scrollLeft: number,
  scrollTop: number,
  scrollUpdateWasRequested: boolean,
  verticalScrollDirection: ScrollDirection,
}) => void;

type ScrollEvent = any;
type ItemStyleCache = { [key: string]: Object };

type OuterProps = {
  children: VNode,
  className: string | void,
  onScroll: (e: ScrollEvent) => void,
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
  columnCount: number,
  columnWidth: itemSize,
  direction: Direction,
  height: number,
  initialScrollLeft?: number,
  initialScrollTop?: number,
  innerRef?: any,
  innerElementType?: string | any,
  innerTagName?: string, // deprecated
  itemData: T,
  itemKey?: (index: number, data: T) => any,
  onItemsRendered?: OnItemsRenderedCallback,
  onScroll?: OnScrollCallback,
  outerRef?: any,
  outerElementType?: string | any,
  outerTagName?: string, // deprecated
  overscanColumnCount?: number,
  overscanColumnsCount?: number, // deprecated
  overscanCount?: number, // deprecated
  overscanRowCount?: number,
  overscanRowsCount?: number, // deprecated
  rowCount: number,
  rowHeight: itemSize,
  style?: Object,
  useIsScrolling: boolean,
  width: number,
};

type State = {
  instance: any,
  isScrolling: boolean,
  horizontalScrollDirection: ScrollDirection,
  scrollLeft: number,
  scrollTop: number,
  scrollUpdateWasRequested: boolean,
  verticalScrollDirection: ScrollDirection,
};

type getItemOffset = (
  props: Props<any>,
  index: number,
  instanceProps: any
) => number;
type getItemSize = (
  props: Props<any>,
  index: number,
  instanceProps: any
) => number;
type getEstimatedTotalSize = (props: Props<any>, instanceProps: any) => number;
type GetOffsetForItemAndAlignment = (
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

const defaultItemKey = ({columnIndex, data, rowIndex}: any) => `${rowIndex}:${columnIndex}`;

// In DEV mode, this Set helps us only log a warning once per component instance.
// This avoids spamming the console every time a render happens.
let devWarningsOverscanCount: any = null;
let devWarningsOverscanRowsColumnsCount: any = null;
let devWarningsTagName: any = null;
// import.meta.env.DEV
if (false) {
  if (typeof window !== 'undefined' && typeof window.WeakSet !== 'undefined') {
    devWarningsOverscanCount = new WeakSet();
    devWarningsOverscanRowsColumnsCount = new WeakSet();
    devWarningsTagName = new WeakSet();
  }
}

export default function createGridComponent({
                                              getColumnOffset,
                                              getColumnStartIndexForOffset,
                                              getColumnStopIndexForStartIndex,
                                              getColumnWidth,
                                              getEstimatedTotalHeight,
                                              getEstimatedTotalWidth,
                                              getOffsetForColumnAndAlignment,
                                              getOffsetForRowAndAlignment,
                                              getRowHeight,
                                              getRowOffset,
                                              getRowStartIndexForOffset,
                                              getRowStopIndexForStartIndex,
                                              initInstanceProps,
                                              shouldResetStyleCacheOnItemSizeChange,
                                              validateProps,
                                            }: {
  getColumnOffset: getItemOffset,
  getColumnStartIndexForOffset: GetStartIndexForOffset,
  getColumnStopIndexForStartIndex: GetStopIndexForStartIndex,
  getColumnWidth: getItemSize,
  getEstimatedTotalHeight: getEstimatedTotalSize,
  getEstimatedTotalWidth: getEstimatedTotalSize,
  getOffsetForColumnAndAlignment: GetOffsetForItemAndAlignment,
  getOffsetForRowAndAlignment: GetOffsetForItemAndAlignment,
  getRowOffset: getItemOffset,
  getRowHeight: getItemSize,
  getRowStartIndexForOffset: GetStartIndexForOffset,
  getRowStopIndexForStartIndex: GetStopIndexForStartIndex,
  initInstanceProps: InitInstanceProps,
  shouldResetStyleCacheOnItemSizeChange: boolean,
  validateProps: ValidateProps,
}) {
  return defineComponent({
    props: {
      className: String,
      columnCount: Number,
      rowCount: Number,
      columnWidth: [Number, Function],
      rowHeight: [Number, Function],
      height: Number,
      overscanColumnCount: Number,
      overscanColumnsCount: Number,
      overscanRowCount: Number,
      overscanRowsCount: Number,
      initialScrollOffset: Number,
      innerRef: Object,
      initialScrollLeft: Number,
      initialScrollTop: Number,
      innerElementType: String,
      innerTagName: String,
      itemCount: Number,
      itemKey: Function,
      itemSize: [Number, Function],
      onItemsRendered: Function,
      onScroll: Function,
      outerRef: Object,
      outerElementType: String,
      outerTagName: String,
      style: [Object],
      width: Number,
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
        horizontalScrollDirection: 'forward',
        scrollLeft:
          typeof props.initialScrollLeft === 'number'
            ? props.initialScrollLeft
            : 0,
        scrollTop:
          typeof props.initialScrollTop === 'number'
            ? props.initialScrollTop
            : 0,
        scrollUpdateWasRequested: false,
        verticalScrollDirection: 'forward',
      })


      let _callOnItemsRendered = memoizeOne(
        (
          overscanColumnStartIndex: number,
          overscanColumnStopIndex: number,
          overscanRowStartIndex: number,
          overscanRowStopIndex: number,
          visibleColumnStartIndex: number,
          visibleColumnStopIndex: number,
          visibleRowStartIndex: number,
          visibleRowStopIndex: number
        ) =>
          props.onItemsRendered && props.onItemsRendered({
            overscanColumnStartIndex,
            overscanColumnStopIndex,
            overscanRowStartIndex,
            overscanRowStopIndex,
            visibleColumnStartIndex,
            visibleColumnStopIndex,
            visibleRowStartIndex,
            visibleRowStopIndex,
          })
      );

      let _callOnScroll = memoizeOne(
        (
          scrollLeft: number,
          scrollTop: number,
          horizontalScrollDirection: ScrollDirection,
          verticalScrollDirection: ScrollDirection,
          scrollUpdateWasRequested: boolean
        ) =>
          props.onScroll && props.onScroll({
            horizontalScrollDirection,
            scrollLeft,
            scrollTop,
            verticalScrollDirection,
            scrollUpdateWasRequested,
          })
      );

      function _callPropsCallbacks() {
        const {columnCount, onItemsRendered, onScroll, rowCount} = props;
        if (typeof props.onItemsRendered === 'function') {
          if (columnCount && rowCount && columnCount > 0 && rowCount > 0) {
            const [
              overscanColumnStartIndex,
              overscanColumnStopIndex,
              visibleColumnStartIndex,
              visibleColumnStopIndex,
            ] = _getHorizontalRangeToRender();
            const [
              overscanRowStartIndex,
              overscanRowStopIndex,
              visibleRowStartIndex,
              visibleRowStopIndex,
            ] = _getVerticalRangeToRender();
            _callOnItemsRendered(
              overscanColumnStartIndex,
              overscanColumnStopIndex,
              overscanRowStartIndex,
              overscanRowStopIndex,
              visibleColumnStartIndex,
              visibleColumnStopIndex,
              visibleRowStartIndex,
              visibleRowStopIndex
            );
          }
        }

        if (typeof props.onScroll === 'function') {
          const {
            horizontalScrollDirection,
            scrollLeft,
            scrollTop,
            scrollUpdateWasRequested,
            verticalScrollDirection,
          } = state;
          _callOnScroll(
            scrollLeft,
            scrollTop,
            horizontalScrollDirection,
            verticalScrollDirection,
            scrollUpdateWasRequested
          );
        }
      }

      // Lazily create and cache item styles while scrolling,
      // So that pure component sCU will prevent re-renders.
      // We maintain this cache, and pass a style prop rather than index,
      // So that List can clear cached styles and force item re-render if necessary.
      const _getItemStyle = (rowIndex: number, columnIndex: number): Object => {
        const {columnWidth, direction, rowHeight} = props;

        const itemStyleCache = _getItemStyleCache(
          shouldResetStyleCacheOnItemSizeChange && columnWidth,
          shouldResetStyleCacheOnItemSizeChange && direction,
          shouldResetStyleCacheOnItemSizeChange && rowHeight
        );

        const key = `${rowIndex}:${columnIndex}`;

        let style;
        if (itemStyleCache.hasOwnProperty(key)) {
          style = itemStyleCache[key];
        } else {
          const offset = getColumnOffset(
            props as any,
            columnIndex,
            _instanceProps
          );
          const isRtl = direction === 'rtl';
          itemStyleCache[key] = style = {
            position: 'absolute',
            left: isRtl ? undefined : offset + 'px',
            right: isRtl ? offset + 'px' : undefined,
            top: getRowOffset(props as any, rowIndex, _instanceProps) + 'px',
            height: getRowHeight(props as any, rowIndex, _instanceProps) + 'px',
            width: getColumnWidth(props as any, columnIndex, _instanceProps) + 'px',
          };
        }

        return style;
      }

      const _getItemStyleCache: (_: any, __: any, ___: any) => ItemStyleCache = memoizeOne((_: any, __: any, ___: any) => ({}));

      function _getHorizontalRangeToRender(): [number, number, number, number] {
        const {
          columnCount,
          overscanColumnCount,
          overscanColumnsCount,
          overscanCount,
          rowCount,
        } = props;
        const {horizontalScrollDirection, isScrolling, scrollLeft} = state;

        const overscanCountResolved: number =
          overscanColumnCount || overscanColumnsCount || overscanCount || 1;

        if (columnCount === 0 || rowCount === 0) {
          return [0, 0, 0, 0];
        }

        const startIndex = getColumnStartIndexForOffset(
          props as any,
          scrollLeft,
          _instanceProps
        );
        const stopIndex = getColumnStopIndexForStartIndex(
          props as any,
          startIndex,
          scrollLeft,
          _instanceProps
        );

        // Overscan by one item in each direction so that tab/focus works.
        // If there isn't at least one extra item, tab loops back around.
        const overscanBackward =
          !isScrolling || horizontalScrollDirection === 'backward'
            ? Math.max(1, overscanCountResolved)
            : 1;
        const overscanForward =
          !isScrolling || horizontalScrollDirection === 'forward'
            ? Math.max(1, overscanCountResolved)
            : 1;

        return [
          Math.max(0, startIndex - overscanBackward),
          // @ts-ignore
          Math.max(0, Math.min(columnCount - 1, stopIndex + overscanForward)),
          startIndex,
          stopIndex,
        ];
      }


      function _getVerticalRangeToRender(): [number, number, number, number] {
        const {
          columnCount,
          overscanCount,
          overscanRowCount,
          overscanRowsCount,
          rowCount,
        } = props;
        const {isScrolling, verticalScrollDirection, scrollTop} = state;

        const overscanCountResolved: number =
          overscanRowCount || overscanRowsCount || overscanCount || 1;

        if (columnCount === 0 || rowCount === 0) {
          return [0, 0, 0, 0];
        }

        const startIndex = getRowStartIndexForOffset(
          props as any,
          scrollTop,
          _instanceProps
        );
        const stopIndex = getRowStopIndexForStartIndex(
          props as any,
          startIndex,
          scrollTop,
          _instanceProps
        );

        // Overscan by one item in each direction so that tab/focus works.
        // If there isn't at least one extra item, tab loops back around.
        const overscanBackward =
          !isScrolling || verticalScrollDirection === 'backward'
            ? Math.max(1, overscanCountResolved)
            : 1;
        const overscanForward =
          !isScrolling || verticalScrollDirection === 'forward'
            ? Math.max(1, overscanCountResolved)
            : 1;

        return [
          Math.max(0, startIndex - overscanBackward),
          // @ts-ignore
          Math.max(0, Math.min(rowCount - 1, stopIndex + overscanForward)),
          startIndex,
          stopIndex,
        ];
      }

      const _onScroll = (event: ScrollEvent): void => {
        const {
          clientHeight,
          clientWidth,
          scrollLeft,
          scrollTop,
          scrollHeight,
          scrollWidth,
        } = event.currentTarget;
        if (
          state.scrollLeft !== scrollLeft ||
          state.scrollTop !== scrollTop
        ) {
          // Scroll position may have been updated by cDM/cDU,
          // In which case we don't need to trigger another render,
          // And we don't want to update state.isScrolling.

          const {direction} = props;

          // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
          // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
          // It's also easier for this component if we convert offsets to the same format as they would be in for ltr.
          // So the simplest solution is to determine which browser behavior we're dealing with, and convert based on it.
          let calculatedScrollLeft = scrollLeft;
          if (direction === 'rtl') {
            switch (getRTLOffsetType()) {
              case 'negative':
                calculatedScrollLeft = -scrollLeft;
                break;
              case 'positive-descending':
                calculatedScrollLeft = scrollWidth - clientWidth - scrollLeft;
                break;
            }
          }

          // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.
          calculatedScrollLeft = Math.max(
            0,
            Math.min(calculatedScrollLeft, scrollWidth - clientWidth)
          );
          const calculatedScrollTop = Math.max(
            0,
            Math.min(scrollTop, scrollHeight - clientHeight)
          );

          state.isScrolling = true
          state.horizontalScrollDirection = state.scrollLeft < scrollLeft ? 'forward' : 'backward'
          state.scrollLeft = calculatedScrollLeft
          state.scrollTop = calculatedScrollTop
          state.verticalScrollDirection = state.scrollTop < scrollTop ? 'forward' : 'backward'
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

      function getDerivedStateFromProps(nextProps: Props<any>, prevState: State): any {
        validateSharedProps(nextProps, prevState);
        validateProps(nextProps);
        return null;
      }

      function scrollTo({scrollLeft, scrollTop,}: { scrollLeft: number, scrollTop: number, }): void {
        if (scrollLeft !== undefined) {
          scrollLeft = Math.max(0, scrollLeft);
        }
        if (scrollTop !== undefined) {
          scrollTop = Math.max(0, scrollTop);
        }

        //---
        if (scrollLeft === undefined) {
          scrollLeft = state.scrollLeft;
        }
        if (scrollTop === undefined) {
          scrollTop = state.scrollTop;
        }

        if (
          state.scrollLeft !== scrollLeft ||
          state.scrollTop !== scrollTop
        ) {
          state.horizontalScrollDirection = state.scrollLeft < scrollLeft ? 'forward' : 'backward'
          state.scrollLeft = scrollLeft
          state.scrollTop = scrollTop
          state.scrollUpdateWasRequested = true
          state.verticalScrollDirection = state.scrollTop < scrollTop ? 'forward' : 'backward'
          _resetIsScrollingDebounced()
        }
      }

      function scrollToItem({
                              align = 'auto',
                              columnIndex,
                              rowIndex,
                            }: { align: ScrollToAlign, columnIndex?: number, rowIndex?: number, }): void {
        const {columnCount, height, rowCount, width} = props;
        const {scrollLeft, scrollTop} = state;
        const scrollbarSize = getScrollbarSize();

        if (columnCount && columnIndex !== undefined) {
          columnIndex = Math.max(0, Math.min(columnIndex, columnCount - 1));
        }
        if (rowCount && rowIndex !== undefined) {
          rowIndex = Math.max(0, Math.min(rowIndex, rowCount - 1));
        }

        const estimatedTotalHeight = getEstimatedTotalHeight(
          props as any,
          _instanceProps
        );
        const estimatedTotalWidth = getEstimatedTotalWidth(
          props as any,
          _instanceProps
        );

        // The scrollbar size should be considered when scrolling an item into view,
        // to ensure it's fully visible.
        // But we only need to account for its size when it's actually visible.
        const horizontalScrollbarSize =
          estimatedTotalWidth > parseInt(width + '') ? scrollbarSize : 0;
        const verticalScrollbarSize =
          estimatedTotalHeight > parseInt(height + '') ? scrollbarSize : 0;

        scrollTo({
          scrollLeft:
            columnIndex !== undefined
              ? getOffsetForColumnAndAlignment(
                props as any,
                columnIndex,
                align,
                scrollLeft,
                _instanceProps,
                verticalScrollbarSize
              )
              : scrollLeft,
          scrollTop:
            rowIndex !== undefined
              ? getOffsetForRowAndAlignment(
                props as any,
                rowIndex,
                align,
                scrollTop,
                _instanceProps,
                horizontalScrollbarSize
              )
              : scrollTop,
        });
      }


      expose({
        scrollToItem
      })

      onMounted(() => {
        const {initialScrollLeft, initialScrollTop} = props;


        if (_outerRef != null) {
          const outerRef = _outerRef;
          if (typeof initialScrollLeft === 'number') {
            outerRef.scrollLeft = initialScrollLeft;
          }
          if (typeof initialScrollTop === 'number') {
            outerRef.scrollTop = initialScrollTop;
          }
        }


        _callPropsCallbacks();
      })

      watch([
          () => props.direction,
          () => state.scrollLeft,
          () => state.scrollTop,
          () => state.scrollUpdateWasRequested,
        ],
        () => {
          const {direction} = props;
          const {scrollLeft, scrollTop, scrollUpdateWasRequested} = state;

          if (scrollUpdateWasRequested && _outerRef != null) {
            // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
            // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
            // So we need to determine which browser behavior we're dealing with, and mimic it.
            const outerRef = _outerRef;
            if (direction === 'rtl') {
              switch (getRTLOffsetType()) {
                case 'negative':
                  outerRef.scrollLeft = -scrollLeft;
                  break;
                case 'positive-ascending':
                  outerRef.scrollLeft = scrollLeft;
                  break;
                default:
                  const {clientWidth, scrollWidth} = outerRef;
                  outerRef.scrollLeft = scrollWidth - clientWidth - scrollLeft;
                  break;
              }
            } else {
              outerRef.scrollLeft = Math.max(0, scrollLeft);
            }

            outerRef.scrollTop = Math.max(0, scrollTop);
          }

          _callPropsCallbacks();
        })
      onUnmounted(() => {
        if (_resetIsScrollingTimeoutId !== null) {
          cancelTimeout(_resetIsScrollingTimeoutId);
        }
      })


      return () => {
        const {
          className,
          columnCount,
          direction,
          height,
          innerRef,
          innerElementType,
          innerTagName,
          itemData,
          itemKey = defaultItemKey,
          outerElementType,
          outerTagName,
          rowCount,
          style,
          useIsScrolling,
          width,
        } = props;
        const {isScrolling} = state;

        const [
          columnStartIndex,
          columnStopIndex,
        ] = _getHorizontalRangeToRender();
        const [rowStartIndex, rowStopIndex] = _getVerticalRangeToRender();

        const items = [];
        if (columnCount && columnCount > 0 && rowCount) {
          for (
            let rowIndex = rowStartIndex;
            rowIndex <= rowStopIndex;
            rowIndex++
          ) {
            for (
              let columnIndex = columnStartIndex;
              columnIndex <= columnStopIndex;
              columnIndex++
            ) {
              let props_ = {
                columnIndex,
                data: itemData,
                isScrolling: useIsScrolling ? isScrolling : undefined,
                key: itemKey({columnIndex, data: itemData, rowIndex}),
                rowIndex,
                style: _getItemStyle(rowIndex, columnIndex),
              }
              items.push(
                createElement(slots.default ? slots.default(props_)[0] : '', props_)
              );
            }
          }
        }

        // Read this value AFTER items have been created,
        // So their actual sizes (if variable) are taken into consideration.
        const estimatedTotalHeight = getEstimatedTotalHeight(
          props as any,
          _instanceProps
        );
        const estimatedTotalWidth = getEstimatedTotalWidth(
          props as any,
          _instanceProps
        );

        return createElement(
          outerElementType || outerTagName || 'div',
          {
            className,
            onScroll: _onScroll,
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
          createElement(innerElementType || innerTagName || 'div', {
            ref: () => innerRef ? innerRef.value : undefined,
            style: {
              height: estimatedTotalHeight + 'px',
              pointerEvents: isScrolling ? 'none' : undefined,
              width: estimatedTotalWidth + 'px',
            },
          }, items)
        );
      }
    }
  })
}

const validateSharedProps = (
  {
    children,
    direction,
    height,
    innerTagName,
    outerTagName,
    overscanColumnsCount,
    overscanCount,
    overscanRowsCount,
    width,
  }: Props<any>,
  {instance}: State
): void => {
  // import.meta.env.DEV
  if (false) {
    if (typeof overscanCount === 'number') {
      if (devWarningsOverscanCount && !devWarningsOverscanCount.has(instance)) {
        devWarningsOverscanCount.add(instance);
        console.warn(
          'The overscanCount prop has been deprecated. ' +
          'Please use the overscanColumnCount and overscanRowCount props instead.'
        );
      }
    }

    if (
      typeof overscanColumnsCount === 'number' ||
      typeof overscanRowsCount === 'number'
    ) {
      if (
        devWarningsOverscanRowsColumnsCount &&
        !devWarningsOverscanRowsColumnsCount.has(instance)
      ) {
        devWarningsOverscanRowsColumnsCount.add(instance);
        console.warn(
          'The overscanColumnsCount and overscanRowsCount props have been deprecated. ' +
          'Please use the overscanColumnCount and overscanRowCount props instead.'
        );
      }
    }

    if (innerTagName != null || outerTagName != null) {
      if (devWarningsTagName && !devWarningsTagName.has(instance)) {
        devWarningsTagName.add(instance);
        console.warn(
          'The innerTagName and outerTagName props have been deprecated. ' +
          'Please use the innerElementType and outerElementType props instead.'
        );
      }
    }

    if (children == null) {
      throw Error(
        'An invalid "children" prop has been specified. ' +
        'Value should be a React component. ' +
        `"${children === null ? 'null' : typeof children}" was specified.`
      );
    }

    switch (direction) {
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

    if (typeof width !== 'number') {
      throw Error(
        'An invalid "width" prop has been specified. ' +
        'Grids must specify a number for width. ' +
        `"${width === null ? 'null' : typeof width}" was specified.`
      );
    }

    if (typeof height !== 'number') {
      throw Error(
        'An invalid "height" prop has been specified. ' +
        'Grids must specify a number for height. ' +
        `"${height === null ? 'null' : typeof height}" was specified.`
      );
    }
  }
};
