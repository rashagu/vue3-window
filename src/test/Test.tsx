import {defineComponent, ref, h, Fragment} from 'vue'
import { FixedSizeList as List } from '../components';
interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}
const Test = defineComponent<ExampleProps>((props, {slots}) => {
  const Row = (p:{index:number, style:any}) => (
    <div  style={p?.style}>Row {JSON.stringify(p?.index)}</div>
  );
  const Column = (p:{index:number, style:any}) => (
    <div style={p?.style}>Column {p?.index}</div>
  );


  return () => (
    <div>
      <List
        height={150}
        itemCount={1000}
        itemSize={35}
        width={300}
      >
        {{
          default:Row
        }}
      </List>
      <br/>
      <List
        height={75}
        itemCount={1000}
        itemSize={100}
        layout="horizontal"
        width={300}
      >
        {Column}
      </List>
      <br/>
    </div>
  )
})

Test.props = vuePropsType

export default Test

