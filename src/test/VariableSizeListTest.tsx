import {defineComponent, ref, h, Fragment} from 'vue'
import {VariableSizeList as List} from "../components";

interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}
const VariableSizeListTest = defineComponent<ExampleProps>((props, {slots}) => {
  const Row = (p:{index:number, style:any}) => (
    <div  style={p?.style}>Row {JSON.stringify(p?.index)}</div>
  );

// These row heights are arbitrary.
// Yours should be based on the content of the row.
  const rowHeights = new Array(1000)
    .fill(true)
    .map(() => 25 + Math.round(Math.random() * 50));
  const getItemSize = (index:number) => rowHeights[index];


  // These column widths are arbitrary.
// Yours should be based on the content of the column.
  const columnWidths = new Array(1000)
    .fill(true)
    .map(() => 75 + Math.round(Math.random() * 50));

  const getItemSize2 = (index:number) => columnWidths[index];

  const Column = (p:{index:number, style:any}) => (
    <div style={p?.style}>Column {p?.index}</div>
  );

  return () => (
    <div>
      <List
        height={150}
        itemCount={1000}
        itemSize={getItemSize}
        width={300}
      >
        {Row}
      </List>
      <br />
      <List
        height={75}
        itemCount={1000}
        itemSize={getItemSize2}
        layout="horizontal"
        width={300}
      >
        {Column}
      </List>
    </div>
  )
})

VariableSizeListTest.props = vuePropsType

export default VariableSizeListTest

