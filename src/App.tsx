import {defineComponent, ref, h, Fragment} from 'vue'
import Test from "./test/Test";
import VariableSizeListTest from "./test/VariableSizeListTest";
import FixedSizeGridTest from "./test/FixedSizeGridTest";
import VariableSizeGridTest from "./test/VariableSizeGridTest";
import ScrollingIndicatorsTest from "./test/ScrollingIndicatorsTest";

interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}
const App = defineComponent<ExampleProps>((props, {slots}) => {


  return () => (
    <div>
      {/*<Test />*/}
      {/*<VariableSizeListTest />*/}
      {/*<FixedSizeGridTest />*/}
      {/*<VariableSizeGridTest/>*/}
      <ScrollingIndicatorsTest />
    </div>
  )
})

App.props = vuePropsType

export default App

