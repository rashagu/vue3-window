import {defineComponent, ref, h, Fragment} from 'vue'
import { FixedSizeList as List } from '../components/index';
interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}
const ScrollingIndicatorsTest = defineComponent<ExampleProps>((props, {slots}) => {
  const Row = (p:{ index: number, isScrolling:boolean, style:any }) => (
    <div style={p?.style}>
      {p?.isScrolling ? 'Scrolling' : `Row ${p?.index}`}
    </div>
  );

  return () => (
    <div>
      <List
        className="List"
        height={150}
        itemCount={1000}
        itemSize={35}
        useIsScrolling
        width={300}
      >
        {Row}
      </List>
    </div>
  )
})

ScrollingIndicatorsTest.props = vuePropsType

export default ScrollingIndicatorsTest

