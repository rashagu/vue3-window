import {defineComponent, ref, h, Fragment} from 'vue'
import { VariableSizeGrid as Grid } from '../components/index';

interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}
const VariableSizeGridTest = defineComponent<ExampleProps>((props, {slots}) => {
// These item sizes are arbitrary.
// Yours should be based on the content of the item.
  const columnWidths = new Array(1000)
    .fill(true)
    .map(() => 75 + Math.round(Math.random() * 50));
  const rowHeights = new Array(1000)
    .fill(true)
    .map(() => 25 + Math.round(Math.random() * 50));

  const Cell = (p:{ columnIndex:any, rowIndex:any, style:any }) => (
    <div style={p?.style}>
      Item {p?.rowIndex},{p?.columnIndex}
    </div>
  );


  return () => (
    <div>
      <Grid
        columnCount={1000}
        columnWidth={(index:number) => columnWidths[index]}
        height={150}
        rowCount={1000}
        rowHeight={(index:number) => rowHeights[index]}
        width={300}
      >
        {Cell}
      </Grid>
    </div>
  )
})

VariableSizeGridTest.props = vuePropsType

export default VariableSizeGridTest

