import {defineComponent, ref, h, Fragment} from 'vue'
import FixedSizeList from "./test/FixedSizeList";
import VariableSizeListTest from "./test/VariableSizeListTest";
import FixedSizeGridTest from "./test/FixedSizeGridTest";
import VariableSizeGridTest from "./test/VariableSizeGridTest";
import ScrollingIndicatorsTest from "./test/ScrollingIndicatorsTest";
import ScrollingTo from "./test/ScrollingTo";
import MemoizedListItems from "./test/MemoizedListItems";
import ScrollingToGrid from "./test/ScrollingToGrid";
import RTLlayout from "./test/RTLlayout";

interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}
const App = defineComponent<ExampleProps>((props, {slots}) => {


  return () => (
    <div>
      <FixedSizeList />
      <VariableSizeListTest />
      <FixedSizeGridTest />
      <VariableSizeGridTest/>
      <ScrollingIndicatorsTest />
      <ScrollingTo />
      <ScrollingToGrid />
      <MemoizedListItems/>
      <RTLlayout />
      <div class={'aa'}>123</div>
    </div>
  )
})

App.props = vuePropsType

export default App

