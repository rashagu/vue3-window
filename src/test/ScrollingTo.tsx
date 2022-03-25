import {defineComponent, ref, h, Fragment} from 'vue'
import {FixedSizeList as List} from '../components/index';

interface ExampleProps {
  name?: string
}

export const vuePropsType = {
  name: String
}


const ScrollingTo = defineComponent<ExampleProps>((props, {slots}) => {
  const Row = (p: {index:number, style:any}) => (
    <div class={p?.index % 2 ? 'ListItemOdd' : 'ListItemEven'} style={p?.style}>
      Row {p?.index}
    </div>
  );
  const listRef = ref<any>(null)
  const scrollToRow200Auto = () => {
    listRef.value?.scrollToItem(200);
  };
  const scrollToRow250Smart = () => {
    listRef.value?.scrollToItem(250, 'smart');
  };
  const scrollToRow300Center = () => {
    listRef.value?.scrollToItem(300, 'center');
  };
  return () => (
    <div>
      <div>
        <button class="ExampleButton" onClick={scrollToRow200Auto}>
          Scroll to row 200 (align: auto)
        </button>
        <button class="ExampleButton" onClick={scrollToRow250Smart}>
          Scroll to row 250 (align: smart)
        </button>
        <button class="ExampleButton" onClick={scrollToRow300Center}>
          Scroll to row 300 (align: center)
        </button>
      </div>
      <List
        className="List"
        height={150}
        itemCount={1000}
        itemSize={35}
        ref={listRef}
        width={300}
      >
        {Row}
      </List>
    </div>
  )
})

ScrollingTo.props = vuePropsType

export default ScrollingTo

