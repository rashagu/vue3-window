import {defineComponent, ref, h, Fragment} from 'vue'
import { FixedSizeGrid as Grid } from '../components/index';


interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}
const ScrollingToGrid = defineComponent<ExampleProps>((props, {slots}) => {

  const Cell = ({ columnIndex, rowIndex, style }:any) => (
    <div
      class={
        columnIndex % 2
          ? rowIndex % 2 === 0
            ? 'GridItemOdd'
            : 'GridItemEven'
          : rowIndex % 2
            ? 'GridItemOdd'
            : 'GridItemEven'
      }
      style={style}
    >
      r{rowIndex}, c{columnIndex}
    </div>
  );


// You can programatically scroll to a item within a Grid.
// First, attach a ref to the Grid:
  const gridRef = ref<any>(null);

  const scrollToRow100Column50Auto = () => {
    gridRef.value.scrollToItem({
      columnIndex: 50,
      rowIndex: 100,
    });
  };

  const scrollToRow300Column150Start = () => {
    gridRef.value.scrollToItem({
      align: 'start',
      columnIndex: 150,
      rowIndex: 300,
    });
  };

  const scrollToRow350Column200End = () => {
    gridRef.value.scrollToItem({
      align: 'end',
      columnIndex: 200,
      rowIndex: 350,
    });
  };

  const scrollToRow200Column100Center = () => {
    gridRef.value.scrollToItem({
      align: 'center',
      columnIndex: 100,
      rowIndex: 200,
    });
  };

  const scrollToRow250Column150Smart = () => {
    gridRef.value.scrollToItem({
      align: 'smart',
      columnIndex: 150,
      rowIndex: 250,
    });
  };

  return () => (
    <div>

      <div>
        <button
          class="ExampleButton"
          onClick={scrollToRow100Column50Auto}
        >
          Scroll to row 100, column 50 (align: auto)
        </button>
        <button
          class="ExampleButton"
          onClick={scrollToRow300Column150Start}
        >
          Scroll to row 300, column 150 (align: start)
        </button>
        <button
          class="ExampleButton"
          onClick={scrollToRow350Column200End}
        >
          Scroll to row 350, column 200 (align: end)
        </button>
        <button
          class="ExampleButton"
          onClick={scrollToRow200Column100Center}
        >
          Scroll to row 200, column 100 (align: center)
        </button>
        <button
          class="ExampleButton"
          onClick={scrollToRow250Column150Smart}
        >
          Scroll to row 250, column 150 (align: smart)
        </button>
      </div>

      <Grid
        class="Grid"
        columnCount={1000}
        columnWidth={100}
        height={150}
        ref={gridRef}
        rowCount={1000}
        rowHeight={35}
        width={300}
      >
        {Cell}
      </Grid>
    </div>
  )
})

ScrollingToGrid.props = vuePropsType

export default ScrollingToGrid

