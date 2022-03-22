import {defineComponent, ref, h, Fragment} from 'vue'
import { FixedSizeGrid as Grid } from '../components/index';


interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}
const FixedSizeGridTest = defineComponent<ExampleProps>((props, {slots}) => {
  const Cell = (p:{ columnIndex:any, rowIndex:any, style:any }) => (
    <div style={p?.style}>
      Item {p?.rowIndex},{p?.columnIndex}
    </div>
  );

  return () => (
    <div>
      <Grid
        columnCount={1000}
        columnWidth={100}
        height={150}
        rowCount={1000}
        rowHeight={35}
        width={300}
      >
        {Cell}
      </Grid>
    </div>
  )
})

FixedSizeGridTest.props = vuePropsType

export default FixedSizeGridTest

